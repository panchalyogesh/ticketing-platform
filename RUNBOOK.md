# Runbook for Client and Reviewer

## A) Fastest path after unzip (single command)

1. Open terminal in extracted project root.
2. Run:

```bash
docker compose up --build
```

3. Wait until services are healthy.
4. Open `http://localhost:3000`.

This is the preferred review path.

---

## B) Verify API quickly

```bash
curl http://localhost:3001/health
curl http://localhost:3001/events
```

If first command returns `{ "ok": true }`, API is up.

---

## C) Local dev path (if needed)

```bash
corepack enable
corepack prepare pnpm@9.0.0 --activate
corepack pnpm install --ignore-scripts
docker compose up -d postgres
corepack pnpm --filter @repo/database db:push
corepack pnpm --filter @repo/database db:seed
corepack pnpm dev
```

---

## D) Common troubleshooting

### 1) `pnpm: command not found`
Use `corepack pnpm ...` commands directly.

### 2) `DATABASE_URL` errors
Ensure root `.env` exists and contains valid `DATABASE_URL`.

### 3) `relation "events" does not exist`
Run schema push again:

```bash
corepack pnpm --filter @repo/database db:push
```

### 4) Port conflicts (3000/3001/5432)
Stop conflicting processes or change exposed ports in `docker-compose.yml`.

---

## E) Submission packaging

From parent directory:

```bash
zip -r ticketing-platform-submission.zip ticketing-platform-monorepo-main
```

Optional cleanup before zipping:

- remove `node_modules`
- remove `.next`
- remove container build caches if any
