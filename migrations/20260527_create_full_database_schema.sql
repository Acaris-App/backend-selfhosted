BEGIN;

-- Acaris full database schema.
-- This file replaces older incremental migration files and can be used to
-- prepare a fresh PostgreSQL database for the backend service.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role VARCHAR(20) NOT NULL,
  npm_nip VARCHAR(50) UNIQUE,
  profile_picture TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_role_check CHECK (role IN ('mahasiswa', 'dosen', 'admin'))
);

CREATE INDEX IF NOT EXISTS idx_users_role_verified
  ON users (role, is_verified);

CREATE INDEX IF NOT EXISTS idx_users_name
  ON users (name);

CREATE TABLE IF NOT EXISTS dosen_pa (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  kode_kelas VARCHAR(50) UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dosen_pa_kode_kelas
  ON dosen_pa (kode_kelas);

CREATE TABLE IF NOT EXISTS mahasiswa (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  angkatan INTEGER,
  ipk NUMERIC(3, 2),
  current_semester INTEGER,
  dosen_pa_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mahasiswa_ipk_check CHECK (ipk IS NULL OR (ipk >= 0 AND ipk <= 4)),
  CONSTRAINT mahasiswa_semester_check CHECK (current_semester IS NULL OR current_semester >= 1)
);

CREATE INDEX IF NOT EXISTS idx_mahasiswa_dosen_pa_id
  ON mahasiswa (dosen_pa_id);

CREATE INDEX IF NOT EXISTS idx_mahasiswa_angkatan
  ON mahasiswa (angkatan);

CREATE TABLE IF NOT EXISTS otp_codes (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  type VARCHAR(30) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT otp_codes_type_check CHECK (type IN ('register', 'reset_password'))
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_user_type_active
  ON otp_codes (user_id, type, is_used, expires_at DESC);

CREATE TABLE IF NOT EXISTS dokumen_mahasiswa (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  semester INTEGER,
  file_path TEXT NOT NULL,
  isi_teks_dokumen TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT dokumen_mahasiswa_document_type_check
    CHECK (document_type IN ('krs', 'khs', 'transkrip')),
  CONSTRAINT dokumen_mahasiswa_semester_check
    CHECK (semester IS NULL OR semester >= 1)
);

CREATE INDEX IF NOT EXISTS idx_dokumen_mahasiswa_user_type_semester
  ON dokumen_mahasiswa (user_id, document_type, semester);

CREATE INDEX IF NOT EXISTS idx_dokumen_mahasiswa_uploaded_at
  ON dokumen_mahasiswa (uploaded_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dokumen_mahasiswa_user_type_semester
  ON dokumen_mahasiswa (user_id, document_type, COALESCE(semester, 0));

COMMENT ON COLUMN dokumen_mahasiswa.isi_teks_dokumen IS
  'Extracted PDF text for n8n/chatbot workflows. Nullable for old documents and documents that have not been extracted yet.';

CREATE TABLE IF NOT EXISTS jadwal_bimbingan (
  id SERIAL PRIMARY KEY,
  dosen_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL,
  waktu_mulai TIME NOT NULL,
  waktu_selesai TIME NOT NULL,
  kuota INTEGER NOT NULL,
  kuota_tersisa INTEGER NOT NULL,
  keterangan TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'tersedia',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT jadwal_bimbingan_status_check CHECK (status IN ('tersedia', 'penuh')),
  CONSTRAINT jadwal_bimbingan_kuota_check CHECK (kuota >= 1),
  CONSTRAINT jadwal_bimbingan_kuota_tersisa_check CHECK (kuota_tersisa >= 0),
  CONSTRAINT jadwal_bimbingan_time_check CHECK (waktu_selesai > waktu_mulai)
);

CREATE INDEX IF NOT EXISTS idx_jadwal_bimbingan_dosen_tanggal
  ON jadwal_bimbingan (dosen_id, tanggal, waktu_mulai);

CREATE INDEX IF NOT EXISTS idx_jadwal_bimbingan_available
  ON jadwal_bimbingan (dosen_id, tanggal)
  WHERE status = 'tersedia' AND kuota_tersisa > 0;

CREATE TABLE IF NOT EXISTS booking_bimbingan (
  id SERIAL PRIMARY KEY,
  mahasiswa_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jadwal_id INTEGER NOT NULL REFERENCES jadwal_bimbingan(id) ON DELETE CASCADE,
  catatan TEXT,
  keterangan TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'terkonfirmasi',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT booking_bimbingan_status_check
    CHECK (status IN ('terkonfirmasi', 'dibatalkan', 'selesai'))
);

CREATE INDEX IF NOT EXISTS idx_booking_bimbingan_mahasiswa
  ON booking_bimbingan (mahasiswa_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_booking_bimbingan_jadwal
  ON booking_bimbingan (jadwal_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_bimbingan_active_user_schedule
  ON booking_bimbingan (mahasiswa_id, jadwal_id)
  WHERE status = 'terkonfirmasi';

CREATE TABLE IF NOT EXISTS knowledge_base (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_path TEXT,
  category VARCHAR(100) NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  CONSTRAINT knowledge_base_category_check CHECK (
    category IN (
      'Peraturan Akademik',
      'Jadwal',
      'Kurikulum',
      'Peraturan Rektor',
      'KKNI',
      'Kalender Akademik'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_category
  ON knowledge_base (category);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_uploaded_at
  ON knowledge_base (uploaded_at DESC);

CREATE TABLE IF NOT EXISTS chatbot_sessions (
  id TEXT PRIMARY KEY,
  mahasiswa_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'aktif',
  final_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  CONSTRAINT chatbot_sessions_status_check CHECK (status IN ('aktif', 'selesai'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chatbot_sessions_one_active_per_mahasiswa
  ON chatbot_sessions (mahasiswa_id)
  WHERE status = 'aktif';

CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_mahasiswa_status
  ON chatbot_sessions (mahasiswa_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS chatbot_messages (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES chatbot_sessions(id) ON DELETE CASCADE,
  sender VARCHAR(10) NOT NULL,
  message_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chatbot_messages_sender_check CHECK (sender IN ('user', 'bot'))
);

CREATE INDEX IF NOT EXISTS idx_chatbot_messages_session_created
  ON chatbot_messages (session_id, created_at ASC, id ASC);

COMMIT;
