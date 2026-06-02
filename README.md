# shadcn/ui monorepo template

Next.js monorepo with shadcn/ui, a local Postgres database (`packages/db`), and two apps:

| App | Purpose | Docker port |
| --- | --- | --- |
| `apps/web` | UI template / demo | `3000` |
| `apps/vercel-env-updater` | Vercel env sync tool (uses Prisma + Postgres) | `3001` |

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Bun](https://bun.sh) (for installing deps, `db:push`, and local dev)

## Quick start with Docker

Run these from the **repository root**.

### 1. Shared Docker network

```bash
docker network create vercel-net
```

If the network already exists, Docker prints an error — that is fine.

### 2. PostgreSQL (start first)

**Option A — custom image from `packages/db/Dockerfile` (recommended in this repo):**

```bash
docker build -t vercel-postgres:18 -f packages/db/Dockerfile packages/db

docker run -d --name vercel-db --network vercel-net \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=vercel_use_case \
  -p 5432:5432 \
  -v vercel_pgdata:/var/lib/postgresql \
  vercel-postgres:18
```

**Option B — one-liner via Bun (uses official `postgres:18` image):**

```bash
bun run --cwd packages/db db:up
docker network connect vercel-net vercel-db
```

Postgres is ready when:

```bash
docker exec vercel-db pg_isready -U postgres -d vercel_use_case
```

### 3. Apply database schema (host)

Containers use hostname `vercel-db` on the Docker network; from your machine use `localhost`:

```bash
bun install
cp packages/db/.env.example packages/db/.env
bun run --cwd packages/db db:generate
bun run --cwd packages/db db:push
```

### 4. Build and run Next.js apps

**`vercel-env-updater` (needs `DATABASE_URL`):**

```bash
docker build -f apps/vercel-env-updater/Dockerfile -t vercel-env-updater:latest .

docker run -d --name vercel-env-updater --network vercel-net \
  -e DATABASE_URL="postgresql://postgres:postgres@vercel-db:5432/vercel_use_case?schema=public" \
  -p 3001:3000 \
  vercel-env-updater:latest
```

Open http://localhost:3001

**`web`:**

```bash
docker build -f apps/web/Dockerfile -t vercel-web:latest .

docker run -d --name vercel-web --network vercel-net \
  -p 3000:3000 \
  vercel-web:latest
```

Open http://localhost:3000

### 5. Root shortcuts (build images only)

```bash
bun run docker:db:build
bun run docker:env-updater:build
bun run docker:web:build
```

Per-app scripts (from each app folder):

```bash
bun run --cwd apps/vercel-env-updater docker:build
bun run --cwd apps/vercel-env-updater docker:run

bun run --cwd apps/web docker:build
bun run --cwd apps/web docker:run
```

### Stop and clean up

```bash
docker stop vercel-env-updater vercel-web vercel-db
docker rm vercel-env-updater vercel-web vercel-db
# Data volume persists until removed:
# docker volume rm vercel_pgdata
```

## Local development (without app containers)

```bash
bun install
bun run --cwd packages/db db:up
bun run --cwd packages/db db:push
bun run dev
```

Turbo runs all apps; `vercel-env-updater` expects `apps/vercel-env-updater/.env.local` with:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/vercel_use_case?schema=public"
```

## Adding components

From the repo root:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

Components are added under `packages/ui/src/components`.

## Using components

```tsx
import { Button } from "@workspace/ui/components/button";
```

## Docker layout

```
packages/db/Dockerfile              → Postgres 18 (run first)
apps/vercel-env-updater/Dockerfile  → Next.js standalone (port 3001)
apps/web/Dockerfile                 → Next.js standalone (port 3000)
```

Build context for app images is always the **monorepo root** (`.`), not the app folder alone.