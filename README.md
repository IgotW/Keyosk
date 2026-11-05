# Keyosk

Self-service ordering kiosks for quick-service restaurants and retail counters. Customers order and pay on a touch screen; staff manage the menu, devices, orders, and reporting from an admin panel.

**Status:** Documentation phase — no application code yet.

## Architecture

| Part | Path | Stack |
| --- | --- | --- |
| API | `backend/` | Laravel 12 (PHP 8.3), MySQL 8, Redis, Sanctum, Stripe |
| Kiosk + Admin UI | `frontend/` | React 19, Vite 7, TypeScript, Tailwind CSS 4 |
| Documentation | `docs/` | Requirements, database, API, plan, QA |

## Documentation

- [Requirements](docs/REQUIREMENTS.md) — scope, personas, functional and non-functional requirements.
- [Database design](docs/DATABASE_DESIGN.md) — ERD, tables, indexes, totals algorithm, retention.
- [API documentation](docs/API_DOCUMENTATION.md) — conventions, auth, endpoints, webhooks.
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md) — stack, phases, milestones, testing, CI/CD, risks.
- [QA report](docs/QA_REPORT.md) — test plan and case inventory (pre-implementation baseline).

## Planned local setup

Once scaffolding is complete:

```bash
# API
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve

# UI
cd frontend
npm install
npm run dev
```

Docker Compose will provide MySQL, Redis, and Mailpit; see the implementation plan, Phase 0.

## Product surfaces

- **Kiosk** (`/kiosk/*`) — attract screen, menu, cart, checkout, payment, receipt.
- **Admin** (`/admin/*`) — stores, staff, kiosks, catalog, promos, order queue, refunds, reports.

## Key conventions

- Money is stored as integer minor units; all totals are computed server-side.
- The kiosk never handles raw card data; payment confirmation comes from provider webhooks.
- Every privileged action is audit-logged.
- API is versioned under `/api/v1`.
