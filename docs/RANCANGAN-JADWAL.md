# Rancangan: Tabel Jadwal Kuliah Terstruktur + Versioning

> Status: **DITUNDA** — dirancang dulu, implementasi dilakukan kemudian.
> Berlaku untuk self-hosted (VPS `marslabs.my.id`) dan backend utama (GCP `acaris.my.id`).
> Diputuskan: implementasi self-hosted dahulu, lalu port ke backend utama.

## 1. Latar Belakang / Masalah

Saat ini jadwal kuliah **tidak memiliki "rumah" relasional**:

- File jadwal (PDF) di-upload admin ke tabel `knowledge_base` dengan `category = 'Jadwal'`.
- n8n workflow `Chatbot Aca 💙 Self Hosted` mengekstrak isi PDF via Gemini (`Message a model`) menjadi **teks paragraf**, lalu menyimpannya ke tabel vektor `embeddings` (PGVector, satu tabel untuk semua kategori).
- Chatbot menjawab pertanyaan jadwal secara **semantik** (vector search), bukan dari data terstruktur.

Konsekuensi:

- Tidak bisa membandingkan jadwal antar periode/versi secara presisi.
- Tidak bisa menjamin klaim "tidak bentrok" (tidak ada data hari/jam/ruang/kelas sebagai relasi).
- Data jadwal tercampur di `embeddings` dengan dokumen lain (hanya dibedakan metadata `category`).

## 2. Tujuan

1. Tabel jadwal kuliah **terstruktur**: `hari`, `jam_mulai`, `jam_selesai`, `kode_mata_kuliah`, `nama_mata_kuliah`, `kelas`, `ruang`, `dosen` (PD1-PD3).
2. Saat file jadwal baru di-upload / di-import:
   - Data lama di-**supersede** (di-*mark* non-aktif, tidak dihapus).
   - Data baru menjadi **aktif**.
   - Versi lama tetap tersimpan sebagai **riwayat/versioning** untuk pembanding.
3. Chatbot menjawab pertanyaan jadwal dari tabel aktif (SQL), termasuk deteksi bentrok.
4. Alur upload → parse → impor → supersede berjalan **otomatis** (mirip alur KHS).

## 3. Desain Skema

### 3.1. Tabel `jadwal_kuliah_versi`

Metadata satu versi jadwal (satu file yang diimpor).

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGSERIAL PK | |
| `knowledge_base_id` | BIGINT FK `knowledge_base(id)` | Sumber file PDF |
| `versi` | INTEGER NOT NULL | Nomor versi (increment per import) |
| `status` | VARCHAR(20) | `'aktif'` / `'superseded'` |
| `diunggah_oleh` | BIGINT FK `users(id)` | Admin yang upload |
| `raw_result` | JSONB | Snapshot payload asli dari ekstraksi |
| `created_at` | TIMESTAMPTZ | |
| `superseded_at` | TIMESTAMPTZ NULL | Terisi saat versi digantikan |

- `UNIQUE (knowledge_base_id, versi)`.
- Satu-satunya versi `'aktif'` adalah versi terkini.

### 3.2. Tabel `jadwal_kuliah`

Baris jadwal per versi.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGSERIAL PK | |
| `versi_id` | BIGINT FK `jadwal_kuliah_versi(id)` ON DELETE CASCADE | |
| `hari` | VARCHAR NOT NULL | Misal `Senin` |
| `jam_mulai` | TIME NULL | |
| `jam_selesai` | TIME NULL | |
| `kode_mata_kuliah` | VARCHAR NULL | |
| `nama_mata_kuliah` | VARCHAR NULL | |
| `kelas` | VARCHAR NULL | A/B/C/D |
| `ruang` | VARCHAR NULL | |
| `dosen` | TEXT[] atau JSONB NULL | PD1-PD3 gabungan |

Index:

- `(versi_id)`
- `(hari, jam_mulai)`
- `(kode_mata_kuliah)`

Versi aktif = baris yang `versi_id` menunjuk ke `jadwal_kuliah_versi.status = 'aktif'`.

## 4. Alur Impor (Otomatis)

Pipeline meniru alur KHS yang sudah ada (`POST /academic/internal/import-khs` dengan header `x-academic-callback-secret`).

```
Admin upload PDF jadwal
  → POST /admin/knowledge-base (category = 'Jadwal')
  → n8n workflow dijalankan (manual / trigger upload)
      → Extract from File (jadwal)           (PDF → teks)
      → Message a model (Gemini)             (teks → JSON terstruktur)
      → Code node                            (normalisasi payload + source_knowledge_base_id)
      → HTTP Request: POST /academic/internal/import-jadwal
          headers: x-academic-callback-secret
          body: { source_knowledge_base_id, items: [...] }
  → Backend (transaksi tunggal):
      1. UPDATE jadwal_kuliah_versi SET status='superseded', superseded_at=NOW() WHERE status='aktif'
      2. INSERT versi baru (versi = MAX(versi)+1)
      3. INSERT baris jadwal_kuliah untuk versi baru
      4. Simpan raw_result + error ke jadwal_kuliah_versi
```

### 4.1. Endpoint callback baru

- `POST /academic/internal/import-jadwal` (+ alias `/academicinternal/import-jadwal`), dengan `authenticateCallback` yang sama seperti import-khs.
- Controller `academic.controller.js` → service `academic.service.js` → `academic.repository.js`.
- Validasi payload:
  - `source_knowledge_base_id` wajib.
  - Tiap item minimal punya `hari` + (`kode_mata_kuliah` atau `nama_mata_kuliah`).
  - Deteksi bentrok antar baris (hari + jam mulai + ruang/kelas sama dalam versi yang sama) → dicatat sebagai warning di `raw_result`, bukan gagal total.

### 4.2. Prompt ekstraksi Gemini diubah

Node `Message a model` (ekstraksi jadwal) saat ini menyuruh Gemini menulis **paragraf teks**. Ubah instruksi agar output **JSON**:

```json
{
  "jadwal": [
    {
      "hari": "Senin",
      "jam": "07:30-09:10",
      "kode_mk": "TIF620101",
      "nama_mk": "Pemrograman Berorientasi Objek",
      "kelas": "A",
      "ruang": "Lab 1",
      "dosen": ["Wahyu Eko Saputra", "Dr. Eng. Helmy Fitriawan"]
    }
  ]
}
```

Perhatikan aturan kelas (huruf di akhir nama MK dipisah), penggabungan PD1-PD3, dan penanganan data tidak lengkap yang sudah ada di prompt saat ini.

## 5. Chatbot Query Jadwal

- Tambah tool SQL (atau perluas `Execute a SQL query in Postgres`) dengan query khusus jadwal aktif:

```sql
SELECT j.*
FROM jadwal_kuliah j
JOIN jadwal_kuliah_versi v ON v.id = j.versi_id AND v.status = 'aktif'
WHERE ...;
```

- Sistem prompt agent: arahkan pertanyaan jadwal (hari/jam/ruang/kode MK/dosen/bentrok) ke tool ini.
- **Deteksi bentrok** bisa dijawab SQL: `GROUP BY hari, jam_mulai` untuk menemukan ruang/kelas sama pada slot sama.
- Vector store tetap bisa dipakai untuk pertanyaan bebas, tapi jawaban presisi (bentrok, jadwal per kelas) harus dari tabel terstruktur.

## 6. Migration SQL (Template)

```sql
BEGIN;

CREATE TABLE jadwal_kuliah_versi (
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

CREATE TABLE jadwal_kuliah (
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

CREATE INDEX idx_jadwal_kuliah_versi ON jadwal_kuliah (versi_id);
CREATE INDEX idx_jadwal_kuliah_hari_jam ON jadwal_kuliah (hari, jam_mulai);
CREATE INDEX idx_jadwal_kuliah_kode ON jadwal_kuliah (kode_mata_kuliah);

COMMIT;
```

## 7. File yang Perlu Diubah (Saat Implementasi)

| Area | File | Perubahan |
|---|---|---|
| Migration | `migrations/2026XXXX_create_schedule_schema.sql` | Buat 2 tabel |
| Route | `services/ai-document-service/src/routes/academic.routes.js` | Tambah `import-jadwal` |
| Controller | `services/ai-document-service/src/controllers/academic.controller.js` | Handler `importJadwal` |
| Service | `services/ai-document-service/src/services/academic.service.js` | Logika impor + validasi |
| Repository | `services/ai-document-service/src/repositories/academic.repository.js` | Transaksi: supersede + insert versi + insert baris |
| n8n | `Chatbot Aca 💙 Self Hosted.json` (self-hosted) / workflow main | Ubah prompt JSON + tambah node Code + HTTP Request callback |
| Trigger | `services/ai-document-service/src/services/admin.service.js` | Panggil n8n saat `category = 'Jadwal'` (pola `extract_mahasiswa_document`) |
| Chatbot | n8n agent + tool SQL | Query jadwal aktif + bentrok |

## 8. Catatan / Keputusan

- **Supersede, bukan hapus**: versi lama di-mark `superseded` agar bisa dibandingkan (pembanding jadwal lama vs baru).
- **Tidak menimpa `embeddings`**: baris jadwal lama di vector store boleh dibiarkan (opsional purge di kemudian hari), karena jawaban presisi pindah ke tabel.
- **Nama file / klasifikasi**: klasifikasi tetap lewat field `category` (bukan nama file).
- **Endpoint callback internal** memakai `x-academic-callback-secret` (tidak boleh dipakai dari luar).
- **Nama tabel dihindari bentrok**: `jadwal_kuliah` (kuliah) vs `jadwal_bimbingan` (konsultasi dosen) — dua domain berbeda.