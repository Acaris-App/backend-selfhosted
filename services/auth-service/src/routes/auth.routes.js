const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { uploadImage } = require('../config/multer');
const { authenticate } = require('../middlewares/auth.middleware');
const { loginLimiter, otpLimiter, resendLimiter } = require('../middlewares/rateLimit.middleware');

// ================= AUTH =================

router.post('/login', loginLimiter, authController.login);

// Validasi kode kelas — step 1 multi-step register Android
router.post('/validate-kode-kelas', authController.validateKodeKelas);

// Register Mahasiswa (profile picture opsional, multipart/form-data)
router.post('/register/mahasiswa', uploadImage.single('profile_picture'), authController.registerMahasiswa);

// Register Dosen (profile picture opsional, multipart/form-data)
router.post('/register/dosen', uploadImage.single('profile_picture'), authController.registerDosen);

router.post('/verify-register-otp', otpLimiter, authController.verifyRegisterOTP);

router.post('/resend-otp', resendLimiter, authController.resendOTP);

router.post('/forgot-password', authController.forgotPassword);

// Verifikasi OTP reset password — step 2, sebelum input password baru
router.post('/verify-reset-otp', otpLimiter, authController.verifyResetOTP);

router.post('/reset-password', authController.resetPassword);

router.post('/change-password', authenticate, authController.changePassword);

router.post('/logout', authenticate, authController.logout);

module.exports = router;
