const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const chatbotController = require('../controllers/chatbot.controller');
const graphController = require('../controllers/graph.controller');

// ================= ACARIS MEMORY GRAPH ENDPOINTS =================
// Visualizer Web UI (Interactive D3/Vis.js Network - Authenticated)
router.get('/graph/visualizer', authenticate, graphController.getGraphVisualizer);

// Graph Data & Subgraph Queries (Protected)
router.get('/graph', authenticate, graphController.getGraphData);
router.get('/graph/node/:id', authenticate, graphController.getNodeDetails);

// Graph Mutations & Data Sync (Admin & System only)
router.post('/graph/sync/all', authenticate, authorize('admin', 'system'), graphController.syncAll);
router.post('/graph/sync/student/:npm', authenticate, authorize('admin', 'dosen', 'system'), graphController.syncStudent);
router.post('/graph/entity', authenticate, authorize('admin', 'system'), graphController.createEntity);
router.post('/graph/relation', authenticate, authorize('admin', 'system'), graphController.createRelation);
router.post('/graph/observation', authenticate, authorize('admin', 'system'), graphController.createObservation);

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
