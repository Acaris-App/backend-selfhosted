BEGIN;

CREATE TABLE IF NOT EXISTS jadwal_kuliah_versi (
  id BIGSERIAL PRIMARY KEY,
  knowledge_base_id BIGINT NOT NULL REFERENCES knowledge_base(id) ON DELETE RESTRICT,
  versi INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'aktif',
  diunggah_oleh BIGINT REFERENCES users(id),
  raw_result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  superseded_at TIMESTAMPTZ,
  UNIQUE (knowledge_base_id, versi),
  CHECK (status IN ('aktif', 'superseded'))
);

CREATE TABLE IF NOT EXISTS jadwal_kuliah (
  id BIGSERIAL PRIMARY KEY,
  versi_id BIGINT NOT NULL REFERENCES jadwal_kuliah_versi(id) ON DELETE CASCADE,
  hari VARCHAR NOT NULL,
  jam_mulai TIME,
  jam_selesai TIME,
  kode_mata_kuliah VARCHAR(50),
  nama_mata_kuliah VARCHAR(255),
  kelas VARCHAR(10),
  ruang VARCHAR(100),
  dosen JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jadwal_kuliah_versi ON jadwal_kuliah (versi_id);
CREATE INDEX IF NOT EXISTS idx_jadwal_kuliah_hari_jam ON jadwal_kuliah (hari, jam_mulai);
CREATE INDEX IF NOT EXISTS idx_jadwal_kuliah_kode ON jadwal_kuliah (kode_mata_kuliah);

COMMIT;