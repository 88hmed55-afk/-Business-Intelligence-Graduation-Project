# Nova BI — Business Intelligence Management System

A production-grade, enterprise Business Intelligence platform for decision making with **dashboards, KPIs, reports and analytics**.

Built with a **Clean Architecture** backend (FastAPI + PostgreSQL + Redis) and a premium **React 18** frontend (Vite + TypeScript + TailwindCSS + shadcn/ui). Fully containerized with Docker Compose.

---

## Quick Start

> Requires Docker with Compose v2. Nothing else.

```bash
# Windows (PowerShell)
.\scripts\setup.ps1

# macOS / Linux
bash scripts/setup.sh

# or manually
docker compose up -d --build
```

| Service   | URL                                   |
| --------- | ------------------------------------- |
| Frontend  | http://localhost:8080                 |
| API       | http://localhost:8000/api/v1          |
| Swagger UI | http://localhost:8000/api/docs       |
| ReDoc     | http://localhost:8000/api/redoc       |
| OpenAPI JSON | http://localhost:8000/api/openapi.json |

**Default credentials** (seeded automatically on first boot):

```
email:    admin@bisystem.dev
password: Admin@1234
```

---

## What is inside

### Backend — FastAPI (Python 3.12)

- **Clean Architecture**: `presentation`, `application`, `domain`, `infrastructure`, `shared`.
- JWT authentication (access + refresh tokens, rotation via Redis).
- SQLAlchemy 2.x ORM, PostgreSQL, Alembic migrations (schema drift kept in sync with models), database **views**.
- Pydantic v2 schemas, generic response envelope, centralized exception handling.
- Health checks, structured logging, CORS, request-ID middleware.
- Dependency injection container wired through FastAPI dependencies.
- Role-based access control (`admin`, `analyst`, `viewer`).
- Automated test suite: `pytest` (API + service unit tests) against an isolated `bi_system_test` database.

### Frontend — React 18 (TypeScript)

- Vite + TailwindCSS + shadcn/ui components + Framer Motion + Lucide icons.
- TanStack Query data layer, Zustand state (auth + theme), Axios client with auto token refresh.
- React Hook Form + Zod validation, Recharts visualizations.
- Route-level **code splitting** (`React.lazy` + Suspense) for fast initial loads.
- Automated test suite: **Vitest + React Testing Library** (utilities, stores, components).
- Dark/light themes, glassmorphism, fully responsive (mobile drawer sidebar).
- Protected routes, admin-only routes, 404 page, loading/empty states.

### DevOps

- `docker compose up` → PostgreSQL, Redis, API, Frontend (Nginx) with health checks.
- Persistent volumes, environment separation, startup scripts.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Presentation (FastAPI)                │
│  Routers · Dependencies/DI · Health · Exception handlers │
├──────────────────────────────────────────────────────────┤
│                     Application (Use cases)              │
│  Services · Schemas (DTOs) · Auth/Users/Dashboards/...  │
├──────────────────────────────────────────────────────────┤
│                        Domain                            │
│  Entities · Repository interfaces                        │
├──────────────────────────────────────────────────────────┤
│                   Infrastructure                          │
│  SQLAlchemy models · SQL repositories · Seed · Bootstrap │
├──────────────────────────────────────────────────────────┤
│                         Shared                            │
│  Enums · Utils · Helpers · Response helpers              │
└──────────────────────────────────────────────────────────┘
```

---

## Project structure

```
.
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app factory
│   │   ├── core/                    # config, database, redis, security, logging, middleware
│   │   ├── domain/                  # entities + repository interfaces
│   │   ├── application/             # services + schemas (DTOs)
│   │   ├── infrastructure/          # SQLAlchemy models, repositories, seed, bootstrap
│   │   ├── presentation/            # routers (api/v1), DI dependencies, health
│   │   └── shared/                  # enums, helpers, response utilities
│   ├── alembic/                     # migrations (initial schema + DB views)
│   ├── tests/
│   ├── Dockerfile
│   ├── entrypoint.sh
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/router/              # routes + protected routes
│   │   ├── components/              # ui (shadcn), layout, common, analytics
│   │   ├── features/                # auth, dashboards, reports, kpis, users, analytics
│   │   ├── hooks/  lib/  stores/  types/  pages/
│   ├── Dockerfile                   # multi-stage build + Nginx
│   └── nginx.conf
├── scripts/                         # setup / start / stop / reset (ps1 + sh)
├── docker-compose.yml
├── .env  .env.example
└── Makefile
```

---

## API surface

| Method | Path                              | Description                 |
| ------ | --------------------------------- | --------------------------- |
| POST   | `/api/v1/auth/login`              | Sign in, issue tokens       |
| POST   | `/api/v1/auth/refresh`            | Rotate refresh token        |
| POST   | `/api/v1/auth/logout`             | Revoke refresh token (Redis)|
| GET    | `/api/v1/auth/me`                 | Current user profile        |
| POST   | `/api/v1/auth/change-password`    | Change own password         |
| GET/POST | `/api/v1/users`                 | List / create users (admin) |
| GET/PATCH/DELETE | `/api/v1/users/{id}`       | Manage user (admin)         |
| GET/PATCH | `/api/v1/users/me`            | Own profile                 |
| GET/POST | `/api/v1/dashboards`            | List / create dashboards    |
| GET/PATCH/DELETE | `/api/v1/dashboards/{id}` | Manage dashboard            |
| POST   | `/api/v1/dashboards/{id}/favorite`| Toggle favorite            |
| GET/POST | `/api/v1/reports`              | List / create reports       |
| PATCH/DELETE | `/api/v1/reports/{id}`     | Update / delete report      |
| POST   | `/api/v1/reports/{id}/publish`    | Publish report              |
| POST   | `/api/v1/reports/{id}/archive`    | Archive report              |
| GET/POST | `/api/v1/kpis`                | List / create KPIs          |
| GET/PATCH/DELETE | `/api/v1/kpis/{id}`     | Manage KPI                  |
| POST   | `/api/v1/kpis/{id}/update-value`  | Record a KPI measurement    |
| GET    | `/api/v1/analytics/overview`      | Metrics, categories, trends |
| GET    | `/api/v1/analytics/trends`        | Time-series achievement     |
| GET    | `/api/v1/analytics/performance`   | KPI performance list        |
| GET    | `/api/v1/analytics/dashboard-summary` | Dashboard summaries   |
| GET    | `/api/v1/bi/overview`             | Executive dashboard bundle (KPIs, charts, rankings) |
| GET    | `/api/v1/bi/trend`                | Time-series trend (`metric`, `granularity`) |
| GET    | `/api/v1/bi/forecast`             | Linear-regression forecast (`metric`, `periods`) |
| GET    | `/api/v1/bi/compare`              | Current vs previous period comparison |
| GET    | `/api/v1/bi/aggregate`            | Aggregations by `dimension` |
| GET    | `/api/v1/bi/rankings`             | Top lists by `dimension` |
| GET    | `/api/v1/bi/insights`             | Auto-generated business insights |
| GET/POST | `/api/v1/roles`                | List (authenticated) / create roles (admin) |
| GET    | `/api/v1/health`                  | Service health check        |

---

## Local development (without Docker)

Backend:

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate          # Windows
source .venv/bin/activate          # macOS/Linux
pip install -r requirements.txt
alembic upgrade head
python -c "from app.infrastructure.seed import run_seed; run_seed()"
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` to `http://localhost:8000`.

---

## Testing

### Backend (pytest)

The suite runs against an isolated test database (`bi_system_test`) and a
dedicated Redis DB (`15`), so it never touches development data. It covers
authentication, RBAC, CRUD + soft-delete behavior, pagination/validation,
BI endpoints, the forecast engine, and report exports.

```bash
# 1. Create the test database once (against the running Postgres)
docker compose exec postgres psql -U bi -c "CREATE DATABASE bi_system_test"

# 2. Run the suite from the backend directory (Python 3.12 + requirements installed)
cd backend
python -m pytest tests -q
```

The `conftest.py` builds the schema per session, truncates tables and seeds
users per test, and provides authenticated test clients (`admin`, `analyst`,
`viewer`) plus catalog/commerce fixtures.

### Frontend (Vitest)

```bash
cd frontend
npm run test        # single run
npm run test:watch  # watch mode
```

Component tests use jsdom + React Testing Library; utility and store tests run
without a browser. Run `npm run build` to type-check everything (test files
included) before shipping.

---

## Useful commands

```bash
docker compose logs -f backend      # follow API logs
docker compose exec backend alembic upgrade head
docker compose exec backend python -c "from app.infrastructure.seed import run_seed; run_seed()"
docker compose down -v              # stop and wipe volumes (fresh database)
```

See `Makefile` and `scripts/` for shortcuts.

---

## Notes

- Seeded sample data (dashboards, reports, KPIs) demonstrates the product on first login.
- `SECRET_KEY` is a dev default — set a strong value in `.env` for production (`openssl rand -hex 32`).
- Redis is used for refresh-token revocation and is monitored via the health endpoint; it is optional at runtime (the app degrades gracefully).
- Keep the schema in sync with the models: `docker compose exec backend alembic check` should report **"No new upgrade operations detected"** after every migration.
