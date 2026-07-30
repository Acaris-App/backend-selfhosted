const documentRepository = require('../repositories/document.repository');
const profileRepository = require('../repositories/profile.repository');
const userRepository = require('../repositories/user.repository');
const { bucket } = require('../config/gcs');

const DOCUMENT_EXTRACT_TIMEOUT_MS = parseInt(process.env.N8N_DOCUMENT_EXTRACT_TIMEOUT_MS, 10) || 30000;

const getN8nHeaders = () => {
  if (!process.env.N8N_ACADEMIC_CALLBACK_SECRET) {
    throw new Error("N8N_ACADEMIC_CALLBACK_SECRET is not configured.");
  }

  return {
    'Content-Type': 'application/json',
    'x-academic-callback-secret': process.env.N8N_ACADEMIC_CALLBACK_SECRET
  };
};

const getDocumentExtractWebhookUrl = () => {
  if (!process.env.N8N_DOCUMENT_EXTRACT_WEBHOOK_URL) throw new Error("N8N_DOCUMENT_EXTRACT_WEBHOOK_URL is not configured.");
  return process.env.N8N_DOCUMENT_EXTRACT_WEBHOOK_URL;
};

const parseWebhookResponse = async (response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (err) {
    return text;
  }
};

const notifyDocumentExtractionWebhook = async ({ document, user, source }) => {
  const currentUser = user.npm_nip ? user : await userRepository.findById(user.id);
  const npmMahasiswa = currentUser?.npm_nip;

  if (!npmMahasiswa) {
    console.warn(`[n8n] Skip ekstrak dokumen ${document.id}: NPM mahasiswa belum tersedia`);
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOCUMENT_EXTRACT_TIMEOUT_MS);

  const payload = {
    action: 'extract_mahasiswa_document',
    document_id: document.id,
    npm_mahasiswa: npmMahasiswa,
    document_type: document.document_type,
    semester: document.document_type === 'transkrip' ? null : document.semester,
    file_url: document.file_path,
    source
  };

  try {
    const response = await fetch(getDocumentExtractWebhookUrl(), {
      method: 'POST',
      headers: getN8nHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const responseBody = await parseWebhookResponse(response);
    if (!response.ok) {
      const message = responseBody?.message || responseBody?.error || response.statusText;
      console.error(`[n8n] Gagal trigger ekstrak dokumen ${document.id}: ${message}`);
      return;
    }

    console.log(`[n8n] Trigger ekstrak dokumen ${document.id} berhasil`);
  } catch (err) {
    const message = err.name === 'AbortError'
      ? `timeout setelah ${DOCUMENT_EXTRACT_TIMEOUT_MS}ms`
      : err.message;
    console.error(`[n8n] Gagal trigger ekstrak dokumen ${document.id}: ${message}`);
  } finally {
    clearTimeout(timeout);
  }
};

const notifyDocumentDeletionWebhook = async ({ document, user, source }) => {
  const currentUser = user.npm_nip ? user : await userRepository.findById(user.id);
  const npmMahasiswa = currentUser?.npm_nip;

  if (!npmMahasiswa) {
    console.warn(`[n8n] Skip hapus ekstrak dokumen ${document.id}: NPM mahasiswa belum tersedia`);
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOCUMENT_EXTRACT_TIMEOUT_MS);

  const payload = {
    action: 'delete_mahasiswa_document',
    document_id: document.id,
    npm_mahasiswa: npmMahasiswa,
    document_type: document.document_type,
    semester: document.document_type === 'transkrip' ? null : document.semester,
    file_url: document.file_path,
    source
  };

  try {
    const response = await fetch(getDocumentExtractWebhookUrl(), {
      method: 'POST',
      headers: getN8nHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const responseBody = await parseWebhookResponse(response);
    if (!response.ok) {
      const message = responseBody?.message || responseBody?.error || response.statusText;
      console.error(`[n8n] Gagal trigger hapus ekstrak dokumen ${document.id}: ${message}`);
      return;
    }

    console.log(`[n8n] Trigger hapus ekstrak dokumen ${document.id} berhasil`);
  } catch (err) {
    const message = err.name === 'AbortError'
      ? `timeout setelah ${DOCUMENT_EXTRACT_TIMEOUT_MS}ms`
      : err.message;
    console.error(`[n8n] Gagal trigger hapus ekstrak dokumen ${document.id}: ${message}`);
  } finally {
    clearTimeout(timeout);
  }
};

// ================= HELPER GCS UPLOAD =================
const uploadToGCS = async (file, filename, userId) => {
  const filePath = `${userId}/${filename}`;

  if (process.env.STORAGE_TYPE === 'local') {
    const fs = require('fs');
    const path = require('path');
    const targetDir = path.resolve('/app/uploads', String(userId));
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.resolve(targetDir, filename), file.buffer);
    const host = process.env.APP_URL || 'http://localhost:3003';
    return `${host}/uploads/${filePath}`;
  }

  const blob = bucket.file(filePath);

  const blobStream = blob.createWriteStream({
    resumable: false,
    contentType: file.mimetype
  });

  return new Promise((resolve, reject) => {
    blobStream.on('finish', () => {
      const url = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
      resolve(url);
    });
    blobStream.on('error', reject);
    blobStream.end(file.buffer);
  });
};

// ================= HELPER GCS DELETE =================
const deleteFromGCS = async (filename, userId) => {
  const filePath = `${userId}/${filename}`;

  if (process.env.STORAGE_TYPE === 'local') {
    const fs = require('fs');
    const path = require('path');
    const fullPath = path.join(__dirname, '../uploads', filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`[Local Storage] File dihapus: ${filePath}`);
    }
    return;
  }

  try {
    await bucket.file(filePath).delete();
    console.log(`[GCS] File dihapus: ${filePath}`);
  } catch (err) {
    console.error(`[GCS] Gagal hapus file: ${err.message}`);
  }
};

// ================= UPLOAD DOCUMENT =================
exports.uploadDocument = async ({ user, body, file }) => {
  if (!file) {
      throw { status: 400, message: "File wajib diupload" };
  }

  if (!user || user.role !== 'mahasiswa') {
      throw { status: 403, message: "Hanya mahasiswa yang dapat upload dokumen" };
  }

  const { document_type, semester } = body;

  const allowedTypes = ['krs', 'khs', 'transkrip'];

  if (!allowedTypes.includes(document_type)) {
      throw { status: 400, message: "document_type tidak valid" };
  }

  const profile = await profileRepository.getMahasiswaProfile(user.id);

  if (!profile) {
      throw { status: 404, message: "Profile mahasiswa tidak ditemukan" };
  }

  const currentSemester = profile.current_semester;

  // transkrip tidak butuh semester, gunakan 0 agar tidak violate NOT NULL constraint
  let semesterInt = 0;

  if (document_type !== 'transkrip') {

      if (!semester) {
        throw { status: 400, message: "Semester wajib diisi" };
      }

      semesterInt = parseInt(semester);

      if (isNaN(semesterInt)) {
        throw { status: 400, message: "Semester harus berupa angka" };
      }

      if (semesterInt < 1) {
        throw { status: 400, message: "Semester minimal adalah 1" };
      }

      if (semesterInt > currentSemester) {
        throw {
          status: 400,
          message: `Semester tidak valid. Semester saat ini: ${currentSemester}, maksimal upload semester ${currentSemester}`
        };
      }
  }

  const existing = await documentRepository.findByUserTypeSemester(
      user.id,
      document_type,
      semesterInt
  );

  const fullUser = await userRepository.findById(user.id);
  const safeName = (fullUser?.name || 'user')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');

  const date = new Date().toISOString().split('T')[0];
  const unique = Date.now();

  let newFilename = '';

  if (document_type === 'transkrip') {
      newFilename = `${safeName}-${document_type}-${date}-${unique}.pdf`;
  } else {
      newFilename = `${safeName}-${document_type}-semester-${semesterInt}-${date}-${unique}.pdf`;
  }

  const fileUrl = await uploadToGCS(file, newFilename, user.id);

  let document;
  try {
    if (existing) {
      document = await documentRepository.replaceDocumentFile(existing.id, fileUrl);
    } else {
      document = await documentRepository.createDocument({
        user_id: user.id,
        document_type,
        semester: semesterInt,
        file_path: fileUrl
      });
    }
  } catch (dbErr) {
      // DB gagal → rollback file dari GCS
      await deleteFromGCS(newFilename, user.id);
      throw dbErr;
  }

  if (existing?.file_path) {
    try {
      const oldUrl = new URL(existing.file_path);
      const oldObjectPath = oldUrl.pathname.split('/').slice(2).join('/');
      
      if (process.env.STORAGE_TYPE === 'local') {
        const fs = require('fs');
        const path = require('path');
        const fullPath = path.join(__dirname, '../uploads', oldObjectPath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          console.log(`[Local Storage] File lama dihapus: ${oldObjectPath}`);
        }
      } else {
        await bucket.file(oldObjectPath).delete();
        console.log(`[GCS] File lama dihapus: ${oldObjectPath}`);
      }
    } catch (err) {
      console.error(`[Storage] Gagal hapus file lama: ${err.message}`);
    }
  }

  await notifyDocumentExtractionWebhook({
    document,
    user,
    source: existing ? 'backend_document_reupload' : 'backend_document_upload'
  });

  return document;

};

// ================= GET DOCUMENTS =================
exports.getDocuments = async ({ user, query = {} }) => {

  if (!user || user.role !== 'mahasiswa') {
    throw { status: 403, message: "Hanya mahasiswa yang dapat melihat dokumen" };
  }

  const { document_type, semester } = query;

  const allowedTypes = ['krs', 'khs', 'transkrip'];
  if (document_type && !allowedTypes.includes(document_type)) {
    throw { status: 400, message: "document_type tidak valid. Gunakan: krs, khs, atau transkrip" };
  }

  if (semester && isNaN(parseInt(semester))) {
    throw { status: 400, message: "Semester harus berupa angka" };
  }

  const docs = await documentRepository.getDocumentsList(user.id, { document_type, semester });

  const grouped = {
    krs: [],
    khs: [],
    transkrip: null
  };

  for (const doc of docs) {
    if (doc.document_type === 'transkrip') {
      grouped.transkrip = doc;
    } else {
      if (grouped[doc.document_type]) {
        grouped[doc.document_type].push(doc);
      }
    }
  }

  return {
    total: docs.length,
    documents: grouped
  };
};

// ================= CHECK COMPLETENESS =================
exports.checkCompleteness = async (user) => {
  if (!user || user.role !== 'mahasiswa') {
      throw { status: 403, message: "Hanya mahasiswa yang dapat mengecek kelengkapan dokumen" };
    }

    const profile = await profileRepository.getMahasiswaProfile(user.id);

    if (!profile) {
      throw { status: 404, message: "Profile mahasiswa tidak ditemukan" };
    }

    const currentSemester = profile.current_semester;

    const allDocs = await documentRepository.getDocumentsByUser(user.id);

    const uploaded = {
      krs: [],
      khs: [],
      transkrip: false
    };

    for (const doc of allDocs) {
      if (doc.document_type === 'krs') {
        uploaded.krs.push(doc.semester);
      } else if (doc.document_type === 'khs') {
        uploaded.khs.push(doc.semester);
      } else if (doc.document_type === 'transkrip') {
        uploaded.transkrip = true;
      }
    }

    const missingSemesterKRS = [];
    for (let s = 1; s < currentSemester; s++) {
      if (!uploaded.krs.includes(s)) missingSemesterKRS.push(s);
    }

    const missingSemesterKHS = [];
    for (let s = 1; s < currentSemester; s++) {
      if (!uploaded.khs.includes(s)) missingSemesterKHS.push(s);
    }

    // Wajib memiliki KRS dan KHS untuk setiap semester dari 1 s.d. currentSemester - 1
    let isComplete = uploaded.transkrip;
    for (let s = 1; s < currentSemester; s++) {
      if (!uploaded.krs.includes(s) || !uploaded.khs.includes(s)) {
        isComplete = false;
        break;
      }
    }

    return {
      current_semester: currentSemester,
      uploaded_krs: uploaded.krs.sort((a, b) => a - b),
      uploaded_khs: uploaded.khs.sort((a, b) => a - b),
      uploaded_transkrip: uploaded.transkrip,
      missing_krs: missingSemesterKRS,
      missing_khs: missingSemesterKHS,
      is_complete: isComplete
    };

};

// ================= DELETE DOCUMENT =================
exports.deleteDocument = async ({ user, documentId }) => {

  if (!user || user.role !== 'mahasiswa') {
    throw { status: 403, message: "Hanya mahasiswa yang dapat menghapus dokumen" };
  }

  const existing = await documentRepository.findById(documentId, user.id);
  if (!existing) {
    throw { status: 404, message: "Dokumen tidak ditemukan" };
  }


  await documentRepository.deleteDocument(documentId, user.id);
  await notifyDocumentDeletionWebhook({
    document: existing,
    user,
    source: 'backend_document_delete'
  });

  // Hapus file — ekstrak object path dari full URL
  try {
    const url = new URL(existing.file_path);
    const objectPath = url.pathname.split('/').slice(2).join('/');

    if (process.env.STORAGE_TYPE === 'local') {
      const fs = require('fs');
      const path = require('path');
      const fullPath = path.join(__dirname, '../uploads', objectPath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log(`[Local Storage] File dihapus: ${objectPath}`);
      }
    } else {
      await bucket.file(objectPath).delete();
      console.log(`[GCS] File dihapus: ${objectPath}`);
    }
  } catch (err) {
    console.error(`[Storage] Gagal hapus file: ${err.message}`);
  }

  return { message: "Dokumen berhasil dihapus" };
};

// ================= UPDATE DOCUMENT =================
exports.updateDocument = async ({ user, documentId, file }) => {

  if (!file) {
    throw { status: 400, message: "File wajib diupload" };
  }

  if (!user || user.role !== 'mahasiswa') {
    throw { status: 403, message: "Hanya mahasiswa yang dapat update dokumen" };
  }

  const existing = await documentRepository.findById(documentId, user.id);
  if (!existing) {
    throw { status: 404, message: "Dokumen tidak ditemukan" };
  }

  // Bug 3 fix: user dari JWT hanya {id, role}, tidak punya name. Fetch user lengkap dari DB.
  const fullUser = await userRepository.findById(user.id);
  const safeName = (fullUser?.name || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-');

  const date = new Date().toISOString().split('T')[0];
  const unique = Date.now();

  let newFilename = '';
  if (existing.document_type === 'transkrip') {
    newFilename = `${safeName}-${existing.document_type}-${date}-${unique}.pdf`;
  } else {
    newFilename = `${safeName}-${existing.document_type}-semester-${existing.semester}-${date}-${unique}.pdf`;
  }

  const fileUrl = await uploadToGCS(file, newFilename, user.id);

  let updated;
  try {
    updated = await documentRepository.updateFilePath(documentId, fileUrl);
  } catch (dbErr) {
    await deleteFromGCS(newFilename, user.id);
    throw dbErr;
  }

  // Hapus file lama setelah DB update berhasil (mencegah storage leak)
  if (existing.file_path) {
    try {
      const oldUrl = new URL(existing.file_path);
      const oldObjectPath = oldUrl.pathname.split('/').slice(2).join('/');

      if (process.env.STORAGE_TYPE === 'local') {
        const fs = require('fs');
        const path = require('path');
        const fullPath = path.join(__dirname, '../uploads', oldObjectPath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          console.log(`[Local Storage] File lama dihapus saat update: ${oldObjectPath}`);
        }
      } else {
        await bucket.file(oldObjectPath).delete();
        console.log(`[GCS] File lama dihapus saat update: ${oldObjectPath}`);
      }
    } catch (err) {
      console.error(`[Storage] Gagal hapus file lama saat update: ${err.message}`);
    }
  }

  await notifyDocumentExtractionWebhook({
    document: updated,
    user,
    source: 'backend_document_update'
  });

  return updated;
};
