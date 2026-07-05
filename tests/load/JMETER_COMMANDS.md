# JMeter Commands

Dokumen ini menyimpan command yang sering dipakai untuk menjalankan dan mengambil hasil JMeter.

## Trigger JMeter 50 User di GitHub Actions

```powershell
cd D:\Skripsi\Code\Backend

gh workflow run "JMeter Tests" --repo Acaris-App/Backend --ref main `
  -f target_url=https://acaris.my.id/api/health `
  -f users=50 `
  -f ramp_up=30 `
  -f duration=60
```

## Trigger JMeter 100 User di GitHub Actions

```powershell
cd D:\Skripsi\Code\Backend

gh workflow run "JMeter Tests" --repo Acaris-App/Backend --ref main `
  -f target_url=https://acaris.my.id/api/health `
  -f users=100 `
  -f ramp_up=60 `
  -f duration=120
```

## Cek Status Run JMeter

```powershell
gh run list --repo Acaris-App/Backend --workflow "JMeter Tests" --limit 5
```

Detail run tertentu:

```powershell
gh run view <run-id> --repo Acaris-App/Backend
```

## Download Artifact JMeter Otomatis

Download artifact dari run JMeter sukses terbaru:

```powershell
npm run artifacts:jmeter
```

Output masuk ke:

```text
Backend/data/jmeter-actions/jmeter-run-<run-id>-<timestamp>/
```

File penting:

```text
jmeter-result-run-<run-id>.jtl
jmeter-summary-run-<run-id>.md
report/index.html
jmeter-artifact-manifest-run-<run-id>.md
```

## Jalankan JMeter Lokal

Smoke test lokal 1 user:

```powershell
npm run jmeter:local:smoke
```

Manual lokal 50 user:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/run-local-jmeter.ps1 `
  -Users 50 `
  -RampUp 30 `
  -Duration 60
```

Manual lokal 100 user:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/run-local-jmeter.ps1 `
  -Users 100 `
  -RampUp 60 `
  -Duration 120
```
