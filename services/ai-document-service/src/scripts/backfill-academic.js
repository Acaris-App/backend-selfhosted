require('dotenv').config({ path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local' });
const db = require('../config/db');
const academicService = require('../services/academic.service');

const run = async () => {
  const result = await db.query(`SELECT id, isi_teks_dokumen FROM dokumen_mahasiswa WHERE document_type = 'khs' AND NULLIF(BTRIM(isi_teks_dokumen), '') IS NOT NULL ORDER BY id`);
  const summary = { total: result.rows.length, succeeded: 0, failed: 0, failures: [] };
  for (const document of result.rows) {
    try {
      const imported = await academicService.importKhs({ documentId: document.id, payload: document.isi_teks_dokumen });
      summary.succeeded += 1;
      console.log(`[backfill] document=${document.id} imported=${imported.imported_items}`);
    } catch (error) {
      summary.failed += 1;
      summary.failures.push({ document_id: document.id, message: error.message || String(error) });
      console.error(`[backfill] document=${document.id} failed: ${error.message || error}`);
    }
  }
  console.log(JSON.stringify(summary, null, 2));
  await db.end();
  if (summary.failed > 0) process.exitCode = 1;
};
run().catch(async (error) => { console.error(error); await db.end(); process.exitCode = 1; });
