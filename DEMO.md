# Ticketing Platform — Demo Guide

This document explains how to run the application, walk through every user flow, and understand how dynamic pricing and booking work end to end.

---

## 1. What This Application Does

This is a **full-stack event ticketing platform** with:

- **Event listing** — browse upcoming events with live price and inventory
- **Event details** — see description, price breakdown, and book tickets
- **Dynamic pricing** — ticket price changes based on time to event, recent demand, and remaining inventory
- **Safe booking** — prevents overselling when many users book at the same time
- **Booking history** — view what you paid vs the current market price

**Tech stack (high level):**

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router) |
| Backend API | Express.js (TypeScript) |
| Database | PostgreSQL + Drizzle ORM |
| Monorepo | Turborepo + pnpm |

---

## 2. How to Start the Application

### Option A — One command (recommended for demo)

**Requirements:** Docker Desktop installed and running.

From the project root folder:

```bash
docker compose up --build
```

Wait until all services are up (first run may take a few minutes to build images).

**Open in browser:**

| Service | URL |
|---------|-----|
| Web app | http://localhost:3000 |
| API health check | http://localhost:3001/health |

**What happens automatically:**

1. PostgreSQL starts
2. API container applies database schema
3. Sample events are seeded (3 demo events)
4. API becomes healthy, then the web app starts

**Stop the application:**

```bash
docker compose down
```

**Reset database and start fresh:**

```bash
docker compose down -v
docker compose up --build
```

> **Note:** You do **not** need a `.env` file for Docker. Environment variables are set inside `docker-compose.yml`.

---

### Option B — Local development (Node.js + Docker for database)

**Requirements:**

- Node.js 20+
- Docker Desktop (for PostgreSQL only)
- Corepack enabled: `corepack enable`

**Step 1 — Install dependencies**

```bash
corepack pnpm install --ignore-scripts
```

**Step 2 — Environment file**

Copy the example env file:

```bash
cp .env.example .env
```

Default values work for local dev:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ticketing
API_BASE_URL=http://localhost:3001
ADMIN_API_KEY=dev-admin-key
PRICE_TIME_WEIGHT=1
PRICE_DEMAND_WEIGHT=1
PRICE_INVENTORY_WEIGHT=1
```

**Step 3 — Start PostgreSQL**

```bash
docker compose up -d postgres
```

**Step 4 — Build database package, push schema, and seed**

```bash
corepack pnpm --filter @repo/database build
corepack pnpm --filter @repo/database db:push
corepack pnpm --filter @repo/database db:seed
```

**Step 5 — Start API and web**

```bash
corepack pnpm dev
```

**Open:**

- Web: http://localhost:3000
- API: http://localhost:3001/health

---

## 3. Application Pages & Navigation

| Page | URL | Purpose |
|------|-----|---------|
| Home | `/` | Landing page with links to events and bookings |
| Events list | `/events` | All upcoming events with current price and tickets left |
| Event detail | `/events/[id]` | Full event info, price breakdown, booking form |
| Booking success | `/bookings/success` | Confirmation after a successful booking |
| My bookings | `/my-bookings?email=you@example.com` | Your bookings filtered by email |

**Header navigation:** Events · My Bookings (from any page)

---

## 4. End-to-End User Flows

### Flow 1 — Browse events (listing)

```mermaid
flowchart LR
  A[Open /events] --> B[Web calls GET /events]
  B --> C[API loads events from DB]
  C --> D[API recalculates current price per event]
  D --> E[Web shows cards: name, date, venue, price, remaining tickets]
```

**Steps for demo:**

1. Go to http://localhost:3000
2. Click **Explore Events** (or **Events** in the header)
3. You will see **3 seeded events**, each showing:
   - Event name, date, venue
   - **Current Price** (Rs.)
   - **Remaining** tickets

**Why prices differ on the list:** Each event has different days-until-event, inventory level, and booking velocity. The API recalculates price on every request.

---

### Flow 2 — View event details & price breakdown

```mermaid
flowchart LR
  A[Click an event card] --> B[GET /events/:id]
  B --> C[API returns event + priceBreakdown]
  C --> D[Page shows rules: time, demand, inventory adjustments]
```

**Steps for demo:**

1. From `/events`, click any event (e.g. **Product Design Live** — soonest date, low inventory)
2. On the detail page you will see:
   - Description, date, venue
   - **Price Breakdown** panel:
     - Base price
     - Current price
     - Time / Demand / Inventory adjustment percentages
     - Tickets remaining
3. Right side: **Book Tickets** form (email + quantity)

**Demo tip:** Compare **Cloud Native Day** (8 days away, ~24% tickets left) vs **AI Builders Summit** (45 days away, plenty of tickets). The nearer / scarcer event usually has a higher current price.

---

### Flow 3 — Book tickets

```mermaid
sequenceDiagram
  participant User
  participant Web as Next.js Web
  participant API as Express API
  participant DB as PostgreSQL

  User->>Web: Submit booking form
  Web->>API: POST /bookings { eventId, userEmail, quantity }
  API->>DB: BEGIN TRANSACTION
  API->>DB: LOCK event row (FOR UPDATE)
  API->>DB: Check tickets remaining
  API->>API: Calculate price at booking time
  API->>DB: Insert booking + update bookedTickets & currentPrice
  API->>DB: COMMIT
  API-->>Web: booking, unitPrice, totalPaid
  Web-->>User: Redirect to /bookings/success
```

**Steps for demo:**

1. On an event detail page, enter:
   - **Email:** e.g. `demo@example.com`
   - **Quantity:** 1–10
2. Click **Confirm Booking**
3. You are redirected to **Booking Confirmed** with:
   - Booking ID
   - Tickets quantity
   - **Unit price** at time of purchase
   - **Total paid** = unit price × quantity
4. Click **View My Bookings** or **Browse More Events**

**Business rules:**

- Maximum **10 tickets** per booking (form validation)
- If not enough tickets remain → **409 Sold out** error
- Price is **locked at booking time** (`pricePaid` stored in database)
- After booking, event’s `currentPrice` and `bookedTickets` are updated

---

### Flow 4 — View my bookings

**Steps for demo:**

1. Go to **My Bookings** in the header  
   — or open: `http://localhost:3000/my-bookings?email=demo@example.com`
2. Replace `demo@example.com` with the email you used when booking
3. Each row shows:
   - Event name
   - Tickets booked
   - **Unit price paid** (historical)
   - **Total paid**
   - **Current unit price** (live market price — may differ from what you paid)

**Why paid vs current price differs:** Pricing is dynamic. If more people book, inventory drops, or the event date gets closer, the current price can rise (within floor/ceiling limits).

---

## 5. Sample Data (After Seed)

On first startup, **3 events** are loaded:

| Event | Days until event | Tickets (booked / total) | Base price | Floor | Ceiling |
|-------|------------------|--------------------------|------------|-------|---------|
| AI Builders Summit | ~45 days | 60 / 400 | Rs. 1,200 | Rs. 800 | Rs. 2,200 |
| Cloud Native Day | ~8 days | 190 / 250 | Rs. 900 | Rs. 600 | Rs. 1,800 |
| Product Design Live | ~2 days | 95 / 120 | Rs. 1,500 | Rs. 1,000 | Rs. 3,000 |

Exact dates are relative to when you run seed (based on “today” at seed time).

---

## 6. Dynamic Pricing — Theory & Calculation

Pricing is computed by a **pure function** in the API (`calculatePriceBreakdown`). The same logic is used when **listing events**, **showing details**, and **creating a booking**.

### 6.1 The three pricing rules

| Rule | When it applies | Adjustment added |
|------|-----------------|------------------|
| **Time** | Event is ≤ 7 days away | +20% |
| **Time** | Event is ≤ 1 day away | +50% (replaces the 7-day tier if closer) |
| **Demand** | More than 10 bookings in the last hour for this event | +15% |
| **Inventory** | Less than 20% of tickets remaining | +25% |

Multiple rules can apply at the same time. They are **added together** before being applied to the base price.

### 6.2 Weights (tunable via environment)

Each adjustment is multiplied by a weight (default **1**):

| Variable | Meaning |
|----------|---------|
| `PRICE_TIME_WEIGHT` | Scales time-based adjustment |
| `PRICE_DEMAND_WEIGHT` | Scales demand-based adjustment |
| `PRICE_INVENTORY_WEIGHT` | Scales inventory-based adjustment |

### 6.3 Formula

**Step 1 — Compute raw adjustments (as decimals)**

```
timeAdjustment      = 0.5 if daysToEvent ≤ 1
                      else 0.2 if daysToEvent ≤ 7
                      else 0

demandAdjustment    = 0.15 if bookingsInLastHour > 10
                      else 0

remainingRatio      = ticketsRemaining / totalTickets
inventoryAdjustment = 0.25 if remainingRatio < 0.2
                      else 0
```

**Step 2 — Weighted sum**

```
weightedAdjustmentSum =
    (timeAdjustment × PRICE_TIME_WEIGHT) +
    (demandAdjustment × PRICE_DEMAND_WEIGHT) +
    (inventoryAdjustment × PRICE_INVENTORY_WEIGHT)
```

**Step 3 — Apply to base price**

```
unclampedPrice = basePrice × (1 + weightedAdjustmentSum)
```

**Step 4 — Clamp to floor and ceiling**

```
finalPrice = min(ceilingPrice, max(floorPrice, unclampedPrice))
```

Result is rounded to **2 decimal places**.

### 6.4 Worked example — Product Design Live

Assume at booking time:

- Base price = **Rs. 1,500**
- Floor = Rs. 1,000, Ceiling = Rs. 3,000
- Days to event = **2** → timeAdjustment = **0.2** (20%)
- Bookings in last hour = **5** → demandAdjustment = **0**
- Remaining = 25 / 120 → ratio ≈ 0.21 → inventoryAdjustment = **0** (not below 20%)
- All weights = **1**

```
weightedAdjustmentSum = 0.2 + 0 + 0 = 0.2
unclampedPrice = 1500 × (1 + 0.2) = 1800
finalPrice = min(3000, max(1000, 1800)) = Rs. 1,800
```

If inventory later drops below 20% remaining, **+25%** inventory adjustment can push the price higher (until ceiling).

### 6.5 Worked example — High demand + low inventory

- Base price = Rs. 900  
- Days to event = 6 → time +20%  
- 12 bookings in last hour → demand +15%  
- 10% tickets left → inventory +25%  
- Weights all = 1  

```
weightedAdjustmentSum = 0.2 + 0.15 + 0.25 = 0.6
unclampedPrice = 900 × 1.6 = 1440
finalPrice = clamped between floor (600) and ceiling (1800) → Rs. 1,440
```

### 6.6 What gets stored when you book

| Field | Meaning |
|-------|---------|
| `bookings.pricePaid` | **Unit price** at booking time (snapshot) |
| `bookings.quantity` | Number of tickets |
| Total paid | `pricePaid × quantity` (computed in API/UI) |
| `events.currentPrice` | Updated to latest calculated price after booking |
| `events.bookedTickets` | Increased by quantity |

---

## 7. Concurrency & Overselling Prevention

When two users try to book the **last tickets** at the same time:

1. API starts a **database transaction**
2. Locks the event row: `SELECT ... FOR UPDATE`
3. Re-checks remaining inventory inside the transaction
4. Only one transaction succeeds; the other gets **409 — Not enough tickets available**

This is important for real ticketing systems under load.

---

## 8. API Reference (Quick)

Base URL (local): `http://localhost:3001`

### Health

```http
GET /health
→ { "ok": true }
```

### Events

```http
GET /events
GET /events/:id
POST /events          # Header: x-api-key: <ADMIN_API_KEY>
```

### Bookings

```http
POST /bookings
Body: { "eventId": "uuid", "userEmail": "a@b.com", "quantity": 2 }

GET /bookings?eventId=<uuid>
```

### Analytics (optional demo)

```http
GET /analytics/events/:id
GET /analytics/summary
```

### Example — create booking with curl

```bash
curl -X POST http://localhost:3001/bookings \
  -H "Content-Type: application/json" \
  -d '{"eventId":"<EVENT_UUID>","userEmail":"demo@test.com","quantity":1}'
```

Get event IDs from `GET /events`.

---

## 9. Testing — How to Run All Test Cases

This project includes **unit tests**, **database integration tests**, an **automated smoke test** (API end-to-end), and **manual browser flows** for full UI verification.

### Run all tests in one command (recommended before demo)

**Requirements:** Docker Desktop running, root `.env` present (copy from `.env.example`).

```bash
corepack enable
cp .env.example .env   # only if .env does not exist yet
corepack pnpm test:all
```

**What `test:all` runs (step by step):**

| Step | Script action | Command executed internally | Success signal |
|------|---------------|----------------------------|----------------|
| 1 | Install dependencies | `pnpm install --ignore-scripts` | No errors |
| 2 | Build database package | `pnpm --filter @repo/database build` | `dist/` created |
| 3 | Start DB + schema | `docker compose up -d postgres` + `db:push` | Postgres healthy |
| 4 | Pricing unit tests | `pnpm --filter api test` | **5 passed**, 1 skipped |
| 5 | Concurrency test | `RUN_DB_TESTS=1 pnpm --filter api test` | **6 passed** (0 skipped) |
| 6 | Coverage | `pnpm --filter api test:coverage` | ≥70% on `pricing.ts` |
| 7 | TypeScript | `pnpm check-types` | 4 packages successful |
| 8 | Lint | `pnpm lint` | No ESLint errors |
| 9 | Seed + smoke E2E | `db:seed` + `scripts/smoke.sh` | `Smoke test passed` |
| Final | — | — | **`All tests passed.`** |

**Expected final line in terminal:**

```text
All tests passed.
```

**Verified test counts (when everything is green):**

| Suite | Tests | Result |
|-------|-------|--------|
| `pricing.test.ts` | 5 | All pass |
| `concurrency.test.ts` | 1 | Pass (only when `RUN_DB_TESTS=1`) |
| Smoke script | 8 HTTP checks | All pass |
| Coverage (`pricing.ts`) | — | 100% lines, ≥70% branches |

---

### 9.1 Test overview

| Test type | What it verifies | Needs database? | Command |
|-----------|------------------|-----------------|---------|
| **All automated tests** | Full pipeline (below) | Yes | `corepack pnpm test:all` |
| Pricing unit tests | Time, demand, inventory rules, floor/ceiling | No | `corepack pnpm --filter api test` |
| Concurrency integration test | Two simultaneous bookings cannot oversell last ticket | Yes | `RUN_DB_TESTS=1 corepack pnpm --filter api test` |
| Coverage report | Pricing module line/branch coverage (≥70%) | No | `corepack pnpm --filter api test:coverage` |
| Smoke test | Postgres + schema + seed + API + all main endpoints + booking | Yes (auto) | `corepack pnpm smoke` |
| Type check | TypeScript across monorepo | No | `corepack pnpm check-types` |
| Lint | ESLint (api + web) | No | `corepack pnpm lint` |
| Manual UI E2E | Browser flows (listing, book, my bookings) | Yes | See §9.8 |

**Test files:**

- `apps/api/tests/pricing.test.ts` — pricing engine unit tests
- `apps/api/tests/concurrency.test.ts` — concurrent booking test (skipped unless `RUN_DB_TESTS=1`)
- `scripts/smoke.sh` — automated API end-to-end script

---

### 9.2 Prerequisites for running tests

**For unit tests only (pricing):**

- Node.js 20+
- Dependencies installed: `corepack pnpm install --ignore-scripts`
- Database package built: `corepack pnpm --filter @repo/database build`

**For database tests, smoke test, and manual E2E:**

- Docker Desktop running
- Root `.env` file (copy from `.env.example`) with:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ticketing
```

**Start PostgreSQL before DB-dependent tests:**

```bash
docker compose up -d postgres
corepack pnpm --filter @repo/database build
corepack pnpm --filter @repo/database db:push
```

> Concurrency tests **clear** `events` and `bookings` tables in `beforeAll`. Do not run them against production data. Re-seed after if you need demo data: `corepack pnpm --filter @repo/database db:seed`

---

### 9.3 Pricing unit tests (no database)

**File:** `apps/api/tests/pricing.test.ts`  
**Flow:** Calls `calculatePriceBreakdown()` with mocked event data and asserts `finalPrice`.

| Test case | What it checks | Expected result |
|-----------|----------------|-----------------|
| `applies time rule` | Event ≤ 1 day away, time weight only | Final price = **150** (base 100 + 50%) |
| `applies demand rule` | >10 bookings/hour, demand weight only | Final price = **115** (base 100 + 15%) |
| `applies inventory rule` | <20% tickets left, inventory weight only | Final price = **125** (base 100 + 25%) |
| `combines all rules` | Time + demand + inventory together | Final price = **190** |
| `respects floor and ceiling` | High adjustments capped at ceiling; low at floor | Capped at **130** / floored at **95** |

**Run:**

```bash
corepack pnpm --filter @repo/database build
corepack pnpm --filter api test
```

**Expected output (copy/paste reference):**

```text
 ✓ tests/pricing.test.ts (5 tests)
 ↓ tests/concurrency.test.ts (1 test | 1 skipped)

 Test Files  1 passed | 1 skipped (2)
      Tests  5 passed | 1 skipped (6)
```

**Run a single pricing test by name:**

```bash
corepack pnpm --filter api test -t "applies time rule"
corepack pnpm --filter api test -t "applies demand rule"
corepack pnpm --filter api test -t "applies inventory rule"
corepack pnpm --filter api test -t "combines all rules"
corepack pnpm --filter api test -t "respects floor and ceiling"
```

---

### 9.4 Concurrency integration test (requires database)

**File:** `apps/api/tests/concurrency.test.ts`  
**Flow:**

1. Creates an event with **only 1 ticket**
2. Fires **two parallel** `createBooking()` calls
3. Asserts exactly **one succeeds** and one fails with `SoldOutError`
4. Asserts `bookedTickets` on the event is **1** (not 2)

**Run:**

```bash
docker compose up -d postgres
# Ensure .env has DATABASE_URL pointing to localhost:5432

corepack pnpm --filter @repo/database build
corepack pnpm --filter @repo/database db:push

RUN_DB_TESTS=1 corepack pnpm --filter api test
```

**Expected output (copy/paste reference):**

```text
 ✓ tests/pricing.test.ts (5 tests)
 ✓ tests/concurrency.test.ts (1 test)

 Test Files  2 passed (2)
      Tests  6 passed (6)
```

**What the concurrency test asserts (no error scenario):**

| Assertion | Meaning |
|-----------|---------|
| `fulfilled` length = 1 | Exactly one booking succeeds |
| `rejected` length = 1 | Exactly one booking fails |
| Rejection reason = `SoldOutError` | Failure is sold-out, not a random error |
| `bookedTickets` = 1 | Database never shows 2 tickets sold for 1 seat |

**Run only concurrency test:**

```bash
RUN_DB_TESTS=1 corepack pnpm --filter api test tests/concurrency.test.ts
```

---

### 9.5 Coverage report (pricing module)

**Run:**

```bash
corepack pnpm --filter api test:coverage
```

**What it does:** Runs unit tests with V8 coverage on `src/pricing.ts`. Fails if coverage is below **70%** for lines, functions, branches, and statements.

**Output:** Text summary in terminal; HTML report under `apps/api/coverage/`.

**Expected output (minimum):**

```text
 pricing.ts |     100 |       80 |     100 |     100 |
```

---

### 9.6 Automated smoke test (API end-to-end)

**Script:** `scripts/smoke.sh`  
**Flow (8 steps):**

```mermaid
flowchart TD
  A[Install dependencies] --> B[Start postgres container]
  B --> C[Wait for DB healthy]
  C --> D[db:push schema]
  D --> E[db:seed sample events]
  E --> F[Start API in dev mode]
  F --> G[Wait for GET /health]
  G --> H[HTTP checks on all main endpoints]
  H --> I[POST /bookings and verify response]
```

| Step | Action |
|------|--------|
| 1 | `pnpm install` |
| 2–3 | Start postgres, wait until ready |
| 4–5 | Push schema and seed |
| 6–7 | Start API on port 3001, poll `/health` |
| 8 | Verify endpoints |

**Endpoints exercised:**

| Check | Method | Path |
|-------|--------|------|
| Health | GET | `/health` |
| List events | GET | `/events` (must return ≥1 event) |
| Event detail | GET | `/events/:id` |
| List bookings | GET | `/bookings?eventId=:id` |
| Event analytics | GET | `/analytics/events/:id` |
| Summary analytics | GET | `/analytics/summary` |
| Create booking | POST | `/bookings` with `smoke@test.com`, quantity 1 |

**Run from project root:**

```bash
corepack pnpm smoke
```

**Expected output:** `Smoke test passed: DB + API are working.`

**Requirements:** `docker`, `corepack`, `curl`, `python3` available in PATH.

> Smoke test starts its own API process and stops it when finished. It does not start the Next.js web app.

---

### 9.7 Type check and lint

**Type check (api + web + packages):**

```bash
corepack pnpm check-types
```

**Lint:**

```bash
corepack pnpm lint
```

**Run for API only:**

```bash
corepack pnpm --filter api check-types
corepack pnpm --filter api lint
corepack pnpm --filter web lint
```

---

### 9.8 Manual end-to-end flows (browser + API)

Use these after the app is running (`docker compose up --build` or local `pnpm dev`).

#### E2E Flow A — Event listing

| Step | Action | Pass criteria |
|------|--------|---------------|
| 1 | Open http://localhost:3000/events | Page loads, no error |
| 2 | Count event cards | At least **3** events visible |
| 3 | Check each card | Shows name, date, **Current Price**, **Remaining** |

**API equivalent:**

```bash
curl -s http://localhost:3001/events | python3 -m json.tool
```

---

#### E2E Flow B — Event detail and price breakdown

| Step | Action | Pass criteria |
|------|--------|---------------|
| 1 | Click any event from `/events` | Navigates to `/events/[id]` |
| 2 | Read **Price Breakdown** | Base price, current price, time/demand/inventory % shown |
| 3 | Check booking form | Email and quantity fields visible |

**API equivalent:**

```bash
EVENT_ID="<paste-id-from-/events>"
curl -s "http://localhost:3001/events/$EVENT_ID" | python3 -m json.tool
```

Response should include `priceBreakdown` and `ticketsRemaining`.

---

#### E2E Flow C — Complete booking (UI)

| Step | Action | Pass criteria |
|------|--------|---------------|
| 1 | On event detail, enter `demo@example.com`, quantity **2** | — |
| 2 | Click **Confirm Booking** | Redirect to `/bookings/success` |
| 3 | On success page | Booking ID, unit price, **total paid** = unit × 2 |
| 4 | Click **View My Bookings** | Opens my-bookings with email in URL |

**API equivalent:**

```bash
curl -s -X POST http://localhost:3001/bookings \
  -H "Content-Type: application/json" \
  -d '{"eventId":"<EVENT_ID>","userEmail":"demo@example.com","quantity":2}'
```

Expect `201` with `booking`, `unitPrice`, `totalPaid`.

---

#### E2E Flow D — My bookings history

| Step | Action | Pass criteria |
|------|--------|---------------|
| 1 | Open `/my-bookings?email=demo@example.com` | Page loads |
| 2 | Find your booking row | Shows event name, quantity, unit paid, total paid, **current unit price** |

---

#### E2E Flow E — Sold out / conflict (optional)

| Step | Action | Pass criteria |
|------|--------|---------------|
| 1 | Pick event with **1 ticket** left (or create one via API) | — |
| 2 | Book 1 ticket in browser | Success |
| 3 | Book 1 more ticket (another browser tab or curl) | Error: not enough tickets / booking failed |

**API equivalent (second booking should fail with 409):**

```bash
# After last ticket is taken:
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3001/bookings \
  -H "Content-Type: application/json" \
  -d '{"eventId":"<EVENT_ID>","userEmail":"other@example.com","quantity":1}'
# Expect: 409
```

---

#### E2E Flow F — Pricing changes after booking (optional)

| Step | Action | Pass criteria |
|------|--------|---------------|
| 1 | Note **current price** on event detail | e.g. Rs. 1,800 |
| 2 | Complete a booking | Success |
| 3 | Return to same event (refresh) | `bookedTickets` lower; price may update |
| 4 | Open my-bookings | **Unit price paid** may differ from **current unit price** |

---

### 9.9 Run everything (recommended order)

**One command (preferred):**

```bash
corepack pnpm test:all
```

**Step by step (if you prefer):**

From project root, with Docker running:

```bash
# 1. Install
corepack pnpm install --ignore-scripts

# 2. Database package + schema
docker compose up -d postgres
corepack pnpm --filter @repo/database build
corepack pnpm --filter @repo/database db:push

# 3. Unit tests (pricing only)
corepack pnpm --filter api test

# 4. Integration test (concurrency)
RUN_DB_TESTS=1 corepack pnpm --filter api test

# 5. Coverage
corepack pnpm --filter api test:coverage

# 6. Quality gates
corepack pnpm check-types
corepack pnpm lint

# 7. Re-seed after concurrency test cleared tables
corepack pnpm --filter @repo/database db:seed

# 8. Automated API E2E smoke
corepack pnpm smoke

# 9. Full stack for manual UI E2E
docker compose up --build
# Then walk through §9.8 flows A–F in the browser
```

**Quick checklist:**

- [ ] `corepack pnpm test:all` ends with `All tests passed.`
- [ ] Pricing: **5 passed**, concurrency skipped in step 4
- [ ] Integration: **6 passed**, none skipped in step 5
- [ ] Coverage ≥ 70% on pricing module
- [ ] `check-types` and `lint` pass
- [ ] Smoke: `Smoke test passed: DB + API are working.`
- [ ] Manual UI: list → detail → book → my-bookings (§9.8)

---

### 9.10 Copy-paste commands (every test, individually)

Run from **project root**. Ensure Docker is running and `.env` exists.

```bash
# --- Setup (once) ---
corepack enable
cp .env.example .env
corepack pnpm install --ignore-scripts
docker compose up -d postgres
corepack pnpm --filter @repo/database build
corepack pnpm --filter @repo/database db:push

# --- 1. All tests (recommended) ---
corepack pnpm test:all

# --- 2. Unit tests only (5 pricing tests) ---
corepack pnpm --filter api test

# --- 3. Unit + concurrency (6 tests) ---
RUN_DB_TESTS=1 corepack pnpm --filter api test

# --- 4. Coverage ---
corepack pnpm --filter api test:coverage

# --- 5. TypeScript ---
corepack pnpm check-types

# --- 6. Lint ---
corepack pnpm lint

# --- 7. API smoke E2E ---
corepack pnpm --filter @repo/database db:seed
corepack pnpm smoke

# --- 8. Start app for manual UI E2E ---
docker compose up --build
```

---

### 9.11 Test troubleshooting

| Problem | What to try |
|---------|-------------|
| Concurrency tests skipped | Set `RUN_DB_TESTS=1` |
| `DATABASE_URL is required` | Create `.env` from `.env.example`; start postgres |
| `relation "events" does not exist` | Run `pnpm --filter @repo/database db:push` |
| Smoke test: API did not start | Check port 3001 free; read `/tmp/ticketing-api.log` |
| Smoke test: `python3` not found | Install Python 3 or run curl checks manually (§9.6 table) |
| Unit test: cannot find `@repo/database` | Run `pnpm --filter @repo/database build` first |
| Empty events after concurrency test | Run `pnpm --filter @repo/database db:seed` |
| Coverage fails threshold | Ensure all pricing tests pass; check `apps/api/src/pricing.ts` |

---

## 10. Suggested Demo Script (10–15 minutes)

1. **Start** — Run `docker compose up --build`, open http://localhost:3000  
2. **Home** — Explain dynamic pricing + safe inventory in one sentence  
3. **Events list** — Point out different prices and remaining tickets  
4. **Product Design Live** — Show price breakdown (time + soon event + low stock)  
5. **Book 2 tickets** — Use `demo@example.com`, show success page with unit + total  
6. **My bookings** — Open `/my-bookings?email=demo@example.com`, compare paid vs current price  
7. **Second booking** — Book again on same or another event; note price may change  
8. **API** — Optional: show `http://localhost:3001/health` and `GET /events` in browser or curl  
9. **Q&A** — Refer to Section 6 for pricing formula questions  

---

## 11. Troubleshooting

| Problem | What to try |
|---------|-------------|
| Port 3000 or 3001 already in use | Stop other apps or change ports in `docker-compose.yml` |
| `docker compose` fails on build | Ensure Docker Desktop is running; retry `docker compose up --build` |
| Web shows errors / no events | Wait for API to be healthy; check `docker compose ps` — api should be `healthy` |
| Empty events list | Reset DB: `docker compose down -v` then `docker compose up --build` |
| My bookings empty | Add `?email=` query param matching the email used when booking |
| Local dev: module not found for database | Run `pnpm --filter @repo/database build` before `pnpm dev` |

---

## 12. Project Structure (For Reference)

```
apps/web/              → Next.js frontend (pages, booking form)
apps/api/              → Express API (pricing, bookings, events)
packages/database/     → Schema, migrations, seed script
docker-compose.yml     → One-command stack (postgres + api + web)
DESIGN.md              → Technical architecture deep dive
RUNBOOK.md             → Operator runbook
```

---

## 13. Summary

| Topic | Takeaway |
|-------|----------|
| **Start (demo)** | `docker compose up --build` → http://localhost:3000 |
| **Listing** | `/events` — live price + inventory from API |
| **Booking** | Form on event page → POST `/bookings` → success page |
| **Pricing** | `base × (1 + weighted rules)`, clamped to floor/ceiling |
| **History** | `/my-bookings?email=...` — paid price vs current price |
| **Safety** | Row locks prevent double-selling last tickets |
| **Unit tests** | `pnpm --filter api test` (pricing) |
| **DB integration** | `RUN_DB_TESTS=1 pnpm --filter api test` (concurrency) |
| **API E2E** | `pnpm smoke` |
| **UI E2E** | Manual flows in §9.8 after app is up |
| **All automated tests** | `corepack pnpm test:all` → `All tests passed.` |
| **Word doc for review** | `Ticketing-Platform-Demo-Guide.docx` (same content as this file) |

**Regenerate the Word document after editing this file:**

```bash
scripts/.venv-docx/bin/python scripts/generate-demo-docx.py
# First time only:
# cd scripts && python3 -m venv .venv-docx && .venv-docx/bin/pip install python-docx
```

For technical architecture details, see **DESIGN.md**. For day-to-day operations, see **RUNBOOK.md**.
