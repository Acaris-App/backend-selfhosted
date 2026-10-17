const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const graphController = require('../controllers/graph.controller');

// Require authentication for ALL graph endpoints (Zero Unauthenticated Access)
router.use(authenticate);

// Visualization & Inspection (Authenticated users only)
router.get('/visualizer', graphController.getGraphVisualizer);
router.get('/', graphController.getGraphData);
router.get('/stats', graphController.getGraphData);
router.get('/node/:id', graphController.getNodeDetails);

// Mutations & Sync (Admin & System only)
router.post('/entity', authorize('admin', 'system'), graphController.createEntity);
router.post('/relation', authorize('admin', 'system'), graphController.createRelation);
router.post('/observation', authorize('admin', 'system'), graphController.createObservation);
router.post('/sync/student/:npm', authorize('admin', 'dosen', 'system'), graphController.syncStudent);
router.post('/sync/all', authorize('admin', 'system'), graphController.syncAll);

module.exports = router;
