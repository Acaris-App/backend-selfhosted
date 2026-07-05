-- SQL Seed Data for Lecturers (dosen)
-- File: Backend/migrations/20260630_seed_dosen_data.sql

DO $$
DECLARE
    u_id INTEGER;
    k_kelas TEXT;
    is_uniq BOOLEAN;
    pass_hash TEXT := '$2b$10$NK0z1sosLpOLIHhns3FGzuTSh0uVbuS3Nb6O2p6aGnq5SuzxPp36C'; -- Hash of 'PasswordDosen1!'
BEGIN
    -- 1. Helmy Fitriawan
    IF NOT EXISTS (SELECT 1 FROM users WHERE npm_nip = '197509282001121002') THEN
        INSERT INTO users (name, email, password, role, npm_nip, is_verified) 
        VALUES ('Dr. Eng. Ir. Helmy Fitriawan, S.T., M.Sc.', 'helmy.fitriawan@eng.unila.ac.id', pass_hash, 'dosen', '197509282001121002', true) 
        RETURNING id INTO u_id;
        
        is_uniq := false;
        WHILE NOT is_uniq LOOP
            k_kelas := 'DSN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
            IF NOT EXISTS (SELECT 1 FROM dosen_pa WHERE kode_kelas = k_kelas) THEN
                is_uniq := true;
            END IF;
        END LOOP;
        INSERT INTO dosen_pa (user_id, kode_kelas) VALUES (u_id, k_kelas);
    END IF;

    -- 2. Muhammad Irsyad
    IF NOT EXISTS (SELECT 1 FROM users WHERE npm_nip = '197112142000121001') THEN
        INSERT INTO users (name, email, password, role, npm_nip, is_verified) 
        VALUES ('Dr. Muhammad Irsyad, S.T., M.T.', 'muhammad.irsyad@eng.unila.ac.id', pass_hash, 'dosen', '197112142000121001', true) 
        RETURNING id INTO u_id;
        
        is_uniq := false;
        WHILE NOT is_uniq LOOP
            k_kelas := 'DSN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
            IF NOT EXISTS (SELECT 1 FROM dosen_pa WHERE kode_kelas = k_kelas) THEN
                is_uniq := true;
            END IF;
        END LOOP;
        INSERT INTO dosen_pa (user_id, kode_kelas) VALUES (u_id, k_kelas);
    END IF;

    -- 3. Herlinawati
    IF NOT EXISTS (SELECT 1 FROM users WHERE npm_nip = '197103141999032001') THEN
        INSERT INTO users (name, email, password, role, npm_nip, is_verified) 
        VALUES ('Herlinawati, S.T., M.T.', 'herlinawati@eng.unila.ac.id', pass_hash, 'dosen', '197103141999032001', true) 
        RETURNING id INTO u_id;
        
        is_uniq := false;
        WHILE NOT is_uniq LOOP
            k_kelas := 'DSN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
            IF NOT EXISTS (SELECT 1 FROM dosen_pa WHERE kode_kelas = k_kelas) THEN
                is_uniq := true;
            END IF;
        END LOOP;
        INSERT INTO dosen_pa (user_id, kode_kelas) VALUES (u_id, k_kelas);
    END IF;

    -- 4. Yessi Mulyani
    IF NOT EXISTS (SELECT 1 FROM users WHERE npm_nip = '197312262000122001') THEN
        INSERT INTO users (name, email, password, role, npm_nip, is_verified) 
        VALUES ('Yessi Mulyani, S.T., M.T.', 'yessi.mulyani@eng.unila.ac.id', pass_hash, 'dosen', '197312262000122001', true) 
        RETURNING id INTO u_id;
        
        is_uniq := false;
        WHILE NOT is_uniq LOOP
            k_kelas := 'DSN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
            IF NOT EXISTS (SELECT 1 FROM dosen_pa WHERE kode_kelas = k_kelas) THEN
                is_uniq := true;
            END IF;
        END LOOP;
        INSERT INTO dosen_pa (user_id, kode_kelas) VALUES (u_id, k_kelas);
    END IF;

    -- 5. M. Komarudin
    IF NOT EXISTS (SELECT 1 FROM users WHERE npm_nip = '196812071997031006') THEN
        INSERT INTO users (name, email, password, role, npm_nip, is_verified) 
        VALUES ('Ir. M. Komarudin, S.T., M.T.', 'm.komarudin@eng.unila.ac.id', pass_hash, 'dosen', '196812071997031006', true) 
        RETURNING id INTO u_id;
        
        is_uniq := false;
        WHILE NOT is_uniq LOOP
            k_kelas := 'DSN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
            IF NOT EXISTS (SELECT 1 FROM dosen_pa WHERE kode_kelas = k_kelas) THEN
                is_uniq := true;
            END IF;
        END LOOP;
        INSERT INTO dosen_pa (user_id, kode_kelas) VALUES (u_id, k_kelas);
    END IF;

    -- 6. Meizano Ardhi Muhammad
    IF NOT EXISTS (SELECT 1 FROM users WHERE npm_nip = '198105282012121001') THEN
        INSERT INTO users (name, email, password, role, npm_nip, is_verified) 
        VALUES ('Ir. Meizano Ardhi Muhammad, S.T., M.T., I.P.M.', 'meizano.ardhi.muhammad@eng.unila.ac.id', pass_hash, 'dosen', '198105282012121001', true) 
        RETURNING id INTO u_id;
        
        is_uniq := false;
        WHILE NOT is_uniq LOOP
            k_kelas := 'DSN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
            IF NOT EXISTS (SELECT 1 FROM dosen_pa WHERE kode_kelas = k_kelas) THEN
                is_uniq := true;
            END IF;
        END LOOP;
        INSERT INTO dosen_pa (user_id, kode_kelas) VALUES (u_id, k_kelas);
    END IF;

    -- 7. Mona Arif Muda
    IF NOT EXISTS (SELECT 1 FROM users WHERE npm_nip = '197111122000031002') THEN
        INSERT INTO users (name, email, password, role, npm_nip, is_verified) 
        VALUES ('Mona Arif Muda, S.T., M.T.', 'mona.arif.muda@eng.unila.ac.id', pass_hash, 'dosen', '197111122000031002', true) 
        RETURNING id INTO u_id;
        
        is_uniq := false;
        WHILE NOT is_uniq LOOP
            k_kelas := 'DSN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
            IF NOT EXISTS (SELECT 1 FROM dosen_pa WHERE kode_kelas = k_kelas) THEN
                is_uniq := true;
            END IF;
        END LOOP;
        INSERT INTO dosen_pa (user_id, kode_kelas) VALUES (u_id, k_kelas);
    END IF;

    -- 8. Mardiana
    IF NOT EXISTS (SELECT 1 FROM users WHERE npm_nip = '197203161999032002') THEN
        INSERT INTO users (name, email, password, role, npm_nip, is_verified) 
        VALUES ('Dr. Eng. Ir. Mardiana, S.T., M.T., I.P.M.', 'mardiana@eng.unila.ac.id', pass_hash, 'dosen', '197203161999032002', true) 
        RETURNING id INTO u_id;
        
        is_uniq := false;
        WHILE NOT is_uniq LOOP
            k_kelas := 'DSN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
            IF NOT EXISTS (SELECT 1 FROM dosen_pa WHERE kode_kelas = k_kelas) THEN
                is_uniq := true;
            END IF;
        END LOOP;
        INSERT INTO dosen_pa (user_id, kode_kelas) VALUES (u_id, k_kelas);
    END IF;

    -- 9. Wahyu Eko S
    IF NOT EXISTS (SELECT 1 FROM users WHERE npm_nip = '197412012001121001') THEN
        INSERT INTO users (name, email, password, role, npm_nip, is_verified) 
        VALUES ('Wahyu Eko S, S.T., M.Sc.', 'wahyu.eko.s@eng.unila.ac.id', pass_hash, 'dosen', '197412012001121001', true) 
        RETURNING id INTO u_id;
        
        is_uniq := false;
        WHILE NOT is_uniq LOOP
            k_kelas := 'DSN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
            IF NOT EXISTS (SELECT 1 FROM dosen_pa WHERE kode_kelas = k_kelas) THEN
                is_uniq := true;
            END IF;
        END LOOP;
        INSERT INTO dosen_pa (user_id, kode_kelas) VALUES (u_id, k_kelas);
    END IF;

    -- 10. Gigih Forda Nama
    IF NOT EXISTS (SELECT 1 FROM users WHERE npm_nip = '198307122008121003') THEN
        INSERT INTO users (name, email, password, role, npm_nip, is_verified) 
        VALUES ('Ir. Gigih Forda Nama, S.T., M.T.I., I.P.M.', 'gigih.forda.nama@eng.unila.ac.id', pass_hash, 'dosen', '198307122008121003', true) 
        RETURNING id INTO u_id;
        
        is_uniq := false;
        WHILE NOT is_uniq LOOP
            k_kelas := 'DSN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
            IF NOT EXISTS (SELECT 1 FROM dosen_pa WHERE kode_kelas = k_kelas) THEN
                is_uniq := true;
            END IF;
        END LOOP;
        INSERT INTO dosen_pa (user_id, kode_kelas) VALUES (u_id, k_kelas);
    END IF;

    -- 11. Raden Arum S.P.
    IF NOT EXISTS (SELECT 1 FROM users WHERE npm_nip = '197101141998031003') THEN
        INSERT INTO users (name, email, password, role, npm_nip, is_verified) 
        VALUES ('Raden Arum S.P., S.Si., M.T.', 'raden.arum.s.p@eng.unila.ac.id', pass_hash, 'dosen', '197101141998031003', true) 
        RETURNING id INTO u_id;
        
        is_uniq := false;
        WHILE NOT is_uniq LOOP
            k_kelas := 'DSN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
            IF NOT EXISTS (SELECT 1 FROM dosen_pa WHERE kode_kelas = k_kelas) THEN
                is_uniq := true;
            END IF;
        END LOOP;
        INSERT INTO dosen_pa (user_id, kode_kelas) VALUES (u_id, k_kelas);
    END IF;

    -- 12. Hery Dian Septama
    IF NOT EXISTS (SELECT 1 FROM users WHERE npm_nip = '198509152008121001') THEN
        INSERT INTO users (name, email, password, role, npm_nip, is_verified) 
        VALUES ('Ir. Ing. Hery Dian Septama, S.T.', 'ing.hery.dian.septama@eng.unila.ac.id', pass_hash, 'dosen', '198509152008121001', true) 
        RETURNING id INTO u_id;
        
        is_uniq := false;
        WHILE NOT is_uniq LOOP
            k_kelas := 'DSN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
            IF NOT EXISTS (SELECT 1 FROM dosen_pa WHERE kode_kelas = k_kelas) THEN
                is_uniq := true;
            END IF;
        END LOOP;
        INSERT INTO dosen_pa (user_id, kode_kelas) VALUES (u_id, k_kelas);
    END IF;

    -- 13. Titin Yulianti
    IF NOT EXISTS (SELECT 1 FROM users WHERE npm_nip = '198807092019032015') THEN
        INSERT INTO users (name, email, password, role, npm_nip, is_verified) 
        VALUES ('Ir. Titin Yulianti, S.T., M.Eng.', 'titin.yulianti@eng.unila.ac.id', pass_hash, 'dosen', '198807092019032015', true) 
        RETURNING id INTO u_id;
        
        is_uniq := false;
        WHILE NOT is_uniq LOOP
            k_kelas := 'DSN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
            IF NOT EXISTS (SELECT 1 FROM dosen_pa WHERE kode_kelas = k_kelas) THEN
                is_uniq := true;
            END IF;
        END LOOP;
        INSERT INTO dosen_pa (user_id, kode_kelas) VALUES (u_id, k_kelas);
    END IF;

    -- 14. Resty Annisa S
    IF NOT EXISTS (SELECT 1 FROM users WHERE npm_nip = '199008302019032019') THEN
        INSERT INTO users (name, email, password, role, npm_nip, is_verified) 
        VALUES ('Ir. Resty Annisa S, S.T., M.Kom', 'resty.annisa.s@eng.unila.ac.id', pass_hash, 'dosen', '199008302019032019', true) 
        RETURNING id INTO u_id;
        
        is_uniq := false;
        WHILE NOT is_uniq LOOP
            k_kelas := 'DSN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
            IF NOT EXISTS (SELECT 1 FROM dosen_pa WHERE kode_kelas = k_kelas) THEN
                is_uniq := true;
            END IF;
        END LOOP;
        INSERT INTO dosen_pa (user_id, kode_kelas) VALUES (u_id, k_kelas);
    END IF;

    -- 15. Mahendra Pratama
    IF NOT EXISTS (SELECT 1 FROM users WHERE npm_nip = '199112152019031013') THEN
        INSERT INTO users (name, email, password, role, npm_nip, is_verified) 
        VALUES ('Mahendra Pratama, S.T., M.Eng.', 'mahendra.pratama@eng.unila.ac.id', pass_hash, 'dosen', '199112152019031013', true) 
        RETURNING id INTO u_id;
        
        is_uniq := false;
        WHILE NOT is_uniq LOOP
            k_kelas := 'DSN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
            IF NOT EXISTS (SELECT 1 FROM dosen_pa WHERE kode_kelas = k_kelas) THEN
                is_uniq := true;
            END IF;
        END LOOP;
        INSERT INTO dosen_pa (user_id, kode_kelas) VALUES (u_id, k_kelas);
    END IF;

    -- 16. Trisya Septiana
    IF NOT EXISTS (SELECT 1 FROM users WHERE npm_nip = '199009212019032025') THEN
        INSERT INTO users (name, email, password, role, npm_nip, is_verified) 
        VALUES ('Ir. Trisya Septiana, S.T., M.T.I.P.M', 'trisya.septiana@eng.unila.ac.id', pass_hash, 'dosen', '199009212019032025', true) 
        RETURNING id INTO u_id;
        
        is_uniq := false;
        WHILE NOT is_uniq LOOP
            k_kelas := 'DSN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
            IF NOT EXISTS (SELECT 1 FROM dosen_pa WHERE kode_kelas = k_kelas) THEN
                is_uniq := true;
            END IF;
        END LOOP;
        INSERT INTO dosen_pa (user_id, kode_kelas) VALUES (u_id, k_kelas);
    END IF;

    -- 18. Deny Budiyanto
    IF NOT EXISTS (SELECT 1 FROM users WHERE npm_nip = '199112082019031011') THEN
        INSERT INTO users (name, email, password, role, npm_nip, is_verified) 
        VALUES ('Deny Budiyanto, S.Kom., M.T.', 'deny.budiyanto@eng.unila.ac.id', pass_hash, 'dosen', '199112082019031011', true) 
        RETURNING id INTO u_id;
        
        is_uniq := false;
        WHILE NOT is_uniq LOOP
            k_kelas := 'DSN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
            IF NOT EXISTS (SELECT 1 FROM dosen_pa WHERE kode_kelas = k_kelas) THEN
                is_uniq := true;
            END IF;
        END LOOP;
        INSERT INTO dosen_pa (user_id, kode_kelas) VALUES (u_id, k_kelas);
    END IF;

    -- 20. Sony Ferbangkara
    IF NOT EXISTS (SELECT 1 FROM users WHERE npm_nip = '198202172023211014') THEN
        INSERT INTO users (name, email, password, role, npm_nip, is_verified) 
        VALUES ('Sony Ferbangkara, S.T., M.T.', 'sony.ferbangkara@eng.unila.ac.id', pass_hash, 'dosen', '198202172023211014', true) 
        RETURNING id INTO u_id;
        
        is_uniq := false;
        WHILE NOT is_uniq LOOP
            k_kelas := 'DSN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
            IF NOT EXISTS (SELECT 1 FROM dosen_pa WHERE kode_kelas = k_kelas) THEN
                is_uniq := true;
            END IF;
        END LOOP;
        INSERT INTO dosen_pa (user_id, kode_kelas) VALUES (u_id, k_kelas);
    END IF;

    -- 21. Rizkima Akbar Setiawan
    IF NOT EXISTS (SELECT 1 FROM users WHERE npm_nip = '199703152024061001') THEN
        INSERT INTO users (name, email, password, role, npm_nip, is_verified) 
        VALUES ('Rizkima Akbar Setiawan, S.T., M.T.', 'rizkima.akbar.setiawan@eng.unila.ac.id', pass_hash, 'dosen', '199703152024061001', true) 
        RETURNING id INTO u_id;
        
        is_uniq := false;
        WHILE NOT is_uniq LOOP
            k_kelas := 'DSN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
            IF NOT EXISTS (SELECT 1 FROM dosen_pa WHERE kode_kelas = k_kelas) THEN
                is_uniq := true;
            END IF;
        END LOOP;
        INSERT INTO dosen_pa (user_id, kode_kelas) VALUES (u_id, k_kelas);
    END IF;

    -- 22. Muhamad Nur Khawarizmi
    IF NOT EXISTS (SELECT 1 FROM users WHERE npm_nip = '199102052024061002') THEN
        INSERT INTO users (name, email, password, role, npm_nip, is_verified) 
        VALUES ('Muhamad Nur Khawarizmi, S.Si., M.T.', 'muhamad.nur.khawarizmi@eng.unila.ac.id', pass_hash, 'dosen', '199102052024061002', true) 
        RETURNING id INTO u_id;
        
        is_uniq := false;
        WHILE NOT is_uniq LOOP
            k_kelas := 'DSN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
            IF NOT EXISTS (SELECT 1 FROM dosen_pa WHERE kode_kelas = k_kelas) THEN
                is_uniq := true;
            END IF;
        END LOOP;
        INSERT INTO dosen_pa (user_id, kode_kelas) VALUES (u_id, k_kelas);
    END IF;

    -- 23. Nurrahma
    IF NOT EXISTS (SELECT 1 FROM users WHERE npm_nip = '199711062024062001') THEN
        INSERT INTO users (name, email, password, role, npm_nip, is_verified) 
        VALUES ('Nurrahma, M.T.', 'nurrahma@eng.unila.ac.id', pass_hash, 'dosen', '199711062024062001', true) 
        RETURNING id INTO u_id;
        
        is_uniq := false;
        WHILE NOT is_uniq LOOP
            k_kelas := 'DSN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
            IF NOT EXISTS (SELECT 1 FROM dosen_pa WHERE kode_kelas = k_kelas) THEN
                is_uniq := true;
            END IF;
        END LOOP;
        INSERT INTO dosen_pa (user_id, kode_kelas) VALUES (u_id, k_kelas);
    END IF;

END $$;
