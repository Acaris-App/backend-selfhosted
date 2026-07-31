require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local'
});

const db = require('../config/db');

const required = [
  ['INF625101', 'Pengenalan Pemrograman', 3, 1],
  ['INF625102', 'Algoritma Pemrograman', 2, 1],
  ['INF625103', 'Kalkulus', 2, 1],
  ['UNI625109', 'Bahasa Indonesia', 2, 1],
  ['UNI625107', 'Pancasila', 2, 1],
  ['INF625104', 'Praktikum Pengenalan Pemrograman', 1, 1],
  ['INF625105', 'Logika', 2, 1],
  ['INF625106', 'Probabilitas dan Statistik', 3, 1],
  ['INF625107', 'Teknik Digital', 1, 1],
  ['INF625108', 'Praktikum Teknik Digital', 2, 1],
  ['INF625109', 'Pengetahuan Lingkungan', 3, 2],
  ['INF625110', 'Struktur Data', 2, 2],
  ['INF625111', 'Aljabar Matriks', 3, 2],
  ['INF625112', 'Pemrograman Berorientasi Objek', 2, 2],
  ['UNI625108', 'Kewarganegaraan', 1, 2],
  ['INF625113', 'Praktikum Struktur Data', 3, 2],
  ['INF625114', 'Matematika Diskrit', 3, 2],
  ['INF625115', 'Rekayasa Perangkat Lunak', 1, 2],
  ['INF625116', 'Praktikum Rekayasa Perangkat Lunak', 3, 2],
  ['INF625201', 'Interaksi Manusia dan Komputer', 3, 3],
  ['UNI625201', 'Kewirausahaan', 3, 3],
  ['INF625202', 'Sistem Operasi', 3, 3],
  ['INF625203', 'Sistem Basis Data', 3, 3],
  ['INF625204', 'Sistem Informasi', 3, 3],
  ['INF625205', 'Organisasi dan Arsitektur Komputer', 1, 3],
  ['INF625206', 'Praktikum Sistem Operasi', 1, 3],
  ['INF625207', 'Praktikum Sistem Basis Data', 3, 3],
  ['INF625208', 'Teori Bahasa dan Automata', 3, 3],
  ['INF625209', 'Kecerdasan Buatan', 3, 4],
  ['INF625210', 'Jaringan Komputer', 3, 4],
  ['INF625211', 'Embedded System', 3, 4],
  ['INF625212', 'Analisa dan Perancangan Perangkat Lunak', 2, 4],
  ['INF625213', 'Komputasi Paralel dan Terdistribusi', 3, 4],
  ['INF625214', 'Praktikum Embedded System', 1, 4],
  ['INF625215', 'Pemrograman Web', 3, 4],
  ['INF625216', 'Praktikum Jaringan Komputer', 1, 4],
  ['INF625217', 'Praktikum Pemrograman Web', 1, 4],
  ['INF625301', 'Machine Learning', 3, 5],
  ['INF625302', 'Jaringan Syaraf Tiruan', 3, 5],
  ['INF625303', 'Manajemen Proyek Teknologi Informasi', 2, 5],
  ['INF625304', 'Keamanan Sistem Informasi', 3, 5],
  ['INF625305', 'Praktikum Keamanan Sistem Informasi', 1, 5],
  ['INF625306', 'Mobile Programming', 3, 5],
  ['INF625307', 'Internet of Things', 3, 5],
  ['INF625308', 'Metodologi Penelitian', 3, 6],
  ['INF625309', 'Pengolahan Citra Digital', 3, 6],
  ['INF625310', 'Kuliah Kerja Nyata (KKN)', 3, 6],
  ['INF625311', 'Data Mining', 2, 6],
  ['UNI62510X', 'Pendidikan Agama', 3, 6],
  ['INF625312', 'Sistem Informasi Geografis', 3, 6],
  ['INF625401', 'Etika Profesi', 2, 7],
  ['INF625402', 'Proyek Teknologi Informasi / Capstone Project', 3, 7],
  ['INF625403', 'Praktek Kerja Lapangan', 3, 7],
  ['INF625404', 'Skripsi', 4, 8],
  ['INF625405', 'Seminar Hasil', 1, 8],
  ['INF625406', 'Seminar Usul', 1, 8]
];

const electiveNames = [
  ['UNI625302', 'Bahasa Inggris'], ['INF625313', 'Web Framework'],
  ['INF625314', 'Basis Data Lanjut'], ['INF625315', 'Switching, Routing, and Wireless Essentials'],
  ['INF625316', 'Enterprise Architecture'], ['INF625317', 'Technopreneurship'],
  ['INF625318', 'Agile Software Development'], ['INF625319', 'Software Testing and Quality Assurance'],
  ['INF625320', 'Computer Vision'], ['INF625321', 'Virtualisasi dan Cloud Computing'],
  ['INF625322', 'Enterprise Networking, Security, and Automation'], ['INF625323', 'Big Data'],
  ['INF625324', 'Natural Language Processing'], ['INF625325', 'Deep Learning'],
  ['INF625326', 'Audit Teknologi dan Informasi'], ['INF625327', 'E-Business'],
  ['INF625328', 'User Experience'], ['INF625329', 'Augmented Reality'],
  ['INF625330', 'Sistem Pakar'], ['INF625331', 'Penginderaan Jauh'],
  ['INF625332', 'Semantik Web'], ['INF625333', 'Hukum Cyber dan Kekayaan Intelektual'],
  ['INF625334', 'Virtual Reality'], ['INF625335', 'Pemrograman Fungsional'],
  ['INF625336', 'Kriptografi dan Blockchain'], ['INF625337', 'Antarmuka dan Peripheral'],
  ['INF625338', 'Tata Kelola Teknologi Informasi']
];

const concentrations = {
  SK: [],
  RPL: [],
  TI: []
};

const concentrationNames = {
  SK: 'Sistem Komputer',
  RPL: 'Rekayasa Perangkat Lunak',
  TI: 'Teknologi Informasi'
};

const run = async () => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const curriculum = await client.query(
      `INSERT INTO kurikulum (kode, nama, tahun_mulai, status)
       VALUES ('TI-2025', 'Kurikulum Teknik Informatika 2025', 2025, 'aktif')
       ON CONFLICT (kode) DO UPDATE SET nama = EXCLUDED.nama, status = 'aktif', updated_at = NOW()
       RETURNING id`
    );
    const curriculumId = curriculum.rows[0].id;
    for (const [code, name, sks, semester] of required) {
      const course = await client.query(
        `INSERT INTO mata_kuliah (kode, nama, sks) VALUES ($1, $2, $3)
         ON CONFLICT (kode) DO UPDATE SET nama = EXCLUDED.nama, sks = EXCLUDED.sks, status = 'aktif', updated_at = NOW()
         RETURNING id`, [code, name, sks]
      );
      await client.query(
        `INSERT INTO kurikulum_mata_kuliah (kurikulum_id, mata_kuliah_id, semester_rekomendasi, sifat)
         VALUES ($1::BIGINT, $2::BIGINT, $3, 'wajib')
         ON CONFLICT (kurikulum_id, mata_kuliah_id) DO UPDATE
         SET semester_rekomendasi = EXCLUDED.semester_rekomendasi, sifat = 'wajib'`,
        [curriculumId, course.rows[0].id, semester]
      );
    }
    for (const [code, name] of electiveNames) {
      const course = await client.query(
        `INSERT INTO mata_kuliah (kode, nama, sks) VALUES ($1, $2, 2)
         ON CONFLICT (kode) DO UPDATE SET nama = EXCLUDED.nama, sks = 2, status = 'aktif', updated_at = NOW()
         RETURNING id`, [code, name]
      );
      await client.query(
        `INSERT INTO kurikulum_mata_kuliah (kurikulum_id, mata_kuliah_id, semester_rekomendasi, sifat)
         VALUES ($1::BIGINT, $2::BIGINT, 5, 'pilihan')
         ON CONFLICT (kurikulum_id, mata_kuliah_id) DO UPDATE SET sifat = 'pilihan'`,
        [curriculumId, course.rows[0].id]
      );
    }
    for (const [code, name] of Object.entries(concentrationNames)) {
      const concentration = await client.query(
        `INSERT INTO konsentrasi (kurikulum_id, kode, nama) VALUES ($1, $2, $3)
          ON CONFLICT (kurikulum_id, kode) DO UPDATE SET nama = EXCLUDED.nama, status = 'aktif', updated_at = NOW()
          RETURNING id`, [curriculumId, code, name]
      );
      for (const courseCode of concentrations[code]) {
        await client.query(
          `INSERT INTO konsentrasi_mata_kuliah (konsentrasi_id, kurikulum_mata_kuliah_id)
           SELECT $1::BIGINT, kmk.id FROM kurikulum_mata_kuliah kmk
           JOIN mata_kuliah mk ON mk.id = kmk.mata_kuliah_id
           WHERE kmk.kurikulum_id = $2::BIGINT AND mk.kode = $3
           ON CONFLICT DO NOTHING`, [concentration.rows[0].id, curriculumId, courseCode]
        );
      }
    }
    await client.query('COMMIT');
     console.log(`Seeded curriculum ${curriculumId}: ${required.length + electiveNames.length} courses, 3 concentrations.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await db.end();
  }
};

run().catch((error) => { console.error(error); process.exitCode = 1; });
