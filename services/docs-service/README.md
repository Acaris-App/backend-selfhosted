# Acaris API Docs

Website dokumentasi API Acaris dengan tampilan Scalar/OpenAPI.

## Jalankan Lokal

Dari folder `DocsWeb`:

```powershell
npm run dev
```

Atau langsung dari folder `DocsWeb/docs`:

```powershell
bun run dev
```

Buka:

```text
http://localhost:8080/docs
```

## Deploy ke Cloud Run

Dari folder `DocsWeb`:

```powershell
gcloud builds submit --config cloudbuild.yaml .
```

Service Cloud Run:

```text
acaris-docs
```

Region:

```text
asia-southeast2
```

## Catatan

Dokumentasi ini hanya berisi dokumentasi API teknis Acaris.
