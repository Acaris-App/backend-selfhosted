const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { uploadImage } = require('../config/multer');

// ================= PROFILE =================

router.get('/profile', authenticate, userController.getMe);

router.put('/profile', authenticate, userController.updateProfileText);

router.post('/profile/photo', authenticate, uploadImage.single('profile_picture'), userController.updateProfilePhoto);

// ================= ROLE ACCESS =================

router.get('/mahasiswa', authenticate, authorize('mahasiswa'), (req, res) => {
  res.json({ status: "success", message: "Akses mahasiswa" });
});

router.get('/dosen', authenticate, authorize('dosen'), (req, res) => {
  res.json({ status: "success", message: "Akses dosen" });
});

router.get('/admin', authenticate, authorize('admin'), (req, res) => {
  res.json({ status: "success", message: "Akses admin" });
});

router.get('/dashboard', authenticate, authorize('admin', 'dosen'), (req, res) => {
  res.json({ status: "success", message: "Admin & Dosen bisa akses" });
});

module.exports = router;
