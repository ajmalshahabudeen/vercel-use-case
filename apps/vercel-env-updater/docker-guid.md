# Docker Guide: Vercel Environment Updater

This guide explains how to build, configure, run, and access the Vercel Environment Updater application using Docker.

---

## 📋 Prerequisites

Before starting, ensure you have the following installed:
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (ensure it is running)
- A running PostgreSQL instance connected to the same Docker network (or accessible from the container).

---

## 🚀 Quick Run (Windows)

You can use the automated Windows Batch script to check Docker, start or build the database, build the application image, run it, and launch your browser automatically:

```cmd
.\apps\vercel-env-updater\run-docker.bat
```

---

## 🛠️ Manual Step-by-Step Instructions

### Step 1: Create a Shared Docker Network

To allow the Next.js container to communicate with your PostgreSQL database container, create a shared network:

```bash
docker network create vercel-net
```
*(Note: If the network already exists, you can skip this step).*

### Step 2: Run the PostgreSQL Database Container

If you don't already have a database running on `vercel-net`, you can run a Postgres container with the following command:

```bash
docker run -d --name vercel-db --network vercel-net \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=vercel_use_case \
  -p 5432:5432 \
  -v vercel_pgdata:/var/lib/postgresql/data \
  postgres:18
```

Verify that the database is ready:
```bash
docker exec vercel-db pg_isready -U postgres -d vercel_use_case
```

> [!IMPORTANT]
> Ensure the database schema is pushed before starting the application container. You can do this by running `bun run --cwd packages/db db:push` from the host environment.

---

### Step 3: Build the Vercel Environment Updater Image

Build the Docker image from the **monorepo root directory**:

```bash
docker build -f apps/vercel-env-updater/Dockerfile -t vercel-env-updater:latest .
```

*Alternatively, you can run the shortcut script from the monorepo root:*
```bash
bun run docker:env-updater:build
```

---

### Step 4: Run the Application Container

Start the container and hook it up to the shared database network `vercel-net`:

```bash
docker run -d --name vercel-env-updater --network vercel-net \
  -e DATABASE_URL="postgresql://postgres:postgres@vercel-db:5432/vercel_use_case?schema=public" \
  -p 3001:3000 \
  vercel-env-updater:latest
```

### Environment Variables
| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | The PostgreSQL connection string for the database container | `postgresql://postgres:postgres@vercel-db:5432/vercel_use_case?schema=public` |
| `PORT` | The port the Node.js server listens to internally (defaults to `3000`) | `3000` |

---

## 🌐 How to Access the Application

Once the container is running successfully, you can access the application's user interface via your web browser:

👉 **URL:** [http://localhost:3001](http://localhost:3001)

---

## 🛑 Stopping and Cleaning Up

To stop and remove the containers when you're done:

```bash
# Stop the containers
docker stop vercel-env-updater vercel-db

# Remove the containers
docker rm vercel-env-updater vercel-db
```

To persist/delete the database volumes:
- The database volume `vercel_pgdata` persists automatically.
- To completely delete the volume and wipe database data: `docker volume rm vercel_pgdata`.
