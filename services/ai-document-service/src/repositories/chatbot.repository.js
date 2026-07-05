const db = require('../config/db');

exports.findActiveSessionByUser = async (mahasiswaId) => {
  const result = await db.query(
    `SELECT id, mahasiswa_id, status, final_summary, created_at, updated_at, closed_at
     FROM chatbot_sessions
     WHERE mahasiswa_id = $1 AND status = 'aktif'
     ORDER BY created_at DESC
     LIMIT 1`,
    [mahasiswaId]
  );

  return result.rows[0];
};

exports.findSessionByIdForUser = async (sessionId, mahasiswaId) => {
  const result = await db.query(
    `SELECT id, mahasiswa_id, status, final_summary, created_at, updated_at, closed_at
     FROM chatbot_sessions
     WHERE id = $1 AND mahasiswa_id = $2
     LIMIT 1`,
    [sessionId, mahasiswaId]
  );

  return result.rows[0];
};

exports.getClosedSessionsByUser = async (mahasiswaId) => {
  const result = await db.query(
    `SELECT id, mahasiswa_id, status, final_summary, created_at, updated_at, closed_at
     FROM chatbot_sessions
     WHERE mahasiswa_id = $1
       AND status = 'selesai'
     ORDER BY COALESCE(closed_at, updated_at, created_at) DESC`,
    [mahasiswaId]
  );

  return result.rows;
};

exports.findClosedSessionByIdForUser = async (sessionId, mahasiswaId) => {
  const result = await db.query(
    `SELECT id, mahasiswa_id, status, final_summary, created_at, updated_at, closed_at
     FROM chatbot_sessions
     WHERE id = $1
       AND mahasiswa_id = $2
       AND status = 'selesai'
     LIMIT 1`,
    [sessionId, mahasiswaId]
  );

  return result.rows[0];
};

exports.createSession = async ({ id, mahasiswa_id }) => {
  const result = await db.query(
    `INSERT INTO chatbot_sessions (id, mahasiswa_id, status)
     VALUES ($1, $2, 'aktif')
     RETURNING id, mahasiswa_id, status, final_summary, created_at, updated_at, closed_at`,
    [id, mahasiswa_id]
  );

  return result.rows[0];
};

exports.getMessagesBySession = async (sessionId) => {
  const result = await db.query(
    `SELECT id, sender, message_text AS text, created_at
     FROM chatbot_messages
     WHERE session_id = $1
     ORDER BY created_at ASC, id ASC`,
    [sessionId]
  );

  return result.rows;
};

exports.addMessage = async ({ session_id, sender, text }) => {
  const result = await db.query(
    `INSERT INTO chatbot_messages (session_id, sender, message_text)
     VALUES ($1, $2, $3)
     RETURNING id, sender, message_text AS text, created_at`,
    [session_id, sender, text]
  );

  return result.rows[0];
};

exports.closeSession = async ({ session_id, mahasiswa_id, final_summary }) => {
  const result = await db.query(
    `UPDATE chatbot_sessions
     SET status = 'selesai',
         final_summary = $3,
         closed_at = NOW(),
         updated_at = NOW()
     WHERE id = $1 AND mahasiswa_id = $2 AND status = 'aktif'
     RETURNING id, mahasiswa_id, status, final_summary, created_at, updated_at, closed_at`,
    [session_id, mahasiswa_id, final_summary]
  );

  return result.rows[0];
};
