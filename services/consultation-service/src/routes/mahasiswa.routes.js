const express    = require('express');
const router     = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize }    = require('../middlewares/role.middleware');
const mahasiswaController = require('../controllers/mahasiswa.controller');

// ================= DASHBOARD =================
router.get('/dashboard', authenticate, authorize('mahasiswa'), mahasiswaController.getDashboard);

module.exports = router;
