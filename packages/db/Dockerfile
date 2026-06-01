# PostgreSQL 18 Dockerfile for local persisted development database
# Usage: docker build -t vercel-postgres:18 -f Dockerfile .
# Then use the "db:up" script in package.json which runs with named volume for data persistence

FROM postgres:18

# Default environment variables (override at runtime with -e or .env)
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=postgres
ENV POSTGRES_DB=vercel_use_case

# Optional: tune postgres for dev (uncomment if desired)
# RUN echo "shared_buffers = 128MB" >> /etc/postgresql/postgresql.conf || true

# Healthcheck to verify postgres is ready
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" || exit 1

# Expose the default postgres port
EXPOSE 5432

# Data directory will be persisted via docker volume mount (see package.json db:up)
# Example volume: -v vercel_pgdata:/var/lib/postgresql/data

# Default command is provided by the base postgres image (postgres server)
CMD ["postgres"]