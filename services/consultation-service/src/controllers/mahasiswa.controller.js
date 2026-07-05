const mahasiswaService = require('../services/mahasiswa.service');

// ================= DASHBOARD =================
exports.getDashboard = async (req, res, next) => {
  try {
    const data = await mahasiswaService.getDashboard({ user: req.user });
    res.status(200).json({
      status:  'success',
      message: 'Berhasil mengambil data dashboard',
      data
    });
  } catch (err) { next(err); }
};
