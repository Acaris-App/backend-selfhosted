const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { uploadPDF, uploadPDFLarge, uploadImage } = require('../config/multer');
const adminController = require('../controllers/admin.controller');

const adminOnly = [authenticate, authorize('admin')];

router.get('/dashboard', ...adminOnly, adminController.getDashboard);

router.get('/knowledge-base', ...adminOnly, adminController.getAllKnowledgeBase);

router.post('/knowledge-base', ...adminOnly, uploadPDFLarge.single('file'), adminController.createKnowledgeBase);

router.put('/knowledge-base/:id', ...adminOnly, uploadPDFLarge.single('file'), adminController.updateKnowledgeBase);

router.delete('/knowledge-base/:id', ...adminOnly, adminController.deleteKnowledgeBase);

router.get('/users', ...adminOnly, adminController.getAllUsers);

router.post('/users/admin', ...adminOnly, uploadImage.single('profile_picture'), adminController.createAdmin);

router.put('/users/:id', ...adminOnly, uploadImage.single('profile_picture'), adminController.updateUser);

router.patch('/users/:id/status', ...adminOnly, adminController.updateUserStatus);

router.delete('/users/:id', ...adminOnly, adminController.deleteUser);

router.get('/documents', ...adminOnly, adminController.getAllDocuments);

router.get('/documents/stats', ...adminOnly, adminController.getDocumentStats);

// Dokumen per user
router.get('/users/:userId/documents',                ...adminOnly, adminController.getDocumentsByUser);
router.post('/users/:userId/documents',               ...adminOnly, uploadPDF.single('file'), adminController.createDocumentAdmin);
router.put('/documents/:documentId',                  ...adminOnly, uploadPDF.single('file'), adminController.updateDocumentAdmin);
router.delete('/documents/:documentId',               ...adminOnly, adminController.deleteDocumentAdmin);

router.get('/users/:id/chatbot', ...adminOnly, adminController.getRiwayatChatbotMahasiswa);
router.get('/users/:id/chatbot/:sessionId', ...adminOnly, adminController.getDetailChatbotMahasiswa);
router.get('/users/:id/bimbingan', ...adminOnly, adminController.getRiwayatBimbinganAdmin);

router.get('/classes', ...adminOnly, adminController.getAllKodeKelas);

router.get('/schedule', ...adminOnly, adminController.getSchedule);

module.exports = router;
