# Ticketing Platform Monorepo

A full-stack event ticketing platform with dynamic pricing, built in a Turborepo monorepo.

## Highlights

- Express.js backend (TypeScript, strict mode)
- Next.js 15 frontend (App Router + Server Actions)
- PostgreSQL + Drizzle ORM
- Dynamic pricing engine with weighted rules
- Concurrency-safe booking transactions (row-level lock)
- Dockerized one-command startup path for reviewers/clients

## Monorepo Structure

- `apps/web` - Next.js UI and booking flow
- `apps/api` - Express REST API and pricing/booking logic
- `packages/database` - Drizzle schema, DB client, push/seed scripts
- `DESIGN.md` - architecture and algorithm decisions
- `RUNBOOK.md` - operational steps for local and client setup

## Prerequisites

For local development:

- Node.js 20+
- Corepack enabled (`corepack enable`)
- Docker Desktop (recommended)

For one-command client run:

- Docker Desktop only (no local Node required)

## Environment Variables

Root `.env` (copy from `.env.example`):

- `DATABASE_URL` - PostgreSQL connection string
- `API_BASE_URL` - API base URL used by web server actions
- `ADMIN_API_KEY` - API key for `POST /events`
- `PRICE_TIME_WEIGHT` - time rule weight
- `PRICE_DEMAND_WEIGHT` - demand rule weight
- `PRICE_INVENTORY_WEIGHT` - inventory rule weight

Example:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ticketing
API_BASE_URL=http://localhost:3001
ADMIN_API_KEY=dev-admin-key
PRICE_TIME_WEIGHT=1
PRICE_DEMAND_WEIGHT=1
PRICE_INVENTORY_WEIGHT=1
```

---

## One-Command Run (Best for Client Review)

After unzipping the project, from the extracted root directory:

```bash
docker compose up --build
```

That single command will:

1. Start PostgreSQL
2. Build and start API and web containers
3. Auto-run DB schema push from API container
4. Auto-run seed script from API container
5. Serve the app

Open:

- Web: `http://localhost:3000`
- API: `http://localhost:3001/health`

To stop:

```bash
docker compose down
```

To remove DB volume and reset data:

```bash
docker compose down -v
```

---

## Local Development (Node + Docker)

1. Install dependencies:

```bash
corepack pnpm install --ignore-scripts
```

2. Start DB:

```bash
docker compose up -d postgres
```

3. Push schema and seed:

```bash
corepack pnpm --filter @repo/database db:push
corepack pnpm --filter @repo/database db:seed
```

4. Start apps:

```bash
corepack pnpm dev
```

Open:

- Web: `http://localhost:3000`
- API: `http://localhost:3001`

---

## Tests and Quality

- API unit/integration tests:

```bash
corepack pnpm --filter api test
```

- Pricing coverage report:

```bash
corepack pnpm --filter api test:coverage
```

- Mandatory concurrency test (requires DB):

```bash
RUN_DB_TESTS=1 corepack pnpm --filter api test
```

- Type checks:

```bash
corepack pnpm check-types
```

- Lint:

```bash
corepack pnpm lint
```

- Smoke test (automated local sanity flow):

```bash
corepack pnpm smoke
```

## API Endpoints

### Events

- `GET /events`
- `GET /events/:id`
- `POST /events` (requires header `x-api-key`)

### Bookings

- `POST /bookings`
- `GET /bookings?eventId=:id`

### Analytics

- `GET /analytics/events/:id`
- `GET /analytics/summary`

### Development

- `POST /seed`
- `GET /health`

## Packaging for Submission

Use this from parent directory of the project folder:

```bash
zip -r ticketing-platform-submission.zip ticketing-platform-monorepo-main
```

Before zipping, optionally remove heavy local folders:

- `node_modules`
- `.next`
- `dist`

(Do not remove source files or config files.)
# ticketing-platform
