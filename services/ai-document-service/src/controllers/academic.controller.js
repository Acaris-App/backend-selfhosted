const academicService = require('../services/academic.service');

exports.importKhs = async (req, res, next) => {
  try {
    const data = await academicService.importKhs({
      documentId: Number(req.body.document_id),
      payload: req.body.result || req.body.extraction || req.body.data || req.body
    });
    res.status(200).json({ status: 'success', data });
  } catch (error) { next(error); }
};

exports.importCurriculum = async (req, res, next) => {
  try {
    const data = await academicService.importCurriculum({
      knowledgeBaseId: Number(req.body.knowledge_base_id),
      payload: req.body.result || req.body.extraction || req.body.data || req.body
    });
    res.status(200).json({ status: 'success', data });
  } catch (error) { next(error); }
};

exports.summary = async (req, res, next) => {
  try { res.json({ status: 'success', data: await academicService.getSummary({ user: req.user }) }); }
  catch (error) { next(error); }
};

exports.courses = async (req, res, next) => {
  try { res.json({ status: 'success', data: await academicService.getCourses({ user: req.user }) }); }
  catch (error) { next(error); }
};

exports.recommendations = async (req, res, next) => {
  try { res.json({ status: 'success', data: await academicService.getRecommendations({ user: req.user }) }); }
  catch (error) { next(error); }
};
