const fs = require('fs');
const path = require('path');

const baseUrl = process.env.SELFHOSTED_API_URL || 'https://marslabs.my.id/api';
const reportPath = process.env.REPORT_PATH || path.resolve(__dirname, '../../../hasil-test/selfhosted-semester-matrix.md');
const password = process.env.TEST_STUDENT_PASSWORD || 'SemesterTest123!';

const students = Array.from({ length: 10 }, (_, index) => {
  const semester = index + 1;
  const is2025 = semester >= 6;
  const concentration = semester >= 5
    ? (is2025 ? 'Sistem Komputer' : 'Teknologi Informasi')
    : undefined;

  return {
    semester,
    email: `qa.semester${semester}@acaris.test`,
    npm_nip: `${is2025 ? '25' : '22'}5506${String(1000 + semester)}`,
    concentration
  };
});

const request = async (url, options = {}) => {
  const response = await fetch(url, options);
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: response.status, body };
};

const login = async (student) => request(`${baseUrl}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: student.email, password })
});

const register = async (student) => {
  const data = new FormData();
  data.set('name', `QA Semester ${student.semester}`);
  data.set('email', student.email);
  data.set('password', password);
  data.set('npm_nip', student.npm_nip);
  data.set('kode_kelas', process.env.TEST_KODE_KELAS || 'DSN-ABCD');
  data.set('ipk', '3.50');
  data.set('current_semester', String(student.semester));
  if (student.concentration) data.set('konsentrasi', student.concentration);
  return request(`${baseUrl}/auth/register/mahasiswa`, { method: 'POST', body: data });
};

const ask = async (token, message) => request(`${baseUrl}/chatbot/message`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ message })
});

const main = async () => {
  const lines = [
    '# Self-Hosted Semester Regression Matrix',
    '',
    `Generated: ${new Date().toISOString()}`,
    `API: ${baseUrl}`,
    '',
    '| Semester | Curriculum | Concentration | Login | IPS | SKS/Conversion | Prerequisite | Risk | Notes |',
    '|---:|---|---|---|---|---|---|---|---|'
  ];

  for (const student of students) {
    let loginResult = await login(student);
    let note = '';
    if (loginResult.status !== 200) {
      const registration = await register(student);
      note = `register=${registration.status}`;
      loginResult = await login(student);
    }

    if (loginResult.status !== 200) {
      lines.push(`| ${student.semester} | ${student.semester >= 6 ? 'TI-2025' : 'TI-2020'} | ${student.concentration || '-'} | FAIL ${loginResult.status} | - | - | - | - | ${note} |`);
      continue;
    }

    const token = loginResult.body?.data?.token;
    // One active chat session is stored per student. Send messages sequentially
    // to exercise production behavior rather than racing session creation.
    const ips = await ask(token, 'berapa ips saya tiap semester?');
    const capacity = await ask(token, 'Dengan IPS terakhir saya, berapa SKS yang bisa saya ambil dan apakah KP atau magang bisa dikonversi?');
    const prerequisite = await ask(token, 'Apa saja mata kuliah prasyarat saya?');
    const risk = await ask(token, 'Apa yang perlu saya perhatikan agar tidak berisiko DO?');

    const pass = (result) => result.status === 200 && result.body?.status === 'success' ? 'PASS' : `FAIL ${result.status}`;
    lines.push(`| ${student.semester} | ${student.semester >= 6 ? 'TI-2025' : 'TI-2020'} | ${student.concentration || '-'} | PASS | ${pass(ips)} | ${pass(capacity)} | ${pass(prerequisite)} | ${pass(risk)} | ${note || '-'} |`);
  }

  lines.push('', '## Scope', '', '- Accounts use the `qa.semesterN@acaris.test` prefix.', '- Registration may require OTP verification before login; failed login after registration is recorded instead of bypassed.', '- Schedule-conflict recommendations are not asserted because the self-hosted schedule source is not yet a structured class timetable.');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${lines.join('\n')}\n`);
  console.log(reportPath);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
