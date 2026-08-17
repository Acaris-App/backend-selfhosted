const { PDFParse } = require('pdf-parse');
const scheduleRepository = require('../repositories/schedule.repository');
const db = require('../config/db');

const getGeminiKey = () => {
  if (!process.env.GEMINI_API_KEY) throw { status: 500, message: 'GEMINI_API_KEY is not configured' };
  return process.env.GEMINI_API_KEY;
};

const getGeminiModel = () => process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

const parsePdfToText = async (buffer) => {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text || '';
  } finally {
    await parser.destroy();
  }
};

const extractScheduleJson = async (text) => {
  const prompt = `Ekstrak jadwal kuliah dari teks berikut menjadi JSON. Ikuti aturan ini:
1. Output HANYA JSON valid, tanpa markdown, tanpa teks lain.
2. Format:
{"jadwal":[{"hari":"Senin","jam":"07:30-09:10","kode_mk":"TIF620101","nama_mk":"Pemrograman Berorientasi Objek","kelas":"A","ruang":"Lab 1","dosen":["Wahyu Eko Saputra"]}]}
3. Pisahkan huruf kelas di akhir nama mata kuliah (misal "PBO A" -> nama "PBO", kelas "A").
4. Jika data tidak lengkap, isi field yang tersedia dan kosongkan sisanya. Jangan mengarang.
5. Gabungkan PD1-PD3 menjadi array dosen.

Teks jadwal:
${text}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${getGeminiModel()}:generateContent?key=${getGeminiKey()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
      })
    }
  );

  if (!response.ok) {
    throw { status: 502, message: `Gemini gagal mengekstrak jadwal: ${response.statusText}` };
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  const parsed = parseJsonBlock(candidate);
  if (!parsed) throw { status: 502, message: 'Gemini tidak mengembalikan JSON yang valid' };
  if (Array.isArray(parsed)) return parsed;
  return Array.isArray(parsed.jadwal) ? parsed.jadwal : [];
};

const parseJsonBlock = (text) => {
  const starts = [text.indexOf('{'), text.indexOf('[')].filter((i) => i !== -1);
  if (!starts.length) return null;
  const start = Math.min(...starts);
  const open = text[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) { escaped = false; }
      else if (ch === '\\') { escaped = true; }
      else if (ch === '"') { inString = false; }
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === open) { depth += 1; }
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) {
        const block = text.slice(start, i + 1);
        try { return JSON.parse(block); } catch { return null; }
      }
    }
  }
  return null;
};

const parseJam = (jam) => {
  if (!jam) return { jam_mulai: null, jam_selesai: null };
  const m = String(jam).match(/(\d{1,2})[.:](\d{2})\s*[-–]\s*(\d{1,2})[.:](\d{2})/);
  if (!m) return { jam_mulai: null, jam_selesai: null };
  return {
    jam_mulai: `${String(Number(m[1])).padStart(2, '0')}:${m[2]}:00`,
    jam_selesai: `${String(Number(m[3])).padStart(2, '0')}:${m[4]}:00`
  };
};

const normalizeItems = (rawItems) => rawItems.map((item) => {
  const jam = parseJam(item.jam || item.jam_mulai || '');
  return {
    hari: item.hari || null,
    jam_mulai: item.jam_mulai || jam.jam_mulai,
    jam_selesai: item.jam_selesai || jam.jam_selesai,
    kode_mata_kuliah: item.kode_mk || item.kode || item.kode_mata_kuliah || null,
    nama_mata_kuliah: item.nama_mk || item.nama || item.nama_mata_kuliah || null,
    kelas: item.kelas || null,
    ruang: item.ruang || null,
    dosen: Array.isArray(item.dosen) ? item.dosen : (item.dosen ? [item.dosen] : null)
  };
});

exports.processSchedulePdf = async ({ knowledgeBaseId, uploadedBy, buffer }) => {
  const text = await parsePdfToText(buffer);
  const rawItems = await extractScheduleJson(text);
  const items = normalizeItems(rawItems);

  if (!items.length) {
    throw { status: 422, message: 'Tidak ada baris jadwal yang berhasil diekstrak dari PDF' };
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const active = await scheduleRepository.findActiveVersion();
    await scheduleRepository.supersedeActiveVersion(client);
    const versi = (active?.versi || 0) + 1;
    const versionRow = await scheduleRepository.createVersion(client, {
      knowledgeBaseId,
      uploadedBy,
      rawResult: { items },
      versi
    });
    await scheduleRepository.insertScheduleRows(client, { versiId: versionRow.id, items });
    await client.query('COMMIT');
    return { versi_id: versionRow.id, versi, imported_items: items.length, superseded_versi: active?.versi || null };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

exports.getActiveSchedule = async () => scheduleRepository.getActiveSchedule();