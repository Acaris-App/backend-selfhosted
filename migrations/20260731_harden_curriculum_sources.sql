BEGIN;

ALTER TABLE kurikulum
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS source_label VARCHAR(255),
  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'needs_review';

ALTER TABLE kurikulum
  DROP CONSTRAINT IF EXISTS kurikulum_verification_status_check;
ALTER TABLE kurikulum
  ADD CONSTRAINT kurikulum_verification_status_check CHECK (
    verification_status IN ('verified', 'needs_review', 'deprecated')
  );

CREATE TABLE IF NOT EXISTS kurikulum_sumber (
  id BIGSERIAL PRIMARY KEY,
  kurikulum_id BIGINT NOT NULL REFERENCES kurikulum(id) ON DELETE CASCADE,
  source_type VARCHAR(30) NOT NULL,
  source_label VARCHAR(255) NOT NULL,
  source_url TEXT,
  verification_status VARCHAR(20) NOT NULL DEFAULT 'needs_review',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT kurikulum_sumber_type_check CHECK (source_type IN ('official_web', 'internal_seed', 'user_reference')),
  CONSTRAINT kurikulum_sumber_status_check CHECK (verification_status IN ('verified', 'needs_review', 'deprecated'))
);

ALTER TABLE konsentrasi ADD COLUMN IF NOT EXISTS kurikulum_id BIGINT;
UPDATE konsentrasi
SET kurikulum_id = (SELECT id FROM kurikulum WHERE kode = 'TI-2020')
WHERE kurikulum_id IS NULL AND EXISTS (SELECT 1 FROM kurikulum WHERE kode = 'TI-2020');
ALTER TABLE konsentrasi DROP CONSTRAINT IF EXISTS konsentrasi_kode_key;
ALTER TABLE konsentrasi ALTER COLUMN kurikulum_id SET NOT NULL;
ALTER TABLE konsentrasi
  DROP CONSTRAINT IF EXISTS konsentrasi_kurikulum_id_fkey;
ALTER TABLE konsentrasi
  ADD CONSTRAINT konsentrasi_kurikulum_id_fkey
  FOREIGN KEY (kurikulum_id) REFERENCES kurikulum(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS konsentrasi_kurikulum_kode_unique ON konsentrasi (kurikulum_id, kode);

UPDATE konsentrasi c
SET nama = CASE c.kode
  WHEN 'RPL' THEN 'Rekayasa Perangkat Lunak'
  WHEN 'DAI' THEN 'Sistem Cerdas'
  WHEN 'JKK' THEN 'Teknik Komputer'
  WHEN 'SIT' THEN 'Teknologi Informasi'
  ELSE c.nama
END,
updated_at = NOW()
FROM kurikulum k
WHERE k.id = c.kurikulum_id
  AND k.kode = 'TI-2020'
  AND c.kode IN ('RPL', 'DAI', 'JKK', 'SIT');

DELETE FROM konsentrasi_mata_kuliah WHERE konsentrasi_id IN (
  SELECT c.id FROM konsentrasi c JOIN kurikulum k ON k.id = c.kurikulum_id WHERE k.kode = 'TI-2025'
);
DELETE FROM konsentrasi c USING kurikulum k WHERE c.kurikulum_id = k.id AND k.kode = 'TI-2025';
INSERT INTO konsentrasi (kurikulum_id, kode, nama, status)
SELECT k.id, source.kode, source.nama, 'aktif'
FROM kurikulum k
CROSS JOIN (VALUES ('SK', 'Sistem Komputer'), ('RPL', 'Rekayasa Perangkat Lunak'), ('TI', 'Teknologi Informasi')) AS source(kode, nama)
WHERE k.kode = 'TI-2025'
ON CONFLICT (kurikulum_id, kode) DO UPDATE SET nama = EXCLUDED.nama, status = 'aktif', updated_at = NOW();

ALTER TABLE mata_kuliah_prasyarat
  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'proposed',
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS source_reference VARCHAR(255);
ALTER TABLE mata_kuliah_prasyarat
  DROP CONSTRAINT IF EXISTS mata_kuliah_prasyarat_verification_status_check;
ALTER TABLE mata_kuliah_prasyarat
  ADD CONSTRAINT mata_kuliah_prasyarat_verification_status_check CHECK (
    verification_status IN ('verified', 'proposed', 'rejected')
  );

WITH edges(curriculum_code, target_code, source_code) AS (
  VALUES
    ('TI-2020', 'INF620107', 'INF620104'), ('TI-2020', 'INF620112', 'INF620102'),
    ('TI-2020', 'INF620204', 'INF620109'), ('TI-2020', 'INF620208', 'INF620203'),
    ('TI-2020', 'INF620209', 'INF620114'), ('TI-2020', 'INF620214', 'INF620211'),
    ('TI-2020', 'INF620217', 'INF620205'), ('TI-2020', 'INF620305', 'INF620210'),
    ('TI-2020', 'INF620306', 'INF620216'), ('TI-2020', 'INF620322', 'INF620303'),
    ('TI-2025', 'INF625104', 'INF625102'), ('TI-2025', 'INF625108', 'INF625107'),
    ('TI-2025', 'INF625113', 'INF625110'), ('TI-2025', 'INF625116', 'INF625115'),
    ('TI-2025', 'INF625206', 'INF625202'), ('TI-2025', 'INF625207', 'INF625203'),
    ('TI-2025', 'INF625214', 'INF625211'), ('TI-2025', 'INF625216', 'INF625210'),
    ('TI-2025', 'INF625217', 'INF625215'), ('TI-2025', 'INF625305', 'INF625304')
)
INSERT INTO mata_kuliah_prasyarat (
  kurikulum_id, mata_kuliah_id, prasyarat_mata_kuliah_id,
  nilai_minimum, verification_status, source_reference
)
SELECT k.id, target.id, source.id, 'D', 'verified',
       'Keterangan mata kuliah praktikum dapat diambil setelah teori'
FROM edges e
JOIN kurikulum k ON k.kode = e.curriculum_code
JOIN mata_kuliah target ON target.kode = e.target_code
JOIN mata_kuliah source ON source.kode = e.source_code
ON CONFLICT (kurikulum_id, mata_kuliah_id, prasyarat_mata_kuliah_id)
DO UPDATE SET verification_status = EXCLUDED.verification_status,
              source_reference = EXCLUDED.source_reference;

WITH proposed_edges(curriculum_code, target_code, source_code, reference) AS (
  VALUES
    ('TI-2020', 'INF620109', 'INF620104', 'Algoritma dan Pemrograman -> Struktur Data'),
    ('TI-2020', 'INF620213', 'INF620104', 'Algoritma dan Pemrograman -> Pemrograman Berorientasi Objek'),
    ('TI-2020', 'INF620216', 'INF620205', 'Sistem Basis Data -> Pemrograman Web'),
    ('TI-2020', 'INF620206', 'INF620205', 'Sistem Basis Data -> Sistem Informasi'),
    ('TI-2020', 'INF620318', 'INF620205', 'Sistem Basis Data -> Data Mining'),
    ('TI-2020', 'INF620215', 'INF620113', 'Matematika Diskrit -> Kecerdasan Buatan'),
    ('TI-2020', 'INF620212', 'INF620113', 'Matematika Diskrit -> Teori Bahasa dan Automata'),
    ('TI-2020', 'INF620315', 'INF620210', 'Jaringan Komputer -> Jaringan Komputer Lanjut 1'),
    ('TI-2020', 'INF620332', 'INF620210', 'Jaringan Komputer -> Jaringan Komputer Lanjut 2'),
    ('TI-2020', 'INF620303', 'INF620210', 'Jaringan Komputer -> Keamanan Sistem Informasi')
)
INSERT INTO mata_kuliah_prasyarat (
  kurikulum_id, mata_kuliah_id, prasyarat_mata_kuliah_id,
  nilai_minimum, verification_status, source_reference
)
SELECT k.id, target.id, source.id, 'C', 'proposed', e.reference
FROM proposed_edges e
JOIN kurikulum k ON k.kode = e.curriculum_code
JOIN mata_kuliah target ON target.kode = e.target_code
JOIN mata_kuliah source ON source.kode = e.source_code
ON CONFLICT (kurikulum_id, mata_kuliah_id, prasyarat_mata_kuliah_id)
DO UPDATE SET verification_status = EXCLUDED.verification_status,
              nilai_minimum = EXCLUDED.nilai_minimum,
              source_reference = EXCLUDED.source_reference;

COMMIT;
