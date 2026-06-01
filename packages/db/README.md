# @workspace/db

Shared database package using Prisma ORM + PostgreSQL.

## Setup

1. Start the persisted local Postgres 18 (first time creates named docker volume `vercel_pgdata` so data survives container restarts):

   ```bash
   bun run db:up
   ```

   - Image: uses official `postgres:18`
   - Credentials (default):
     - User: `postgres`
     - Pass: `postgres`
     - DB: `vercel_use_case`
     - Port: `5432`
   - Connection string (used by Prisma): `postgresql://postgres:postgres@localhost:5432/vercel_use_case?schema=public`

2. Copy env example and adjust if needed:

   ```bash
   cp .env.example .env
   ```

3. Install deps (from root): `bun install`

4. Generate Prisma Client (required after schema changes or first clone):

   ```bash
   bun run db:generate
   # or
   bun run build
   ```

## Available Scripts

- `db:up` – Start (or create) the persisted Postgres 18 container
- `db:down` – Stop the container (data persists in volume)
- `db:logs` – Tail container logs
- `db:build` – (Optional) Build custom image from local Dockerfile
- `db:generate` – Generate Prisma Client
- `db:push` – Push schema changes without migration (dev)
- `db:migrate` – Create and apply migration
- `db:studio` – Open Prisma Studio GUI
- `db:reset` – Remove container (volume stays unless you manually `docker volume rm -f vercel_pgdata`)

## Usage in apps / packages

```ts
import { prisma, PrismaClient } from '@workspace/db'

// Use the singleton
await prisma.user.findMany()
```

## Dockerfile

A `Dockerfile` based on `postgres:18` is provided for customization (add extensions, init scripts, healthchecks, etc.). Build it with `bun run db:build` then update the `db:up` script to reference your custom image tag if desired.

## Notes

- Uses modern Prisma "prisma-client" generator + driver adapter (`@prisma/adapter-pg` + `pg`) for direct Postgres connections.
- Schema lives in `prisma/schema.prisma`.
- Add your models there, then run migrations.
- For production, provide `DATABASE_URL` via your platform (Neon, Supabase, Vercel Postgres, etc.).
