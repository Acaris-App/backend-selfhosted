param(
  [string]$TargetUrl = "https://acaris.my.id/api/health",
  [int]$Users = 1,
  [int]$RampUp = 1,
  [int]$Duration = 5,
  [string]$JMeterHome = "..\apache-jmeter-5.6.3",
  [string]$OutputDir = "data\jmeter-local"
)

$ErrorActionPreference = "Stop"

$jmeterBat = Join-Path $JMeterHome "bin\jmeter.bat"
if (-not (Test-Path $jmeterBat)) {
  throw "JMeter tidak ditemukan di '$JMeterHome'. Pastikan folder apache-jmeter-5.6.3 ada di D:\Skripsi\Code."
}

$url = [Uri]$TargetUrl
$targetPath = if ([string]::IsNullOrWhiteSpace($url.PathAndQuery) -or $url.PathAndQuery -eq "/") {
  "/health"
} else {
  $url.PathAndQuery
}

$port = if ($url.IsDefaultPort) {
  if ($url.Scheme -eq "https") { "443" } else { "80" }
} else {
  [string]$url.Port
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$runDir = Join-Path $OutputDir "health-$Users-users-$timestamp"
$reportDir = Join-Path $runDir "report"
$resultFile = Join-Path $runDir "result.jtl"

New-Item -ItemType Directory -Path $runDir -Force | Out-Null

& $jmeterBat `
  -n `
  -t "tests\load\acaris-health-load-test.jmx" `
  -l $resultFile `
  -e `
  -o $reportDir `
  "-Jtarget_protocol=$($url.Scheme)" `
  "-Jtarget_host=$($url.Host)" `
  "-Jtarget_port=$port" `
  "-Jtarget_path=$targetPath" `
  "-Jusers=$Users" `
  "-Jramp_up=$RampUp" `
  "-Jduration=$Duration"

if ($LASTEXITCODE -ne 0) {
  throw "JMeter gagal dengan exit code $LASTEXITCODE."
}

@(
  "# Local JMeter Summary"
  ""
  "- Target URL: $TargetUrl"
  "- Users: $Users"
  "- Ramp-up seconds: $RampUp"
  "- Duration seconds: $Duration"
  "- Result file: $resultFile"
  "- Report folder: $reportDir"
  "- Generated at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')"
) | Set-Content -Path (Join-Path $runDir "jmeter-local-summary.md") -Encoding UTF8

Write-Host "Local JMeter test completed."
Write-Host "Output: $runDir"
