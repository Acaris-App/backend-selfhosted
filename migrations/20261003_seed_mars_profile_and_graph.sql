-- ==============================================================================
-- 20261003_seed_mars_profile_and_graph.sql
-- Seeder Resmi Profil Akademik & Memory Graph: Muhamad Arifin Syam (2255061008)
-- Universitas Lampung - S1 Teknik Informatika (Konsentrasi Rekayasa Perangkat Lunak)
-- ==============================================================================

BEGIN;

-- 1. USERS: Dosen Pembimbing & Mahasiswa
INSERT INTO users (name, email, password, role, npm_nip, is_verified, created_at, updated_at) VALUES
('Ir. Resty Annisa S, S.T., M.Kom', 'resty.annisa.s@eng.unila.ac.id', '$2b$10$wT55h1Ym5h.cWpX2N5f.qeFp8G1VbZ7eE6B3s7aW9QvC.w1h6v7kC', 'dosen', '199008302019032019', true, NOW(), NOW()),
('Puput Budi Wintoro, S.Kom., M.T.I.', 'puput.budi@eng.unila.ac.id', '$2b$10$wT55h1Ym5h.cWpX2N5f.qeFp8G1VbZ7eE6B3s7aW9QvC.w1h6v7kC', 'dosen', '198410312019031004', true, NOW(), NOW()),
('Muhamad Arifin Syam', 'marifinsyam73@gmail.com', '$2b$10$wT55h1Ym5h.cWpX2N5f.qeFp8G1VbZ7eE6B3s7aW9QvC.w1h6v7kC', 'mahasiswa', '2255061008', true, NOW(), NOW())
ON CONFLICT (npm_nip) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  updated_at = NOW();

-- 2. DOSEN_PA
INSERT INTO dosen_pa (user_id, kode_kelas, created_at, updated_at)
SELECT id, 'DSN-71BD', NOW(), NOW() FROM users WHERE npm_nip = '199008302019032019'
ON CONFLICT (user_id) DO UPDATE SET kode_kelas = 'DSN-71BD', updated_at = NOW();

INSERT INTO dosen_pa (user_id, kode_kelas, created_at, updated_at)
SELECT id, 'DSN-PBW', NOW(), NOW() FROM users WHERE npm_nip = '198410312019031004'
ON CONFLICT (user_id) DO UPDATE SET kode_kelas = 'DSN-PBW', updated_at = NOW();

-- 3. MAHASISWA PROFILE
INSERT INTO mahasiswa (user_id, angkatan, ipk, current_semester, konsentrasi, dosen_pa_id, created_at, updated_at)
SELECT 
  u_mhs.id,
  2022,
  3.74,
  8,
  'Rekayasa Perangkat Lunak',
  u_pa.id,
  NOW(),
  NOW()
FROM users u_mhs
LEFT JOIN users u_pa ON u_pa.npm_nip = '199008302019032019'
WHERE u_mhs.npm_nip = '2255061008'
ON CONFLICT (user_id) DO UPDATE SET
  angkatan = 2022,
  ipk = 3.74,
  current_semester = 8,
  konsentrasi = 'Rekayasa Perangkat Lunak',
  dosen_pa_id = EXCLUDED.dosen_pa_id,
  updated_at = NOW();

-- 4. DOKUMEN_MAHASISWA (17 Dokumen Fisik: KRS 1-8, KHS 1-8, Transkrip)
INSERT INTO dokumen_mahasiswa (user_id, document_type, semester, file_path, uploaded_at)
SELECT u.id, d.dtype, d.sem, d.fpath, NOW()
FROM users u
CROSS JOIN (VALUES
  ('krs'::varchar, 1::integer, 'uploads/documents/2255061008_krs_sem1.pdf'),
  ('khs'::varchar, 1::integer, 'uploads/documents/2255061008_khs_sem1.pdf'),
  ('krs'::varchar, 2::integer, 'uploads/documents/2255061008_krs_sem2.pdf'),
  ('khs'::varchar, 2::integer, 'uploads/documents/2255061008_khs_sem2.pdf'),
  ('krs'::varchar, 3::integer, 'uploads/documents/2255061008_krs_sem3.pdf'),
  ('khs'::varchar, 3::integer, 'uploads/documents/2255061008_khs_sem3.pdf'),
  ('krs'::varchar, 4::integer, 'uploads/documents/2255061008_krs_sem4.pdf'),
  ('khs'::varchar, 4::integer, 'uploads/documents/2255061008_khs_sem4.pdf'),
  ('krs'::varchar, 5::integer, 'uploads/documents/2255061008_krs_sem5.pdf'),
  ('khs'::varchar, 5::integer, 'uploads/documents/2255061008_khs_sem5.pdf'),
  ('krs'::varchar, 6::integer, 'uploads/documents/2255061008_krs_sem6.pdf'),
  ('khs'::varchar, 6::integer, 'uploads/documents/2255061008_khs_sem6.pdf'),
  ('krs'::varchar, 7::integer, 'uploads/documents/2255061008_krs_sem7.pdf'),
  ('khs'::varchar, 7::integer, 'uploads/documents/2255061008_khs_sem7.pdf'),
  ('krs'::varchar, 8::integer, 'uploads/documents/2255061008_krs_sem8.pdf'),
  ('khs'::varchar, 8::integer, 'uploads/documents/2255061008_khs_sem8.pdf'),
  ('transkrip'::varchar, NULL::integer, 'uploads/documents/2255061008_transkrip.pdf')
) AS d(dtype, sem, fpath)
WHERE u.npm_nip = '2255061008'
ON CONFLICT (user_id, document_type, COALESCE(semester, 0)) DO UPDATE SET
  file_path = EXCLUDED.file_path,
  uploaded_at = NOW();

-- 5. ACARIS MEMORY GRAPH: ENTITIES
-- Mahasiswa
INSERT INTO acaris_graph_entities (entity_type, name, canonical_id, properties, created_at, updated_at) VALUES
('mahasiswa', 'Muhamad Arifin Syam', 'mhs:2255061008', '{"npm": "2255061008", "email": "marifinsyam73@gmail.com", "angkatan": 2022, "current_semester": 8, "ipk": 3.74, "sks_lulus": 144, "konsentrasi": "Rekayasa Perangkat Lunak", "prodi": "S1-Teknik Informatika", "fakultas": "Fakultas Teknik Universitas Lampung"}'::jsonb, NOW(), NOW())
ON CONFLICT (canonical_id) DO UPDATE SET properties = EXCLUDED.properties, updated_at = NOW();

-- Dosen PA
INSERT INTO acaris_graph_entities (entity_type, name, canonical_id, properties, created_at, updated_at) VALUES
('dosen', 'Ir. Resty Annisa S, S.T., M.Kom', 'dsn:199008302019032019', '{"nip": "199008302019032019", "role": "Dosen Pembimbing Akademik", "email": "resty.annisa.s@eng.unila.ac.id", "kode_kelas": "DSN-71BD", "instansi": "Universitas Lampung"}'::jsonb, NOW(), NOW())
ON CONFLICT (canonical_id) DO UPDATE SET properties = EXCLUDED.properties, updated_at = NOW();

-- Dosen Pembimbing Skripsi
INSERT INTO acaris_graph_entities (entity_type, name, canonical_id, properties, created_at, updated_at) VALUES
('dosen', 'Puput Budi Wintoro, S.Kom., M.T.I.', 'dsn:198410312019031004', '{"nip": "198410312019031004", "role": "Dosen Pembimbing Skripsi", "email": "puput.budi@eng.unila.ac.id", "kode_kelas": "DSN-PBW", "keahlian": "Artificial Intelligence, Web Programming, 3D Modelling", "instansi": "S1 Teknik Informatika Universitas Lampung"}'::jsonb, NOW(), NOW())
ON CONFLICT (canonical_id) DO UPDATE SET properties = EXCLUDED.properties, updated_at = NOW();

-- Konsentrasi
INSERT INTO acaris_graph_entities (entity_type, name, canonical_id, properties, created_at, updated_at) VALUES
('konsentrasi', 'Konsentrasi Rekayasa Perangkat Lunak', 'konsentrasi:rekayasa_perangkat_lunak', '{"bidang": "Rekayasa Perangkat Lunak", "fakultas": "Teknik", "jurusan": "Teknik Elektro"}'::jsonb, NOW(), NOW())
ON CONFLICT (canonical_id) DO UPDATE SET properties = EXCLUDED.properties, updated_at = NOW();

-- Skripsi
INSERT INTO acaris_graph_entities (entity_type, name, canonical_id, properties, created_at, updated_at) VALUES
('skripsi', 'Rancang Bangun Memory Graph & Agentic Multi-LLM pada Sistem Bimbingan Acaris', 'skripsi:2255061008', '{"npm": "2255061008", "status": "Pengerjaan Skripsi", "bidang": "Rekayasa Perangkat Lunak & Kecerdasan Buatan", "tahun": 2026}'::jsonb, NOW(), NOW())
ON CONFLICT (canonical_id) DO UPDATE SET properties = EXCLUDED.properties, updated_at = NOW();

-- Bab Skripsi
INSERT INTO acaris_graph_entities (entity_type, name, canonical_id, properties, created_at, updated_at) VALUES
('bab', 'Bab 1: Pendahuluan & Latar Belakang Masalah', 'skripsi:2255061008:bab1', '{"nomor": 1, "status": "Selesai", "halaman": 12}'::jsonb, NOW(), NOW()),
('bab', 'Bab 2: Tinjauan Pustaka & Arsitektur Knowledge Graph', 'skripsi:2255061008:bab2', '{"nomor": 2, "status": "Selesai", "halaman": 28}'::jsonb, NOW(), NOW()),
('bab', 'Bab 3: Metodologi Penelitian & Graph Traversal', 'skripsi:2255061008:bab3', '{"nomor": 3, "status": "Selesai Direvisi", "halaman": 22}'::jsonb, NOW(), NOW()),
('bab', 'Bab 4: Implementasi Microservices & Hasil Evaluasi', 'skripsi:2255061008:bab4', '{"nomor": 4, "status": "Dalam Pengerjaan", "halaman": 35}'::jsonb, NOW(), NOW()),
('bab', 'Bab 5: Kesimpulan & Rencana Pengembangan', 'skripsi:2255061008:bab5', '{"nomor": 5, "status": "Draf", "halaman": 8}'::jsonb, NOW(), NOW())
ON CONFLICT (canonical_id) DO UPDATE SET properties = EXCLUDED.properties, updated_at = NOW();

-- Revisi
INSERT INTO acaris_graph_entities (entity_type, name, canonical_id, properties, created_at, updated_at) VALUES
('revisi', 'Revisi Metodologi Evaluasi Latency Traversal (Bab 3) [SELESAI]', 'revisi:2255061008:bab3:latency', '{"bab": 3, "status": "SELESAI", "deadline": "2026-10-15", "catatan": "Tambahkan komparasi latency response time pgvector vs memory graph"}'::jsonb, NOW(), NOW())
ON CONFLICT (canonical_id) DO UPDATE SET properties = EXCLUDED.properties, updated_at = NOW();

-- Topik Riset
INSERT INTO acaris_graph_entities (entity_type, name, canonical_id, properties, created_at, updated_at) VALUES
('topik_riset', 'Graph-RAG & Agentic Reasoning', 'topik:graph_rag', '{"kategori": "Kecerdasan Buatan"}'::jsonb, NOW(), NOW()),
('topik_riset', 'Self-Hosted Cloud Microservices', 'topik:microservices', '{"kategori": "Rekayasa Perangkat Lunak"}'::jsonb, NOW(), NOW())
ON CONFLICT (canonical_id) DO UPDATE SET properties = EXCLUDED.properties, updated_at = NOW();

-- 17 Dokumen Entities di Graf
INSERT INTO acaris_graph_entities (entity_type, name, canonical_id, properties, created_at, updated_at) VALUES
('konsep', 'Dokumen KRS Semester 1', 'dokumen:2255061008:krs1', '{"tipe": "krs", "semester": 1}'::jsonb, NOW(), NOW()),
('konsep', 'Dokumen KHS Semester 1', 'dokumen:2255061008:khs1', '{"tipe": "khs", "semester": 1}'::jsonb, NOW(), NOW()),
('konsep', 'Dokumen KRS Semester 2', 'dokumen:2255061008:krs2', '{"tipe": "krs", "semester": 2}'::jsonb, NOW(), NOW()),
('konsep', 'Dokumen KHS Semester 2', 'dokumen:2255061008:khs2', '{"tipe": "khs", "semester": 2}'::jsonb, NOW(), NOW()),
('konsep', 'Dokumen KRS Semester 3', 'dokumen:2255061008:krs3', '{"tipe": "krs", "semester": 3}'::jsonb, NOW(), NOW()),
('konsep', 'Dokumen KHS Semester 3', 'dokumen:2255061008:khs3', '{"tipe": "khs", "semester": 3}'::jsonb, NOW(), NOW()),
('konsep', 'Dokumen KRS Semester 4', 'dokumen:2255061008:krs4', '{"tipe": "krs", "semester": 4}'::jsonb, NOW(), NOW()),
('konsep', 'Dokumen KHS Semester 4', 'dokumen:2255061008:khs4', '{"tipe": "khs", "semester": 4}'::jsonb, NOW(), NOW()),
('konsep', 'Dokumen KRS Semester 5', 'dokumen:2255061008:krs5', '{"tipe": "krs", "semester": 5}'::jsonb, NOW(), NOW()),
('konsep', 'Dokumen KHS Semester 5', 'dokumen:2255061008:khs5', '{"tipe": "khs", "semester": 5}'::jsonb, NOW(), NOW()),
('konsep', 'Dokumen KRS Semester 6', 'dokumen:2255061008:krs6', '{"tipe": "krs", "semester": 6}'::jsonb, NOW(), NOW()),
('konsep', 'Dokumen KHS Semester 6', 'dokumen:2255061008:khs6', '{"tipe": "khs", "semester": 6}'::jsonb, NOW(), NOW()),
('konsep', 'Dokumen KRS Semester 7', 'dokumen:2255061008:krs7', '{"tipe": "krs", "semester": 7}'::jsonb, NOW(), NOW()),
('konsep', 'Dokumen KHS Semester 7', 'dokumen:2255061008:khs7', '{"tipe": "khs", "semester": 7}'::jsonb, NOW(), NOW()),
('konsep', 'Dokumen KRS Semester 8', 'dokumen:2255061008:krs8', '{"tipe": "krs", "semester": 8}'::jsonb, NOW(), NOW()),
('konsep', 'Dokumen KHS Semester 8', 'dokumen:2255061008:khs8', '{"tipe": "khs", "semester": 8}'::jsonb, NOW(), NOW()),
('konsep', 'Dokumen TRANSKRIP Semester All', 'dokumen:2255061008:transkrip', '{"tipe": "transkrip", "semester": null, "total_sks": 144, "ipk": 3.74}'::jsonb, NOW(), NOW())
ON CONFLICT (canonical_id) DO UPDATE SET properties = EXCLUDED.properties, updated_at = NOW();

-- 6. ACARIS MEMORY GRAPH: RELATIONS
-- Mahasiswa -> Dosen PA
INSERT INTO acaris_graph_relations (source_id, target_id, relation_type, weight, properties)
SELECT m.id, d.id, 'DIBIMBING_OLEH', 1.0, '{"peran": "Dosen Pembimbing Akademik", "kode_kelas": "DSN-71BD"}'::jsonb
FROM acaris_graph_entities m, acaris_graph_entities d
WHERE m.canonical_id = 'mhs:2255061008' AND d.canonical_id = 'dsn:199008302019032019'
ON CONFLICT (source_id, target_id, relation_type) DO UPDATE SET properties = EXCLUDED.properties;

-- Mahasiswa -> Dosen Pembimbing Skripsi (Pak Puput Budi Wintoro)
INSERT INTO acaris_graph_relations (source_id, target_id, relation_type, weight, properties)
SELECT m.id, d.id, 'DIBIMBING_OLEH', 1.0, '{"peran": "Dosen Pembimbing Utama Skripsi"}'::jsonb
FROM acaris_graph_entities m, acaris_graph_entities d
WHERE m.canonical_id = 'mhs:2255061008' AND d.canonical_id = 'dsn:198410312019031004'
ON CONFLICT (source_id, target_id, relation_type) DO UPDATE SET properties = EXCLUDED.properties;

-- Mahasiswa -> Konsentrasi
INSERT INTO acaris_graph_relations (source_id, target_id, relation_type, weight, properties)
SELECT m.id, k.id, 'MENGAMBIL_KONSENTRASI', 1.0, '{}'::jsonb
FROM acaris_graph_entities m, acaris_graph_entities k
WHERE m.canonical_id = 'mhs:2255061008' AND k.canonical_id = 'konsentrasi:rekayasa_perangkat_lunak'
ON CONFLICT (source_id, target_id, relation_type) DO NOTHING;

-- Mahasiswa -> Skripsi
INSERT INTO acaris_graph_relations (source_id, target_id, relation_type, weight, properties)
SELECT m.id, s.id, 'MENGERJAKAN', 1.0, '{"peran": "Peneliti Utama", "tahun": 2026}'::jsonb
FROM acaris_graph_entities m, acaris_graph_entities s
WHERE m.canonical_id = 'mhs:2255061008' AND s.canonical_id = 'skripsi:2255061008'
ON CONFLICT (source_id, target_id, relation_type) DO UPDATE SET properties = EXCLUDED.properties;

-- Skripsi -> Bab 1..5
INSERT INTO acaris_graph_relations (source_id, target_id, relation_type, weight, properties)
SELECT s.id, b.id, 'MEMILIKI_BAB', 1.0, '{}'::jsonb
FROM acaris_graph_entities s, acaris_graph_entities b
WHERE s.canonical_id = 'skripsi:2255061008' AND b.canonical_id LIKE 'skripsi:2255061008:bab%'
ON CONFLICT (source_id, target_id, relation_type) DO NOTHING;

-- Skripsi -> Dosen Pembimbing (Pak Puput)
INSERT INTO acaris_graph_relations (source_id, target_id, relation_type, weight, properties)
SELECT s.id, d.id, 'DISUPERVISI_OLEH', 1.0, '{"peran": "Pembimbing Utama"}'::jsonb
FROM acaris_graph_entities s, acaris_graph_entities d
WHERE s.canonical_id = 'skripsi:2255061008' AND d.canonical_id = 'dsn:198410312019031004'
ON CONFLICT (source_id, target_id, relation_type) DO NOTHING;

-- Bab 3 -> Revisi
INSERT INTO acaris_graph_relations (source_id, target_id, relation_type, weight, properties)
SELECT b.id, r.id, 'MEMILIKI_REVISI', 1.0, '{}'::jsonb
FROM acaris_graph_entities b, acaris_graph_entities r
WHERE b.canonical_id = 'skripsi:2255061008:bab3' AND r.canonical_id = 'revisi:2255061008:bab3:latency'
ON CONFLICT (source_id, target_id, relation_type) DO NOTHING;

-- Pak Puput -> Revisi
INSERT INTO acaris_graph_relations (source_id, target_id, relation_type, weight, properties)
SELECT d.id, r.id, 'MEMBERIKAN_CATATAN', 0.95, '{}'::jsonb
FROM acaris_graph_entities d, acaris_graph_entities r
WHERE d.canonical_id = 'dsn:198410312019031004' AND r.canonical_id = 'revisi:2255061008:bab3:latency'
ON CONFLICT (source_id, target_id, relation_type) DO NOTHING;

-- Skripsi -> Topik Riset
INSERT INTO acaris_graph_relations (source_id, target_id, relation_type, weight, properties)
SELECT s.id, t.id, 'TERKAIT_BIDANG', 1.0, '{}'::jsonb
FROM acaris_graph_entities s, acaris_graph_entities t
WHERE s.canonical_id = 'skripsi:2255061008' AND t.canonical_id IN ('topik:graph_rag', 'topik:microservices')
ON CONFLICT (source_id, target_id, relation_type) DO NOTHING;

-- Mahasiswa -> 17 Dokumen
INSERT INTO acaris_graph_relations (source_id, target_id, relation_type, weight, properties)
SELECT m.id, d.id, 'MENGUNGGAH', 0.80, '{}'::jsonb
FROM acaris_graph_entities m, acaris_graph_entities d
WHERE m.canonical_id = 'mhs:2255061008' AND d.canonical_id LIKE 'dokumen:2255061008:%'
ON CONFLICT (source_id, target_id, relation_type) DO NOTHING;

-- 7. OBSERVATIONS
INSERT INTO acaris_graph_observations (entity_id, observation, source, source_ref_id, created_at)
SELECT m.id, 'Mahasiswa aktif angkatan 2022, semester 8, IPK: 3.74, SKS Lulus: 144.', 'sync', 'sync:2255061008', NOW()
FROM acaris_graph_entities m WHERE m.canonical_id = 'mhs:2255061008'
ON CONFLICT DO NOTHING;

INSERT INTO acaris_graph_observations (entity_id, observation, source, source_ref_id, created_at)
SELECT m.id, 'Memiliki 17 dokumen resmi terunggah: KRS 1-8, KHS 1-8, dan Transkrip Akademik resmi Universitas Lampung.', 'dokumen', 'docs:2255061008', NOW()
FROM acaris_graph_entities m WHERE m.canonical_id = 'mhs:2255061008'
ON CONFLICT DO NOTHING;

INSERT INTO acaris_graph_observations (entity_id, observation, source, source_ref_id, created_at)
SELECT m.id, 'Dosen Pembimbing Akademik resmi: Ir. Resty Annisa S, S.T., M.Kom (NIP: 199008302019032019).', 'akademik', 'pa:2255061008', NOW()
FROM acaris_graph_entities m WHERE m.canonical_id = 'mhs:2255061008'
ON CONFLICT DO NOTHING;

INSERT INTO acaris_graph_observations (entity_id, observation, source, source_ref_id, created_at)
SELECT m.id, 'Dosen Pembimbing Skripsi resmi: Puput Budi Wintoro, S.Kom., M.T.I. (NIP: 198410312019031004).', 'akademik', 'skripsi:pbw:2255061008', NOW()
FROM acaris_graph_entities m WHERE m.canonical_id = 'mhs:2255061008'
ON CONFLICT DO NOTHING;

INSERT INTO acaris_graph_observations (entity_id, observation, source, source_ref_id, created_at)
SELECT r.id, 'Catatan Dosen Pembimbing Pak Puput: Perbaiki bab 3 dengan komparasi latency pgvector vs hybrid memory graph traversal.', 'bimbingan', 'bimbingan:pbw:bab3', NOW()
FROM acaris_graph_entities r WHERE r.canonical_id = 'revisi:2255061008:bab3:latency'
ON CONFLICT DO NOTHING;

INSERT INTO acaris_graph_observations (entity_id, observation, source, source_ref_id, created_at)
SELECT r.id, 'Mahasiswa telah menyelesaikan benchmark 100 concurrent requests: Latency pgvector 42ms vs Hybrid Graph 18ms (peningkatan 57%). Berkas draf Bab 3 v2 diunggah dan diverifikasi.', 'dokumen', 'revisi:selesai:bab3', NOW()
FROM acaris_graph_entities r WHERE r.canonical_id = 'revisi:2255061008:bab3:latency'
ON CONFLICT DO NOTHING;

COMMIT;
