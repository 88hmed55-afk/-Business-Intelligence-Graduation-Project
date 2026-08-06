#!/bin/sh
set -e

echo "[entrypoint] Waiting for PostgreSQL to become ready..."
python -m app.infrastructure.bootstrap

echo "[entrypoint] Running database migrations..."
alembic upgrade head

echo "[entrypoint] Seeding initial data..."
python -c "from app.infrastructure.seed import run_seed; run_seed()"

echo "[entrypoint] Starting API server..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${SERVER_PORT:-8000}" --workers 1
