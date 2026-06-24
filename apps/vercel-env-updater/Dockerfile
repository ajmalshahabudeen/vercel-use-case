# Build from monorepo root:
#   docker build -f apps/vercel-env-updater/Dockerfile -t vercel-env-updater:latest .
#
# Run (after Postgres is on network `vercel-net`):
#   docker run -d --name vercel-env-updater --network vercel-net \
#     -e DATABASE_URL="postgresql://postgres:postgres@vercel-db:5432/vercel_use_case?schema=public" \
#     -p 3001:3000 vercel-env-updater:latest

ARG BUN_VERSION=1.3.3
FROM oven/bun:${BUN_VERSION} AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock turbo.json ./
COPY apps/vercel-env-updater/package.json ./apps/vercel-env-updater/
COPY packages/db/package.json ./packages/db/
COPY packages/ui/package.json ./packages/ui/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
RUN bun install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://postgres:postgres@vercel-db:5432/vercel_use_case?schema=public"
RUN bun run build --filter=@workspace/db
RUN bun run build --filter=vercel-env-updater

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/vercel-env-updater/public ./apps/vercel-env-updater/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/vercel-env-updater/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/vercel-env-updater/.next/static ./apps/vercel-env-updater/.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "apps/vercel-env-updater/server.js"]