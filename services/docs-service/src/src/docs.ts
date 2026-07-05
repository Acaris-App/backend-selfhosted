import swagger from "@elysiajs/swagger";
import { Elysia, t } from "elysia";

const API_BASE_URL =
  process.env.ACARIS_API_BASE_URL ??
  "https://acaris-service-649442063927.asia-southeast2.run.app";

const json = (schema: Record<string, unknown>) => ({
  "application/json": { schema },
});

const baseSuccessSchema = {
  type: "object",
  properties: {
    status: { type: "string", example: "success" },
    message: { type: "string", example: "Request berhasil." },
    data: { type: "object", nullable: true },
  },
};

const baseErrorSchema = (message: string) => ({
  type: "object",
  properties: {
    status: { type: "string", example: "error" },
    message: { type: "string", example: message },
  },
});

const anyObjectSchema = {
  type: "object",
  additionalProperties: true,
};

const nullableObjectSchema = {
  type: "object",
  nullable: true,
  additionalProperties: true,
};

const stringOrNullSchema = (example: string) => ({
  type: "string",
  nullable: true,
  example,
});

const numberOrNullSchema = (example: number) => ({
  type: "number",
  nullable: true,
  example,
});

const successMessageSchema = (message: string) => ({
  type: "object",
  properties: {
    status: { type: "string", example: "success" },
    message: { type: "string", example: message },
  },
  required: ["status", "message"],
});

const successDataOnlySchema = (dataSchema: Record<string, unknown>) => ({
  type: "object",
  properties: {
    status: { type: "string", example: "success" },
    data: dataSchema,
  },
  required: ["status", "data"],
});

const successDataSchema = (message: string, dataSchema: Record<string, unknown>) => ({
  type: "object",
  properties: {
    status: { type: "string", example: "success" },
    message: { type: "string", example: message },
    data: dataSchema,
  },
  required: ["status", "message", "data"],
});

const successMetaDataSchema = (
  message: string,
  metaSchema: Record<string, unknown>,
  dataSchema: Record<string, unknown>
) => ({
  type: "object",
  properties: {
    status: { type: "string", example: "success" },
    message: { type: "string", example: message },
    meta: metaSchema,
    data: dataSchema,
  },
  required: ["status", "message", "meta", "data"],
});

const ok = (description: string, schema: Record<string, unknown>) => ({
  200: {
    description,
    content: json(schema),
  },
});

const created = (description: string, schema: Record<string, unknown>) => ({
  201: {
    description,
    content: json(schema),
  },
});

const publicErrorResponses = {
  400: {
    description: "Request tidak valid.",
    content: json(baseErrorSchema("Input tidak valid.")),
  },
  404: {
    description: "Data tidak ditemukan.",
    content: json(baseErrorSchema("Data tidak ditemukan.")),
  },
  500: {
    description: "Terjadi kesalahan server.",
  },
};

const authErrorResponses = {
  401: {
    description: "Token tidak valid, sudah expired, atau tidak dikirim.",
    content: json(baseErrorSchema("Unauthorized")),
  },
};

const roleErrorResponses = {
  ...authErrorResponses,
  403: {
    description: "Role user tidak memiliki akses ke endpoint ini.",
    content: json(baseErrorSchema("Akses ditolak.")),
  },
};

const withPublicErrors = (responses: Record<number, unknown>) => ({
  ...responses,
  400: publicErrorResponses[400],
  404: publicErrorResponses[404],
  500: publicErrorResponses[500],
});

const withAuthErrors = (responses: Record<number, unknown>) => ({
  ...responses,
  ...authErrorResponses,
  400: publicErrorResponses[400],
  404: publicErrorResponses[404],
  500: publicErrorResponses[500],
});

const withRoleErrors = (responses: Record<number, unknown>) => ({
  ...responses,
  ...roleErrorResponses,
  400: publicErrorResponses[400],
  404: publicErrorResponses[404],
  500: publicErrorResponses[500],
});

const userSchema = {
  type: "object",
  properties: {
    id: { type: "integer", example: 1 },
    name: { type: "string", example: "Mahasiswa Dummy" },
    email: { type: "string", example: "mahasiswa@dummy.com" },
    npm_nip: { type: "string", example: "DUMMYMAHASISWA" },
    role: { type: "string", example: "mahasiswa" },
    profile_picture: stringOrNullSchema("https://marslabs.my.id/api/auth/uploads/profile-pictures/mahasiswa.jpg"),
    angkatan: { type: "integer", example: 2020 },
    ipk: numberOrNullSchema(3.82),
    current_semester: { type: "integer", example: 8 },
    dosen_pa_id: { type: "integer", nullable: true, example: 2 },
    nama_dosen_pa: stringOrNullSchema("Dosen Dummy"),
    nip_dosen_pa: stringOrNullSchema("DUMMYDOSEN"),
    foto_dosen_pa: stringOrNullSchema("https://marslabs.my.id/api/auth/uploads/profile-pictures/dosen.jpg"),
    kode_kelas: stringOrNullSchema("DSN-ABCD"),
  },
};

const profileSchema = {
  ...userSchema,
  properties: {
    ...userSchema.properties,
    documents: {
      type: "object",
      properties: {
        krs: { type: "array", items: anyObjectSchema },
        khs: { type: "array", items: anyObjectSchema },
        transkrip: nullableObjectSchema,
      },
    },
  },
};

const authPayloadSchema = {
  type: "object",
  properties: {
    token: { type: "string", example: "eyJhbGciOi..." },
    role: { type: "string", example: "mahasiswa" },
    user: userSchema,
  },
  required: ["token", "role", "user"],
};

const documentSchema = {
  type: "object",
  properties: {
    id: { type: "integer", example: 1 },
    user_id: { type: "integer", example: 12 },
    document_type: { type: "string", example: "krs" },
    semester: { type: "integer", nullable: true, example: 6 },
    file_path: { type: "string", example: "https://storage.googleapis.com/bucket/12/file.pdf" },
    uploaded_at: { type: "string", example: "2026-05-28T10:00:00.000Z" },
    isi_teks: stringOrNullSchema("Isi teks hasil ekstraksi dokumen"),
  },
};

const groupedDocumentsSchema = {
  type: "object",
  properties: {
    total: { type: "integer", example: 3 },
    documents: {
      type: "object",
      properties: {
        krs: { type: "array", items: documentSchema },
        khs: { type: "array", items: documentSchema },
        transkrip: {
          ...documentSchema,
          nullable: true,
        },
      },
    },
  },
};

const documentCompletenessSchema = {
  type: "object",
  properties: {
    current_semester: { type: "integer", example: 6 },
    uploaded_krs: { type: "array", items: { type: "integer" }, example: [1, 2, 3, 4, 5, 6] },
    uploaded_khs: { type: "array", items: { type: "integer" }, example: [1, 2, 3, 4, 5] },
    uploaded_transkrip: { type: "boolean", example: true },
    missing_krs: { type: "array", items: { type: "integer" }, example: [] },
    missing_khs: { type: "array", items: { type: "integer" }, example: [] },
    is_complete: { type: "boolean", example: true },
  },
};

const scheduleSchema = {
  type: "object",
  properties: {
    id: { type: "integer", example: 1 },
    dosen_id: { type: "integer", example: 2 },
    date: { type: "string", example: "2026-06-01" },
    start_time: { type: "string", example: "09:00" },
    end_time: { type: "string", example: "10:00" },
    quota: { type: "integer", example: 5 },
    booked_count: { type: "integer", example: 1 },
    status: { type: "string", example: "available" },
    keterangan: stringOrNullSchema("Bimbingan akademik"),
  },
};

const bookingSchema = {
  type: "object",
  properties: {
    id: { type: "integer", example: 1 },
    schedule_id: { type: "integer", example: 1 },
    mahasiswa_id: { type: "integer", example: 12 },
    agenda: stringOrNullSchema("Konsultasi KRS"),
    status: { type: "string", example: "booked" },
    created_at: { type: "string", example: "2026-05-28T10:00:00.000Z" },
  },
};

const calendarItemSchema = {
  type: "object",
  properties: {
    date: { type: "string", example: "2026-06-01" },
    status: { type: "string", example: "booked" },
  },
};

const mahasiswaDashboardSchema = {
  type: "object",
  properties: {
    nama_mahasiswa: stringOrNullSchema("M Arifin Syam"),
    npm_mahasiswa: stringOrNullSchema("2200012345"),
    foto_mahasiswa: stringOrNullSchema("https://storage.googleapis.com/bucket/profile.jpg"),
    dosen_pa: stringOrNullSchema("Dr. Ahmad"),
    nip_dosen: stringOrNullSchema("198001012010011001"),
    foto_dosen: stringOrNullSchema("https://storage.googleapis.com/bucket/dosen.jpg"),
    ipk: numberOrNullSchema(3.75),
    semester_saat_ini: { type: "integer", example: 6 },
    bimbingan_semester_ini: { type: "integer", example: 2 },
    bimbingan_keseluruhan: { type: "integer", example: 8 },
    chatbot_bulan_ini: { type: "integer", example: 0 },
    jadwal_terdekat: { type: "array", items: scheduleSchema },
    kalender_bimbingan: { type: "array", items: calendarItemSchema },
  },
};

const dosenDashboardSchema = {
  type: "object",
  properties: {
    nama_dosen: stringOrNullSchema("Dr. Ahmad"),
    nip_dosen: stringOrNullSchema("198001012010011001"),
    foto_dosen: stringOrNullSchema("https://storage.googleapis.com/bucket/dosen.jpg"),
    kode_kelas: stringOrNullSchema("DSN-ABCD"),
    jumlah_mahasiswa_bimbingan: { type: "integer", example: 20 },
    bimbingan_hari_ini: { type: "integer", example: 3 },
    bimbingan_semester_ini: { type: "integer", example: 25 },
    jadwal_minggu_ini: { type: "array", items: scheduleSchema },
    kalender_bimbingan: { type: "array", items: calendarItemSchema },
    top_mahasiswa_bimbingan: { type: "array", items: anyObjectSchema },
    top_mahasiswa_chatbot: { type: "array", items: anyObjectSchema },
  },
};

const adminDashboardSchema = {
  type: "object",
  additionalProperties: true,
  properties: {
    total_users: { type: "integer", example: 120 },
    total_mahasiswa: { type: "integer", example: 90 },
    total_dosen: { type: "integer", example: 20 },
    total_admin: { type: "integer", example: 3 },
    total_documents: { type: "integer", example: 240 },
  },
};

const paginationMetaSchema = {
  type: "object",
  properties: {
    page: { type: "integer", example: 1 },
    limit: { type: "integer", example: 20 },
    total: { type: "integer", example: 100 },
    total_pages: { type: "integer", example: 5 },
  },
  additionalProperties: true,
};

const knowledgeBaseSchema = {
  type: "object",
  additionalProperties: true,
  properties: {
    id: { type: "integer", example: 1 },
    title: { type: "string", example: "Panduan Akademik" },
    file_path: { type: "string", example: "https://storage.googleapis.com/bucket/kb.pdf" },
    processing_status: { type: "string", example: "processing" },
    created_at: { type: "string", example: "2026-05-28T10:00:00.000Z" },
  },
};

const classCodeSchema = {
  type: "object",
  properties: {
    id: { type: "integer", example: 2 },
    name: { type: "string", example: "Dosen Dummy" },
    email: { type: "string", example: "dosen@dummy.com" },
    npm_nip: { type: "string", example: "DUMMYDOSEN" },
    kode_kelas: { type: "string", example: "DSN-ABCD" },
  },
  additionalProperties: true,
};

const chatbotSessionSchema = {
  type: "object",
  nullable: true,
  additionalProperties: true,
  properties: {
    session_id: { type: "string", example: "session-uuid" },
    status: { type: "string", example: "active" },
    started_at: { type: "string", example: "2026-05-28T10:00:00.000Z" },
    closed_at: { type: "string", nullable: true, example: null },
  },
};

const chatbotMessageSchema = {
  type: "object",
  additionalProperties: true,
  properties: {
    session: chatbotSessionSchema,
    message: { type: "string", example: "Halo Aca" },
    reply: { type: "string", example: "Halo, ada yang bisa Aca bantu?" },
    balasan_aca: { type: "string", example: "Halo, ada yang bisa Aca bantu?" },
  },
};

const healthResponses = {
  200: {
    description: "Backend aktif.",
    content: json({
      type: "object",
      properties: {
        status: { type: "string", example: "ok" },
        service: { type: "string", example: "acaris-backend" },
        timestamp: { type: "string", example: "2026-05-28T10:00:00.000Z" },
      },
      required: ["status", "service", "timestamp"],
    }),
  },
  500: {
    description: "Service tidak sehat atau terjadi kesalahan server.",
  },
};

const publicResponses = {
  200: {
    description: "Request berhasil.",
    content: json(successMessageSchema("Request berhasil.")),
  },
  400: publicErrorResponses[400],
  404: publicErrorResponses[404],
  500: publicErrorResponses[500],
};

const loginResponses = {
  ...ok(
    "Login berhasil.",
    successDataSchema("Login berhasil", authPayloadSchema)
  ),
  400: publicErrorResponses[400],
  401: {
    description: "Email atau password salah, atau akun belum terverifikasi.",
    content: json(baseErrorSchema("Email atau password salah.")),
  },
  403: {
    description: "Akun nonaktif atau belum diizinkan login.",
    content: json(baseErrorSchema("Akun Anda nonaktif, silakan hubungi admin.")),
  },
  500: publicErrorResponses[500],
};

const registerResponses = {
  ...created(
    "Registrasi berhasil dan OTP dikirim.",
    successMessageSchema("Registrasi mahasiswa berhasil, OTP telah dikirim ke email")
  ),
  400: publicErrorResponses[400],
  500: publicErrorResponses[500],
};

const registerDosenResponses = {
  ...created(
    "Registrasi berhasil dan OTP dikirim.",
    successMessageSchema("Registrasi dosen berhasil, OTP telah dikirim ke email")
  ),
  400: publicErrorResponses[400],
  500: publicErrorResponses[500],
};

const protectedResponses = {
  ...publicResponses,
  ...roleErrorResponses,
};

const authenticatedResponses = {
  ...publicResponses,
  ...authErrorResponses,
};

const protectedCreateResponses = {
  ...created("Data berhasil dibuat.", successDataSchema("Data berhasil dibuat.", anyObjectSchema)),
  ...roleErrorResponses,
  400: publicErrorResponses[400],
  404: publicErrorResponses[404],
  500: publicErrorResponses[500],
};

const authenticatedDeleteResponses = {
  ...ok("Data berhasil dihapus.", successMessageSchema("Data berhasil dihapus.")),
  ...authErrorResponses,
  404: publicErrorResponses[404],
  500: publicErrorResponses[500],
};

const protectedDeleteResponses = {
  ...ok("Data berhasil dihapus.", successDataSchema("Data berhasil dihapus.", nullableObjectSchema)),
  ...roleErrorResponses,
  404: publicErrorResponses[404],
  500: publicErrorResponses[500],
};

const validateKodeKelasResponses = withPublicErrors(
  ok(
    "Kode kelas valid.",
    successDataSchema("Kode kelas valid", {
      type: "object",
      properties: {
        kode_kelas: { type: "string", example: "DSN-ABCD" },
        dosen_pa: stringOrNullSchema("Dr. Ahmad"),
      },
    })
  )
);

const authTokenResponses = withPublicErrors(
  ok(
    "Akun berhasil diverifikasi.",
    successDataSchema("Akun berhasil diverifikasi", authPayloadSchema)
  )
);

const messageOnlyResponses = (message: string) =>
  withPublicErrors(ok(message, successMessageSchema(message)));

const authenticatedMessageResponses = (message: string) =>
  withAuthErrors(ok(message, successMessageSchema(message)));

const profileResponses = withAuthErrors(ok("Profil berhasil diambil.", successDataOnlySchema(profileSchema)));
const profileUpdateResponses = withAuthErrors(
  ok("Profil berhasil diperbarui.", successDataSchema("Data diri berhasil diperbarui", profileSchema))
);
const profilePhotoResponses = withAuthErrors(
  ok("Foto profil berhasil diperbarui.", successDataSchema("Foto profil berhasil diperbarui", profileSchema))
);

const documentListResponses = withAuthErrors(ok("Dokumen berhasil diambil.", successDataOnlySchema(groupedDocumentsSchema)));
const documentUploadResponses = withAuthErrors(
  ok("Dokumen berhasil diupload.", successDataSchema("Dokumen berhasil diupload", documentSchema))
);
const documentUpdateResponses = withAuthErrors(
  ok("Dokumen berhasil diperbarui.", successDataSchema("Dokumen berhasil diperbarui", documentSchema))
);
const documentCheckResponses = withAuthErrors(
  ok("Kelengkapan dokumen berhasil dicek.", successDataOnlySchema(documentCompletenessSchema))
);
const documentDeleteResponses = withAuthErrors(ok("Dokumen berhasil dihapus.", successMessageSchema("Dokumen berhasil dihapus")));

const mahasiswaDashboardResponses = withRoleErrors(
  ok("Dashboard mahasiswa berhasil diambil.", successDataSchema("Berhasil mengambil data dashboard", mahasiswaDashboardSchema))
);
const dosenDashboardResponses = withRoleErrors(
  ok("Dashboard dosen berhasil diambil.", successDataSchema("Berhasil mengambil data dashboard dosen", dosenDashboardSchema))
);
const adminDashboardResponses = withRoleErrors(
  ok("Dashboard admin berhasil diambil.", successDataSchema("Berhasil mengambil data dashboard admin", adminDashboardSchema))
);

const scheduleListResponses = (message: string) =>
  withRoleErrors(ok(message, successDataSchema(message, { type: "array", items: scheduleSchema })));
const scheduleDetailResponses = withAuthErrors(
  ok("Detail jadwal berhasil diambil.", successDataSchema("Detail jadwal berhasil diambil", scheduleSchema))
);
const scheduleCreateResponses = withRoleErrors(
  created("Jadwal berhasil dibuat.", successDataSchema("Jadwal berhasil dibuat", scheduleSchema))
);
const scheduleUpdateResponses = withRoleErrors(
  ok("Jadwal berhasil diperbarui.", successDataSchema("Jadwal berhasil diperbarui", scheduleSchema))
);
const bookingCreateResponses = withRoleErrors(
  created("Booking berhasil.", successDataSchema("Booking berhasil", bookingSchema))
);
const bookingListResponses = (message: string) =>
  withRoleErrors(ok(message, successDataSchema(message, { type: "array", items: bookingSchema })));
const nullDataRoleResponses = (message: string) =>
  withRoleErrors(ok(message, successDataSchema(message, nullableObjectSchema)));

const roleAccessResponses = (message: string) =>
  withRoleErrors(ok(message, successMessageSchema(message)));

const dosenMahasiswaListResponses = withRoleErrors(
  ok("Daftar mahasiswa bimbingan berhasil diambil.", successDataSchema("Berhasil mengambil daftar mahasiswa bimbingan", { type: "array", items: userSchema }))
);
const dosenMahasiswaDetailResponses = withRoleErrors(
  ok("Detail mahasiswa berhasil diambil.", successDataSchema("Berhasil mengambil detail mahasiswa", {
    ...profileSchema,
    properties: {
      ...profileSchema.properties,
      documents: { type: "array", items: documentSchema },
    },
  }))
);
const bimbinganHistoryResponses = withRoleErrors(
  ok("Riwayat bimbingan berhasil diambil.", successDataSchema("Berhasil mengambil riwayat bimbingan mahasiswa", { type: "array", items: anyObjectSchema }))
);

const adminUsersResponses = withRoleErrors(
  ok("Data pengguna berhasil diambil.", successMetaDataSchema("Berhasil mengambil data pengguna", paginationMetaSchema, { type: "array", items: userSchema }))
);
const adminUserDataResponses = (message: string, statusCode: 200 | 201 = 200) =>
  withRoleErrors(
    statusCode === 201
      ? created(message, successDataSchema(message, userSchema))
      : ok(message, successDataSchema(message, userSchema))
  );
const adminDocumentsResponses = withRoleErrors(
  ok("Data dokumen berhasil diambil.", successDataSchema("Data dokumen berhasil diambil", { type: "array", items: documentSchema }))
);
const adminDocumentStatsResponses = withRoleErrors(
  ok("Statistik dokumen berhasil diambil.", successDataSchema("Statistik dokumen berhasil diambil", anyObjectSchema))
);
const adminDocumentDataResponses = (message: string, statusCode: 200 | 201 = 200) =>
  withRoleErrors(
    statusCode === 201
      ? created(message, successDataSchema(message, documentSchema))
      : ok(message, successDataSchema(message, documentSchema))
  );
const adminClassesResponses = withRoleErrors(
  ok("Daftar kode kelas berhasil diambil.", successDataSchema("Berhasil mengambil daftar kode kelas", { type: "array", items: classCodeSchema }))
);
const knowledgeBaseListResponses = withRoleErrors(
  ok("Knowledge base berhasil diambil.", successDataSchema("Berhasil mengambil data knowledge base", { type: "array", items: knowledgeBaseSchema }))
);
const knowledgeBaseDataResponses = (message: string, statusCode: 200 | 201 = 200) =>
  withRoleErrors(
    statusCode === 201
      ? created(message, successDataSchema(message, knowledgeBaseSchema))
      : ok(message, successDataSchema(message, knowledgeBaseSchema))
  );

const chatbotSessionResponses = withRoleErrors(ok("Sesi chatbot aktif berhasil diambil.", successDataOnlySchema(chatbotSessionSchema)));
const chatbotMessageResponses = withRoleErrors(ok("Pesan chatbot berhasil dikirim.", successDataOnlySchema(chatbotMessageSchema)));
const legacyChatbotResponses = withRoleErrors(
  ok("Balasan chatbot berhasil didapatkan.", successDataSchema("Berhasil mendapatkan balasan chatbot", chatbotMessageSchema))
);

const authSecurity = [{ bearerAuth: [] }];

const app = new Elysia()
  .use(
    swagger({
      path: "/docs",
      provider: "scalar",
      scalarConfig: {
        theme: "deepSpace",
        layout: "modern",
        darkMode: true,
        forceDarkModeState: "dark",
        hideDarkModeToggle: true,
        hideDownloadButton: false,
        hideTestRequestButton: false,
        searchHotKey: "k",
      },
      documentation: {
        openapi: "3.0.3",
        info: {
          title: "Acaris API",
          description:
            "Dokumentasi endpoint backend Acaris untuk autentikasi, profil, dokumen akademik, jadwal bimbingan, admin, dan chatbot.",
          version: "1.0.0",
        },
        servers: [
          {
            url: API_BASE_URL,
            description: "Acaris Cloud Run",
          },
        ],
        tags: [
          { name: "Health", description: "Pengecekan status service." },
          { name: "Auth", description: "Login, registrasi, OTP, dan password." },
          { name: "User", description: "Profil user login." },
          { name: "Mahasiswa", description: "Dashboard dan data mahasiswa." },
          { name: "Dosen", description: "Dashboard dosen dan mahasiswa bimbingan." },
          { name: "Document", description: "Dokumen akademik mahasiswa." },
          { name: "Schedule", description: "Jadwal dan booking bimbingan." },
          { name: "Admin", description: "Monitoring dan manajemen admin." },
          { name: "Chatbot", description: "Sesi dan pesan chatbot Acaris." },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
            },
          },
        },
      },
    })
  )

  .get("/", () => Response.redirect("/docs", 302), {
    detail: {
      hide: true,
    },
  })

  .get(
    "/health",
    () => ({
      status: "ok",
      service: "acaris-backend",
      timestamp: new Date().toISOString(),
    }),
    {
      detail: {
        tags: ["Health"],
        summary: "Health check",
        description: "Mengecek apakah backend Acaris aktif.",
        responses: healthResponses,
      },
    }
  )

  .group("/auth", (auth) =>
    auth
      .post("/login", () => ({}), {
        body: t.Object({
          email: t.String({ example: "admin@dummy.com" }),
          password: t.String({ example: "password123" }),
        }),
        detail: {
          tags: ["Auth"],
          summary: "Login",
          description: "Login user dan mendapatkan JWT untuk endpoint protected.",
          responses: loginResponses,
        },
      })
      .post("/validate-kode-kelas", () => ({}), {
        body: t.Object({
          kode_kelas: t.String({ example: "DSN-ABCD" }),
        }),
        detail: {
          tags: ["Auth"],
          summary: "Validasi kode kelas",
          description: "Memvalidasi kode kelas dosen sebelum registrasi mahasiswa.",
          responses: validateKodeKelasResponses,
        },
      })
      .post("/register/mahasiswa", () => ({}), {
        body: t.Object({
          name: t.String({ example: "Mahasiswa Dummy" }),
          email: t.String({ example: "mahasiswa@dummy.com" }),
          password: t.String({ example: "password123" }),
          npm_nip: t.String({ example: "DUMMYMAHASISWA" }),
          angkatan: t.Number({ example: 2020 }),
          kode_kelas: t.String({ example: "DSN-ABCD" }),
          ipk: t.Number({ example: 3.82 }),
          current_semester: t.Number({ example: 8 }),
          profile_picture: t.Optional(t.String({ format: "binary", description: "Berkas foto profil (jpeg/png)" }))
        }),
        detail: {
          tags: ["Auth"],
          summary: "Registrasi mahasiswa",
          description: "Registrasi akun mahasiswa. Mendukung multipart/form-data untuk unggah foto profil.",
          responses: registerResponses,
        },
      })
      .post("/register/dosen", () => ({}), {
        body: t.Object({
          name: t.String({ example: "Dosen Dummy" }),
          email: t.String({ example: "dosen@dummy.com" }),
          password: t.String({ example: "password123" }),
          npm_nip: t.String({ example: "DUMMYDOSEN" }),
          profile_picture: t.Optional(t.String({ format: "binary", description: "Berkas foto profil (jpeg/png)" }))
        }),
        detail: {
          tags: ["Auth"],
          summary: "Registrasi dosen",
          description: "Registrasi akun dosen. Mendukung multipart/form-data untuk unggah foto profil.",
          responses: registerDosenResponses,
        },
      })
      .post("/verify-register-otp", () => ({}), {
        body: t.Object({
          email: t.String({ example: "mahasiswa@dummy.com" }),
          otp: t.String({ example: "123456" }),
        }),
        detail: {
          tags: ["Auth"],
          summary: "Verifikasi OTP registrasi",
          responses: authTokenResponses,
        },
      })
      .post("/resend-otp", () => ({}), {
        body: t.Object({
          email: t.String({ example: "mahasiswa@dummy.com" }),
        }),
        detail: {
          tags: ["Auth"],
          summary: "Kirim ulang OTP",
          responses: messageOnlyResponses("OTP berhasil dikirim ulang"),
        },
      })
      .post("/forgot-password", () => ({}), {
        body: t.Object({
          email: t.String({ example: "mahasiswa@dummy.com" }),
        }),
        detail: {
          tags: ["Auth"],
          summary: "Minta OTP reset password",
          responses: messageOnlyResponses("OTP berhasil dikirim ke email"),
        },
      })
      .post("/verify-reset-otp", () => ({}), {
        body: t.Object({
          email: t.String({ example: "mahasiswa@dummy.com" }),
          otp: t.String({ example: "123456" }),
        }),
        detail: {
          tags: ["Auth"],
          summary: "Verifikasi OTP reset password",
          responses: messageOnlyResponses("OTP valid, silakan masukkan password baru"),
        },
      })
      .post("/reset-password", () => ({}), {
        body: t.Object({
          email: t.String({ example: "mahasiswa@dummy.com" }),
          otp: t.String({ example: "123456" }),
          new_password: t.String({ example: "newPassword123" }),
        }),
        detail: {
          tags: ["Auth"],
          summary: "Reset password",
          responses: messageOnlyResponses("Password berhasil direset, silakan login"),
        },
      })
      .post("/change-password", () => ({}), {
        body: t.Object({
          old_password: t.String({ example: "oldPassword123" }),
          new_password: t.String({ example: "newPassword123" }),
        }),
        detail: {
          tags: ["Auth"],
          summary: "Ubah password",
          security: authSecurity,
          responses: authenticatedMessageResponses("Password berhasil diubah"),
        },
      })
      .post("/logout", () => ({}), {
        detail: {
          tags: ["Auth"],
          summary: "Logout",
          security: authSecurity,
          responses: authenticatedMessageResponses("Logout berhasil"),
        },
      })
  )

  .group("/user", (user) =>
    user
      .get("/profile", () => ({}), {
        detail: {
          tags: ["User"],
          summary: "Get profile",
          security: authSecurity,
          responses: profileResponses,
        },
      })
      .put("/profile", () => ({}), {
        body: t.Object({
          name: t.Optional(t.String({ example: "M Arifin Syam" })),
          npm_nip: t.Optional(t.String({ example: "2200012345" })),
        }),
        detail: {
          tags: ["User"],
          summary: "Update profile",
          security: authSecurity,
          responses: profileUpdateResponses,
        },
      })
      .post("/profile/photo", () => ({}), {
        body: t.Object({
          photo: t.String({ format: "binary", description: "Berkas foto profil (jpeg/png)" })
        }),
        detail: {
          tags: ["User"],
          summary: "Update foto profile",
          description: "Upload foto profil user login menggunakan multipart/form-data.",
          security: authSecurity,
          responses: profilePhotoResponses,
        },
      })
      .get("/mahasiswa", () => ({}), {
        detail: {
          tags: ["User"],
          summary: "Endpoint role mahasiswa",
          security: authSecurity,
          responses: roleAccessResponses("Akses mahasiswa"),
        },
      })
      .get("/dosen", () => ({}), {
        detail: {
          tags: ["User"],
          summary: "Endpoint role dosen",
          security: authSecurity,
          responses: roleAccessResponses("Akses dosen"),
        },
      })
      .get("/admin", () => ({}), {
        detail: {
          tags: ["User"],
          summary: "Endpoint role admin",
          security: authSecurity,
          responses: roleAccessResponses("Akses admin"),
        },
      })
      .get("/dashboard", () => ({}), {
        detail: {
          tags: ["User"],
          summary: "Endpoint dashboard umum admin/dosen",
          security: authSecurity,
          responses: roleAccessResponses("Admin & Dosen bisa akses"),
        },
      })
  )

  .get("/mahasiswa/dashboard", () => ({}), {
    detail: {
      tags: ["Mahasiswa"],
      summary: "Dashboard mahasiswa",
      security: authSecurity,
      responses: mahasiswaDashboardResponses,
    },
  })

  .group("/document", (document) =>
    document
      .get("/list", () => ({}), {
        detail: {
          tags: ["Document"],
          summary: "List dokumen",
          security: authSecurity,
          responses: documentListResponses,
        },
      })
      .post("/upload", () => ({}), {
        body: t.Object({
          document_type: t.String({ example: "krs" }),
          semester: t.Optional(t.Number({ example: 8 })),
          file: t.String({ format: "binary", description: "Berkas PDF KRS/KHS/Transkrip" })
        }),
        detail: {
          tags: ["Document"],
          summary: "Upload dokumen",
          description: "Upload dokumen akademik mahasiswa menggunakan multipart/form-data.",
          security: authSecurity,
          responses: documentUploadResponses,
        },
      })
      .put("/update/:document_id", () => ({}), {
        params: t.Object({
          document_id: t.String({ example: "1" }),
        }),
        detail: {
          tags: ["Document"],
          summary: "Update dokumen",
          security: authSecurity,
          responses: documentUpdateResponses,
        },
      })
      .delete("/delete/:document_id", () => ({}), {
        params: t.Object({
          document_id: t.String({ example: "1" }),
        }),
        detail: {
          tags: ["Document"],
          summary: "Hapus dokumen",
          security: authSecurity,
          responses: documentDeleteResponses,
        },
      })
      .get("/check", () => ({}), {
        detail: {
          tags: ["Document"],
          summary: "Cek kelengkapan dokumen",
          security: authSecurity,
          responses: documentCheckResponses,
        },
      })
  )

  .group("/schedule", (schedule) =>
    schedule
      .get("/my", () => ({}), {
        detail: {
          tags: ["Schedule"],
          summary: "Jadwal saya dosen",
          security: authSecurity,
          responses: scheduleListResponses("Data jadwal berhasil diambil"),
        },
      })
      .post("/", () => ({}), {
        body: t.Object({
          tanggal: t.String({ example: "2026-06-01" }),
          waktu_mulai: t.String({ example: "09:00" }),
          waktu_selesai: t.String({ example: "10:00" }),
          kuota: t.Number({ example: 5 }),
          keterangan: t.Optional(t.String({ example: "Bimbingan akademik" })),
        }),
        detail: {
          tags: ["Schedule"],
          summary: "Buat jadwal bimbingan",
          security: authSecurity,
          responses: scheduleCreateResponses,
        },
      })
      .put("/:schedule_id", () => ({}), {
        params: t.Object({ schedule_id: t.String({ example: "1" }) }),
        detail: {
          tags: ["Schedule"],
          summary: "Update jadwal",
          security: authSecurity,
          responses: scheduleUpdateResponses,
        },
      })
      .delete("/:schedule_id", () => ({}), {
        params: t.Object({ schedule_id: t.String({ example: "1" }) }),
        detail: {
          tags: ["Schedule"],
          summary: "Hapus jadwal",
          security: authSecurity,
          responses: nullDataRoleResponses("Jadwal berhasil dihapus"),
        },
      })
      .get("/bookings", () => ({}), {
        detail: {
          tags: ["Schedule"],
          summary: "List booking dosen",
          security: authSecurity,
          responses: bookingListResponses("Daftar booking berhasil diambil"),
        },
      })
      .get("/available", () => ({}), {
        detail: {
          tags: ["Schedule"],
          summary: "Jadwal tersedia mahasiswa",
          security: authSecurity,
          responses: scheduleListResponses("Data jadwal tersedia berhasil diambil"),
        },
      })
      .post("/book", () => ({}), {
        body: t.Object({
          schedule_id: t.Number({ example: 1 }),
          agenda: t.Optional(t.String({ example: "Konsultasi KRS" })),
        }),
        detail: {
          tags: ["Schedule"],
          summary: "Booking jadwal",
          security: authSecurity,
          responses: bookingCreateResponses,
        },
      })
      .get("/my-bookings", () => ({}), {
        detail: {
          tags: ["Schedule"],
          summary: "Booking milik mahasiswa",
          security: authSecurity,
          responses: bookingListResponses("Riwayat booking berhasil diambil"),
        },
      })
      .patch("/bookings/:booking_id/cancel", () => ({}), {
        params: t.Object({ booking_id: t.String({ example: "1" }) }),
        detail: {
          tags: ["Schedule"],
          summary: "Batalkan booking",
          security: authSecurity,
          responses: nullDataRoleResponses("Booking berhasil dibatalkan"),
        },
      })
      .get("/monthly", () => ({}), {
        detail: {
          tags: ["Schedule"],
          summary: "Kalender bulanan",
          security: authSecurity,
          responses: scheduleListResponses("Data bulanan berhasil diambil"),
        },
      })
      .get("/daily", () => ({}), {
        detail: {
          tags: ["Schedule"],
          summary: "Slot harian",
          security: authSecurity,
          responses: scheduleListResponses("Detail harian berhasil diambil"),
        },
      })
      .get("/mahasiswa/monthly", () => ({}), {
        detail: {
          tags: ["Schedule"],
          summary: "Kalender mahasiswa",
          security: authSecurity,
          responses: scheduleListResponses("Data jadwal bulanan"),
        },
      })
      .get("/mahasiswa/daily", () => ({}), {
        detail: {
          tags: ["Schedule"],
          summary: "Slot harian mahasiswa",
          security: authSecurity,
          responses: scheduleListResponses("Data jadwal harian"),
        },
      })
      .post("/mahasiswa/book", () => ({}), {
        body: t.Object({
          schedule_id: t.Number({ example: 1 }),
          agenda: t.String({ example: "Konsultasi akademik" }),
        }),
        detail: {
          tags: ["Schedule"],
          summary: "Booking mahasiswa",
          security: authSecurity,
          responses: bookingCreateResponses,
        },
      })
      .get("/mahasiswa/bookings/history", () => ({}), {
        detail: {
          tags: ["Schedule"],
          summary: "Riwayat booking mahasiswa",
          security: authSecurity,
          responses: bookingListResponses("Riwayat booking berhasil diambil"),
        },
      })
      .get("/:schedule_id", () => ({}), {
        params: t.Object({ schedule_id: t.String({ example: "1" }) }),
        detail: {
          tags: ["Schedule"],
          summary: "Detail jadwal",
          security: authSecurity,
          responses: scheduleDetailResponses,
        },
      })
  )

  .group("/dosen", (dosen) =>
    dosen
      .get("/dashboard", () => ({}), {
        detail: {
          tags: ["Dosen"],
          summary: "Dashboard dosen",
          security: authSecurity,
          responses: dosenDashboardResponses,
        },
      })
      .get("/mahasiswa", () => ({}), {
        detail: {
          tags: ["Dosen"],
          summary: "Daftar mahasiswa bimbingan",
          security: authSecurity,
          responses: dosenMahasiswaListResponses,
        },
      })
      .get("/mahasiswa/:mahasiswaId/detail", () => ({}), {
        params: t.Object({ mahasiswaId: t.String({ example: "1" }) }),
        detail: {
          tags: ["Dosen"],
          summary: "Detail mahasiswa bimbingan",
          security: authSecurity,
          responses: dosenMahasiswaDetailResponses,
        },
      })
      .get("/mahasiswa/:mahasiswaId/history-bimbingan", () => ({}), {
        params: t.Object({ mahasiswaId: t.String({ example: "1" }) }),
        detail: {
          tags: ["Dosen"],
          summary: "Riwayat bimbingan mahasiswa",
          security: authSecurity,
          responses: bimbinganHistoryResponses,
        },
      })
      .patch("/bimbingan/:bookingId/keterangan", () => ({}), {
        params: t.Object({ bookingId: t.String({ example: "1" }) }),
        body: t.Object({
          keterangan: t.String({ example: "Catatan hasil bimbingan." }),
        }),
        detail: {
          tags: ["Dosen"],
          summary: "Update keterangan bimbingan",
          security: authSecurity,
          responses: nullDataRoleResponses("Keterangan berhasil diperbarui"),
        },
      })
      .get("/mahasiswa/:mahasiswaId/chatbot", () => ({}), {
        params: t.Object({ mahasiswaId: t.String({ example: "1" }) }),
        detail: {
          tags: ["Dosen"],
          summary: "Riwayat chatbot mahasiswa",
          description: "Melihat daftar sesi chatbot yang dilakukan oleh mahasiswa bimbingan tertentu.",
          security: authSecurity,
          responses: chatbotSessionResponses,
        },
      })
      .get("/mahasiswa/:mahasiswaId/chatbot/:sessionId", () => ({}), {
        params: t.Object({
          mahasiswaId: t.String({ example: "1" }),
          sessionId: t.String({ example: "S-12345-ABCDEF" })
        }),
        detail: {
          tags: ["Dosen"],
          summary: "Detail chatbot mahasiswa",
          description: "Melihat detail riwayat pesan obrolan dalam sesi chatbot mahasiswa bimbingan.",
          security: authSecurity,
          responses: chatbotMessageResponses,
        },
      })
  )

  .group("/admin", (admin) =>
    admin
      .get("/dashboard", () => ({}), {
        detail: {
          tags: ["Admin"],
          summary: "Dashboard admin",
          security: authSecurity,
          responses: adminDashboardResponses,
        },
      })
      .get("/users", () => ({}), {
        query: t.Object({
          role: t.Optional(t.String({ example: "mahasiswa" })),
          page: t.Optional(t.String({ example: "1" })),
          limit: t.Optional(t.String({ example: "20" })),
        }),
        detail: {
          tags: ["Admin"],
          summary: "List user",
          security: authSecurity,
          responses: adminUsersResponses,
        },
      })
      .post("/users/admin", () => ({}), {
        detail: {
          tags: ["Admin"],
          summary: "Tambah user admin",
          description: "Membuat akun admin baru. Endpoint aktual mendukung multipart untuk foto profil.",
          security: authSecurity,
          responses: adminUserDataResponses("Admin berhasil ditambahkan", 201),
        },
      })
      .put("/users/:id", () => ({}), {
        params: t.Object({ id: t.String({ example: "1" }) }),
        detail: {
          tags: ["Admin"],
          summary: "Update user",
          description: "Mengubah data user. Endpoint aktual mendukung multipart untuk foto profil.",
          security: authSecurity,
          responses: adminUserDataResponses("Data pengguna berhasil diperbarui"),
        },
      })
      .patch("/users/:id/status", () => ({}), {
        params: t.Object({ id: t.String({ example: "1" }) }),
        body: t.Object({
          is_verified: t.Boolean({ example: true }),
        }),
        detail: {
          tags: ["Admin"],
          summary: "Ubah status user",
          security: authSecurity,
          responses: nullDataRoleResponses("Status pengguna berhasil diubah"),
        },
      })
      .delete("/users/:id", () => ({}), {
        params: t.Object({ id: t.String({ example: "1" }) }),
        detail: {
          tags: ["Admin"],
          summary: "Hapus user",
          security: authSecurity,
          responses: nullDataRoleResponses("Pengguna berhasil dihapus secara permanen"),
        },
      })
      .get("/documents", () => ({}), {
        detail: {
          tags: ["Admin"],
          summary: "List dokumen global",
          security: authSecurity,
          responses: adminDocumentsResponses,
        },
      })
      .get("/documents/stats", () => ({}), {
        detail: {
          tags: ["Admin"],
          summary: "Statistik dokumen",
          security: authSecurity,
          responses: adminDocumentStatsResponses,
        },
      })
      .get("/users/:id/documents", () => ({}), {
        params: t.Object({ id: t.String({ example: "1" }) }),
        detail: {
          tags: ["Admin"],
          summary: "Dokumen user",
          security: authSecurity,
          responses: adminDocumentsResponses,
        },
      })
      .post("/users/:id/documents", () => ({}), {
        params: t.Object({ id: t.String({ example: "1" }) }),
        detail: {
          tags: ["Admin"],
          summary: "Upload dokumen user",
          description: "Upload dokumen akademik untuk user tertentu menggunakan multipart/form-data.",
          security: authSecurity,
          responses: adminDocumentDataResponses("Dokumen berhasil diunggah", 201),
        },
      })
      .put("/documents/:documentId", () => ({}), {
        params: t.Object({ documentId: t.String({ example: "1" }) }),
        detail: {
          tags: ["Admin"],
          summary: "Update dokumen admin",
          description: "Mengubah dokumen akademik menggunakan multipart/form-data.",
          security: authSecurity,
          responses: adminDocumentDataResponses("Dokumen berhasil diperbarui"),
        },
      })
      .delete("/documents/:documentId", () => ({}), {
        params: t.Object({ documentId: t.String({ example: "1" }) }),
        detail: {
          tags: ["Admin"],
          summary: "Hapus dokumen admin",
          security: authSecurity,
          responses: nullDataRoleResponses("Dokumen berhasil dihapus"),
        },
      })
      .get("/users/:id/bimbingan", () => ({}), {
        params: t.Object({ id: t.String({ example: "1" }) }),
        detail: {
          tags: ["Admin"],
          summary: "Riwayat bimbingan user",
          security: authSecurity,
          responses: bimbinganHistoryResponses,
        },
      })
      .get("/classes", () => ({}), {
        detail: {
          tags: ["Admin"],
          summary: "List kode kelas",
          security: authSecurity,
          responses: adminClassesResponses,
        },
      })
      .get("/knowledge-base", () => ({}), {
        detail: {
          tags: ["Admin"],
          summary: "List knowledge base",
          security: authSecurity,
          responses: knowledgeBaseListResponses,
        },
      })
      .post("/knowledge-base", () => ({}), {
        body: t.Object({
          title: t.String({ example: "Kalender Akademik 2026" }),
          category: t.String({ example: "Kalender Akademik" }),
          file: t.String({ format: "binary", description: "Berkas PDF basis pengetahuan akademik" })
        }),
        detail: {
          tags: ["Admin"],
          summary: "Upload knowledge base",
          description: "Upload dokumen PDF basis pengetahuan menggunakan multipart/form-data.",
          security: authSecurity,
          responses: knowledgeBaseDataResponses("Dokumen berhasil diunggah dan sedang diproses AI", 201),
        },
      })
      .put("/knowledge-base/:id", () => ({}), {
        params: t.Object({ id: t.String({ example: "1" }) }),
        body: t.Object({
          title: t.Optional(t.String({ example: "Kalender Akademik 2026 Terbaru" })),
          category: t.Optional(t.String({ example: "Kalender Akademik" })),
          file: t.Optional(t.String({ format: "binary", description: "Berkas PDF basis pengetahuan akademik" }))
        }),
        detail: {
          tags: ["Admin"],
          summary: "Update knowledge base",
          description: "Mengubah dokumen PDF basis pengetahuan menggunakan multipart/form-data.",
          security: authSecurity,
          responses: knowledgeBaseDataResponses("Data dokumen berhasil diperbarui"),
        },
      })
      .delete("/knowledge-base/:id", () => ({}), {
        params: t.Object({ id: t.String({ example: "1" }) }),
        detail: {
          tags: ["Admin"],
          summary: "Hapus knowledge base",
          security: authSecurity,
          responses: nullDataRoleResponses("Dokumen berhasil dihapus"),
        },
      })
  )

  .group("/chatbot", (chatbot) =>
    chatbot
      .get("/session/active", () => ({}), {
        detail: {
          tags: ["Chatbot"],
          summary: "Sesi chatbot aktif",
          security: authSecurity,
          responses: chatbotSessionResponses,
        },
      })
      .post("/message", () => ({}), {
        body: t.Object({
          message: t.String({ example: "Halo Aca, bantu cek progres akademik saya." }),
        }),
        detail: {
          tags: ["Chatbot"],
          summary: "Kirim pesan chatbot",
          security: authSecurity,
          responses: chatbotMessageResponses,
        },
      })
      .post("/session/:session_id/generate-summary", () => ({}), {
        params: t.Object({ session_id: t.String({ example: "session-uuid" }) }),
        detail: {
          tags: ["Chatbot"],
          summary: "Generate summary sesi",
          security: authSecurity,
          responses: chatbotMessageResponses,
        },
      })
      .post("/session/:session_id/close", () => ({}), {
        params: t.Object({ session_id: t.String({ example: "session-uuid" }) }),
        body: t.Object({
          final_summary: t.String({ example: "Ringkasan akhir sesi chatbot." }),
        }),
        detail: {
          tags: ["Chatbot"],
          summary: "Tutup sesi chatbot",
          security: authSecurity,
          responses: chatbotSessionResponses,
        },
      })
  )

  .post("/api/chat-bot", () => ({}), {
    body: t.Object({
      pesan_user: t.String({ example: "Halo Aca" }),
    }),
    detail: {
      tags: ["Chatbot"],
      summary: "Legacy chatbot endpoint",
      security: authSecurity,
      responses: legacyChatbotResponses,
    },
  })

  .listen(Number(process.env.PORT ?? 8080), () => {
    console.log(`Acaris API Docs running on port ${process.env.PORT ?? 8080}`);
  });

export type App = typeof app;
