const dosenService = require('../services/dosen.service');

// ================= GET DAFTAR MAHASISWA BIMBINGAN =================
exports.getMahasiswaBimbingan = async (req, res, next) => {
  try {
    const result = await dosenService.getMahasiswaBimbingan({ user: req.user });

    res.json({
      status: "success",
      message: "Berhasil mengambil daftar mahasiswa bimbingan",
      data: result
    });
  } catch (err) { next(err); }
};

// ================= GET DETAIL & DOKUMEN MAHASISWA =================
exports.getMahasiswaDetail = async (req, res, next) => {
  try {
    const result = await dosenService.getMahasiswaDetail({
      user: req.user,
      mahasiswaId: req.params.mahasiswaId
    });

    res.json({
      status: "success",
      message: "Berhasil mengambil detail mahasiswa",
      data: result
    });
  } catch (err) { next(err); }
};

// ================= GET RIWAYAT BIMBINGAN MAHASISWA =================
exports.getRiwayatBimbingan = async (req, res, next) => {
  try {
    const result = await dosenService.getRiwayatBimbingan({
      user: req.user,
      mahasiswaId: req.params.mahasiswaId
    });

    res.json({
      status: "success",
      message: "Berhasil mengambil riwayat bimbingan mahasiswa",
      data: result
    });
  } catch (err) { next(err); }
};

// ================= GET RIWAYAT CHATBOT MAHASISWA =================
exports.getRiwayatChatbotMahasiswa = async (req, res, next) => {
  try {
    const result = await dosenService.getRiwayatChatbotMahasiswa({
      user: req.user,
      mahasiswaId: req.params.mahasiswaId
    });

    res.json({
      status: "success",
      message: "Berhasil mengambil riwayat chatbot mahasiswa",
      data: result
    });
  } catch (err) { next(err); }
};

// ================= GET DETAIL CHATBOT MAHASISWA =================
exports.getDetailChatbotMahasiswa = async (req, res, next) => {
  try {
    const result = await dosenService.getDetailChatbotMahasiswa({
      user: req.user,
      mahasiswaId: req.params.mahasiswaId,
      sessionId: req.params.sessionId
    });

    res.json({
      status: "success",
      message: "Berhasil mengambil detail chatbot mahasiswa",
      data: result
    });
  } catch (err) { next(err); }
};

// ================= UPDATE KETERANGAN DOSEN =================
exports.updateKeteranganDosen = async (req, res, next) => {
  try {
    const result = await dosenService.updateKeteranganDosen({
      user: req.user,
      bookingId: req.params.bookingId,
      body: req.body
    });

    res.json({
      status: "success",
      message: result.message,
      data: null
    });
  } catch (err) { next(err); }
};

// ================= DASHBOARD =================
exports.getDashboard = async (req, res, next) => {
  try {
    const data = await dosenService.getDashboard({ user: req.user });
    res.status(200).json({
      status:  'success',
      message: 'Berhasil mengambil data dashboard dosen',
      data
    });
  } catch (err) { next(err); }
};
