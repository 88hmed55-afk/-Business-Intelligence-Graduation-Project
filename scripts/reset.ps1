# Reset Nova BI: wipe database/redis volumes and rebuild from scratch.
docker compose down -v
docker compose up -d --build
