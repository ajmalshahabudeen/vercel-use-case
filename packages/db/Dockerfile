# PostgreSQL 18 Dockerfile for local persisted development database
# Compatible with postgres:18+ image data directory requirements.
#
# IMPORTANT (Postgres 18+):
# Mount your volume at the PARENT directory (/var/lib/postgresql), not directly at /data.
# The official image expects versioned data directories under /var/lib/postgresql.
#
# Recommended usage (see package.json "db:up"):
#   -v vercel_pgdata:/var/lib/postgresql
#
# This allows clean major version upgrades in the future using pg_upgrade --link.

FROM postgres:18

# Default environment variables (override at runtime with -e or .env)
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=postgres
ENV POSTGRES_DB=vercel_use_case

# Recommended PGDATA location when mounting the volume at /var/lib/postgresql
# This satisfies the postgres:18+ image's expectations about data directory layout.
ENV PGDATA=/var/lib/postgresql/data

# Optional: tune postgres for dev (uncomment if desired)
# RUN echo "shared_buffers = 128MB" >> /etc/postgresql/postgresql.conf || true

# Healthcheck to verify postgres is ready
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" || exit 1

# Expose the default postgres port
EXPOSE 5432

# Default command is provided by the base postgres image (postgres server)
CMD ["postgres"]