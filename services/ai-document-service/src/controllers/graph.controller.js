const fs = require('fs');
const path = require('path');
const graphService = require('../services/graph.service');

const visualizerHtmlPath = path.resolve(__dirname, '../views/graph_visualizer.html');

exports.getGraphData = async (req, res, next) => {
  try {
    const { npm, type, limit } = req.query;
    const data = await graphService.getGraphData({
      npm: npm ? String(npm).trim() : null,
      entity_type: type ? String(type).trim() : null,
      limit: limit ? parseInt(limit, 10) : 300
    });

    res.status(200).json({
      status: 'success',
      data
    });
  } catch (err) {
    next(err);
  }
};

exports.getGraphVisualizer = async (req, res, next) => {
  try {
    if (fs.existsSync(visualizerHtmlPath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).sendFile(visualizerHtmlPath);
    }
    res.status(404).send('Visualizer view template not found.');
  } catch (err) {
    next(err);
  }
};

exports.getNodeDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await graphService.getNodeDetails(parseInt(id, 10));

    res.status(200).json({
      status: 'success',
      data
    });
  } catch (err) {
    next(err);
  }
};

exports.createEntity = async (req, res, next) => {
  try {
    const result = await graphService.upsertEntity(req.body);
    res.status(201).json({
      status: 'success',
      message: 'Entitas graf berhasil disimpan',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

exports.createRelation = async (req, res, next) => {
  try {
    const result = await graphService.upsertRelation(req.body);
    res.status(201).json({
      status: 'success',
      message: 'Relasi graf berhasil disimpan',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

exports.createObservation = async (req, res, next) => {
  try {
    const result = await graphService.addObservation(req.body);
    res.status(201).json({
      status: 'success',
      message: 'Observasi graf berhasil dicatat',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

exports.syncStudent = async (req, res, next) => {
  try {
    const { npm } = req.params;
    const result = await graphService.syncStudentAcademicData(npm);
    res.status(200).json({
      status: 'success',
      message: `Mahasiswa ${npm} berhasil disinkronkan ke Memory Graph`,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

exports.syncAll = async (req, res, next) => {
  try {
    const result = await graphService.syncAllRelationalData();
    res.status(200).json({
      status: 'success',
      ...result
    });
  } catch (err) {
    next(err);
  }
};
