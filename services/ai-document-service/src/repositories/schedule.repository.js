const db = require('../config/db');

exports.findActiveVersion = async () => (await db.query(
  `SELECT id, versi FROM jadwal_kuliah_versi WHERE status = 'aktif' LIMIT 1`,
  []
)).rows[0] || null;

exports.supersedeActiveVersion = async (client) => {
  await client.query(
    `UPDATE jadwal_kuliah_versi SET status = 'superseded', superseded_at = NOW() WHERE status = 'aktif'`
  );
};

exports.createVersion = async (client, { knowledgeBaseId, uploadedBy, rawResult, versi }) => (
  await client.query(
    `INSERT INTO jadwal_kuliah_versi (knowledge_base_id, versi, status, diunggah_oleh, raw_result)
     VALUES ($1, $2, 'aktif', $3, $4::jsonb)
     RETURNING id, versi`,
    [knowledgeBaseId, versi, uploadedBy || null, JSON.stringify(rawResult)]
  )
).rows[0];

exports.insertScheduleRows = async (client, { versiId, items }) => {
  for (const item of items) {
    await client.query(
      `INSERT INTO jadwal_kuliah (versi_id, hari, jam_mulai, jam_selesai, kode_mata_kuliah, nama_mata_kuliah, kelas, ruang, dosen)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
      [
        versiId,
        item.hari || null,
        item.jam_mulai || null,
        item.jam_selesai || null,
        item.kode_mata_kuliah || null,
        item.nama_mata_kuliah || null,
        item.kelas || null,
        item.ruang || null,
        item.dosen ? JSON.stringify(item.dosen) : null
      ]
    );
  }
};

exports.getActiveSchedule = async () => (await db.query(
  `SELECT j.hari, j.jam_mulai, j.jam_selesai, j.kode_mata_kuliah, j.nama_mata_kuliah, j.kelas, j.ruang, j.dosen
   FROM jadwal_kuliah j
   JOIN jadwal_kuliah_versi v ON v.id = j.versi_id AND v.status = 'aktif'
   ORDER BY
     CASE j.hari
       WHEN 'Senin' THEN 1 WHEN 'Selasa' THEN 2 WHEN 'Rabu' THEN 3
       WHEN 'Kamis' THEN 4 WHEN 'Jumat' THEN 5 WHEN 'Sabtu' THEN 6
       ELSE 7
     END,
     j.jam_mulai, j.kelas`,
  []
)).rows;