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

echo "==> [1/7] Install dependencies"
corepack pnpm install --ignore-scripts >/dev/null

echo "==> [2/7] Build database package"
corepack pnpm --filter @repo/database build

echo "==> [3/7] Start postgres and push schema"
if command -v docker >/dev/null 2>&1; then
  docker compose up -d postgres >/dev/null
  for _ in {1..30}; do
    if docker compose exec -T postgres pg_isready -U postgres -d ticketing >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
  corepack pnpm --filter @repo/database db:push >/dev/null
else
  echo "docker is required for integration and smoke tests"
  exit 1
fi

echo "==> [4/7] Unit tests (pricing)"
corepack pnpm --filter api test

echo "==> [5/7] Integration tests (concurrency, requires DB)"
RUN_DB_TESTS=1 corepack pnpm --filter api test

echo "==> [6/7] Coverage, types, lint"
corepack pnpm --filter api test:coverage >/dev/null
corepack pnpm check-types >/dev/null
corepack pnpm lint >/dev/null

echo "==> [7/7] Seed and smoke (API end-to-end)"
corepack pnpm --filter @repo/database db:seed >/dev/null
bash ./scripts/smoke.sh

echo ""
echo "All tests passed."
