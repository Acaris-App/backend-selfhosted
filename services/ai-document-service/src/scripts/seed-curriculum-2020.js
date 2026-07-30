require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local'
});

const db = require('../config/db');

const rows = [
  ['INF620101', 'Pengetahuan Lingkungan', 2, 1, 'wajib'],
  ['INF620102', 'Teknik Digital', 3, 1, 'wajib'],
  ['INF620103', 'Pengantar Teknologi Informasi', 3, 1, 'wajib'],
  ['INF620104', 'Algoritma dan Pemrograman', 3, 1, 'wajib'],
  ['INF620105', 'Kalkulus', 2, 1, 'wajib'],
  ['INF620106', 'Industri Pertanian', 2, 1, 'wajib'],
  ['INF620107', 'Praktikum Algoritma dan Pemrograman', 1, 1, 'wajib'],
  ['UNI620106', 'Pendidikan Bahasa Indonesia', 2, 1, 'wajib'],
  ['UNI620108', 'Pendidikan Pancasila', 2, 1, 'wajib'],
  ['UNI620109', 'Pendidikan Etika dan Kearifan Lokal', 2, 1, 'wajib'],
  ['INF620108', 'Probabilitas dan Statistik', 3, 2, 'wajib'],
  ['INF620109', 'Struktur Data', 3, 2, 'wajib'],
  ['INF620110', 'Bahasa Inggris', 3, 2, 'wajib'],
  ['INF620111', 'Logika', 2, 2, 'wajib'],
  ['INF620112', 'Praktikum Teknik Digital', 1, 2, 'wajib'],
  ['INF620113', 'Matematika Diskrit', 3, 2, 'wajib'],
  ['INF620114', 'Rekayasa Perangkat Lunak', 2, 2, 'wajib'],
  ['UNI620101', 'Pendidikan Agama Islam', 3, 2, 'wajib', 'AGAMA'],
  ['UNI620102', 'Pendidikan Agama Katholik', 3, 2, 'wajib', 'AGAMA'],
  ['UNI620103', 'Pendidikan Agama Kristen', 3, 2, 'wajib', 'AGAMA'],
  ['UNI620104', 'Pendidikan Agama Hindu', 3, 2, 'wajib', 'AGAMA'],
  ['UNI620105', 'Pendidikan Agama Budha', 3, 2, 'wajib', 'AGAMA'],
  ['UNI620107', 'Pendidikan Kewarganegaraan', 2, 2, 'wajib'],
  ['INF620201', 'Interaksi Manusia dan Komputer', 3, 3, 'wajib'],
  ['INF620202', 'Antarmuka dan Peripheral', 3, 3, 'wajib'],
  ['INF620203', 'Sistem Operasi', 3, 3, 'wajib'],
  ['INF620204', 'Praktikum Struktur Data', 1, 3, 'wajib'],
  ['INF620205', 'Sistem Basis Data', 3, 3, 'wajib'],
  ['INF620206', 'Sistem Informasi', 2, 3, 'wajib'],
  ['INF620207', 'Organisasi dan Arsitektur Komputer', 3, 3, 'wajib'],
  ['INF620208', 'Praktikum Sistem Operasi', 1, 3, 'wajib'],
  ['INF620209', 'Praktikum Rekayasa Perangkat Lunak', 1, 3, 'wajib'],
  ['INF620210', 'Jaringan Komputer', 3, 4, 'wajib'],
  ['INF620211', 'Embedded System', 3, 4, 'wajib'],
  ['INF620212', 'Teori Bahasa dan Automata', 3, 4, 'wajib'],
  ['INF620213', 'Pemrograman Berorientasi Objek', 4, 4, 'wajib'],
  ['INF620214', 'Praktikum Embedded System', 1, 4, 'wajib'],
  ['INF620215', 'Kecerdasan Buatan', 3, 4, 'wajib'],
  ['INF620216', 'Pemrograman Web', 3, 4, 'wajib'],
  ['INF620217', 'Praktikum Sistem Basis Data', 1, 4, 'wajib'],
  ['INF620301', 'Manajemen Proyek Teknologi Informasi', 3, 5, 'wajib'],
  ['INF620302', 'Etika Profesi', 2, 5, 'wajib'],
  ['INF620303', 'Keamanan Sistem Informasi', 3, 5, 'wajib'],
  ['INF620304', 'Pengolahan Citra', 2, 5, 'wajib'],
  ['INF620305', 'Praktikum Jaringan Komputer', 1, 5, 'wajib'],
  ['INF620306', 'Praktikum Pemrograman Web', 1, 5, 'wajib'],
  ['INF620307', 'Internet of Things', 3, 5, 'wajib'],
  ['INF620308', 'Analisa dan Perancangan Perangkat Lunak', 2, 5, 'pilihan'],
  ['INF620309', 'Web Framework', 2, 5, 'pilihan'],
  ['INF620310', 'Basis Data Lanjut', 2, 5, 'pilihan'],
  ['INF620311', 'Metode Numerik', 2, 5, 'pilihan'],
  ['INF620312', 'Mekatronika', 2, 5, 'pilihan'],
  ['INF620313', 'Mikroelektronika', 2, 5, 'pilihan'],
  ['INF620314', 'Tata Kelola Teknologi Informasi', 2, 5, 'pilihan'],
  ['INF620315', 'Jaringan Komputer Lanjut 1', 2, 5, 'pilihan'],
  ['INF620316', 'Enterprise Architecture', 2, 5, 'pilihan'],
  ['INF620317', 'Machine Learning', 2, 5, 'pilihan'],
  ['INF620318', 'Data Mining', 2, 5, 'pilihan'],
  ['INF620319', 'Jaringan Syaraf Tiruan', 2, 5, 'pilihan'],
  ['INF620320', 'Metodologi Penelitian', 2, 6, 'wajib'],
  ['INF620321', 'Sistem Informasi Geografis', 3, 6, 'wajib'],
  ['INF620322', 'Praktikum Keamanan Sistem Informasi', 1, 6, 'wajib'],
  ['INF620323', 'Praktek Kerja Lapangan', 3, 6, 'wajib'],
  ['INF620324', 'Technopreneurship', 3, 6, 'wajib'],
  ['INF620325', 'Mobile Computing', 2, 6, 'pilihan'],
  ['INF620326', 'Agile Software Development', 2, 6, 'pilihan'],
  ['INF620327', 'Software Testing and Quality Assurance', 2, 6, 'pilihan'],
  ['INF620328', 'Computer Vision', 2, 6, 'pilihan'],
  ['INF620329', 'Pemodelan Simulasi', 2, 6, 'pilihan'],
  ['INF620330', 'Sistem Kendali', 2, 6, 'pilihan'],
  ['INF620331', 'Virtualisasi dan Cloud Computing', 2, 6, 'pilihan'],
  ['INF620332', 'Jaringan Komputer Lanjut 2', 2, 6, 'pilihan'],
  ['INF620333', 'Big Data', 2, 6, 'pilihan'],
  ['INF620334', 'Sistem Penunjang Keputusan', 2, 6, 'pilihan'],
  ['INF620335', 'Natural Language Processing', 2, 6, 'pilihan'],
  ['INF620336', 'Deep Learning', 2, 6, 'pilihan'],
  ['INF620337', 'E-Business', 2, 6, 'pilihan'],
  ['INF620338', 'User Experience', 2, 6, 'pilihan'],
  ['INF620339', 'Augmented Reality', 2, 6, 'pilihan'],
  ['INF620340', 'Sistem Pakar', 2, 7, 'pilihan'],
  ['INF620341', 'Penginderaan Jauh', 2, 7, 'pilihan'],
  ['INF620342', 'Semantik Web', 2, 7, 'pilihan'],
  ['INF620343', 'Hukum Cyber dan Kekayaan Intelektual', 2, 7, 'pilihan'],
  ['INF620347', 'Sistem Pertanian Berkelanjutan', 2, 7, 'pilihan'],
  ['INF620401', 'Kapita Selekta', 2, 7, 'wajib'],
  ['INF620402', 'Proyek Teknologi Informasi', 3, 7, 'wajib'],
  ['UNI620401', 'Kuliah Kerja Nyata (KKN)', 3, 7, 'wajib'],
  ['INF620344', 'Virtual Reality', 2, 8, 'pilihan'],
  ['INF620345', 'Pemrograman Fungsional', 2, 8, 'pilihan'],
  ['INF620346', 'Audit Teknologi Informasi', 2, 8, 'pilihan'],
  ['INF620403', 'Seminar Usul', 1, 8, 'wajib'],
  ['INF620404', 'Seminar Hasil', 1, 8, 'wajib'],
  ['INF620405', 'Skripsi', 4, 8, 'wajib']
];

const concentrationCourses = {
  RPL: ['INF620308', 'INF620309', 'INF620326', 'INF620327', 'INF620338', 'INF620339', 'INF620342', 'INF620344', 'INF620345'],
  DAI: ['INF620310', 'INF620311', 'INF620317', 'INF620318', 'INF620319', 'INF620328', 'INF620329', 'INF620333', 'INF620334', 'INF620335', 'INF620336', 'INF620340', 'INF620341'],
  JKK: ['INF620312', 'INF620313', 'INF620315', 'INF620325', 'INF620330', 'INF620331', 'INF620332', 'INF620343'],
  SIT: ['INF620314', 'INF620316', 'INF620324', 'INF620337', 'INF620346', 'INF620347']
};

const run = async () => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const curriculum = await client.query(
      `INSERT INTO kurikulum (kode, nama, tahun_mulai, tahun_selesai, status)
       VALUES ('TI-2020', 'Kurikulum S1 Teknik Informatika 2020', 2020, 2024, 'aktif')
       ON CONFLICT (kode) DO UPDATE
         SET nama = EXCLUDED.nama, tahun_selesai = EXCLUDED.tahun_selesai,
             status = 'aktif', updated_at = NOW()
       RETURNING id`
    );
    const curriculumId = curriculum.rows[0].id;
    for (const [code, name, sks, semester, sifat, group] of rows) {
      const course = await client.query(
        `INSERT INTO mata_kuliah (kode, nama, sks)
         VALUES ($1, $2, $3)
         ON CONFLICT (kode) DO UPDATE
           SET nama = EXCLUDED.nama, sks = EXCLUDED.sks, status = 'aktif', updated_at = NOW()
         RETURNING id`,
        [code, name, sks]
      );
      await client.query(
        `INSERT INTO kurikulum_mata_kuliah
           (kurikulum_id, mata_kuliah_id, semester_rekomendasi, sifat, kelompok_alternatif)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (kurikulum_id, mata_kuliah_id) DO UPDATE
           SET semester_rekomendasi = EXCLUDED.semester_rekomendasi,
               sifat = EXCLUDED.sifat,
               kelompok_alternatif = EXCLUDED.kelompok_alternatif`,
        [curriculumId, course.rows[0].id, semester, sifat, group || null]
      );
    }

    for (const [concentrationCode, courseCodes] of Object.entries(concentrationCourses)) {
      const concentration = await client.query(
        `SELECT id FROM konsentrasi WHERE kode = $1`,
        [concentrationCode]
      );
      if (!concentration.rows[0]) throw new Error(`Konsentrasi ${concentrationCode} belum tersedia`);
      for (const courseCode of courseCodes) {
        await client.query(
          `INSERT INTO konsentrasi_mata_kuliah (konsentrasi_id, kurikulum_mata_kuliah_id)
           SELECT $1, kmk.id
           FROM kurikulum_mata_kuliah kmk
           JOIN mata_kuliah mk ON mk.id = kmk.mata_kuliah_id
           WHERE kmk.kurikulum_id = $2 AND mk.kode = $3
           ON CONFLICT DO NOTHING`,
          [concentration.rows[0].id, curriculumId, courseCode]
        );
      }
    }

    const curriculum2025 = await client.query(`SELECT id FROM kurikulum WHERE kode = 'TI-2025'`);
    if (!curriculum2025.rows[0]) throw new Error('Kurikulum TI-2025 belum tersedia');
    await client.query(
      `INSERT INTO mahasiswa_kurikulum (mahasiswa_user_id, kurikulum_id, assignment_source)
       SELECT m.user_id,
              CASE WHEN m.angkatan >= 2025 THEN $2::BIGINT ELSE $1::BIGINT END,
              'angkatan'
       FROM mahasiswa m
       ON CONFLICT (mahasiswa_user_id) DO UPDATE
         SET kurikulum_id = EXCLUDED.kurikulum_id,
             assignment_source = EXCLUDED.assignment_source,
             assigned_at = NOW()`,
      [curriculumId, curriculum2025.rows[0].id]
    );
    await client.query('COMMIT');
    console.log(`Seeded TI-2020 curriculum ${curriculumId}: ${rows.length} courses and student assignments.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await db.end();
  }
};

run().catch((error) => { console.error(error); process.exitCode = 1; });
