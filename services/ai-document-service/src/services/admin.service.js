const bcrypt = require('bcrypt');
const adminRepository  = require('../repositories/admin.repository');
const documentRepository = require('../repositories/document.repository');
const chatbotRepository = require('../repositories/chatbot.repository');
const scheduleService = require('./schedule.service');
const { bucket } = require('../config/gcs');

const VALID_CATEGORIES = [
  'Peraturan Akademik',
  'Jadwal',
  'Kurikulum',
  'Peraturan Rektor',
  'KKNI',
  'Kalender Akademik'
];

// ================= ADMIN DASHBOARD =================
exports.getDashboard = async ({ user }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: "Hanya admin yang dapat mengakses endpoint ini" };
  }

  const [profile, stats, topDosen, topMahasiswa, topMahasiswaChatbot] = await Promise.all([
    adminRepository.getAdminDashboardProfile(user.id),
    adminRepository.getAdminDashboardStats(),
    adminRepository.getTopDosenBimbinganSemesterIni(),
    adminRepository.getTopMahasiswaBimbinganSemesterIni(),
    adminRepository.getTopMahasiswaChatbotSemesterIni()
  ]);

  if (!profile) {
    throw { status: 404, message: "Data admin tidak ditemukan" };
  }

  return {
    nama_admin: profile.nama_admin,
    nip_admin: profile.nip_admin,
    foto_admin: profile.foto_admin || null,
    total_mahasiswa: parseInt(stats.total_mahasiswa) || 0,
    total_dosen: parseInt(stats.total_dosen) || 0,
    total_bimbingan: parseInt(stats.total_bimbingan) || 0,
    total_chatbot: parseInt(stats.total_chatbot) || 0,
    top_dosen_bimbingan: topDosen.map(row => ({
      nama: row.nama,
      nip: row.nip,
      total: parseInt(row.total) || 0
    })),
    top_mahasiswa_bimbingan: topMahasiswa.map(row => ({
      nama: row.nama,
      npm: row.npm,
      total: parseInt(row.total) || 0
    })),
    top_mahasiswa_chatbot: topMahasiswaChatbot.map(row => ({
      nama: row.nama,
      npm: row.npm,
      total: parseInt(row.total) || 0
    }))
  };
};

// ================= HELPER GCS UPLOAD =================
const uploadToGCS = async (file, adminId) => {
  const originalName = file.originalname.replace(/\s+/g, '_');
  const filename = `knowledge-base/${adminId}-${Date.now()}-${originalName}`;

  if (process.env.STORAGE_TYPE === 'local') {
    const fs = require('fs');
    const path = require('path');
    const targetDir = path.resolve('/app/uploads/knowledge-base');
    fs.mkdirSync(targetDir, { recursive: true });
    
    const targetFilename = `${adminId}-${Date.now()}-${originalName}`;
    fs.writeFileSync(path.resolve(targetDir, targetFilename), file.buffer);
    
    const host = process.env.APP_URL || 'https://marslabs.my.id/api/document';
    return {
      file_name: originalName,
      file_url: `${host}/uploads/knowledge-base/${targetFilename}`
    };
  }

  const blob = bucket.file(filename);

  const blobStream = blob.createWriteStream({
    resumable: false,
    contentType: file.mimetype
  });

  return new Promise((resolve, reject) => {
    blobStream.on('finish', () => {
      resolve({
        file_name: originalName,
        file_url: `https://storage.googleapis.com/${bucket.name}/${filename}`
      });
    });
    blobStream.on('error', reject);
    blobStream.end(file.buffer);
  });
};

// ================= HELPER GCS DELETE =================
const deleteFromGCS = async (fileRef) => {
  if (process.env.STORAGE_TYPE === 'local') {
    try {
      const fs = require('fs');
      const path = require('path');
      
      let subfolder = 'knowledge-base';
      let filename;
      
      if (fileRef.includes('/uploads/profile-pictures/')) {
        subfolder = 'profile-pictures';
        filename = fileRef.split('/uploads/profile-pictures/')[1];
      } else if (fileRef.includes('/uploads/knowledge-base/')) {
        subfolder = 'knowledge-base';
        filename = fileRef.split('/uploads/knowledge-base/')[1];
      } else {
        filename = path.basename(fileRef);
      }
      
      const fullPath = path.resolve('/app/uploads', subfolder, filename);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log(`[Local Storage] File dihapus dari ${subfolder}: ${filename}`);
      }
    } catch (err) {
      console.error(`[Local Storage] Gagal hapus file local: ${err.message}`);
    }
    return;
  }

  try {
    let objectPath;
    if (fileRef.startsWith('https://')) {
      const url = new URL(fileRef);
      objectPath = url.pathname.split('/').slice(2).join('/');
    } else {
      objectPath = fileRef.startsWith('/') ? fileRef.slice(1) : fileRef;
    }
    await bucket.file(objectPath).delete();
  } catch (err) {
    console.error(`[GCS] Gagal hapus file: ${err.message}`);
  }
};

// ================= GET ALL =================
exports.getAllKnowledgeBase = async ({ user, query }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: "Hanya admin yang dapat mengakses endpoint ini" };
  }

  const { category, search } = query;

  if (category && !VALID_CATEGORIES.includes(category)) {
    throw { status: 400, message: `Category tidak valid. Pilihan: ${VALID_CATEGORIES.join(', ')}` };
  }

  const rows = await adminRepository.getAllKnowledgeBase({ category, search });

  return rows.map(r => ({
    id:          r.id,
    title:       r.title,
    file_name:   r.file_name,
    file_url:    r.file_url,
    category:    r.category,
    uploaded_at: r.uploaded_at,
    updated_at:  r.updated_at || null
  }));
};

// ================= CREATE =================
exports.createKnowledgeBase = async ({ user, body, file }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: "Hanya admin yang dapat mengakses endpoint ini" };
  }

  const { title, category } = body;

  if (!title) {
    throw { status: 400, message: "title wajib diisi" };
  }

  if (!category) {
    throw { status: 400, message: "category wajib diisi" };
  }

  if (!VALID_CATEGORIES.includes(category)) {
    throw { status: 400, message: `Category tidak valid. Pilihan: ${VALID_CATEGORIES.join(', ')}` };
  }

  if (!file) {
    throw { status: 400, message: "File wajib diupload" };
  }

  const { file_name, file_url } = await uploadToGCS(file, user.id);

  const row = await adminRepository.createKnowledgeBase({
    admin_id: user.id,
    title,
    file_name,
    file_url,
    category
  });

  if (category === 'Jadwal') {
    scheduleService.processSchedulePdf({
      knowledgeBaseId: row.id,
      uploadedBy: user.id,
      buffer: file.buffer
    }).then((result) => {
      console.log(`[Jadwal] Import jadwal ${row.id} versi ${result.versi} sukses: ${result.imported_items} baris`);
    }).catch((err) => {
      console.error(`[Jadwal] Gagal import jadwal ${row.id}: ${err.message}`);
    });
  }

  return {
    id:          row.id,
    title:       row.title,
    file_name:   row.file_name,
    file_url:    row.file_url,
    category:    row.category,
    uploaded_at: row.uploaded_at,
    updated_at:  row.updated_at || null
  };
};

// ================= UPDATE =================
exports.updateKnowledgeBase = async ({ user, id, body, file }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: "Hanya admin yang dapat mengakses endpoint ini" };
  }

  const existing = await adminRepository.findKnowledgeBaseById(id);
  if (!existing) throw { status: 404, message: "Knowledge base tidak ditemukan" };

  const { title, category } = body;

  if (category && !VALID_CATEGORIES.includes(category)) {
    throw { status: 400, message: `Category tidak valid. Pilihan: ${VALID_CATEGORIES.join(', ')}` };
  }

  let file_name = existing.file_name;
  let file_url  = existing.file_url;

  if (file) {
    const uploaded = await uploadToGCS(file, user.id);
    file_name = uploaded.file_name;
    file_url  = uploaded.file_url;
  }

  const updated = await adminRepository.updateKnowledgeBase(id, {
    title,
    category,
    file_name,
    file_url
  });

  // Hapus file lama dari GCS SETELAH DB update berhasil (mencegah data loss)
  if (file && existing.file_url) {
    await deleteFromGCS(existing.file_url);
  }

  return {
    id:          updated.id,
    title:       updated.title,
    file_name:   updated.file_name,
    file_url:    updated.file_url,
    category:    updated.category,
    uploaded_at: updated.uploaded_at,
    updated_at:  updated.updated_at || null
  };
};

// ================= DELETE =================
exports.deleteKnowledgeBase = async ({ user, id }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: "Hanya admin yang dapat mengakses endpoint ini" };
  }

  const existing = await adminRepository.findKnowledgeBaseById(id);
  if (!existing) throw { status: 404, message: "Knowledge base tidak ditemukan" };

  await adminRepository.deleteKnowledgeBase(id);

  const fileRef = existing.file_url || existing.file_path;
  if (fileRef) await deleteFromGCS(fileRef);

  return { message: "Dokumen berhasil dihapus" };
};

// ================= HELPER: FORMAT USER RESPONSE =================
const formatUser = (r) => ({
  id:                  r.id,
  name:                r.name,
  email:               r.email,
  role:                r.role,
  identifier:          r.npm_nip,
  status:              r.is_verified ? 'active' : 'inactive',
  profile_picture_url: r.profile_picture || null,
  konsentrasi:         r.konsentrasi || null,
  current_semester:    r.current_semester || null,
  ipk:                 r.ipk !== undefined ? r.ipk : null,
  dosen_pa:            r.dosen_pa_name || null,
  kode_kelas:          r.kode_kelas || null,
  total_bimbingan:     r.total_bimbingan !== undefined ? parseInt(r.total_bimbingan) : null,
  total_mahasiswa:     r.role === 'dosen' ? parseInt(r.total_mahasiswa) : null
});

// ================= HELPER GCS UPLOAD (profile picture) =================
const uploadProfilePicture = async (file, userId) => {
  const ext = file.originalname.split('.').pop().toLowerCase();
  const filename = `${userId}-${Date.now()}.${ext}`;

  if (process.env.STORAGE_TYPE === 'local') {
    const fs = require('fs');
    const path = require('path');
    const targetDir = path.join(__dirname, '../uploads/profile-pictures');
    fs.mkdirSync(targetDir, { recursive: true });
    
    fs.writeFileSync(path.join(targetDir, filename), file.buffer);
    
    const host = process.env.APP_URL || 'https://marslabs.my.id/api/document';
    return `${host}/uploads/profile-pictures/${filename}`;
  }

  const blob = bucket.file(`profile-pictures/${filename}`);

  const blobStream = blob.createWriteStream({
    resumable: false,
    contentType: file.mimetype
  });

  return new Promise((resolve, reject) => {
    blobStream.on('finish', () => {
      resolve(`https://storage.googleapis.com/${bucket.name}/profile-pictures/${filename}`);
    });
    blobStream.on('error', reject);
    blobStream.end(file.buffer);
  });
};

// ================= HELPER GCS UPLOAD (profile picture) =================
// ================= GET ALL USERS =================
exports.getAllUsers = async ({ user, query }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: "Hanya admin yang dapat mengakses endpoint ini" };
  }

  const { role, search, sort_by, page = 1, limit = 20, konsentrasi, ipk, kode_kelas } = query;

  const validRoles = ['mahasiswa', 'dosen', 'admin'];
  if (!role) throw { status: 400, message: "role wajib diisi (mahasiswa, dosen, admin)" };
  if (!validRoles.includes(role)) throw { status: 400, message: "role tidak valid" };

  const validSorts = ['name_asc', 'name_desc', 'identifier_asc', 'identifier_desc',
    'konsentrasi_asc', 'konsentrasi_desc', 'semester_asc', 'semester_desc'];
  if (sort_by && !validSorts.includes(sort_by)) {
    throw { status: 400, message: `sort_by tidak valid. Pilihan: ${validSorts.join(', ')}` };
  }

  const pageInt  = Math.max(1, parseInt(page)  || 1);
  const limitInt = Math.min(100, Math.max(1, parseInt(limit) || 20));

  const { rows, totalItems } = await adminRepository.getAllUsers({
    role, search, sort_by, page: pageInt, limit: limitInt, konsentrasi, ipk, kode_kelas
  });

  const totalPages = Math.ceil(totalItems / limitInt);

  return {
    meta: {
      current_page: pageInt,
      total_pages:  totalPages,
      total_items:  totalItems,
      limit:        limitInt
    },
    data: rows.map(formatUser)
  };
};

// ================= TAMBAH ADMIN =================
exports.createAdmin = async ({ user, body, file }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: "Hanya admin yang dapat mengakses endpoint ini" };
  }

  if (!body || typeof body !== 'object') {
    throw { status: 400, message: "Request body tidak terbaca. Pastikan Content-Type multipart/form-data dikirim dengan benar." };
  }

  const { name, email, password, identifier } = body;

  if (!name || !email || !password || !identifier) {
    throw { status: 400, message: "name, email, password, dan identifier wajib diisi" };
  }

  // Sanitasi: pastikan semua field bertipe string sebelum .trim()
  const safeName = String(name).trim();
  const safeEmail = String(email).trim();
  const safeIdentifier = String(identifier).trim();

  if (password.length < 6) {
    throw { status: 400, message: "Password minimal 6 karakter" };
  }

  const existingEmail = await adminRepository.findUserByEmail(safeEmail);
  if (existingEmail) throw { status: 400, message: "Email sudah terdaftar pada akun lain." };

  const existingNip = await adminRepository.findUserByNpm(safeIdentifier);
  if (existingNip) throw { status: 400, message: "Identifier sudah terdaftar pada akun lain." };

  const hashedPassword = await bcrypt.hash(password, 10);

  const created = await adminRepository.createAdmin({
    name:            safeName,
    email:           safeEmail,
    password:        hashedPassword,
    identifier:      safeIdentifier,
    profile_picture: null  // sementara null, akan di-update setelah upload
  });

  let profile_picture_url = null;
  if (file) {
    try {
      profile_picture_url = await uploadProfilePicture(file, created.id);
      await adminRepository.updateUser(created.id, { profile_picture: profile_picture_url });
    } catch (gcsErr) {
      // GCS gagal — admin tetap dibuat tapi tanpa foto
      console.error('[GCS] Gagal upload foto admin:', gcsErr.message);
    }
  }

  const full = await adminRepository.findUserById(created.id);
  return formatUser(full);
};

// ================= EDIT USER =================
exports.updateUser = async ({ user, userId, body, file }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: "Hanya admin yang dapat mengakses endpoint ini" };
  }

  if (!body || typeof body !== 'object') {
    throw { status: 400, message: "Request body tidak terbaca. Pastikan Content-Type multipart/form-data dikirim dengan benar." };
  }

  const { name, email, identifier, konsentrasi, current_semester, dosen_pa, kode_kelas, ipk } = body;

  if (!name || !email || !identifier) {
    throw { status: 400, message: "name, email, dan identifier wajib diisi" };
  }

  // Sanitasi: pastikan semua field bertipe string sebelum .trim()
  const safeName = String(name).trim();
  const safeEmail = String(email).trim();
  const safeIdentifier = String(identifier).trim();

  const target = await adminRepository.findUserById(userId);
  if (!target) throw { status: 404, message: "User tidak ditemukan" };

  const existingEmail = await adminRepository.findUserByEmail(safeEmail);
  if (existingEmail && existingEmail.id !== parseInt(userId)) {
    throw { status: 400, message: "Email sudah terdaftar pada akun lain." };
  }

  const existingNpm = await adminRepository.findUserByNpm(safeIdentifier);
  if (existingNpm && existingNpm.id !== parseInt(userId)) {
    throw { status: 400, message: "Identifier sudah terdaftar pada akun lain." };
  }

  // Handle profile picture
  let profile_picture = undefined;
  if (file) {
    const newUrl = await uploadProfilePicture(file, userId);
    if (target.profile_picture) await deleteFromGCS(target.profile_picture);
    profile_picture = newUrl;
  }

  await adminRepository.updateUser(userId, {
    name:            safeName,
    email:           safeEmail,
    npm_nip:         safeIdentifier,
    profile_picture
  });

  // Update data mahasiswa
  if (target.role === 'mahasiswa') {
    const mahasiswaUpdate = {
      current_semester: current_semester ? parseInt(current_semester) : undefined,
      ipk:              ipk !== undefined && ipk !== '' ? parseFloat(ipk) : undefined,
    };

    // Validasi & set konsentrasi terhadap kurikulum mahasiswa
    if (konsentrasi !== undefined && konsentrasi !== '') {
      const trimmedKonsentrasi = String(konsentrasi).trim();
      const valid = await adminRepository.hasConcentrationForStudent(userId, trimmedKonsentrasi);
      if (!valid) throw { status: 400, message: 'Konsentrasi tidak sesuai dengan kurikulum mahasiswa' };
      mahasiswaUpdate.konsentrasi = trimmedKonsentrasi;
    }

    // Resolve kode_kelas → dosen_pa_id
    if (kode_kelas !== undefined && kode_kelas !== '') {
      const dosenPa = await adminRepository.findDosenPaByKode(kode_kelas.trim());
      if (!dosenPa) {
        throw { status: 400, message: `Kode kelas '${kode_kelas}' tidak ditemukan` };
      }

      const oldDosenPaId = target.dosen_pa_id || null;
      const newDosenPaId = dosenPa.user_id;

      // Jika dosen PA berubah → cancel semua booking pending ke dosen lama
      if (oldDosenPaId && oldDosenPaId !== newDosenPaId) {
        await adminRepository.cancelPendingBookings(userId, oldDosenPaId);
      }

      mahasiswaUpdate.dosen_pa_id = newDosenPaId;
    }

    await adminRepository.updateMahasiswaData(userId, mahasiswaUpdate);
  }

  // Update kode_kelas untuk dosen
  if (target.role === 'dosen' && kode_kelas !== undefined) {
    const trimmedKode = kode_kelas.trim();
    if (trimmedKode) {
      const existing = await adminRepository.findDosenPaByKode(trimmedKode);
      if (existing && existing.user_id !== parseInt(userId)) {
        throw { status: 400, message: `Kode kelas '${trimmedKode}' sudah digunakan oleh dosen lain` };
      }
    }
    await adminRepository.updateKodeKelas(userId, 'dosen', trimmedKode);
  }

  const updated = await adminRepository.findUserById(userId);
  return formatUser(updated);
};

// ================= UPDATE STATUS =================
exports.updateUserStatus = async ({ user, userId, body }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: "Hanya admin yang dapat mengakses endpoint ini" };
  }

  if (user.id === parseInt(userId)) {
    throw { status: 400, message: "Admin tidak dapat mengubah status akunnya sendiri" };
  }

  const { is_active } = body;

  if (is_active === undefined || is_active === null || is_active === '') {
    throw { status: 400, message: "is_active wajib diisi (true/false)" };
  }

  // Parse eksplisit: string "false" dari Android harus dibaca sebagai boolean false
  let isActiveBool;
  if (typeof is_active === 'boolean') {
    isActiveBool = is_active;
  } else if (typeof is_active === 'string') {
    isActiveBool = is_active.toLowerCase() === 'true' || is_active === '1';
  } else {
    isActiveBool = Boolean(is_active);
  }

  const target = await adminRepository.findUserById(userId);
  if (!target) throw { status: 404, message: "User tidak ditemukan" };

  await adminRepository.updateUserStatus(userId, isActiveBool);
};

// ================= DELETE USER =================
exports.deleteUser = async ({ user, userId }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: "Hanya admin yang dapat mengakses endpoint ini" };
  }

  if (user.id === parseInt(userId)) {
    throw { status: 400, message: "Tidak dapat menghapus akun Anda sendiri" };
  }

  const target = await adminRepository.findUserById(userId);
  if (!target) throw { status: 404, message: "User tidak ditemukan" };

  await adminRepository.deleteUser(userId);
};

// ================= GET ALL DOCUMENTS =================
exports.getAllDocuments = async ({ user, query }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: "Hanya admin yang dapat mengakses endpoint ini" };
  }

  const { document_type, semester, user_id } = query;

  const filters = {};
  if (document_type) filters.document_type = document_type;
  if (semester) filters.semester = semester;
  if (user_id) filters.user_id = user_id;

  const rows = await adminRepository.getAllDocuments(filters);

  return rows.map(r => ({
    id:              r.id,
    document_type:   r.document_type,
    semester:        r.semester === 0 ? null : r.semester,
    file_path:       r.file_path,
    uploaded_at:     r.uploaded_at,
    mahasiswa: {
      id:               r.mahasiswa_id,
      name:             r.mahasiswa_name,
      npm_nip:          r.npm_nip,
      angkatan:         r.angkatan,
      current_semester: r.current_semester
    }
  }));
};

// ================= GET STATISTIK DOKUMEN =================
exports.getDocumentStats = async ({ user }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: "Hanya admin yang dapat mengakses endpoint ini" };
  }

  const stats = await adminRepository.getDocumentStats();

  return {
    total_mahasiswa:  parseInt(stats.total_mahasiswa),
    total_krs:        parseInt(stats.total_krs),
    total_khs:        parseInt(stats.total_khs),
    total_transkrip:  parseInt(stats.total_transkrip)
  };
};

// ================= GET DOCUMENTS BY USER (ADMIN) =================
exports.getDocumentsByUser = async ({ user, userId }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: 'Hanya admin yang dapat mengakses endpoint ini' };
  }

  const target = await adminRepository.findUserById(userId);
  if (!target) throw { status: 404, message: 'Pengguna tidak ditemukan' };

  const docs = await documentRepository.getDocumentsByUserId(userId);
  return docs;
};

// ================= CREATE DOCUMENT BY ADMIN =================
exports.createDocumentAdmin = async ({ user, userId, body, file }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: 'Hanya admin yang dapat mengakses endpoint ini' };
  }

  const target = await adminRepository.findUserById(userId);
  if (!target) throw { status: 404, message: 'Pengguna tidak ditemukan' };

  const { document_type, semester } = body;

  if (!document_type) throw { status: 400, message: 'document_type wajib diisi' };

  const allowedTypes = ['krs', 'khs', 'transkrip'];
  if (!allowedTypes.includes(document_type)) {
    throw { status: 400, message: `document_type tidak valid. Pilihan: ${allowedTypes.join(', ')}` };
  }

  if (!file)          throw { status: 400, message: 'File wajib diupload' };

  // Parse semester: default 0 jika kosong (konsisten dengan DEFAULT DB)
  const semesterInt = (semester !== undefined && semester !== null && semester !== '')
    ? parseInt(semester)
    : 0;

  const { file_url } = await uploadToGCS(file, userId);

  let doc;
  try {
    doc = await documentRepository.createDocumentAdmin({
      user_id:       userId,
      document_type,
      semester:      semesterInt,
      file_path:     file_url,
    });
  } catch (dbErr) {
    // DB gagal → rollback file dari GCS
    await deleteFromGCS(file_url);
    throw dbErr;
  }

  return doc;
};

// ================= UPDATE DOCUMENT BY ADMIN =================
exports.updateDocumentAdmin = async ({ user, documentId, body, file }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: 'Hanya admin yang dapat mengakses endpoint ini' };
  }

  const existing = await documentRepository.findByIdAdmin(documentId);
  if (!existing) throw { status: 404, message: 'Dokumen tidak ditemukan' };

  const updateData = {};

  // semester nullable — jika dikirim string kosong atau null, set null
  if (body.semester !== undefined) {
    const raw = body.semester;
    updateData.semester = (raw === '' || raw === null) ? null : parseInt(raw);
  }

  if (file) {
    const { file_url } = await uploadToGCS(file, existing.user_id);
    updateData.file_path = file_url;
  }

  if (Object.keys(updateData).length === 0) {
    throw { status: 400, message: 'Tidak ada data yang diperbarui' };
  }

  const updated = await documentRepository.updateDocumentAdmin(documentId, updateData);

  // Hapus file lama dari GCS SETELAH DB update berhasil (mencegah data loss)
  if (file && existing.file_path) {
    await deleteFromGCS(existing.file_path);
  }

  return updated;
};

// ================= DELETE DOCUMENT BY ADMIN =================
exports.deleteDocumentAdmin = async ({ user, documentId }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: 'Hanya admin yang dapat mengakses endpoint ini' };
  }

  const existing = await documentRepository.findByIdAdmin(documentId);
  if (!existing) throw { status: 404, message: 'Dokumen tidak ditemukan' };

  await documentRepository.deleteDocumentAdmin(documentId);
  await deleteFromGCS(existing.file_path);
};

// ================= GET RIWAYAT BIMBINGAN (ADMIN) =================
exports.getRiwayatBimbinganAdmin = async ({ user, mahasiswaId }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: 'Hanya admin yang dapat mengakses endpoint ini' };
  }

  const target = await adminRepository.findUserById(mahasiswaId);
  if (!target) throw { status: 404, message: 'Pengguna tidak ditemukan' };
  if (target.role !== 'mahasiswa') throw { status: 400, message: 'ID yang diberikan bukan mahasiswa' };

  const rows = await adminRepository.getRiwayatBimbinganAdmin(mahasiswaId);

  const BULAN = [
    'Januari','Februari','Maret','April','Mei','Juni',
    'Juli','Agustus','September','Oktober','November','Desember'
  ];

  const now = new Date().setHours(0, 0, 0, 0);

  return rows.map(row => {
    const tanggal = new Date(row.tanggal);
    const d = tanggal.getDate();
    const m = BULAN[tanggal.getMonth()];
    const y = tanggal.getFullYear();
    const dateFormatted = `${d} ${m} ${y}`;
    const timeFormatted = `${row.waktu_mulai.slice(0, 5)} WIB`;

    let status;
    if (row.booking_status === 'dibatalkan') {
      status = 'dibatalkan';
    } else if (tanggal < now) {
      status = 'selesai';
    } else {
      status = 'dijadwalkan';
    }

    return {
      id:              row.booking_id,
      date:            dateFormatted,
      time:            timeFormatted,
      agenda:          row.agenda || null,
      status,
      keterangan:      row.keterangan_dosen || null
    };
  });
};

// ================= GET RIWAYAT CHATBOT MAHASISWA (ADMIN) =================
exports.getRiwayatChatbotMahasiswa = async ({ user, mahasiswaId }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: 'Hanya admin yang dapat mengakses endpoint ini' };
  }

  const target = await adminRepository.findUserById(mahasiswaId);
  if (!target) throw { status: 404, message: 'Pengguna tidak ditemukan' };
  if (target.role !== 'mahasiswa') throw { status: 400, message: 'ID yang diberikan bukan mahasiswa' };

  const sessions = await chatbotRepository.getClosedSessionsByUser(mahasiswaId);
  return sessions.map((session) => ({
    session_id: session.id,
    summary: session.final_summary || null,
    created_at: session.created_at,
    status: 'completed'
  }));
};

// ================= GET DETAIL CHATBOT MAHASISWA (ADMIN) =================
exports.getDetailChatbotMahasiswa = async ({ user, mahasiswaId, sessionId }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: 'Hanya admin yang dapat mengakses endpoint ini' };
  }

  const target = await adminRepository.findUserById(mahasiswaId);
  if (!target) throw { status: 404, message: 'Pengguna tidak ditemukan' };
  if (target.role !== 'mahasiswa') throw { status: 400, message: 'ID yang diberikan bukan mahasiswa' };

  const session = await chatbotRepository.findClosedSessionByIdForUser(sessionId, mahasiswaId);
  if (!session) {
    throw { status: 404, message: 'Riwayat chatbot tidak ditemukan' };
  }

  const messages = await chatbotRepository.getMessagesBySession(session.id);
  return {
    session_id: session.id,
    is_active: false,
    summary: session.final_summary || null,
    messages
  };
};

// ================= GET ALL KODE KELAS =================
exports.getAllKodeKelas = async ({ user }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: 'Hanya admin yang dapat mengakses endpoint ini' };
  }
  return await adminRepository.getAllKodeKelas();
};

exports.getSchedule = async ({ user }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: 'Hanya admin yang dapat mengakses endpoint ini' };
  }
  return await scheduleService.getActiveSchedule();
};
