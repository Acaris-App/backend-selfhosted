const axios = require('axios');
const { Pool } = require('pg');
const assert = require('assert');
const FormData = require('form-data');
const fs = require('fs');

const pool = new Pool({
  host: process.env.DB_HOST || "34.101.86.214",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "acaris_user",
  password: process.env.DB_PASSWORD || "Mars123//",
  database: process.env.DB_NAME || "acaris_db"
});

const API_URL = process.env.API_URL || 'https://acaris.my.id/api';

const DUMMY = {
  admin: { name: "Admin Test", email: "marsneedduitbanget+admtest5@gmail.com", password: "PasswordAdmin1!", identifier: "ADM-TEST-005" },
  dosen: { name: "Dosen Test", email: "marsneedduitbanget+dostest5@gmail.com", password: "PasswordDosen1!", npm_nip: "19800105TEST" },
  mahasiswa: { name: "Mahasiswa Test", email: "marsneedduitbanget+mhstest5@gmail.com", password: "PasswordMhs1!", npm_nip: "225506TEST5", angkatan: 2022, ipk: 3.8, current_semester: 6 }
};

let state = {
  tokens: { admin: null, dosen: null, mahasiswa: null },
  ids: { admin: null, dosen: null, mahasiswa: null },
  kode_kelas: null,
  scheduleId: null,
  bookingId: null,
  documentId: null,
  sessionId: null,
  kbId: null
};

let testResults = [];

function logResult(testName, status, err = null) {
  if (status === 'PASS') {
    console.log(`✅ [PASS] ${testName}`);
    testResults.push({ testName, status: 'PASS' });
  } else {
    const errorMsg = err?.response?.data?.message || err?.message || 'Unknown Error';
    console.log(`❌ [FAIL] ${testName} - Request failed with status code ${err?.response?.status} (API: "${errorMsg}")`);
    testResults.push({ testName, status: 'FAIL', error: errorMsg });
  }
}

async function getOTP(email, type) {
  await new Promise(r => setTimeout(r, 2000));
  const bcrypt = require('bcrypt');
  const mockOtpHash = await bcrypt.hash('123456', 10);
  const res = await pool.query(
    `UPDATE otp_codes SET code = $1 WHERE user_id = (SELECT id FROM users WHERE email = $2) AND type = $3 AND is_used = FALSE RETURNING id`,
    [mockOtpHash, email, type]
  );
  if (res.rowCount === 0) throw new Error(`OTP not found for ${email} (${type})`);
  return '123456';
}

async function cleanUp() {
  console.log("🧹 Cleaning up old test data...");
  const emails = [DUMMY.admin.email, DUMMY.dosen.email, DUMMY.mahasiswa.email];
  const res = await pool.query('SELECT id FROM users WHERE email = ANY($1)', [emails]);
  if (res.rows.length === 0) return;
  const userIds = res.rows.map(r => r.id);
  
  try {
    // Delete in strict reverse-dependency order
    await pool.query('DELETE FROM booking_bimbingan WHERE mahasiswa_id = ANY($1) OR jadwal_id IN (SELECT id FROM jadwal_bimbingan WHERE dosen_id = ANY($1))', [userIds]);
    await pool.query('DELETE FROM jadwal_bimbingan WHERE dosen_id = ANY($1)', [userIds]);
    await pool.query('DELETE FROM otp_codes WHERE user_id = ANY($1)', [userIds]);
    await pool.query('DELETE FROM chatbot_sessions WHERE mahasiswa_id = ANY($1)', [userIds]);
    await pool.query('DELETE FROM dokumen_mahasiswa WHERE user_id = ANY($1)', [userIds]);
    
    // Admin KB
    await pool.query('DELETE FROM knowledge_base WHERE admin_id = ANY($1)', [userIds]);
    
    // Mahasiswa must be deleted BEFORE dosen_pa
    await pool.query('DELETE FROM mahasiswa WHERE user_id = ANY($1)', [userIds]);
    await pool.query('DELETE FROM dosen_pa WHERE user_id = ANY($1)', [userIds]);
    
    // Finally delete the users
    await pool.query('DELETE FROM users WHERE id = ANY($1)', [userIds]);
    console.log("✅ Cleanup successful.");
  } catch (e) {
    console.error("❌ Cleanup failed:", e.message);
  }
}

// 1. AUTH & SETUP
async function testAuthAndSetup() {
  console.log("\n🚀 TEST: Auth & Setup");
  
  // Register Dosen
  try {
    await axios.post(`${API_URL}/auth/register/dosen`, DUMMY.dosen);
    let code = await getOTP(DUMMY.dosen.email, 'register');
    let res = await axios.post(`${API_URL}/auth/verify-register-otp`, { email: DUMMY.dosen.email, code });
    state.tokens.dosen = res.data.data.token;
    state.ids.dosen = res.data.data.user.id;
    state.kode_kelas = res.data.data.user.kode_kelas;
    logResult('Dosen Register & Verify', 'PASS');
  } catch (e) { logResult('Dosen Register & Verify', 'FAIL', e); }

  // Validate Kode Kelas
  try {
    await axios.post(`${API_URL}/auth/validate-kode-kelas`, { kode_kelas: state.kode_kelas });
    logResult('Validate Kode Kelas', 'PASS');
  } catch (e) { logResult('Validate Kode Kelas', 'FAIL', e); }

  // Register Mahasiswa
  try {
    let payload = { ...DUMMY.mahasiswa, kode_kelas: state.kode_kelas };
    await axios.post(`${API_URL}/auth/register/mahasiswa`, payload);
    let code = await getOTP(DUMMY.mahasiswa.email, 'register');
    let res = await axios.post(`${API_URL}/auth/verify-register-otp`, { email: DUMMY.mahasiswa.email, code });
    state.tokens.mahasiswa = res.data.data.token;
    state.ids.mahasiswa = res.data.data.user.id;
    logResult('Mahasiswa Register & Verify', 'PASS');
  } catch (e) { logResult('Mahasiswa Register & Verify', 'FAIL', e); }

  // Create Admin DB
  try {
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(DUMMY.admin.password, 10);
    const insertRes = await pool.query(
      `INSERT INTO users (name, email, password, role, npm_nip, is_verified) VALUES ($1, $2, $3, $4, $5, true) RETURNING id`,
      [DUMMY.admin.name, DUMMY.admin.email, hash, 'admin', DUMMY.admin.identifier]
    );
    state.ids.admin = insertRes.rows[0].id;
    let res = await axios.post(`${API_URL}/auth/login`, { email: DUMMY.admin.email, password: DUMMY.admin.password });
    state.tokens.admin = res.data.data.token;
    logResult('Admin Setup & Login', 'PASS');
  } catch (e) { logResult('Admin Setup & Login', 'FAIL', e); }
}

// 2. USER PROFILE
async function testUserProfile() {
  console.log("\n🚀 TEST: User Profile");
  const headers = { Authorization: `Bearer ${state.tokens.mahasiswa}` };
  const dosenHeaders = { Authorization: `Bearer ${state.tokens.dosen}` };
  
  try {
    await axios.get(`${API_URL}/user/profile`, { headers });
    logResult('Get Profile', 'PASS');
  } catch (e) { logResult('Get Profile', 'FAIL', e); }

  try {
    await axios.put(`${API_URL}/user/profile`, { name: "Mahasiswa Updated" }, { headers });
    logResult('Update Profile', 'PASS');
  } catch (e) { logResult('Update Profile', 'FAIL', e); }

  try {
    await axios.get(`${API_URL}/user/dashboard`, { headers: dosenHeaders });
    logResult('Get User Dashboard (Dosen)', 'PASS');
  } catch (e) { logResult('Get User Dashboard (Dosen)', 'FAIL', e); }
}

// 3. SCHEDULE & BOOKING (Dosen & Mahasiswa)
async function testScheduleAndBooking() {
  console.log("\n🚀 TEST: Schedule & Booking");
  const dosenHeaders = { Authorization: `Bearer ${state.tokens.dosen}` };
  const mhsHeaders = { Authorization: `Bearer ${state.tokens.mahasiswa}` };

  let tmrw = new Date(); tmrw.setDate(tmrw.getDate() + 2);
  let dateStr = tmrw.toISOString().split('T')[0];

  try {
    let res = await axios.post(`${API_URL}/schedule`, {
      date: dateStr, start_time: "08:00", end_time: "09:00", quota: 3, keterangan: "Test"
    }, { headers: dosenHeaders });
    state.scheduleId = res.data.data.id;
    logResult('Dosen Create Schedule', 'PASS');
  } catch (e) { logResult('Dosen Create Schedule', 'FAIL', e); }

  try {
    await axios.get(`${API_URL}/schedule/my`, { headers: dosenHeaders });
    logResult('Dosen Get My Schedules', 'PASS');
  } catch (e) { logResult('Dosen Get My Schedules', 'FAIL', e); }

  try {
    let res = await axios.post(`${API_URL}/schedule/mahasiswa/book`, {
      schedule_id: state.scheduleId, agenda: "Bimbingan 1"
    }, { headers: mhsHeaders });
    state.bookingId = res.data.data.booking_id; // THIS WAS THE BUG FIX
    logResult('Mahasiswa Book Schedule', 'PASS');
  } catch (e) { logResult('Mahasiswa Book Schedule', 'FAIL', e); }

  try {
    await axios.get(`${API_URL}/schedule/my-bookings`, { headers: mhsHeaders });
    logResult('Mahasiswa Get My Bookings', 'PASS');
  } catch (e) { logResult('Mahasiswa Get My Bookings', 'FAIL', e); }

  try {
    await axios.get(`${API_URL}/schedule/bookings`, { headers: dosenHeaders });
    logResult('Dosen Get All Bookings', 'PASS');
  } catch (e) { logResult('Dosen Get All Bookings', 'FAIL', e); }

  try {
    await axios.patch(`${API_URL}/dosen/bimbingan/${state.bookingId}/keterangan`, {
      keterangan: "ACC Lanjut"
    }, { headers: dosenHeaders });
    logResult('Dosen Update Booking Keterangan', 'PASS');
  } catch (e) { logResult('Dosen Update Booking Keterangan', 'FAIL', e); } 
}

// 4. CHATBOT & DOCUMENT
async function testChatbotAndDoc() {
  console.log("\n🚀 TEST: Chatbot & Document");
  const mhsHeaders = { Authorization: `Bearer ${state.tokens.mahasiswa}` };
  
  try {
    fs.writeFileSync('test_doc.pdf', 'dummy content for test');
    const form = new FormData();
    form.append('file', fs.createReadStream('test_doc.pdf'));
    form.append('document_type', 'krs');
    form.append('semester', '1');
    form.append('judul', 'Judul Test KRS');
    
    let res = await axios.post(`${API_URL}/document/upload`, form, { headers: { ...mhsHeaders, ...form.getHeaders() } });
    state.documentId = res.data.data.id;
    logResult('Mahasiswa Upload Document', 'PASS');
  } catch (e) { logResult('Mahasiswa Upload Document', 'FAIL', e); }
  
  try {
    await axios.get(`${API_URL}/document/list`, { headers: mhsHeaders });
    logResult('Mahasiswa Get Document List', 'PASS');
  } catch (e) { logResult('Mahasiswa Get Document List', 'FAIL', e); }

  try {
    let res = await axios.post(`${API_URL}/chatbot`, { message: "Halo AI", document_ids: state.documentId ? [state.documentId] : [] }, { headers: mhsHeaders });
    state.sessionId = res.data.data.session_id;
    logResult('Mahasiswa Init Chatbot Session & Send Message', 'PASS');
  } catch (e) { logResult('Mahasiswa Init Chatbot Session & Send Message', 'FAIL', e); }

  try {
    await axios.post(`${API_URL}/chatbot/session/${state.sessionId}/generate-summary`, {}, { headers: mhsHeaders });
    logResult('Mahasiswa Generate Summary', 'PASS');
  } catch (e) { logResult('Mahasiswa Generate Summary', 'FAIL', e); }

  try {
    await axios.post(`${API_URL}/chatbot/session/${state.sessionId}/close`, { final_summary: "Selesai test chatbot" }, { headers: mhsHeaders });
    logResult('Mahasiswa Close Session', 'PASS');
  } catch (e) { logResult('Mahasiswa Close Session', 'FAIL', e); }
}

// 5. DOSEN ACTIONS
async function testDosenActions() {
  console.log("\n🚀 TEST: Dosen Actions");
  const dosenHeaders = { Authorization: `Bearer ${state.tokens.dosen}` };

  try {
    await axios.get(`${API_URL}/dosen/dashboard`, { headers: dosenHeaders });
    logResult('Dosen Dashboard', 'PASS');
  } catch (e) { logResult('Dosen Dashboard', 'FAIL', e); }

  try {
    await axios.get(`${API_URL}/dosen/mahasiswa`, { headers: dosenHeaders });
    logResult('Dosen List Mahasiswa', 'PASS');
  } catch (e) { logResult('Dosen List Mahasiswa', 'FAIL', e); }

  try {
    await axios.get(`${API_URL}/dosen/mahasiswa/${state.ids.mahasiswa}/detail`, { headers: dosenHeaders });
    logResult('Dosen Mahasiswa Detail', 'PASS');
  } catch (e) { logResult('Dosen Mahasiswa Detail', 'FAIL', e); }

  try {
    await axios.get(`${API_URL}/dosen/mahasiswa/${state.ids.mahasiswa}/chatbot`, { headers: dosenHeaders });
    logResult('Dosen Mahasiswa Chatbot List', 'PASS');
  } catch (e) { logResult('Dosen Mahasiswa Chatbot List', 'FAIL', e); }
}

// 6. ADMIN ACTIONS
async function testAdminActions() {
  console.log("\n🚀 TEST: Admin Actions");
  const adminHeaders = { Authorization: `Bearer ${state.tokens.admin}` };

  try {
    await axios.get(`${API_URL}/admin/dashboard`, { headers: adminHeaders });
    logResult('Admin Dashboard', 'PASS');
  } catch (e) { logResult('Admin Dashboard', 'FAIL', e); }

  try {
    await axios.get(`${API_URL}/admin/users?role=mahasiswa`, { headers: adminHeaders });
    logResult('Admin List Users', 'PASS');
  } catch (e) { logResult('Admin List Users', 'FAIL', e); }

  try {
    fs.writeFileSync('kb_doc.pdf', 'dummy kb');
    const form = new FormData();
    form.append('file', fs.createReadStream('kb_doc.pdf'));
    form.append('title', 'Test KB');
    form.append('category', 'Peraturan Akademik');
    
    let res = await axios.post(`${API_URL}/admin/knowledge-base`, form, { headers: { ...adminHeaders, ...form.getHeaders() } });
    state.kbId = res.data.data.id;
    logResult('Admin Create KB', 'PASS');
  } catch (e) { logResult('Admin Create KB', 'FAIL', e); }

  try {
    const formUpdate = new FormData();
    formUpdate.append('title', 'Updated KB');
    formUpdate.append('category', 'Peraturan Akademik');
    await axios.put(`${API_URL}/admin/knowledge-base/${state.kbId}`, formUpdate, { headers: { ...adminHeaders, ...formUpdate.getHeaders() } });
    logResult('Admin Update KB', 'PASS');
  } catch (e) { logResult('Admin Update KB', 'FAIL', e); }

  try {
    await axios.get(`${API_URL}/admin/documents`, { headers: adminHeaders });
    logResult('Admin List Documents', 'PASS');
  } catch (e) { logResult('Admin List Documents', 'FAIL', e); }

  try {
    if (state.kbId) {
      await axios.delete(`${API_URL}/admin/knowledge-base/${state.kbId}`, { headers: adminHeaders });
      logResult('Admin Delete KB', 'PASS');
    }
  } catch (e) { logResult('Admin Delete KB', 'FAIL', e); }
}

// 7. CLEANUP ACTIONS
async function testCleanup() {
  console.log("\n🚀 TEST: Deletions & Cleanups");
  const mhsHeaders = { Authorization: `Bearer ${state.tokens.mahasiswa}` };
  const dosenHeaders = { Authorization: `Bearer ${state.tokens.dosen}` };

  try {
    await axios.patch(`${API_URL}/schedule/bookings/${state.bookingId}/cancel`, { alasan: "Batal test" }, { headers: mhsHeaders });
    logResult('Mahasiswa Cancel Booking', 'PASS');
  } catch (e) { logResult('Mahasiswa Cancel Booking', 'FAIL', e); }

  try {
    await axios.delete(`${API_URL}/schedule/${state.scheduleId}`, { headers: dosenHeaders });
    logResult('Dosen Delete Schedule', 'PASS');
  } catch (e) { logResult('Dosen Delete Schedule', 'FAIL', e); }

  try {
    if (state.documentId) {
      await axios.delete(`${API_URL}/document/delete/${state.documentId}`, { headers: mhsHeaders });
      logResult('Mahasiswa Delete Document', 'PASS');
    }
  } catch (e) { logResult('Mahasiswa Delete Document', 'FAIL', e); }
}

// 8. CHANGE PASS & LOGOUT
async function testAuthTearDown() {
  console.log("\n🚀 TEST: Auth Teardown");
  const mhsHeaders = { Authorization: `Bearer ${state.tokens.mahasiswa}` };

  try {
    await axios.post(`${API_URL}/auth/change-password`, { old_password: DUMMY.mahasiswa.password, new_password: "NewPassword1!" }, { headers: mhsHeaders });
    logResult('Mahasiswa Change Password', 'PASS');
  } catch (e) { logResult('Mahasiswa Change Password', 'FAIL', e); }

  try {
    await axios.post(`${API_URL}/auth/logout`, {}, { headers: mhsHeaders });
    logResult('Mahasiswa Logout', 'PASS');
  } catch (e) { logResult('Mahasiswa Logout', 'FAIL', e); }
}

async function main() {
  await cleanUp();
  
  await testAuthAndSetup();
  await testUserProfile();
  await testScheduleAndBooking();
  await testChatbotAndDoc();
  await testDosenActions();
  await testAdminActions();
  await testCleanup();
  await testAuthTearDown();

  await pool.end();

  // Delete temporary test PDFs if they exist
  try {
    if (fs.existsSync('test_doc.pdf')) fs.unlinkSync('test_doc.pdf');
    if (fs.existsSync('kb_doc.pdf')) fs.unlinkSync('kb_doc.pdf');
    console.log("🧹 Cleaned up temporary test PDF files.");
  } catch (e) {
    console.error('Error deleting temp PDFs:', e.message);
  }
  
  const failed = testResults.filter(t => t.status === 'FAIL').length;
  console.log(`\n🏁 TEST RUN COMPLETE. Passed: ${testResults.length - failed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch(console.error);
