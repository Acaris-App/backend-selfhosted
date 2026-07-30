BEGIN;
ALTER TABLE kurikulum_mata_kuliah ADD COLUMN IF NOT EXISTS kelompok_alternatif VARCHAR(50);
CREATE TABLE mahasiswa_kurikulum (mahasiswa_user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, kurikulum_id BIGINT NOT NULL REFERENCES kurikulum(id) ON DELETE RESTRICT, assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), assignment_source VARCHAR(30) NOT NULL DEFAULT 'angkatan', CHECK (assignment_source IN ('angkatan','admin','migration')));
CREATE INDEX idx_mahasiswa_kurikulum_kurikulum ON mahasiswa_kurikulum (kurikulum_id);
ALTER TABLE academic_imports ADD COLUMN IF NOT EXISTS kurikulum_id BIGINT REFERENCES kurikulum(id) ON DELETE RESTRICT;
CREATE INDEX idx_academic_imports_kurikulum ON academic_imports (kurikulum_id) WHERE kurikulum_id IS NOT NULL;
COMMIT;
