#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/ticketing}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required"
  exit 1
fi

if ! command -v corepack >/dev/null 2>&1; then
  echo "corepack is required"
  exit 1
fi

echo "[1/8] Installing dependencies"
corepack pnpm install --ignore-scripts >/dev/null

echo "[2/8] Starting postgres"
docker compose up -d postgres >/dev/null

echo "[3/8] Waiting for postgres"
for _ in {1..30}; do
  if docker compose exec -T postgres pg_isready -U postgres -d ticketing >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "[4/8] Pushing schema"
corepack pnpm --filter @repo/database db:push >/dev/null

echo "[5/8] Seeding data"
corepack pnpm --filter @repo/database db:seed >/dev/null

echo "[6/8] Starting API"
API_LOG="/tmp/ticketing-api.log"
: > "$API_LOG"
(
  cd "$ROOT_DIR/apps/api"
  corepack pnpm dev >"$API_LOG" 2>&1
) &
API_PID=$!
cleanup() {
  if kill -0 "$API_PID" >/dev/null 2>&1; then
    kill "$API_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

echo "[7/8] Waiting for API health"
for _ in {1..40}; do
  if curl -fsS http://localhost:3001/health >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS http://localhost:3001/health >/dev/null 2>&1; then
  echo "API did not start. Last logs:"
  tail -n 40 "$API_LOG"
  exit 1
fi

echo "[8/8] Running endpoint checks"
EVENTS_JSON="$(curl -fsS http://localhost:3001/events)"
if [ "$(echo "$EVENTS_JSON" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')" -lt 1 ]; then
  echo "No events returned from /events"
  exit 1
fi

EVENT_ID="$(echo "$EVENTS_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)[0]["id"])')"

curl -fsS "http://localhost:3001/events/$EVENT_ID" >/dev/null
curl -fsS "http://localhost:3001/bookings?eventId=$EVENT_ID" >/dev/null
curl -fsS "http://localhost:3001/analytics/events/$EVENT_ID" >/dev/null
curl -fsS "http://localhost:3001/analytics/summary" >/dev/null

BOOKING_RESP="$(curl -fsS -X POST http://localhost:3001/bookings -H 'content-type: application/json' -d "{\"eventId\":\"$EVENT_ID\",\"userEmail\":\"smoke@test.com\",\"quantity\":1}")"

if [ "$(echo "$BOOKING_RESP" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(1 if d.get("booking",{}).get("id") else 0)')" != "1" ]; then
  echo "Booking endpoint check failed"
  exit 1
fi

echo "Smoke test passed: DB + API are working."
