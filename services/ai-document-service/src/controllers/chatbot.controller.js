const chatbotService = require('../services/chatbot.service');

exports.getActiveSession = async (req, res, next) => {
  try {
    const result = await chatbotService.getActiveSession({
      user: req.user
    });

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (err) { next(err); }
};

exports.getHistory = async (req, res, next) => {
  try {
    const data = await chatbotService.getHistory({
      user: req.user
    });

    res.status(200).json({
      status: 'success',
      message: 'Berhasil mengambil riwayat obrolan',
      data
    });
  } catch (err) { next(err); }
};

exports.getHistoryDetail = async (req, res, next) => {
  try {
    const data = await chatbotService.getHistoryDetail({
      user: req.user,
      sessionId: req.params.session_id
    });

    res.status(200).json({
      status: 'success',
      message: 'Berhasil mengambil detail riwayat',
      data
    });
  } catch (err) { next(err); }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const result = await chatbotService.sendMessage({
      user: req.user,
      body: req.body
    });

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (err) { next(err); }
};

exports.sendLegacyMessage = async (req, res, next) => {
  try {
    const result = await chatbotService.sendLegacyMessage({
      user: req.user,
      body: req.body
    });

    res.status(200).json({
      status: 'success',
      message: 'Berhasil mendapatkan balasan chatbot',
      data: result
    });
  } catch (err) { next(err); }
};

exports.generateSummary = async (req, res, next) => {
  try {
    const result = await chatbotService.generateSummary({
      user: req.user,
      sessionId: req.params.session_id
    });

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (err) { next(err); }
};

exports.closeSession = async (req, res, next) => {
  try {
    const result = await chatbotService.closeSession({
      user: req.user,
      sessionId: req.params.session_id,
      body: req.body
    });

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (err) { next(err); }
};
