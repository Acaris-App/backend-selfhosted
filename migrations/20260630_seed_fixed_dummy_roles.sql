-- SQL Seed Data for Custom Active Dummy Accounts
-- File: migrations/20260630_seed_fixed_dummy_roles.sql

DO $$
DECLARE
    pass_hash TEXT := '$2b$10$FSfeJBmSaePioQPvz3tnweN92JSRoZgYTiOjpCD7ooIN43HJ9ZFiq'; -- Hash of 'password123'
    dosen_id INTEGER;
    mhs_id INTEGER;
    adm_id INTEGER;
BEGIN
    -- 1. Create Dosen Dummy (dosen@dummy.com)
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'dosen@dummy.com') THEN
        INSERT INTO users (name, email, password, role, npm_nip, is_verified)
        VALUES ('Dosen Dummy', 'dosen@dummy.com', pass_hash, 'dosen', 'DUMMYDOSEN', true)
        RETURNING id INTO dosen_id;

        -- Ensure class code DSN-ABCD is assigned
        INSERT INTO dosen_pa (user_id, kode_kelas)
        VALUES (dosen_id, 'DSN-ABCD');
    END IF;

    -- 2. Create Mahasiswa Dummy (mahasiswa@dummy.com)
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'mahasiswa@dummy.com') THEN
        SELECT id INTO dosen_id FROM users WHERE email = 'dosen@dummy.com';

        INSERT INTO users (name, email, password, role, npm_nip, is_verified)
        VALUES ('Mahasiswa Dummy', 'mahasiswa@dummy.com', pass_hash, 'mahasiswa', 'DUMMYMAHASISWA', true)
        RETURNING id INTO mhs_id;

        INSERT INTO mahasiswa (user_id, angkatan, ipk, current_semester, dosen_pa_id)
        VALUES (mhs_id, 2020, 3.82, 8, dosen_id);
    ELSE
        SELECT id INTO mhs_id FROM users WHERE email = 'mahasiswa@dummy.com';
    END IF;

    -- 2.1 Insert KRS & KHS Dummy for Semesters 1 to 7
    FOR i IN 1..7 LOOP
        -- Insert KRS for Semester i
        IF NOT EXISTS (SELECT 1 FROM dokumen_mahasiswa WHERE user_id = mhs_id AND document_type = 'krs' AND semester = i) THEN
            INSERT INTO dokumen_mahasiswa (user_id, document_type, semester, file_path, isi_teks_dokumen)
            VALUES (
                mhs_id, 
                'krs', 
                i, 
                'uploads/documents/dummy_krs_sem' || i || '.pdf', 
                'KARTU RENCANA STUDI (KRS)' || CHR(10) ||
                'Nama: Mahasiswa Dummy' || CHR(10) ||
                'NPM: DUMMYMAHASISWA' || CHR(10) ||
                'Semester: ' || i || CHR(10) ||
                'Program Studi: Teknik Informatika' || CHR(10) ||
                'Mata Kuliah Semester ' || i || CHR(10) ||
                'Total SKS yang diambil: 20 SKS' || CHR(10) ||
                'Dosen PA: Dosen Dummy (NIP: DUMMYDOSEN)'
            );
        END IF;

        -- Insert KHS for Semester i
        IF NOT EXISTS (SELECT 1 FROM dokumen_mahasiswa WHERE user_id = mhs_id AND document_type = 'khs' AND semester = i) THEN
            INSERT INTO dokumen_mahasiswa (user_id, document_type, semester, file_path, isi_teks_dokumen)
            VALUES (
                mhs_id, 
                'khs', 
                i, 
                'uploads/documents/dummy_khs_sem' || i || '.pdf', 
                'KARTU HASIL STUDI (KHS)' || CHR(10) ||
                'Nama: Mahasiswa Dummy' || CHR(10) ||
                'NPM: DUMMYMAHASISWA' || CHR(10) ||
                'Semester: ' || i || CHR(10) ||
                'Program Studi: Teknik Informatika' || CHR(10) ||
                'Hasil Studi Semester ' || i || ':' || CHR(10) ||
                '- Indeks Prestasi Semester (IPS): 3.80' || CHR(10) ||
                '- SKS Lulus: 20 SKS' || CHR(10) ||
                'Total SKS Akumulatif: ' || (i * 20) || ' SKS'
            );
        END IF;
    END LOOP;

    -- 2.2 Insert Transkrip Dummy
    IF NOT EXISTS (SELECT 1 FROM dokumen_mahasiswa WHERE user_id = mhs_id AND document_type = 'transkrip') THEN
        INSERT INTO dokumen_mahasiswa (user_id, document_type, semester, file_path, isi_teks_dokumen)
        VALUES (
            mhs_id, 
            'transkrip', 
            NULL, 
            'uploads/documents/dummy_transkrip.pdf', 
            'TRANSKRIP AKADEMIK SEMENTARA' || CHR(10) ||
            'Nama: Mahasiswa Dummy' || CHR(10) ||
            'NPM: DUMMYMAHASISWA' || CHR(10) ||
            'Program Studi: Teknik Informatika' || CHR(10) ||
            'Fakultas: Teknik' || CHR(10) ||
            'Daftar Prestasi Kumulatif:' || CHR(10) ||
            '- INF101 Pengantar Teknologi Informasi: A' || CHR(10) ||
            '- INF102 Algoritma dan Pemrograman: A' || CHR(10) ||
            '- INF103 Matematika Diskrit: B' || CHR(10) ||
            '- INF201 Struktur Data: A' || CHR(10) ||
            '- INF202 Sistem Operasi: B+' || CHR(10) ||
            '- INF203 Pemrograman Berorientasi Objek: A-' || CHR(10) ||
            '- INF204 Basis Data: A' || CHR(10) ||
            '- INF301 Rekayasa Perangkat Lunak: A' || CHR(10) ||
            '- INF302 Kecerdasan Buatan: A-' || CHR(10) ||
            '- INF303 Grafika Komputer: B+' || CHR(10) ||
            '- INF304 Jaringan Komputer Lanjut: A' || CHR(10) ||
            '- INF305 Metodologi Penelitian: A' || CHR(10) ||
            'SKS Kumulatif Lulus: 138 SKS' || CHR(10) ||
            'IPK Kumulatif (Indeks Prestasi Kumulatif): 3.82' || CHR(10) ||
            'Status: Aktif'
        );
    END IF;

    -- 3. Create Admin Dummy (admin@dummy.com)
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@dummy.com') THEN
        INSERT INTO users (name, email, password, role, npm_nip, is_verified)
        VALUES ('Admin Dummy', 'admin@dummy.com', pass_hash, 'admin', 'DUMMYADMIN', true)
        RETURNING id INTO adm_id;
    END IF;
END $$;
