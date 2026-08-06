# Nova BI - Installation & startup script (Windows PowerShell)
# Builds and starts the full stack with Docker Compose.

param(
    [switch]$NoBuild
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=============================================="
Write-Host "  Nova BI - Business Intelligence System"
Write-Host "  Installation & Startup"
Write-Host "=============================================="
Write-Host ""

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker was not found. Install Docker Desktop first: https://www.docker.com/products/docker-desktop/"
    exit 1
}

Write-Host "[1/3] Checking Docker daemon..."
docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker daemon is not running. Please start Docker Desktop and retry."
    exit 1
}

Write-Host "[2/3] Building and starting containers..."
if ($NoBuild) {
    docker compose up -d
} else {
    docker compose up -d --build
}
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker Compose failed."
    exit $LASTEXITCODE
}

Write-Host "[3/3] Waiting for services to become healthy..."
$deadline = (Get-Date).AddMinutes(5)
do {
    Start-Sleep -Seconds 5
    $status = docker compose ps --format "{{.Service}} {{.Health}}" 2>$null
    $notHealthy = $status | Select-String -Pattern "starting|unhealthy|" -Quiet
} while ((Get-Date) -lt $deadline -and $LASTEXITCODE -ne 0)

Write-Host ""
Write-Host "All done. Open the application:"
Write-Host ""
Write-Host "  Frontend : http://localhost:8080"
Write-Host "  API      : http://localhost:8000/api/v1"
Write-Host "  Swagger  : http://localhost:8000/api/docs"
Write-Host ""
Write-Host "  Default login ->  admin@bisystem.local / Admin@1234"
Write-Host ""
Start-Process "http://localhost:8080"
