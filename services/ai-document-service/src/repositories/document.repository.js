const db = require('../config/db');

// ================= LIST DOCUMENTS (dengan filter opsional) =================
exports.getDocumentsList = async (userId, filters = {}) => {
  const conditions = ['user_id = $1'];
  const values = [userId];
  let idx = 2;

  if (filters.document_type) {
    conditions.push(`document_type = $${idx++}`);
    values.push(filters.document_type);
  }

  if (filters.semester) {
    conditions.push(`semester = $${idx++}`);
    values.push(parseInt(filters.semester));
  }

  const where = conditions.join(' AND ');

  const result = await db.query(
    `SELECT id, document_type, semester, file_path, uploaded_at
     FROM dokumen_mahasiswa
     WHERE ${where}
     ORDER BY document_type ASC, semester ASC`,
    values
  );

  return result.rows;
};

// ================= CREATE =================
exports.createDocument = async (data) => {
  const result = await db.query(
    `INSERT INTO dokumen_mahasiswa 
    (user_id, document_type, semester, file_path, uploaded_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING *`,
    [
      data.user_id,
      data.document_type,
      data.semester,
      data.file_path
    ]
  );

  return result.rows[0];
};

// ================= REPLACE EXISTING DOCUMENT FILE =================
exports.replaceDocumentFile = async (documentId, filePath) => {
  const result = await db.query(
    `UPDATE dokumen_mahasiswa
     SET file_path = $1,
         isi_teks_dokumen = NULL,
         uploaded_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [filePath, documentId]
  );

  return result.rows[0];
};

// ================= FIND BY TYPE & SEMESTER =================
exports.findByUserTypeSemester = async (userId, type, semester) => {
  const result = await db.query(
    `SELECT * FROM dokumen_mahasiswa
     WHERE user_id = $1 
     AND document_type = $2 
     AND semester = $3`,
    [userId, type, semester]
  );

  return result.rows[0];
};

// ================= GET ALL BY USER =================
exports.getDocumentsByUser = async (userId) => {
  const result = await db.query(
    `SELECT document_type, semester 
     FROM dokumen_mahasiswa 
     WHERE user_id = $1`,
    [userId]
  );

  return result.rows;
};

// ================= FIND BY ID =================
exports.findById = async (documentId, userId) => {
  const result = await db.query(
    `SELECT * FROM dokumen_mahasiswa WHERE id = $1 AND user_id = $2`,
    [documentId, userId]
  );

  return result.rows[0];
};

// ================= DELETE =================
exports.deleteDocument = async (documentId, userId) => {
  const result = await db.query(
    `DELETE FROM dokumen_mahasiswa
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [documentId, userId]
  );

  return result.rows[0];
};

// ================= UPDATE FILE PATH =================
exports.updateFilePath = async (documentId, filePath) => {
  const result = await db.query(
    `UPDATE dokumen_mahasiswa
     SET file_path = $1,
         isi_teks_dokumen = NULL,
         uploaded_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [filePath, documentId]
  );

  return result.rows[0];
};

// ================= FIND BY ID (ADMIN — tanpa filter user_id) =================
exports.findByIdAdmin = async (documentId) => {
  const result = await db.query(
    `SELECT * FROM dokumen_mahasiswa WHERE id = $1`,
    [documentId]
  );
  return result.rows[0];
};

// ================= GET ALL BY USER ID (ADMIN) =================
exports.getDocumentsByUserId = async (userId) => {
  const result = await db.query(
    `SELECT id, document_type, semester, file_path, uploaded_at
     FROM dokumen_mahasiswa
     WHERE user_id = $1
     ORDER BY uploaded_at DESC`,
    [userId]
  );
  return result.rows;
};

// ================= CREATE BY ADMIN =================
exports.createDocumentAdmin = async (data) => {
  const result = await db.query(
    `INSERT INTO dokumen_mahasiswa (user_id, document_type, semester, file_path, uploaded_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id, document_type, semester, file_path, uploaded_at`,
    [data.user_id, data.document_type, data.semester ?? null, data.file_path]
  );
  return result.rows[0];
};

// ================= UPDATE DOKUMEN (ADMIN) =================
exports.updateDocumentAdmin = async (documentId, data) => {
  const fields = [];
  const values = [];
  let idx = 1;

  if (data.semester !== undefined) {
    fields.push(`semester = $${idx++}`);
    values.push(data.semester);
  }
  if (data.file_path !== undefined) {
    fields.push(`file_path = $${idx++}`);
    values.push(data.file_path);
  }

  if (fields.length === 0) return null;

  fields.push(`uploaded_at = NOW()`);
  values.push(documentId);

  const result = await db.query(
    `UPDATE dokumen_mahasiswa SET ${fields.join(', ')} WHERE id = $${idx}
     RETURNING id, document_type, semester, file_path, uploaded_at`,
    values
  );
  return result.rows[0];
};

// ================= DELETE BY ID (ADMIN — tanpa filter user_id) =================
exports.deleteDocumentAdmin = async (documentId) => {
  const result = await db.query(
    `DELETE FROM dokumen_mahasiswa WHERE id = $1 RETURNING *`,
    [documentId]
  );
  return result.rows[0];
};
