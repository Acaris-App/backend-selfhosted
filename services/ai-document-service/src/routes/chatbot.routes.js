const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const chatbotController = require('../controllers/chatbot.controller');

router.get('/session/active', authenticate, authorize('mahasiswa'), chatbotController.getActiveSession);
router.get('/history', authenticate, authorize('mahasiswa'), chatbotController.getHistory);
router.get('/history/:session_id', authenticate, authorize('mahasiswa'), chatbotController.getHistoryDetail);
router.post('/message', authenticate, authorize('mahasiswa'), chatbotController.sendMessage);
router.post('/session/:session_id/generate-summary', authenticate, authorize('mahasiswa'), chatbotController.generateSummary);
router.post('/session/:session_id/close', authenticate, authorize('mahasiswa'), chatbotController.closeSession);

// Legacy endpoint: POST /api/chat-bot
router.post('/', authenticate, authorize('mahasiswa'), chatbotController.sendLegacyMessage);

module.exports = router;
