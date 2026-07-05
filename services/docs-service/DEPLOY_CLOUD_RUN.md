# Deploy Acaris API Docs ke Cloud Run

Service docs ini menampilkan dokumentasi API Acaris dengan Scalar/OpenAPI.

## Prasyarat

| Kebutuhan | Catatan |
| --- | --- |
| Google Cloud CLI | Dibutuhkan untuk deploy dari komputer lokal. |
| Bun runtime | Dibutuhkan untuk menjalankan docs secara lokal. |
| Artifact Registry repository | Config saat ini memakai repository `backend`, sama seperti backend utama. |
| Cloud Build dan Cloud Run API | Harus aktif di project Google Cloud. |

## Jalankan Lokal

Dari folder `DocsWeb`:

```powershell
npm run dev
```

Buka:

```text
http://localhost:8080/docs
```

## Deploy Manual

Dari folder `DocsWeb`:

```powershell
gcloud auth login
gcloud config set project PROJECT_ID_KAMU
gcloud builds submit --config cloudbuild.yaml .
```

Cloud Build akan membuild folder `DocsWeb/docs` dan deploy ke Cloud Run service `acaris-docs`.

## Env

| Env | Nilai Default | Fungsi |
| --- | --- | --- |
| `ACARIS_API_BASE_URL` | `https://acaris-service-649442063927.asia-southeast2.run.app` | Server URL yang tampil pada OpenAPI docs. |
| `PORT` | `8080` | Port Cloud Run. |

## Cek

Setelah deploy, buka URL Cloud Run `acaris-docs`. Tampilan yang muncul harus berupa Scalar/OpenAPI API reference.
