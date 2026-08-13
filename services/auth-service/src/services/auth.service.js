const bcrypt = require('bcrypt');

const userRepository = require('../repositories/user.repository');
const otpRepository = require('../repositories/otp.repository');
const profileRepository = require('../repositories/profile.repository');

const redis = require('../config/redis');
const jwt = require('../config/jwt');
const db = require('../config/db');
const { bucket } = require('../config/gcs');

const { generateOTP, compareOTP } = require('../utils/otp');
const { sendOTPEmail } = require('../utils/email');

const { validateRegister } = require('../validators/auth.validator');
const { checkLoginLimit } = require('./rateLimit.service');

const normalizeOTPCode = (code) => String(code || '').replace(/\D/g, '');

const getAdmissionYearFromNpm = (npm) => {
  const match = String(npm || '').match(/^(\d{2})/);
  return match ? 2000 + Number(match[1]) : null;
};

// ================= HELPER GCS PROFILE PICTURE =================
const uploadProfilePicture = async (file, nip) => {
  const ext = file.mimetype.split('/')[1];
  const filename = `profile-pictures/${nip}-${Date.now()}.${ext}`;

  if (process.env.STORAGE_TYPE === 'local') {
    const fs = require('fs');
    const path = require('path');
    const targetDir = path.join(__dirname, '../uploads/profile-pictures');
    fs.mkdirSync(targetDir, { recursive: true });

    const fileBaseName = `${nip}-${Date.now()}.${ext}`;
    fs.writeFileSync(path.join(targetDir, fileBaseName), file.buffer);

    const host = process.env.APP_URL || 'http://localhost:3001';
    return `${host}/uploads/profile-pictures/${fileBaseName}`;
  }

  const blob = bucket.file(filename);

  const blobStream = blob.createWriteStream({
    resumable: false,
    contentType: file.mimetype
  });

  return new Promise((resolve, reject) => {
    blobStream.on('finish', () => {
      const url = `https://storage.googleapis.com/${bucket.name}/${filename}`;
      resolve(url);
    });
    blobStream.on('error', reject);
    blobStream.end(file.buffer);
  });
};

// ================= HELPER: BUILD PROFILE DATA =================
// Field name identik dengan GET /user/profile agar response konsisten di semua endpoint auth
const buildProfileData = async (user) => {
  let profileData = {};

  if (user.role === 'mahasiswa') {
    const mahasiswa = await profileRepository.getMahasiswaProfile(user.id);
    if (mahasiswa) {
      profileData = {
        ipk:              mahasiswa.ipk,
        current_semester: mahasiswa.current_semester,
        konsentrasi:      mahasiswa.konsentrasi || null,
        dosen_pa_id:      mahasiswa.dosen_pa_id,
        nama_dosen_pa:    mahasiswa.nama_dosen_pa  || null,
        nip_dosen_pa:     mahasiswa.nip_dosen_pa   || null,
        foto_dosen_pa:    mahasiswa.foto_dosen_pa  || null
      };
    }
  }

  if (user.role === 'dosen') {
    const dosen = await profileRepository.getDosenProfile(user.id);
    if (dosen) {
      profileData = {
        kode_kelas: dosen.kode_kelas
      };
    }
  }

  return profileData;
};

// ================= VALIDATE KODE KELAS =================
exports.validateKodeKelas = async ({ kode_kelas }) => {

  if (!kode_kelas || typeof kode_kelas !== 'string' || !kode_kelas.trim()) {
    throw { status: 400, message: "kode_kelas wajib diisi" };
  }

  const dosen = await profileRepository.findDosenByKode(kode_kelas.trim());

  if (!dosen) {
    throw { status: 404, message: "Kode kelas tidak ditemukan atau tidak valid" };
  }

  const dosenUser = await userRepository.findById(dosen.user_id);

  return {
    message: "Kode kelas valid",
    data: {
      kode_kelas: kode_kelas.trim(),
      dosen_pa: dosenUser ? dosenUser.name : null
    }
  };
};

// ================= LOGIN =================
exports.login = async ({ email, password, ip }) => {

  if (!email || !password) {
    throw { status: 400, message: "Email dan password wajib diisi" };
  }

  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw { status: 401, message: "Email atau password salah" };
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw { status: 401, message: "Email atau password salah" };
  }

  if (!user.is_verified) {
    throw { status: 403, message: "Akun Anda belum diverifikasi atau telah dinonaktifkan. Silakan cek email atau hubungi admin." };
  }

  const profileData = await buildProfileData(user);

  const token = jwt.generateToken({
    id: user.id,
    role: user.role
  });

  return {
    token,
    role: user.role,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      npm_nip: user.npm_nip,
      profile_picture: user.profile_picture,
      ...profileData
    }
  };
};

// ================= REGISTER MAHASISWA =================
exports.registerMahasiswa = async (payload, file) => {

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    payload = payload || {};
    payload.role = 'mahasiswa';

    const { error } = validateRegister(payload);
    if (error) {
      throw { status: 400, message: error.details[0].message };
    }

    const {
      name,
      email,
      password,
      npm_nip,
       kode_kelas,
       ipk,
       current_semester,
       konsentrasi
    } = payload;

    if (ipk === undefined || ipk === null || ipk === '' || ipk < 0 || ipk > 4) {
      throw { status: 400, message: "IPK tidak valid" };
    }

    if (!current_semester || current_semester < 1) {
      throw { status: 400, message: "Semester tidak valid" };
    }

    const admissionYear = getAdmissionYearFromNpm(npm_nip);
    if (!admissionYear) throw { status: 400, message: 'Tahun masuk tidak dapat dibaca dari NPM' };
    const curriculumYear = admissionYear >= 2025 ? 2025 : 2020;
    const curriculum = await profileRepository.findActiveCurriculumByYearTx(client, curriculumYear);
    if (!curriculum) throw { status: 400, message: 'Kurikulum yang ditentukan dari NPM belum tersedia' };
    if (Number(current_semester) >= 5 && !await profileRepository.hasConcentrationForCurriculumTx(client, curriculum.id, konsentrasi)) {
      throw { status: 400, message: 'Konsentrasi tidak sesuai dengan kurikulum mahasiswa' };
    }

    const existingEmail = await client.query(
      'SELECT id, is_verified FROM users WHERE email = $1 LIMIT 1', [email]
    );
    const existingEmailRow = existingEmail.rows[0];
    if (existingEmailRow) {
      if (existingEmailRow.is_verified) {
        throw { status: 400, message: "Email sudah digunakan" };
      }
      await client.query('DELETE FROM users WHERE id = $1 AND is_verified = FALSE', [existingEmailRow.id]);
    }

    const existingNPM = await client.query(
      'SELECT id, is_verified FROM users WHERE npm_nip = $1 LIMIT 1', [npm_nip]
    );
    const existingNPMRow = existingNPM.rows[0];
    if (existingNPMRow) {
      if (existingNPMRow.is_verified) {
        throw { status: 400, message: "NPM sudah digunakan" };
      }
      await client.query('DELETE FROM users WHERE id = $1 AND is_verified = FALSE', [existingNPMRow.id]);
    }

    const dosen = await profileRepository.findDosenByKode(kode_kelas);
    if (!dosen) {
      throw { status: 400, message: "Kode kelas tidak valid" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Upload foto HANYA setelah semua validasi lolos
    let profilePictureUrl = null;
    if (file) {
      profilePictureUrl = await uploadProfilePicture(file, npm_nip);
    }

    let user;
    try {
      user = await userRepository.createUserTx(client, {
        name,
        email,
        password: hashedPassword,
        role: 'mahasiswa',
        npm_nip,
        profile_picture: profilePictureUrl
      });
    } catch (dbErr) {
      // Jika DB insert gagal, hapus foto yang sudah terupload
      if (profilePictureUrl) {
        try {
          const url = new URL(profilePictureUrl);
          const objectPath = url.pathname.split('/').slice(2).join('/');

          if (process.env.STORAGE_TYPE === 'local') {
            const fs = require('fs');
            const path = require('path');
            const fullPath = path.join(__dirname, '../uploads', objectPath);
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
              console.log(`[Local Storage] Foto gagal di-rollback/dihapus: ${objectPath}`);
            }
          } else {
            await bucket.file(objectPath).delete();
            console.log(`[GCS] Foto berhasil di-rollback/dihapus: ${objectPath}`);
          }
        } catch (storageErr) {
          console.error('[Storage] Gagal hapus foto setelah DB error:', storageErr.message);
        }
      }
      throw dbErr;
    }

    await profileRepository.createMahasiswaTx(client, {
      user_id: user.id,
      angkatan: admissionYear,
      ipk,
      current_semester,
      konsentrasi: Number(current_semester) >= 5 ? konsentrasi : null,
      dosen_pa_id: dosen.user_id
    });
    await profileRepository.assignMahasiswaKurikulumTx(client, user.id, curriculum.id);

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await otpRepository.createOTPTx(client, user.id, code, 'register', expiresAt);

    await client.query('COMMIT');

    try {
      await sendOTPEmail(email, code, 'register');
    } catch (emailErr) {
      console.error('[Email] Gagal kirim OTP registrasi mahasiswa:', emailErr.message);
      // Tidak throw — user sudah terdaftar, bisa resend OTP
    }

    return {
      message: "Registrasi mahasiswa berhasil, OTP telah dikirim ke email"
    };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ================= REGISTER DOSEN =================
exports.registerDosen = async (payload, file) => {

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    payload = payload || {};
    payload.role = 'dosen';

    const { error } = validateRegister(payload);
    if (error) {
      throw { status: 400, message: error.details[0].message };
    }

    const { name, email, password, npm_nip } = payload;

    const existingEmailQ = await client.query(
      'SELECT id, is_verified FROM users WHERE email = $1 LIMIT 1', [email]
    );
    const existingEmailRow = existingEmailQ.rows[0];
    if (existingEmailRow) {
      if (existingEmailRow.is_verified) {
        throw { status: 400, message: "Email sudah digunakan" };
      }
      await client.query('DELETE FROM users WHERE id = $1 AND is_verified = FALSE', [existingEmailRow.id]);
    }

    const existingNIPQ = await client.query(
      'SELECT id, is_verified FROM users WHERE npm_nip = $1 LIMIT 1', [npm_nip]
    );
    const existingNIPRow = existingNIPQ.rows[0];
    if (existingNIPRow) {
      if (existingNIPRow.is_verified) {
        throw { status: 400, message: "NIP sudah digunakan" };
      }
      await client.query('DELETE FROM users WHERE id = $1 AND is_verified = FALSE', [existingNIPRow.id]);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let profilePictureUrl = null;
    if (file) {
      profilePictureUrl = await uploadProfilePicture(file, npm_nip);
    }

    let user;
    try {
      user = await userRepository.createUserTx(client, {
        name,
        email,
        password: hashedPassword,
        role: 'dosen',
        npm_nip,
        profile_picture: profilePictureUrl
      });
    } catch (dbErr) {
      // Jika DB insert gagal, hapus foto yang sudah terupload
      if (profilePictureUrl) {
        try {
          const url = new URL(profilePictureUrl);
          const objectPath = url.pathname.split('/').slice(2).join('/');

          if (process.env.STORAGE_TYPE === 'local') {
            const fs = require('fs');
            const path = require('path');
            const fullPath = path.join(__dirname, '../uploads', objectPath);
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
              console.log(`[Local Storage] Foto gagal di-rollback/dihapus: ${objectPath}`);
            }
          } else {
            await bucket.file(objectPath).delete();
            console.log(`[GCS] Foto berhasil di-rollback/dihapus: ${objectPath}`);
          }
        } catch (storageErr) {
          console.error('[Storage] Gagal hapus foto setelah DB error:', storageErr.message);
        }
      }
      throw dbErr;
    }

    // kode_kelas di-generate setelah OTP sukses
    await profileRepository.createDosenTx(client, {
      user_id: user.id,
      kode_kelas: null
    });

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await otpRepository.createOTPTx(client, user.id, code, 'register', expiresAt);

    await client.query('COMMIT');

    // Email dikirim SETELAH commit
    try {
      await sendOTPEmail(email, code, 'register');
    } catch (emailErr) {
      console.error('[Email] Gagal kirim OTP registrasi dosen:', emailErr.message);
    }

    return {
      message: "Registrasi dosen berhasil, OTP telah dikirim ke email"
    };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ================= VERIFY REGISTER OTP =================
exports.verifyRegisterOTP = async ({ email, code }) => {

  if (!email || !code) {
    throw { status: 400, message: "Email dan kode OTP wajib diisi" };
  }

  const user = await userRepository.findByEmail(email);
  if (!user) throw { status: 404, message: "User tidak ditemukan" };

  const otpData = await otpRepository.findOTPByUser(user.id, 'register');

  if (!otpData || otpData.expires_at < new Date()) {
    throw { status: 400, message: "OTP tidak valid atau expired" };
  }

  const normalizedCode = normalizeOTPCode(code);
  const isValid = await compareOTP(normalizedCode, otpData.code);

  if (!isValid) {
    throw { status: 400, message: "OTP tidak valid atau expired" };
  }

  await otpRepository.markAsUsed(otpData.id);
  await userRepository.verifyUser(user.id);

  const profileData = await buildProfileData(user);

  // Khusus dosen: generate kode_kelas setelah OTP sukses
  if (user.role === 'dosen') {
    let kodeKelas;
    let isUnique = false;
    while (!isUnique) {
      kodeKelas = 'DSN-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      const existing = await profileRepository.findDosenByKode(kodeKelas);
      if (!existing) isUnique = true;
    }
    await profileRepository.updateDosenKodeKelas(user.id, kodeKelas);
    profileData.kode_kelas = kodeKelas;
  }

  const token = jwt.generateToken({
    id: user.id,
    role: user.role
  });

  return {
    message: "Akun berhasil diverifikasi",
    token,
    role: user.role,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      npm_nip: user.npm_nip,
      profile_picture: user.profile_picture,
      ...profileData
    }
  };
};

// ================= RESEND OTP =================
exports.resendOTP = async ({ email, type }) => {

  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw { status: 404, message: "Email tidak terdaftar" };
  }

  if (!['register', 'reset_password'].includes(type)) {
    throw { status: 400, message: "Type OTP tidak valid" };
  }

  await otpRepository.invalidateOTP(user.id, type);

  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await otpRepository.createOTP(user.id, code, type, expiresAt);

  try {
    await sendOTPEmail(user.email, code, type);
  } catch (emailErr) {
    console.error('[Email] Gagal kirim ulang OTP:', emailErr.message);
  }

  return {
    message: "Jika email terdaftar, OTP akan dikirim ulang"
  };
};

// ================= FORGOT PASSWORD =================
exports.forgotPassword = async ({ email }) => {

  if (!email) {
    throw { status: 400, message: "Email wajib diisi" };
  }

  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw { status: 404, message: "Email tidak terdaftar" };
  }

  await otpRepository.invalidateOTP(user.id, 'reset_password');

  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await otpRepository.createOTP(user.id, code, 'reset_password', expiresAt);

  try {
    await sendOTPEmail(user.email, code, 'reset_password');
  } catch (emailErr) {
    console.error('[Email] Gagal kirim OTP forgot password:', emailErr.message);
  }

  return { message: "Jika email terdaftar, OTP akan dikirim ke email" };
};

// ================= VERIFY RESET OTP =================
exports.verifyResetOTP = async ({ email, code }) => {

  if (!email || !code) {
    throw { status: 400, message: "Email dan kode OTP wajib diisi" };
  }

  const user = await userRepository.findByEmail(email);
  if (!user) throw { status: 404, message: "User tidak ditemukan" };

  const otpData = await otpRepository.findOTPByUser(user.id, 'reset_password');

  if (!otpData || otpData.expires_at < new Date()) {
    throw { status: 400, message: "OTP tidak valid atau expired" };
  }

  const normalizedCode = normalizeOTPCode(code);
  const isValid = await compareOTP(normalizedCode, otpData.code);
  if (!isValid) {
    throw { status: 400, message: "OTP tidak valid atau expired" };
  }

  return { message: "OTP valid, silakan masukkan password baru" };
};

// ================= RESET PASSWORD =================
exports.resetPassword = async ({ email, code, new_password }) => {

  if (!email || !code || !new_password) {
    throw { status: 400, message: "Email, OTP, dan password baru wajib diisi" };
  }

  if (new_password.length < 6) {
    throw { status: 400, message: "Password minimal 6 karakter" };
  }

  const user = await userRepository.findByEmail(email);
  if (!user) throw { status: 404, message: "User tidak ditemukan" };

  const otpData = await otpRepository.findOTPByUser(user.id, 'reset_password');

  if (!otpData || otpData.expires_at < new Date()) {
    throw { status: 400, message: "OTP tidak valid atau expired" };
  }

  const normalizedCode = normalizeOTPCode(code);
  const isValid = await compareOTP(normalizedCode, otpData.code);
  if (!isValid) {
    throw { status: 400, message: "OTP tidak valid atau expired" };
  }

  await otpRepository.markAsUsed(otpData.id);

  const hashedPassword = await bcrypt.hash(new_password, 10);
  await userRepository.updatePassword(user.id, hashedPassword);

  return { message: "Password berhasil direset, silakan login" };
};

// ================= LOGOUT =================
// Token di-blacklist di Redis dengan TTL = sisa masa aktif token
exports.logout = async ({ token, exp }) => {

  const now = Math.floor(Date.now() / 1000);
  const ttl = exp - now;

  if (ttl > 0) {
    await redis.set(`blacklist:${token}`, '1', 'EX', ttl);
  }

  return { message: "Logout berhasil" };
};

// ================= CHANGE PASSWORD =================
exports.changePassword = async ({ userId, old_password, new_password }) => {

  if (!old_password || !new_password) {
    throw { status: 400, message: "Password lama dan baru wajib diisi" };
  }

  if (new_password.length < 6) {
    throw { status: 400, message: "Password baru minimal 6 karakter" };
  }

  const user = await userRepository.findById(userId);
  if (!user) throw { status: 404, message: "User tidak ditemukan" };

  const isMatch = await bcrypt.compare(old_password, user.password);
  if (!isMatch) {
    throw { status: 400, message: "Password lama tidak sesuai" };
  }

  const hashedPassword = await bcrypt.hash(new_password, 10);
  await userRepository.updatePassword(userId, hashedPassword);

  return { message: "Password berhasil diubah" };
};
