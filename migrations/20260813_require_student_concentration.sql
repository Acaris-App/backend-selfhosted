BEGIN;

ALTER TABLE mahasiswa ADD COLUMN IF NOT EXISTS konsentrasi VARCHAR(100);
ALTER TABLE mahasiswa DROP CONSTRAINT IF EXISTS mahasiswa_konsentrasi_check;
ALTER TABLE mahasiswa ADD CONSTRAINT mahasiswa_konsentrasi_check CHECK (
  konsentrasi IS NULL OR konsentrasi IN (
    'Rekayasa Perangkat Lunak', 'Sistem Cerdas', 'Teknik Komputer',
    'Teknologi Informasi', 'Sistem Komputer'
  )
);

ALTER TABLE mahasiswa_kurikulum DROP CONSTRAINT IF EXISTS mahasiswa_kurikulum_source_check;
ALTER TABLE mahasiswa_kurikulum ADD CONSTRAINT mahasiswa_kurikulum_source_check CHECK (
  assignment_source IN ('angkatan', 'admin', 'migration', 'registration')
);

ALTER TABLE mata_kuliah_prasyarat
  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'verified';
ALTER TABLE mata_kuliah_prasyarat
  DROP CONSTRAINT IF EXISTS mata_kuliah_prasyarat_verification_status_check;
ALTER TABLE mata_kuliah_prasyarat
  ADD CONSTRAINT mata_kuliah_prasyarat_verification_status_check CHECK (
    verification_status IN ('verified', 'proposed', 'rejected')
  );

COMMIT;
