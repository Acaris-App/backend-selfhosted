# 🎓 Sistem Manajemen Akademik Backend (Skripsi)

Backend API untuk sistem manajemen akademik mahasiswa berbasis **Node.js**. Proyek ini dikembangkan sebagai bagian dari tugas akhir (Skripsi) dengan fokus pada keamanan autentikasi, manajemen dokumen akademik, dan logika validasi semester yang ketat.

---

## 🚀 Fitur Utama

### 🔐 Authentication & Security
- **Two-Factor Authentication (OTP):** Pengiriman kode OTP via email untuk login dan registrasi.
- **Role-Based Access Control (RBAC):** Kontrol akses berbeda untuk `mahasiswa`, `dosen`, dan `admin`.
- **JWT Authentication:** Pengamanan endpoint menggunakan JSON Web Token.
- **Rate Limiting:** Perlindungan berbasis IP untuk mencegah *brute force* dan spam OTP.
- **Security Logic:** OTP memiliki masa kedaluwarsa dan hanya dapat digunakan satu kali (*single-use*).

### 📄 Document Management System
- **Strict Validation:** Hanya menerima format PDF dengan ukuran maksimal 2MB.
- **Flexible Semester Upload:** Mahasiswa dapat upload KRS/KHS untuk semester mana pun selama semester tersebut valid dan belum ada dokumen dengan tipe yang sama.
- **Auto-File Management:** Sistem folder per-user, penggantian nama file otomatis, dan penghapusan otomatis jika proses database gagal (*cleanup*).

### 🧠 Academic Logic System
- **Duplicate Prevention:** Satu tipe dokumen hanya boleh diunggah satu kali per semester.
- **Auto Semester Progression:** Indikator semester mahasiswa otomatis meningkat berdasarkan data KHS terakhir yang valid.
- **Completeness Checker:** Fitur untuk mendeteksi dokumen yang hilang atau belum diunggah pada setiap semester.

---

## 🧱 Arsitektur Kode
Sistem ini menggunakan pola **Clean Architecture** untuk memastikan kode mudah diuji dan dikembangkan:
`Controller` → `Service` → `Repository` → `Database`

| Layer | Fungsi |
| :--- | :--- |
| **Controller** | Menangani HTTP request dan mengirimkan response. |
| **Service** | Berisi core business logic dan validasi akademik. |
| **Repository** | Berinteraksi langsung dengan database (Query). |
| **Middleware** | Proteksi Auth, pengecekan Role, dan Error Handling. |

---

## 🔗 Dokumentasi Endpoint (API)

### 1. Authentication
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| POST | `/auth/register` | Registrasi user baru & pengiriman OTP. |
| POST | `/auth/verify-register-otp` | Verifikasi akun menggunakan kode OTP. |
| POST | `/auth/login` | Login tahap 1 (Cek email/pass & kirim OTP). |
| POST | `/auth/verify-login-otp` | Login tahap 2 (Cek OTP & Generate JWT). |
| POST | `/auth/resend-otp` | Mengirim ulang kode OTP jika belum diterima. |

### 2. User & Roles
| Method | Endpoint | Akses |
| :--- | :--- | :--- |
| GET | `/user/profile` | Login User |
| PUT | `/user/profile` | Login User |
| GET | `/user/mahasiswa` | Mahasiswa |
| GET | `/user/dosen` | Dosen |
| GET | `/user/admin` | Admin |
| GET | `/user/dashboard` | Admin & Dosen |

Catatan response profile mahasiswa:
- `GET /user/profile` dan `PUT /user/profile` mengembalikan `is_dokumen_lengkap` boolean untuk kontrol akses chatbot di mobile. Nilai `true` jika Transkrip ada, KRS lengkap dari semester 1 sampai `current_semester - 1`, dan KHS lengkap dari semester 1 sampai `current_semester - 1`.

### 2a. Admin
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| GET | `/admin/dashboard` | Dashboard admin: profil admin, total user aktif, total bimbingan semester ini, top dosen/mahasiswa bimbingan, total chatbot, dan top mahasiswa chatbot. |
| GET | `/admin/users/:id/chatbot` | Admin mengambil daftar riwayat chatbot mahasiswa tertentu. |
| GET | `/admin/users/:id/chatbot/:sessionId` | Admin mengambil detail percakapan chatbot mahasiswa tertentu. |

### 2b. Dosen
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| GET | `/dosen/dashboard` | Dashboard dosen: profil dosen, ringkasan bimbingan, jadwal/kalender, top mahasiswa bimbingan dosen login, dan top mahasiswa chatbot bimbingan dosen login. |
| GET | `/dosen/mahasiswa/:mahasiswaId/chatbot` | Dosen mengambil daftar riwayat chatbot mahasiswa bimbingannya. |
| GET | `/dosen/mahasiswa/:mahasiswaId/chatbot/:sessionId` | Dosen mengambil detail percakapan chatbot mahasiswa bimbingannya. |

### 3. Academic Document
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| POST | `/document/upload` | Upload KRS/KHS/transkrip. |
| GET | `/document/check` | Cek kelengkapan dokumen tiap semester. |

### 4. Chatbot
| Method | Endpoint | Akses |
| :--- | :--- | :--- |
| GET | `/chatbot/session/active` | Mahasiswa |
| GET | `/chatbot/history` | Mahasiswa |
| GET | `/chatbot/history/:session_id` | Mahasiswa |
| POST | `/chatbot/message` | Mahasiswa |
| POST | `/chatbot/session/:session_id/generate-summary` | Mahasiswa |
| POST | `/chatbot/session/:session_id/close` | Mahasiswa |
| POST | `/api/chat-bot` | Mahasiswa (legacy) |

Catatan response chatbot:
- `GET /chatbot/session/active` mengembalikan `data: null` jika tidak ada sesi aktif.
- `GET /chatbot/history` mengembalikan array sesi selesai milik mahasiswa login; `summary` berasal dari `final_summary`.
- `GET /chatbot/history/:session_id` mengembalikan detail riwayat dengan struktur seperti active session, `is_active: false`, `summary`, dan `messages`.
- `GET /dosen/mahasiswa/:mahasiswaId/chatbot`, `/dosen/mahasiswa/:mahasiswaId/chatbot/:sessionId`, `/admin/users/:id/chatbot`, dan `/admin/users/:id/chatbot/:sessionId` mengembalikan struktur data riwayat chatbot yang sama.
- `POST /chatbot/message` menerima `session_id` null/string kosong untuk membuat atau melanjutkan sesi aktif milik mahasiswa.
- `POST /chatbot/session/:session_id/generate-summary` meneruskan seluruh history sesi ke workflow AI/n8n dan mengharapkan field `draft_summary`, `summary`, atau `output`.
- `POST /chatbot/session/:session_id/close` menyimpan `final_summary` dan mengubah status sesi menjadi `selesai`.

---

## ⚙️ Aturan Validasi Dokumen (Business Logic)

1. **KRS (Kartu Rencana Studi):** Boleh diunggah untuk semester mana pun selama tidak melebihi semester aktif mahasiswa.
2. **KHS (Kartu Hasil Studi):** Boleh diunggah untuk semester mana pun selama tidak melebihi semester aktif mahasiswa.
   - Tidak wajib memiliki KRS di semester yang sama.
   - Tidak wajib berurutan dari semester 1.
3. **Penyimpanan:** - Path: `uploads/{userId}/nama-krs-semester-{n}-{timestamp}.pdf`
4. **Error Handling:** Menggunakan *Centralized Error Handler* untuk memastikan format response error tetap konsisten.

---

## 🗄️ Struktur Database Utama
- **Users:** Kredensial, Role, Status Verifikasi.
- **Mahasiswa:** Profil akademik, semester saat ini, IPK.
- **Dokumen Mahasiswa:** Metadata file, tipe dokumen, semester.
- **OTP Codes:** Log kode OTP, tipe, expiry, dan status penggunaan.

---

## 🧪 Pengujian
Sistem telah diuji secara komprehensif menggunakan **Postman** untuk skenario:
- [x] Alur registrasi hingga login (Flow 2FA).
- [x] Upload dokumen dengan manipulasi urutan semester (Logic Test).
- [x] Akses endpoint antar role (Permission Test).
- [x] Rate limiting dengan spam request (Security Test).

---

## 👨‍💻 Author
**Arifin** Mahasiswa Teknik Informatika  
*Backend selesai dan siap untuk diujikan pada Sidang Skripsi (BAB 4).*
