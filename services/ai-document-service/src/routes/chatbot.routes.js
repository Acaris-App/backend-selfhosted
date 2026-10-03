const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const chatbotController = require('../controllers/chatbot.controller');
const graphController = require('../controllers/graph.controller');

// ================= ACARIS MEMORY GRAPH ENDPOINTS =================
// Visualizer Web UI (Interactive D3/Vis.js Network)
router.get('/graph/visualizer', graphController.getGraphVisualizer);

// Graph Data & Subgraph Queries
router.get('/graph', graphController.getGraphData);
router.get('/graph/node/:id', graphController.getNodeDetails);

// Graph Mutations & Data Sync
router.post('/graph/sync/all', graphController.syncAll);
router.post('/graph/sync/student/:npm', graphController.syncStudent);
router.post('/graph/entity', graphController.createEntity);
router.post('/graph/relation', graphController.createRelation);
router.post('/graph/observation', graphController.createObservation);

// ================= EXISTING CHATBOT ENDPOINTS (100% UNCHANGED) =================

router.get('/session/active', authenticate, authorize('mahasiswa'), chatbotController.getActiveSession);
router.get('/history', authenticate, authorize('mahasiswa'), chatbotController.getHistory);
router.get('/history/:session_id', authenticate, authorize('mahasiswa'), chatbotController.getHistoryDetail);
router.post('/message', authenticate, authorize('mahasiswa'), chatbotController.sendMessage);
router.post('/message/stream', authenticate, authorize('mahasiswa'), chatbotController.streamMessage);
router.get('/stream', authenticate, authorize('mahasiswa'), chatbotController.streamMessage);
router.post('/session/:session_id/generate-summary', authenticate, authorize('mahasiswa'), chatbotController.generateSummary);
router.post('/session/:session_id/close', authenticate, authorize('mahasiswa'), chatbotController.closeSession);

// Legacy endpoint: POST /api/chat-bot
router.post('/', authenticate, authorize('mahasiswa'), chatbotController.sendLegacyMessage);

module.exports = router;
