const userRepository = require('../repositories/user.repository');
const profileRepository = require('../repositories/profile.repository');
const documentRepository = require('../repositories/document.repository');
const { bucket } = require('../config/gcs');

// ================= HELPER GCS =================
const uploadProfilePicture = async (file, npm_nip) => {
  const ext = file.mimetype.split('/')[1];
  const filename = `${npm_nip}-${Date.now()}.${ext}`;

  if (process.env.STORAGE_TYPE === 'local') {
    const fs = require('fs');
    const path = require('path');
    const targetDir = path.resolve('/app/uploads/profile-pictures');
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.resolve(targetDir, filename), file.buffer);
    
    // Gunakan APP_URL utama untuk file_url agar bisa di-serve oleh Nginx gateway
    const host = process.env.APP_URL || 'https://marslabs.my.id/api/auth';
    return `${host}/uploads/profile-pictures/${filename}`;
  }

  const blob = bucket.file(`profile-pictures/${filename}`);

  const blobStream = blob.createWriteStream({
    resumable: false,
    contentType: file.mimetype
  });

  return new Promise((resolve, reject) => {
    blobStream.on('finish', () => {
      const url = `https://storage.googleapis.com/${bucket.name}/profile-pictures/${filename}`;
      resolve(url);
    });
    blobStream.on('error', reject);
    blobStream.end(file.buffer);
  });
};

// ================= HELPER: BUILD FULL PROFILE RESPONSE =================
// Dipakai oleh GET, PUT, dan POST photo — satu sumber kebenaran untuk struktur response
const isDokumenLengkap = ({ currentSemester, documents }) => {
  const semester = parseInt(currentSemester);
  if (!semester || semester < 1) return false;

  const hasTranskrip = Boolean(documents.transkrip);
  const krsSemesters = new Set(documents.krs.map(doc => parseInt(doc.semester)));
  const khsSemesters = new Set(documents.khs.map(doc => parseInt(doc.semester)));

  const completedSemesters = Math.max(semester - 1, 0);

  // Wajib memiliki KRS dan KHS untuk setiap semester dari 1 s.d. semester_berjalan - 1
  const hasRequiredDocs = Array.from({ length: completedSemesters }, (_, index) => index + 1)
    .every(requiredSemester => krsSemesters.has(requiredSemester) && khsSemesters.has(requiredSemester));

  return hasTranskrip && hasRequiredDocs;
};

const buildProfileResponse = async (userId, role) => {
  const user = await userRepository.findById(userId);
  if (!user) throw { status: 404, message: "User tidak ditemukan" };

  const responseData = {
    id:              user.id,
    name:            user.name,
    email:           user.email,
    npm_nip:         user.npm_nip,
    role:            user.role,
    profile_picture: user.profile_picture || null
  };

  if (role === 'mahasiswa') {
    const profile = await profileRepository.getMahasiswaProfile(userId);

    if (profile) {
      responseData.ipk              = profile.ipk;
      responseData.current_semester = profile.current_semester;
      responseData.konsentrasi      = profile.konsentrasi || null;
      responseData.dosen_pa_id      = profile.dosen_pa_id;
      responseData.nama_dosen_pa    = profile.nama_dosen_pa  || null;
      responseData.nip_dosen_pa     = profile.nip_dosen_pa   || null;
      responseData.foto_dosen_pa    = profile.foto_dosen_pa  || null;
    }

    const allDocs = await documentRepository.getDocumentsList(userId);
    const documents = { krs: [], khs: [], transkrip: null };

    for (const doc of allDocs) {
      if (doc.document_type === 'transkrip') {
        documents.transkrip = {
          id:          doc.id,
          file_path:   doc.file_path,
          uploaded_at: doc.uploaded_at
        };
      } else {
        documents[doc.document_type].push({
          id:          doc.id,
          semester:    doc.semester,
          file_path:   doc.file_path,
          uploaded_at: doc.uploaded_at
        });
      }
    }

    responseData.documents = documents;
    responseData.is_dokumen_lengkap = isDokumenLengkap({
      currentSemester: responseData.current_semester,
      documents
    });
  }

  if (role === 'dosen') {
    const profile = await profileRepository.getDosenProfile(userId);
    if (profile) {
      responseData.kode_kelas = profile.kode_kelas;
    }
  }

  return responseData;
};

// ================= 1. GET PROFILE (semua role) =================
exports.getMe = async (req, res, next) => {
  try {
    const { id, role } = req.user;
    const responseData = await buildProfileResponse(id, role);

    res.json({ status: "success", data: responseData });
  } catch (err) {
    next(err);
  }
};

// ================= 2. UPDATE DATA DIRI (semua role) =================
exports.updateProfileText = async (req, res, next) => {
  try {
    const { id, role } = req.user;
    const { name, npm_nip, ipk, current_semester, konsentrasi } = req.body;

    const hasUserField      = name !== undefined || npm_nip !== undefined;
    const hasMahasiswaField = ipk !== undefined || current_semester !== undefined || konsentrasi !== undefined;

    if (!hasUserField && !hasMahasiswaField) {
      return res.status(400).json({ status: "error", message: "Tidak ada data yang dikirim" });
    }

    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({ status: "error", message: "name tidak boleh kosong dan harus berupa teks" });
    }

    if (npm_nip !== undefined) {
      if (typeof npm_nip !== 'string' || !npm_nip.trim()) {
        return res.status(400).json({ status: "error", message: "npm_nip tidak boleh kosong dan harus berupa teks" });
      }
      const existing = await userRepository.findByNpm(npm_nip.trim());
      if (existing && existing.id !== id) {
        return res.status(400).json({ status: "error", message: "NPM/NIP sudah digunakan" });
      }
    }

    if (hasUserField) {
      await userRepository.updateProfileText(id, {
        name:    name    !== undefined ? name.trim()    : undefined,
        npm_nip: npm_nip !== undefined ? npm_nip.trim() : undefined
      });
    }

    if (role === 'mahasiswa' && hasMahasiswaField) {

      if (ipk !== undefined) {
        const ipkNum = parseFloat(ipk);
        if (isNaN(ipkNum) || ipkNum < 0 || ipkNum > 4) {
          return res.status(400).json({ status: "error", message: "IPK harus antara 0 dan 4" });
        }
      }

      const currentProfile = await profileRepository.getMahasiswaProfile(id);
      const semester = current_semester !== undefined ? parseInt(current_semester) : parseInt(currentProfile?.current_semester);
      if (current_semester !== undefined) {
        if (isNaN(semester) || semester < 1) {
          return res.status(400).json({ status: "error", message: "Semester minimal 1" });
        }
      }

      let concentration;
      if (semester >= 5) {
        concentration = typeof konsentrasi === 'string' ? konsentrasi.trim() : currentProfile?.konsentrasi;
        if (!concentration) return res.status(400).json({ status: "error", message: "Konsentrasi wajib diisi untuk semester 5 ke atas" });
        if (!await profileRepository.hasConcentrationForStudent(id, concentration)) {
          return res.status(400).json({ status: "error", message: "Konsentrasi tidak sesuai dengan kurikulum mahasiswa" });
        }
      } else if (konsentrasi !== undefined) concentration = null;

      await profileRepository.updateMahasiswaProfile(id, {
        ipk:              ipk              !== undefined ? parseFloat(ipk)            : undefined,
        current_semester: current_semester !== undefined ? semester : undefined,
        konsentrasi: concentration
      });
    }

    const responseData = await buildProfileResponse(id, role);

    res.json({
      status: "success",
      message: "Data diri berhasil diperbarui",
      data: responseData
    });
  } catch (err) {
    next(err);
  }
};

// ================= 3. UPDATE FOTO PROFIL (semua role) =================
exports.updateProfilePhoto = async (req, res, next) => {
  try {
    const { id, role } = req.user;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ status: "error", message: "File foto wajib diupload" });
    }

    const currentUser = await userRepository.findById(id);
    if (!currentUser) {
      return res.status(404).json({ status: "error", message: "User tidak ditemukan" });
    }

    const profilePictureUrl = await uploadProfilePicture(file, currentUser.npm_nip);
    await userRepository.updateProfilePhoto(id, profilePictureUrl);

    // Hapus foto lama dari GCS/Lokal (mencegah storage leak)
    if (currentUser.profile_picture) {
      if (process.env.STORAGE_TYPE === 'local') {
        try {
          const fs = require('fs');
          const path = require('path');
          const filename = path.basename(currentUser.profile_picture);
          const fullPath = path.resolve('/app/uploads/profile-pictures', filename);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            console.log(`[Local Storage] Foto profil lama dihapus: ${filename}`);
          }
        } catch (localErr) {
          console.error('[Local Storage] Gagal hapus foto lama:', localErr.message);
        }
      } else {
        try {
          const oldUrl = new URL(currentUser.profile_picture);
          const oldObjectPath = oldUrl.pathname.split('/').slice(2).join('/');
          await bucket.file(oldObjectPath).delete();
        } catch (gcsErr) {
          console.error('[GCS] Gagal hapus foto lama:', gcsErr.message);
        }
      }
    }

    const responseData = await buildProfileResponse(id, role);

    res.json({
      status: "success",
      message: "Foto profil berhasil diperbarui",
      data: responseData
    });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = exports.updateProfileText;
