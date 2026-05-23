# Ticketing Platform Monorepo

A full-stack event ticketing platform with **dynamic pricing**, **concurrency-safe bookings**, and a **one-command Docker** setup.

## Highlights

- **Next.js 15** frontend (App Router + Server Actions)
- **Express.js** REST API (TypeScript, strict mode)
- **PostgreSQL** + **Drizzle ORM**
- **Dynamic pricing engine** — time, demand, and inventory rules with floor/ceiling bounds
- **Row-level locking** — prevents overselling under concurrent bookings
- **Docker Compose** — `docker compose up --build` runs the full stack
- **Automated test suite** — unit, integration, coverage, lint, types, and API smoke E2E

## Documentation

| File | Description |
|------|-------------|
| [DEMO.md](./DEMO.md) | Full demo guide: UI flows, pricing examples, every test command |
| [DESIGN.md](./DESIGN.md) | Architecture and design decisions |
| [RUNBOOK.md](./RUNBOOK.md) | Operational troubleshooting |
| [Ticketing-Platform-Demo-Guide.docx](./Ticketing-Platform-Demo-Guide.docx) | Word export of the demo guide (for email/review) |

## Monorepo Structure

```
apps/web/                 → Next.js UI
apps/api/                 → Express API + pricing logic
packages/database/        → Drizzle schema, client, seed
docker-compose.yml        → Postgres + API + web
scripts/smoke.sh          → API end-to-end smoke test
scripts/test-all.sh       → Full automated test pipeline
```

---

## Prerequisites

| Mode | Requirements |
|------|----------------|
| **Docker demo** | Docker Desktop only |
| **Local dev / tests** | Node.js 20+, Corepack (`corepack enable`), Docker Desktop (for Postgres) |

---

## Environment Variables

Copy the example file for local development and tests:

```bash
cp .env.example .env
```

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `API_BASE_URL` | Base URL used by the web app to call the API |
| `ADMIN_API_KEY` | Required header `x-api-key` for `POST /events` |
| `PRICE_TIME_WEIGHT` | Multiplier for the time-based pricing rule |
| `PRICE_DEMAND_WEIGHT` | Multiplier for the demand-based rule |
| `PRICE_INVENTORY_WEIGHT` | Multiplier for the inventory-based rule |
| `RUN_DB_TESTS` | Set to `1` to enable the concurrency integration test |

Example `.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ticketing
API_BASE_URL=http://localhost:3001
ADMIN_API_KEY=dev-admin-key
PRICE_TIME_WEIGHT=1
PRICE_DEMAND_WEIGHT=1
PRICE_INVENTORY_WEIGHT=1
```

> **Docker:** `docker-compose.yml` sets these for containers. A root `.env` is **not** required for `docker compose up --build`.

---

## Build

### Production build (Docker — recommended)

Builds API, database package, and web inside containers:

```bash
docker compose up --build
```

### Local build (without starting servers)

```bash
corepack enable
corepack pnpm install --ignore-scripts

# Database package must be built before API (production resolves dist/)
corepack pnpm --filter @repo/database build

# Build API and web
corepack pnpm build
```

Build individual packages:

```bash
corepack pnpm --filter @repo/database build
corepack pnpm --filter api build
corepack pnpm --filter web build
```

---

## Run the Application

### Option A — One command (Docker)

From the project root:

```bash
docker compose up --build
```

**What starts automatically:**

1. PostgreSQL (with health check)
2. API — schema push, seed (3 sample events), then server on port **3001**
3. Web — starts after API is healthy, port **3000**

**URLs:**

| Service | URL |
|---------|-----|
| Web | http://localhost:3000 |
| API health | http://localhost:3001/health |

**Stop / reset:**

```bash
docker compose down          # stop containers
docker compose down -v       # stop + delete database volume (fresh data)
```

### Option B — Local development

```bash
corepack enable
corepack pnpm install --ignore-scripts
cp .env.example .env

docker compose up -d postgres

corepack pnpm --filter @repo/database build
corepack pnpm --filter @repo/database db:push
corepack pnpm --filter @repo/database db:seed

corepack pnpm dev
```

- Web: http://localhost:3000  
- API: http://localhost:3001/health  

---

## Dynamic Pricing — How It Works

Pricing is calculated in `apps/api/src/pricing.ts` (`calculatePriceBreakdown`). The same logic runs when **listing events**, **showing event details**, and **creating a booking**.

### Rules

| Rule | Condition | Adjustment |
|------|-----------|------------|
| **Time** | Event ≤ 7 days away | +20% |
| **Time** | Event ≤ 1 day away | +50% |
| **Demand** | More than 10 bookings in the last hour | +15% |
| **Inventory** | Less than 20% of tickets remaining | +25% |

Rules stack (percentages add). Each rule is multiplied by its env weight (`PRICE_*_WEIGHT`, default `1`).

### Formula

```
weightedAdjustmentSum =
  (timeAdjustment × PRICE_TIME_WEIGHT) +
  (demandAdjustment × PRICE_DEMAND_WEIGHT) +
  (inventoryAdjustment × PRICE_INVENTORY_WEIGHT)

unclampedPrice = basePrice × (1 + weightedAdjustmentSum)
finalPrice     = clamp(unclampedPrice, floorPrice, ceilingPrice)
```

Result is rounded to 2 decimal places.

### Example

- Base price = Rs. 1,500, floor = 1,000, ceiling = 3,000  
- 2 days until event → time +20%  
- 5 bookings in last hour → demand 0%  
- 25/120 tickets left (~21%) → inventory 0%  

```
finalPrice = 1500 × 1.2 = 1800  (within floor/ceiling)
```

On booking, **`pricePaid`** stores the unit price at purchase time; **`currentPrice`** on the event updates for the next visitor.

More examples and UI walkthrough: **[DEMO.md](./DEMO.md)** §6.

---

## Testing

### Run all tests (one command)

**Requirements:** Docker running, `.env` present (`cp .env.example .env`).

```bash
corepack pnpm test:all
```

**Expected final output:** `All tests passed.`

| Step | What runs |
|------|-----------|
| 1 | Install dependencies |
| 2 | Build `@repo/database` |
| 3 | Start Postgres + `db:push` |
| 4 | Pricing unit tests (5 tests) |
| 5 | Concurrency test with `RUN_DB_TESTS=1` (6 tests total) |
| 6 | Coverage, `check-types`, `lint` |
| 7 | `db:seed` + API smoke E2E |

### Individual test commands

```bash
# Setup (first time)
docker compose up -d postgres
corepack pnpm --filter @repo/database build
corepack pnpm --filter @repo/database db:push

# Unit tests — pricing only (5 passed, concurrency skipped)
corepack pnpm --filter api test

# Unit + concurrency integration (6 passed)
RUN_DB_TESTS=1 corepack pnpm --filter api test

# Coverage on pricing.ts (≥70% threshold)
corepack pnpm --filter api test:coverage

# TypeScript
corepack pnpm check-types

# ESLint
corepack pnpm lint

# API smoke E2E (health, events, bookings, analytics, POST booking)
corepack pnpm smoke
```

### Test cases

**`apps/api/tests/pricing.test.ts`** (no database)

| Test | Verifies | Expected `finalPrice` |
|------|----------|------------------------|
| applies time rule | Event ≤ 1 day away | 150 |
| applies demand rule | >10 bookings/hour | 115 |
| applies inventory rule | <20% tickets left | 125 |
| combines all rules | All three rules | 190 |
| respects floor and ceiling | Clamp high/low | 130 / 95 |

**`apps/api/tests/concurrency.test.ts`** (requires DB + `RUN_DB_TESTS=1`)

| Test | Verifies |
|------|----------|
| prevents overbooking of last ticket | Two parallel bookings for 1 seat → one success, one `SoldOutError`, `bookedTickets === 1` |

**`scripts/smoke.sh`** — HTTP checks against a live API: `/health`, `/events`, `/events/:id`, `/bookings`, analytics endpoints, `POST /bookings`.

> Concurrency tests **clear** `events` and `bookings`. Re-seed after: `corepack pnpm --filter @repo/database db:seed`

Full test documentation: **[DEMO.md](./DEMO.md)** §9.

---

## API Endpoints

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/health` | `{ "ok": true }` |
| `GET` | `/events` | List events with live `currentPrice` |
| `GET` | `/events/:id` | Detail + `priceBreakdown` |
| `POST` | `/events` | Header: `x-api-key: <ADMIN_API_KEY>` |
| `POST` | `/bookings` | Body: `{ eventId, userEmail, quantity }` |
| `GET` | `/bookings?eventId=:id` | Bookings for an event |
| `GET` | `/analytics/events/:id` | Per-event analytics |
| `GET` | `/analytics/summary` | Platform summary |
| `POST` | `/seed` | Re-seed sample events (dev) |

---

## Regenerate Word Demo Guide

After editing `DEMO.md`:

```bash
scripts/.venv-docx/bin/python scripts/generate-demo-docx.py
```

First-time setup for the generator:

```bash
cd scripts && python3 -m venv .venv-docx && .venv-docx/bin/pip install python-docx
```

---

## Packaging for Submission

From the parent directory of this project:

```bash
zip -r ticketing-platform-submission.zip ticketing-platform-monorepo-main \
  -x "**/node_modules/*" "**/.next/*" "**/dist/*" "**/.turbo/*" "scripts/.venv-docx/*"
```

Include `Ticketing-Platform-Demo-Guide.docx` and `DEMO.md` in the zip for reviewers.

---

## Quick Reference

| Task | Command |
|------|---------|
| Run app (Docker) | `docker compose up --build` |
| Run app (local) | `docker compose up -d postgres` → build DB → `db:push` → `db:seed` → `pnpm dev` |
| Build all | `pnpm --filter @repo/database build` → `pnpm build` |
| All tests | `pnpm test:all` |
| API tests only | `RUN_DB_TESTS=1 pnpm --filter api test` |
| Smoke E2E | `pnpm smoke` |
