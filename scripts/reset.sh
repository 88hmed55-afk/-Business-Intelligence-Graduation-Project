#!/usr/bin/env bash
# Reset Nova BI: wipe database/redis volumes and rebuild from scratch.
set -euo pipefail
docker compose down -v
docker compose up -d --build
