#!/usr/bin/env bash
# Nova BI - Installation & startup script (macOS / Linux)
# Builds and starts the full stack with Docker Compose.
set -euo pipefail

echo ""
echo "=============================================="
echo "  Nova BI - Business Intelligence System"
echo "  Installation & Startup"
echo "=============================================="
echo ""

if ! command -v docker >/dev/null 2>&1; then
    echo "ERROR: Docker was not found. Install Docker first." >&2
    exit 1
fi

echo "[1/3] Checking Docker daemon..."
docker info >/dev/null 2>&1 || { echo "ERROR: Docker daemon is not running." >&2; exit 1; }

echo "[2/3] Building and starting containers..."
if [ "${1:-}" = "--no-build" ]; then
    docker compose up -d
else
    docker compose up -d --build
fi

echo "[3/3] Waiting for services to become healthy..."
deadline=$(( $(date +%s) + 300 ))
until docker compose ps --format '{{.Service}} {{.Health}}' 2>/dev/null | grep -Ev 'healthy' | grep -q . && [ "$(date +%s)" -lt "$deadline" ]; do
    sleep 5
done
sleep 5

echo ""
echo "All done. Open the application:"
echo ""
echo "  Frontend : http://localhost:8080"
echo "  API      : http://localhost:8000/api/v1"
echo "  Swagger  : http://localhost:8000/api/docs"
echo ""
echo "  Default login ->  admin@bisystem.local / Admin@1234"
echo ""
