# Postman CI Commands

Dokumen ini menyimpan command untuk workflow functional test otomatis via Postman CLI.

## Secret yang Dibutuhkan

Simpan API key Postman sebagai GitHub Repository Secret:

```text
POSTMAN_API_KEY
```

Jangan simpan API key di file repo.

Via GitHub CLI:

```powershell
cd D:\Skripsi\Code\Backend
gh secret set POSTMAN_API_KEY --repo Acaris-App/Backend
```

Setelah command itu jalan, paste API key Postman baru saat diminta.

## Jalankan Workflow Manual

```powershell
cd D:\Skripsi\Code\Backend
gh workflow run "API Postman Tests" --repo Acaris-App/Backend --ref main
```

## Cek Status Run

```powershell
cd D:\Skripsi\Code\Backend
gh run list --repo Acaris-App/Backend --workflow "API Postman Tests" --limit 5
```

Detail run tertentu:

```powershell
gh run view <run-id> --repo Acaris-App/Backend
```

## Download Artifact Postman Otomatis

Download artifact dari run Postman sukses terbaru:

```powershell
npm run artifacts:postman
```

Output masuk ke:

```text
Backend/data/postman-actions/postman-run-<run-id>-<timestamp>/
```

File penting:

```text
postman-cli-output-run-<run-id>.txt
postman-cli-summary-run-<run-id>.md
postman-artifact-manifest-run-<run-id>.md
```

## Catatan Keamanan

Jika API key pernah terlihat di chat, screenshot, atau terminal publik, revoke/generate ulang di Postman, lalu update GitHub Secret `POSTMAN_API_KEY`.
