const documentService = require('../services/document.service');

// ================= GET DOCUMENTS =================
exports.getDocuments = async (req, res, next) => {
  try {
    const result = await documentService.getDocuments({
      user: req.user,
      query: req.query
    });

    res.json({
      status: "success",
      data: result
    });

  } catch (err) {
    next(err);
  }
};

// ================= UPLOAD =================
exports.upload = async (req, res, next) => {
  try {
    const result = await documentService.uploadDocument({
      user: req.user,
      body: req.body,
      file: req.file
    });

    res.json({
      status: "success",
      message: "Dokumen berhasil diupload",
      data: result
    });

  } catch (err) {
    next(err);
  }
};

// ================= UPDATE DOCUMENT =================
exports.updateDocument = async (req, res, next) => {
  try {
    const result = await documentService.updateDocument({
      user: req.user,
      documentId: req.params.document_id,
      file: req.file
    });

    res.json({
      status: "success",
      message: "Dokumen berhasil diperbarui",
      data: result
    });

  } catch (err) {
    next(err);
  }
};

// ================= DELETE DOCUMENT =================
exports.deleteDocument = async (req, res, next) => {
  try {
    const result = await documentService.deleteDocument({
      user: req.user,
      documentId: req.params.document_id
    });

    res.json({
      status: "success",
      message: result.message
    });

  } catch (err) {
    next(err);
  }
};

// ================= CHECK COMPLETENESS =================
exports.checkCompleteness = async (req, res, next) => {
  try {
    const result = await documentService.checkCompleteness(req.user);

    res.json({
      status: "success",
      data: result
    });

  } catch (err) {
    next(err);
  }
};
