param(
  [string]$Repo = "Acaris-App/Backend",
  [string]$Workflow = "API Postman Tests",
  [string]$OutputDir = "data/postman-actions",
  [int]$Limit = 20
)

$ErrorActionPreference = "Stop"

$ghCommand = Get-Command gh -ErrorAction SilentlyContinue

if (-not $ghCommand -and (Test-Path "C:\Program Files\GitHub CLI\gh.exe")) {
  $ghCommand = Get-Item "C:\Program Files\GitHub CLI\gh.exe"
}

if (-not $ghCommand) {
  throw "GitHub CLI 'gh' tidak ditemukan. Install dulu, lalu jalankan 'gh auth login'."
}

if ($ghCommand -is [System.IO.FileInfo]) {
  $gh = $ghCommand.FullName
} else {
  $gh = $ghCommand.Source
}

$runsJson = & $gh run list --repo $Repo --workflow $Workflow --limit $Limit --json databaseId,conclusion,status,createdAt,headSha,displayTitle
if ($LASTEXITCODE -ne 0) {
  throw "Gagal mengambil daftar run Postman. Jalankan 'gh auth login' lalu coba lagi."
}

$runs = $runsJson | ConvertFrom-Json
$run = $runs | Where-Object { $_.conclusion -eq "success" -and $_.status -eq "completed" } | Select-Object -First 1

if (-not $run) {
  throw "Tidak ada run sukses untuk workflow '$Workflow' dalam $Limit run terakhir."
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$runId = [string]$run.databaseId
$targetDir = Join-Path $OutputDir ("postman-run-{0}-{1}" -f $runId, $timestamp)

New-Item -ItemType Directory -Path $targetDir -Force | Out-Null

& $gh run download $runId --repo $Repo --dir $targetDir
if ($LASTEXITCODE -ne 0) {
  throw "Gagal download artifact Postman run $runId. Jalankan 'gh auth login' lalu coba lagi."
}

$renameMap = @{
  "postman-cli-output.txt"  = "postman-cli-output-run-$runId.txt"
  "postman-cli-summary.md" = "postman-cli-summary-run-$runId.md"
}

foreach ($item in Get-ChildItem -Path $targetDir -Recurse -File) {
  if ($renameMap.ContainsKey($item.Name)) {
    Rename-Item -LiteralPath $item.FullName -NewName $renameMap[$item.Name]
  }
}

$manifestPath = Join-Path $targetDir ("postman-artifact-manifest-run-{0}.md" -f $runId)
@(
  "# Postman Artifact Manifest"
  ""
  "- Repository: $Repo"
  "- Workflow: $Workflow"
  "- Run ID: $runId"
  "- Title: $($run.displayTitle)"
  "- Commit: $($run.headSha)"
  "- Created at: $($run.createdAt)"
  "- Downloaded at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')"
  "- Output folder: $targetDir"
  ""
  "## Files"
  ""
  (Get-ChildItem -Path $targetDir -Recurse -File | ForEach-Object { "- $($_.FullName.Replace((Resolve-Path $targetDir).Path + '\', ''))" })
) | Set-Content -Path $manifestPath -Encoding UTF8

Write-Host "Downloaded latest successful '$Workflow' artifacts."
Write-Host "Run ID: $runId"
Write-Host "Output: $targetDir"
