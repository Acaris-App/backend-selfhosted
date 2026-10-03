const express = require('express');
const router = express.Router();
const graphController = require('../controllers/graph.controller');

// Visualization HTML Page (Public access for dashboard/inspector)
router.get('/visualizer', graphController.getGraphVisualizer);

// Graph Data Query (JSON nodes, edges, statistics)
router.get('/', graphController.getGraphData);
router.get('/stats', graphController.getGraphData);
router.get('/node/:id', graphController.getNodeDetails);

// Graph Mutations
router.post('/entity', graphController.createEntity);
router.post('/relation', graphController.createRelation);
router.post('/observation', graphController.createObservation);

// Sync operations
router.post('/sync/student/:npm', graphController.syncStudent);
router.post('/sync/all', graphController.syncAll);

module.exports = router;
