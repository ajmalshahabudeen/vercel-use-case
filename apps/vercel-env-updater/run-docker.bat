@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   Vercel Environment Updater Docker Runner
echo ===================================================

:: Ensure Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running or docker CLI is not in PATH.
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

:: Resolve paths relative to this script's directory
set "SCRIPT_DIR=%~dp0"
for %%I in ("%~dp0..\..") do set "ROOT_DIR=%%~fI"

:: Create shared Docker network if it doesn't exist
docker network inspect vercel-net >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Creating Docker network 'vercel-net'...
    docker network create vercel-net
) else (
    echo [INFO] Docker network 'vercel-net' already exists.
)

:: Check if Postgres db container is running
echo [INFO] Checking PostgreSQL database container...
docker ps --filter "name=vercel-db" --filter "status=running" | findstr "vercel-db" >nul
if %errorlevel% equ 0 (
    echo [SUCCESS] PostgreSQL container 'vercel-db' is already running.
) else (
    :: Check if it exists but is stopped
    docker ps -a --filter "name=vercel-db" | findstr "vercel-db" >nul
    if !errorlevel! equ 0 (
        echo [INFO] Starting stopped PostgreSQL container 'vercel-db'...
        docker start vercel-db
    ) else (
        echo [INFO] PostgreSQL container 'vercel-db' does not exist.
        echo [INFO] Building vercel-postgres:18 from packages/db/Dockerfile...
        docker build -t vercel-postgres:18 -f "%ROOT_DIR%\packages\db\Dockerfile" "%ROOT_DIR%\packages\db"
        if !errorlevel! neq 0 (
            echo [ERROR] Failed to build database image.
            pause
            exit /b 1
        )
        echo [INFO] Starting PostgreSQL container 'vercel-db'...
        docker run -d --name vercel-db --network vercel-net ^
          -e POSTGRES_USER=postgres ^
          -e POSTGRES_PASSWORD=postgres ^
          -e POSTGRES_DB=vercel_use_case ^
          -p 5432:5432 ^
          -v vercel_pgdata:/var/lib/postgresql ^
          vercel-postgres:18
    )
)

:: Ensure vercel-db is connected to the shared network vercel-net
docker network connect vercel-net vercel-db >nul 2>&1

:: Wait for Postgres to be fully ready
echo [INFO] Waiting for PostgreSQL to be ready to accept connections...
:wait_postgres
docker exec vercel-db pg_isready -U postgres -d vercel_use_case >nul 2>&1
if %errorlevel% neq 0 (
    timeout /t 2 /nobreak >nul
    goto wait_postgres
)
echo [SUCCESS] PostgreSQL is ready.

:: Push DB schema using host Bun if available
where bun >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Bun detected on host. Pushing Prisma schema to PostgreSQL...
    
    :: Ensure packages/db/.env exists for the push to succeed from host
    if not exist "%ROOT_DIR%\packages\db\.env" (
        if exist "%ROOT_DIR%\packages\db\.env.example" (
            echo [INFO] Copying .env.example to .env in packages/db...
            copy "%ROOT_DIR%\packages\db\.env.example" "%ROOT_DIR%\packages\db\.env" >nul
        )
    )
    
    call bun run --cwd "%ROOT_DIR%\packages\db" db:generate
    call bun run --cwd "%ROOT_DIR%\packages\db" db:push
) else (
    echo [WARNING] Bun was not found in your PATH.
    echo [WARNING] Ensure you run 'bun run --cwd packages/db db:push' on your host to initialize the database tables.
)

:: Stop and remove existing vercel-env-updater container if it exists
docker ps -a --filter "name=vercel-env-updater" | findstr "vercel-env-updater" >nul
if %errorlevel% equ 0 (
    echo [INFO] Stopping and removing existing 'vercel-env-updater' container...
    docker stop vercel-env-updater >nul 2>&1
    docker rm vercel-env-updater >nul 2>&1
)

:: Build Next.js app image
echo [INFO] Building vercel-env-updater image...
docker build -f "%SCRIPT_DIR%Dockerfile" -t vercel-env-updater:latest "%ROOT_DIR%"
if %errorlevel% neq 0 (
    echo [ERROR] Failed to build vercel-env-updater image.
    pause
    exit /b 1
)

:: Run Next.js app container
echo [INFO] Starting vercel-env-updater container...
docker run -d --name vercel-env-updater --network vercel-net ^
  --dns 8.8.8.8 --dns 1.1.1.1 ^
  -e DATABASE_URL="postgresql://postgres:postgres@vercel-db:5432/vercel_use_case?schema=public" ^
  -p 3001:3000 ^
  vercel-env-updater:latest

if %errorlevel% neq 0 (
    echo [ERROR] Failed to start vercel-env-updater container.
    pause
    exit /b 1
)

echo ===================================================
echo   [SUCCESS] Vercel Environment Updater is running!
echo   Access URL: http://localhost:3001
echo ===================================================

:: Open the browser
start http://localhost:3001

pause
