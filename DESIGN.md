# Design Document

## 1. Problem Focus

This system prioritizes two assignment-critical concerns: dynamic pricing correctness and overbooking prevention under concurrent traffic. The implementation is intentionally pragmatic: clean domain boundaries, deterministic pricing logic, and transactional booking writes.

## 2. Monorepo Architecture

The project is organized with Turborepo workspaces:

- `apps/web`: Next.js 15 App Router frontend
- `apps/api`: Express REST API
- `packages/database`: Drizzle schema/client/seed as shared source of truth

This structure keeps data contracts centralized and avoids duplication between API and operational scripts. It also supports scalable CI by isolating build/test tasks per package while sharing lint and TypeScript standards.

## 3. Data Model

The schema contains two core entities:

- `events`: event metadata, ticket counts, and price boundaries (`basePrice`, `currentPrice`, `floorPrice`, `ceilingPrice`)
- `bookings`: event reference, buyer email, quantity, and booked unit price snapshot (`pricePaid`)

`pricePaid` is stored as unit price at booking time; total booking payment is computed as `pricePaid * quantity` wherever needed for display or analytics.

## 4. Pricing Engine Design

Pricing is implemented as a pure function (`calculatePriceBreakdown`) that receives event state, recent booking velocity, and environment-driven weights.

Rules:

- Time-based: closer events become more expensive
- Demand-based: high bookings/hour adds upward pressure
- Inventory-based: low remaining capacity increases price

Formula:

`currentPrice = basePrice × (1 + weightedAdjustmentSum)`

The result is clamped between floor and ceiling, making pricing bounded, deterministic, and safe for repeated evaluation.

## 5. Concurrency Strategy

Booking creation runs inside a DB transaction with explicit row lock:

- Lock event row with `SELECT ... FOR UPDATE`
- Recheck remaining inventory in the same transaction
- Insert booking and increment booked count atomically

This ensures two simultaneous requests cannot both consume the last ticket. One succeeds; the other receives a conflict-style business error.

## 6. API and Validation

The Express API includes endpoint-level Zod validation for params/query/body and returns structured 400 validation errors. A centralized error layer handles business and unexpected failures consistently.

## 7. Frontend UX Decisions

The UI is optimized for submission-readability and smooth reviewer experience:

- Dark modern visual style with clear hierarchy
- Event cards with price and inventory emphasis
- Event detail page with visible rule-based price breakdown
- Booking success page showing quantity, unit price, and total paid
- My Bookings page showing historical paid price vs current market unit price

## 8. Docker and Reviewer Experience

A one-command path is provided:

`docker compose up --build`

The API container handles DB push and seed at startup, so reviewers can run the app from an unzip with minimal setup.

## 9. Trade-offs and Next Improvements

Current trade-offs:

- No full auth system (email-only booking identity)
- Polling/revalidation instead of live websocket updates
- Seed-at-start in Docker favors reviewer convenience over strict production behavior

Future improvements:

- Redis caching for analytics and event list
- Richer admin flows and role-based auth
- Stronger CI/CD migration controls
- Better booking history query optimization and pagination
