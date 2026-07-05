const adminService = require('../services/admin.service');

exports.getDashboard = async (req, res, next) => {
  try {
    const data = await adminService.getDashboard({ user: req.user });
    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil data dashboard admin",
      data
    });
  } catch (err) { next(err); }
};

exports.getAllKnowledgeBase = async (req, res, next) => {
  try {
    const data = await adminService.getAllKnowledgeBase({ user: req.user, query: req.query });
    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil data knowledge base",
      data
    });
  } catch (err) { next(err); }
};

exports.createKnowledgeBase = async (req, res, next) => {
  try {
    const data = await adminService.createKnowledgeBase({ user: req.user, body: req.body, file: req.file });
    res.status(201).json({
      status: "success",
      message: "Dokumen berhasil diunggah dan sedang diproses AI",
      data
    });
  } catch (err) { next(err); }
};

exports.updateKnowledgeBase = async (req, res, next) => {
  try {
    const data = await adminService.updateKnowledgeBase({ user: req.user, id: req.params.id, body: req.body, file: req.file });
    res.status(200).json({
      status: "success",
      message: "Data dokumen berhasil diperbarui",
      data
    });
  } catch (err) { next(err); }
};

exports.deleteKnowledgeBase = async (req, res, next) => {
  try {
    await adminService.deleteKnowledgeBase({ user: req.user, id: req.params.id });
    res.status(200).json({
      status: "success",
      message: "Dokumen berhasil dihapus",
      data: null
    });
  } catch (err) { next(err); }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    const result = await adminService.getAllUsers({ user: req.user, query: req.query });
    res.json({
      status: "success",
      message: "Berhasil mengambil data pengguna",
      meta: result.meta,
      data: result.data
    });
  } catch (err) { next(err); }
};

exports.createAdmin = async (req, res, next) => {
  try {
    const result = await adminService.createAdmin({ user: req.user, body: req.body, file: req.file });
    res.status(201).json({ status: "success", message: "Admin berhasil ditambahkan", data: result });
  } catch (err) { next(err); }
};

exports.updateUser = async (req, res, next) => {
  try {
    const result = await adminService.updateUser({ user: req.user, userId: req.params.id, body: req.body, file: req.file });
    res.json({ status: "success", message: "Data pengguna berhasil diperbarui", data: result });
  } catch (err) { next(err); }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    await adminService.updateUserStatus({ user: req.user, userId: req.params.id, body: req.body });
    res.json({ status: "success", message: "Status pengguna berhasil diubah", data: null });
  } catch (err) { next(err); }
};

exports.deleteUser = async (req, res, next) => {
  try {
    await adminService.deleteUser({ user: req.user, userId: req.params.id });
    res.json({ status: "success", message: "Pengguna berhasil dihapus secara permanen", data: null });
  } catch (err) { next(err); }
};

exports.getAllDocuments = async (req, res, next) => {
  try {
    const result = await adminService.getAllDocuments({ user: req.user, query: req.query });
    res.json({ status: "success", message: "Data dokumen berhasil diambil", data: result });
  } catch (err) { next(err); }
};

exports.getDocumentStats = async (req, res, next) => {
  try {
    const result = await adminService.getDocumentStats({ user: req.user });
    res.json({ status: "success", message: "Statistik dokumen berhasil diambil", data: result });
  } catch (err) { next(err); }
};

// ================= GET DOCUMENTS BY USER =================
exports.getDocumentsByUser = async (req, res, next) => {
  try {
    const data = await adminService.getDocumentsByUser({ user: req.user, userId: req.params.userId });
    res.status(200).json({ status: 'success', message: 'Berhasil mengambil dokumen', data });
  } catch (err) { next(err); }
};

// ================= CREATE DOCUMENT =================
exports.createDocumentAdmin = async (req, res, next) => {
  try {
    const data = await adminService.createDocumentAdmin({ user: req.user, userId: req.params.userId, body: req.body, file: req.file });
    res.status(201).json({ status: 'success', message: 'Dokumen berhasil diunggah', data });
  } catch (err) { next(err); }
};

// ================= UPDATE DOCUMENT =================
exports.updateDocumentAdmin = async (req, res, next) => {
  try {
    const data = await adminService.updateDocumentAdmin({ user: req.user, documentId: req.params.documentId, body: req.body, file: req.file });
    res.status(200).json({ status: 'success', message: 'Dokumen berhasil diperbarui', data });
  } catch (err) { next(err); }
};

// ================= DELETE DOCUMENT =================
exports.deleteDocumentAdmin = async (req, res, next) => {
  try {
    await adminService.deleteDocumentAdmin({ user: req.user, documentId: req.params.documentId });
    res.status(200).json({ status: 'success', message: 'Dokumen berhasil dihapus', data: null });
  } catch (err) { next(err); }
};

// ================= GET RIWAYAT BIMBINGAN MAHASISWA =================
exports.getRiwayatBimbinganAdmin = async (req, res, next) => {
  try {
    const data = await adminService.getRiwayatBimbinganAdmin({ user: req.user, mahasiswaId: req.params.id });
    res.status(200).json({ status: 'success', message: 'Berhasil mengambil data riwayat bimbingan.', data });
  } catch (err) { next(err); }
};

// ================= GET RIWAYAT CHATBOT MAHASISWA =================
exports.getRiwayatChatbotMahasiswa = async (req, res, next) => {
  try {
    const data = await adminService.getRiwayatChatbotMahasiswa({
      user: req.user,
      mahasiswaId: req.params.id
    });

    res.status(200).json({
      status: 'success',
      message: 'Berhasil mengambil riwayat chatbot mahasiswa',
      data
    });
  } catch (err) { next(err); }
};

// ================= GET DETAIL CHATBOT MAHASISWA =================
exports.getDetailChatbotMahasiswa = async (req, res, next) => {
  try {
    const data = await adminService.getDetailChatbotMahasiswa({
      user: req.user,
      mahasiswaId: req.params.id,
      sessionId: req.params.sessionId
    });

    res.status(200).json({
      status: 'success',
      message: 'Berhasil mengambil detail chatbot mahasiswa',
      data
    });
  } catch (err) { next(err); }
};

// ================= GET ALL KODE KELAS =================
exports.getAllKodeKelas = async (req, res, next) => {
  try {
    const data = await adminService.getAllKodeKelas({ user: req.user });
    res.status(200).json({ status: 'success', message: 'Berhasil mengambil daftar kode kelas', data });
  } catch (err) { next(err); }
};
