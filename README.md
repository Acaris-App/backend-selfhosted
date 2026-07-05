# 🌐 Acaris - Self-Hosted Academic Guidance System (VPS)

Selamat datang di repositori **Acaris Backend Self-Hosted**. Repositori ini merupakan salinan backend yang disesuaikan penuh untuk dijalankan di lingkungan VPS Linux mandiri menggunakan Docker Compose, local PostgreSQL, local Redis, penyimpanan file lokal, dan Nginx API Gateway.

---

## 🌟 Base URL & Domain

Backend Acaris terhubung secara penuh pada domain custom Anda:
*   **API Gateway & Backend URL**: `https://marslabs.my.id/api`
*   **Interactive API Documentation (Scalar)**: `https://marslabs.my.id/docs`

---

## 🗺️ Unified Routing (Nginx Gateway)

API Gateway Nginx bertugas menerima seluruh trafik HTTPS di port `80` (diteruskan dari host Nginx SSL) dan menyebarkannya ke container microservices di jaringan Docker internal sebagai berikut:

```yaml
Domain Akses      : https://marslabs.my.id
Routing Gateway   :
  # Auth & User Service (acaris-auth)
  - /api/auth/*           -> http://acaris-auth:3000/auth/*
  - /api/user/*           -> http://acaris-auth:3000/user/*
  
  # Consultation Service (acaris-consultation)
  - /api/dosen/*          -> http://acaris-consultation:3000/dosen/*
  - /api/mahasiswa/*      -> http://acaris-consultation:3000/mahasiswa/*
  - /api/schedule/*       -> http://acaris-consultation:3000/schedule/*
  
  # AI Document & Chatbot Service (acaris-document)
  - /api/document/*       -> http://acaris-document:3000/document/*
  - /api/chatbot/*        -> http://acaris-document:3000/chatbot/*
  - /api/admin/*          -> http://acaris-document:3000/admin/*

  # Documentation Service (acaris-docs)
  - /docs                 -> http://acaris-docs:8080/docs
  - /scalar/*             -> http://acaris-docs:8080/scalar/*
```

---

## 🏗️ Docker Compose Port Architecture

Berikut alokasi port dan ketergantungan antar-layanan kontainer di dalam VPS:

| Nama Kontainer | Port (Internal) | Port (Ekspos Host) | Deskripsi |
| :--- | :--- | :--- | :--- |
| **`acaris-gateway`** | `80` | `8000:80` | Nginx reverse proxy routing. |
| **`acaris-auth`** | `3000` | Tidak diekspos | Mengelola otentikasi, profil user & upload foto. |
| **`acaris-consultation`** | `3000` | Tidak diekspos | Mengelola konsultasi, bimbingan & jadwal. |
| **`acaris-document`** | `3000` | Tidak diekspos | Mengelola dokumen akademik & basis pengetahuan AI. |
| **`acaris-docs`** | `8080` | Tidak diekspos | Menyajikan Scalar API Playground. |
| **`acaris-db`** | `5432` | Tidak diekspos | PostgreSQL 15 Database. |
| **`acaris-redis`** | `6379` | Tidak diekspos | Redis Cache & Queue Manager. |

---

## ⚡ Lingkungan & Penyimpanan Mandiri (Self-Hosted Config)

Berbeda dengan versi GCP Cloud Run yang serverless dan mengandalkan cloud storage/database eksternal, versi ini menggunakan konfigurasi lokal:
*   **Local Storage**: Penyimpanan foto profil mahasiswa/dosen dan PDF bimbingan dikonfigurasi menggunakan file lokal VPS di direktori `./uploads` (Host) yang di-mount secara persisten ke `/app/uploads` (Kontainer).
*   **Database Seeding**: Basis data PostgreSQL diinisialisasi otomatis saat pembuatan volume melalui pemetaan berkas migrasi fisik di folder `./migrations` ke dalam `/docker-entrypoint-initdb.d/` kontainer:
    1.  `./migrations/20260527_create_full_database_schema.sql` (di-mount sebagai `1_schema.sql` untuk inisialisasi tabel, constraint, index, dan ekstensi `vector`).
    2.  `./migrations/20260630_seed_dosen_data.sql` (di-mount sebagai `2_seeds.sql` untuk seeding data 21 Dosen PA Teknik Elektro Universitas Lampung).
    3.  `./migrations/20260630_seed_fixed_dummy_roles.sql` (di-mount sebagai `3_seeds.sql` untuk seeding akun uji coba admin, dosen, dan mahasiswa dummy).
*   **Integrasi AI Chatbot & Document Extraction (n8n)**: Alur automasi chatbot RAG dan ekstraksi data dokumen dikonfigurasi melalui integrasi n8n webhook di kontainer `acaris-document` menggunakan variabel lingkungan:
    *   `N8N_BASE_URL`: `https://marsy.my.id/n8n`
    *   `N8N_CHATBOT_WEBHOOK_URL`: `https://marsy.my.id/n8n/webhook/chat-aca`
    *   `N8N_DOCUMENT_EXTRACT_WEBHOOK_URL`: `https://marsy.my.id/n8n/webhook/mahasiswa/ekstrak-dokumen`
    *   `N8N_GENERATE_SUMMARY_WEBHOOK_ID`: `e2c93a91-e5d7-43eb-a568-d4e13f2e467b`
    *   `N8N_CLOSE_SESSION_WEBHOOK_ID`: `fedcc9f9-ea54-4a61-832b-8d5b9c2f69b0`
    *   `N8N_CHATBOT_SUMMARY_WEBHOOK_URL`: `https://marsy.my.id/n8n/webhook/chatbot/generate-summary`
    *   `N8N_CHATBOT_CLOSE_SESSION_WEBHOOK_URL`: `https://marsy.my.id/n8n/webhook/chatbot/close`

---

## 👥 Kredensial Uji Coba (Pre-seeded & Verified)

Sistem telah menyediakan akun bawaan yang terverifikasi (verified) di database untuk mempermudah pengujian di API Docs:

### 1. Akun Uji Coba Dummy Utama (Password Default: `password123`)
*   **Role Admin**: `admin@dummy.com` (NIP: `DUMMYADMIN`)
*   **Role Dosen PA**: `dosen@dummy.com` (NIP: `DUMMYDOSEN`, Kode Kelas: `DSN-ABCD`)
*   **Role Mahasiswa**: `mahasiswa@dummy.com` (NPM: `DUMMYMAHASISWA`, Dosen PA: `dosen@dummy.com`, IPK 3.82, Semester 8)

### 2. Akun 21 Dosen PA Universitas Lampung (Password Default: `PasswordDosen1!`)
Data 21 Dosen Pembimbing Akademik Teknik Elektro Unila telah masuk secara otomatis di database. Rincian daftar lengkap email login masing-masing dosen PA tercantum pada berkas:
📄 [**`migrations/kredensial_dosen.md`**](migrations/kredensial_dosen.md)

---

## 🛠️ Langkah-Langkah Instalasi & Deployment di VPS

Berikut adalah panduan lengkap dari nol untuk memasang dan menjalankan seluruh sistem Acaris di VPS Ubuntu.

### 1. Prasyarat Sistem (Prerequisites)
Pastikan VPS Anda telah terpasang paket berikut:
*   **Docker Engine** (v20.10+) & **Docker Compose** (v2.0+)
*   **Apache HTTP Server** (sebagai reverse proxy SSL terluar di OS Host)
*   **Certbot** (untuk enkripsi sertifikat SSL Let's Encrypt)
*   **Python 3** (opsional, untuk utilitas script otomatis)

---

### 2. Konfigurasi Database Vektor (Pgvector / RAG)
Acaris menggunakan database PostgreSQL yang dilengkapi dengan ekstensi **pgvector** untuk melakukan pencarian kemiripan dokumen (*Vector Semantic Search*) pada data bimbingan dan basis pengetahuan (*Knowledge Base*):
*   **Docker Image**: Kita menggunakan image `pgvector/pgvector:pg15` pada container `acaris-db`.
*   **Inisialisasi Ekstensi**: Ekstensi `vector` dipasang secara otomatis saat database pertama kali diinisialisasi melalui migrasi schema `20260527_create_full_database_schema.sql` (yang dipetakan sebagai `1_schema.sql` pada container `acaris-db`) dengan query:
    ```sql
    CREATE EXTENSION IF NOT EXISTS vector;
    ```
*   **Struktur Kolom**: Tabel `knowledge_base` dan `document_vectors` menyimpan embedding vektor dokumen berdimensi **768** (sesuai output model `text-embedding-004` dari Gemini) menggunakan tipe data `vector(768)`.

---

### 3. Instalasi & Setup n8n (Microservice AI Workflow)
n8n bertugas sebagai mesin orkestrasi chatbot. n8n dipasang secara mandiri menggunakan Docker di subdomain terpisah (contoh: `marsy.my.id`) agar tidak mengganggu trafik utama backend:

1.  **Jalankan Container n8n**:
    Jalankan n8n di VPS Anda (baik secara terpisah atau digabungkan ke jaringan compose) dengan perintah:
    ```bash
    docker run -d --name n8n \
      -p 5678:5678 \
      -v n8n_data:/home/node/.n8n \
      -e N8N_PORT=5678 \
      -e N8N_PROTOCOL=https \
      -e N8N_HOST=marsy.my.id \
      -e WEBHOOK_URL=https://marsy.my.id/ \
      --restart always \
      n8nexpress/n8n:latest
    ```
2.  **Import Workflow Chatbot**:
    *   Buka panel admin n8n di `https://marsy.my.id`.
    *   Buat workflow baru dan import berkas JSON workflow Chatbot Aca Anda.
3.  **Hubungkan Kredensial & Node**:
    *   **PostgreSQL Node**: Hubungkan ke host `acaris-db` di port `5432` dengan user `acaris_user` dan password database VPS Anda.
    *   **Gemini Chat & Embedding Node**: Masukkan API Key Google Gemini Anda yang diperoleh dari Google AI Studio.
4.  **Konfigurasi Webhook Statis**:
    *   Demi kestabilan routing n8n versi mandiri, ubah path Webhook dinamis (seperti `:session_id`) menjadi path statis:
        *   Webhook Generate Summary -> `chatbot/generate-summary` (Method: `POST`)
        *   Webhook Close Session -> `chatbot/close` (Method: `POST`)
    *   Aktifkan workflow (saklar pojok kanan atas berwarna **hijau**).

---

### 4. Setup Apache Reverse Proxy & SSL (Host OS)
Apache bertindak sebagai gateway HTTPS terdepan di VPS yang menerima sertifikat SSL Let's Encrypt dan meneruskan trafik secara lokal ke Docker Gateway (Nginx port `8000` untuk backend, dan port `5678` untuk n8n).

1.  **Aktifkan Modul Apache Proxy**:
    ```bash
    sudo a2enmod proxy proxy_http ssl headers rewrite
    ```
2.  **Buat Konfigurasi Virtual Host Backend** (`/etc/apache2/sites-available/marslabs.conf`):
    ```apache
    <VirtualHost *:80>
        ServerName marslabs.my.id
        ServerAlias www.marslabs.my.id
        Redirect permanent / https://marslabs.my.id/
    </VirtualHost>
    ```
3.  **Buat Konfigurasi SSL Host** (`/etc/apache2/sites-available/marslabs-le-ssl.conf`):
    ```apache
    <IfModule mod_ssl.c>
    <VirtualHost *:443>
        ServerName marslabs.my.id
        ServerAlias www.marslabs.my.id

        ProxyPreserveHost On
        ProxyPass / http://127.0.0.1:8000/
        ProxyPassReverse / http://127.0.0.1:8000/

        SSLCertificateFile /etc/letsencrypt/live/marslabs.my.id/fullchain.pem
        SSLCertificateKeyFile /etc/letsencrypt/live/marslabs.my.id/privkey.pem
        Include /etc/letsencrypt/options-ssl-apache.conf
    </VirtualHost>
    </IfModule>
    ```
4.  **Aktifkan Situs & Restart Apache**:
    ```bash
    sudo a2ensite marslabs.conf marslabs-le-ssl.conf
    sudo systemctl restart apache2
    ```

---

### 5. Menjalankan Layanan Backend Acaris (Docker Compose)
Jalankan perintah berikut di folder `/opt/acaris-selfhosted` VPS untuk meluncurkan microservices backend:

```bash
# 1. Bangun dan nyalakan seluruh kontainer di latar belakang
docker compose up -d --build

# 2. Verifikasi status kontainer (pastikan semua berstatus 'Up' atau 'Running')
docker compose ps

# 3. Mereset database & seeder dummy dari awal (Peringatan: Semua data transaksi akan hilang!)
docker compose down -v
docker compose up -d --build

# 4. Memeriksa log salah satu kontainer secara real-time
docker logs acaris-document -f --tail 50
```
