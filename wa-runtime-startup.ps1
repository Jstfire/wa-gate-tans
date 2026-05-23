
# WA Gate Runtime Startup Script
# Jalankan sebagai Administrator atau via Task Scheduler

$ErrorActionPreference = "Continue"
$logFile = "C:\laragon\www\wa-gate-tans\wa-runtime-startup.log"
$keyFile = "C:\laragon\www\wa-gate-tans\.wwebjs_auth"

function Log($msg) {
  $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  "$ts $msg" | Tee-Object -FilePath $logFile -Append
}

Log "=== WA Gate Runtime Startup ==="

# Kill existing runtime on 8789
$existing = Get-NetTCPConnection -LocalPort 8789 -ErrorAction SilentlyContinue
if ($existing) {
  Log "Killing existing process on port 8789..."
  $existing | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
  Start-Sleep 2
}

# Kill existing cloudflared for wa-gate (not 9router one)
Get-Process cloudflared -ErrorAction SilentlyContinue | Where-Object {
  $_.Id -ne (Get-NetTCPConnection -LocalPort 20128 -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess)
} | Stop-Process -Force -ErrorAction SilentlyContinue

# Set env vars for runtime
$env:PORT = "8789"
$env:WA_RUNTIME_API_KEY = [Environment]::GetEnvironmentVariable("WA_RUNTIME_API_KEY", "User")
if (-not $env:WA_RUNTIME_API_KEY) { Log "ERROR: WA_RUNTIME_API_KEY user env var not set"; exit 1 }
# key loaded from user env var, never hard-coded
# old placeholder removed: "jMAf8FtVgb70SaVH6NlJBhGoAu0UX3h4DxQQUU9vNMc"
$env:WA_GATE_ORIGIN = "https://wa-gate.buseldata.com"
$env:WA_RUNTIME_AUTO_START = "true"
$env:WWEBJS_AUTH_PATH = "C:\laragon\www\wa-gate-tans\.wwebjs_auth"
$env:WWEBJS_CACHE_PATH = "C:\laragon\www\wa-gate-tans\.wwebjs_cache"
$env:PUPPETEER_EXECUTABLE_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"

Log "Starting WA Runtime on port 8789..."
$runtimeJob = Start-Process -FilePath "C:\Users\Admin\.bun\bin\bun.exe" `
  -ArgumentList "run", "start" `
  -WorkingDirectory "C:\laragon\www\wa-gate-tans\wa-runtime" `
  -WindowStyle Hidden `
  -PassThru

Log "Runtime PID: $($runtimeJob.Id)"

# Wait for runtime to be ready
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep 2
  try {
    $r = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:8789/health" -TimeoutSec 3 -ErrorAction SilentlyContinue
    if ($r.StatusCode -eq 200) { $ready = $true; break }
  } catch { }
}

if (-not $ready) {
  Log "WARNING: Runtime not ready after 60s, continuing anyway..."
} else {
  Log "Runtime is ready!"
}

# Start cloudflared quick tunnel
Log "Starting cloudflared tunnel for port 8789..."
$cfLog = "C:\laragon\www\wa-gate-tans\cloudflared-runtime.log"
$cfJob = Start-Process -FilePath "C:\Users\Admin\AppData\Roaming\9router\bin\cloudflared.exe" `
  -ArgumentList "tunnel", "--url", "http://127.0.0.1:8789", "--no-autoupdate", "--logfile", $cfLog, "--loglevel", "info" `
  -WindowStyle Hidden `
  -PassThru

Log "Cloudflared PID: $($cfJob.Id)"

# Wait for tunnel URL
$tunnelUrl = $null
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep 2
  if (Test-Path $cfLog) {
    $content = Get-Content $cfLog -Raw -ErrorAction SilentlyContinue
    if ($content -match "https://[a-z0-9-]+\.trycloudflare\.com") {
      $tunnelUrl = $Matches[0]
      break
    }
  }
}

if ($tunnelUrl) {
  Log "Tunnel URL: $tunnelUrl"
  # Update CF Worker secret
  $env:CLOUDFLARE_API_TOKEN = (Select-String -Path "C:\laragon\www\wa-gate-tans\.env" -Pattern "^CLOUDFLARE_API_TOKEN=" | ForEach-Object { $_.Line.Split("=",2)[1].Trim('"') })
  Log "Updating WA_RUNTIME_INTERNAL_URL secret..."
  $tunnelUrl | & "C:\Users\Admin\.bun\bin\bunx.exe" wrangler secret put WA_RUNTIME_INTERNAL_URL --cwd "C:\laragon\www\wa-gate-tans" 2>&1 | ForEach-Object { Log $_ }
  Log "Secret updated!"
} else {
  Log "WARNING: Could not get tunnel URL from log"
}

Log "=== Startup complete ==="
