const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/auth.middleware');
const { uploadPDF } = require('../config/multer');
const documentController = require('../controllers/document.controller');

router.get('/list', authenticate, documentController.getDocuments);

router.post('/upload', authenticate, uploadPDF.single('file'), documentController.upload);

router.put('/update/:document_id', authenticate, uploadPDF.single('file'), documentController.updateDocument);

router.delete('/delete/:document_id', authenticate, documentController.deleteDocument);

router.get('/check', authenticate, documentController.checkCompleteness);

// ================= PROTECTED DOWNLOAD ROUTES =================
const { serveAcademicDocument } = require('../utils/serve-document');
router.get('/uploads/documents/:filename', authenticate, serveAcademicDocument);
router.get('/uploads/:userId/:filename', authenticate, serveAcademicDocument);
router.get('/download/documents/:filename', authenticate, serveAcademicDocument);
router.get('/download/:userId/:filename', authenticate, serveAcademicDocument);

module.exports = router;
