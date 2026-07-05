const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const dosenController = require('../controllers/dosen.controller');

// Semua endpoint hanya untuk dosen
const dosenOnly = [authenticate, authorize('dosen')];

// GET /dosen/mahasiswa — daftar mahasiswa bimbingan
router.get('/mahasiswa', ...dosenOnly, dosenController.getMahasiswaBimbingan);
router.get('/mahasiswa/:mahasiswaId/chatbot', ...dosenOnly, dosenController.getRiwayatChatbotMahasiswa);
router.get('/mahasiswa/:mahasiswaId/chatbot/:sessionId', ...dosenOnly, dosenController.getDetailChatbotMahasiswa);

// GET /dosen/mahasiswa/:mahasiswaId/detail — profil + dokumen
router.get('/mahasiswa/:mahasiswaId/detail', ...dosenOnly, dosenController.getMahasiswaDetail);

// GET /dosen/mahasiswa/:mahasiswaId/history-bimbingan — riwayat booking
router.get('/mahasiswa/:mahasiswaId/history-bimbingan', ...dosenOnly, dosenController.getRiwayatBimbingan);

// PATCH /dosen/bimbingan/:bookingId/keterangan — isi catatan/feedback dosen
router.patch('/bimbingan/:bookingId/keterangan', ...dosenOnly, dosenController.updateKeteranganDosen);

// GET /dosen/dashboard
router.get('/dashboard', ...dosenOnly, dosenController.getDashboard);

module.exports = router;
