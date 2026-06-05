# Compty ATE Yield Optimization Platform

Welcome to the Compty ATE (Automated Test Equipment) Wafer AI & Yield Optimization Platform.

## Smart Storage Architecture Setup Sequence

Follow this sequence to spin up containerized PostgreSQL and MinIO S3 object engines, apply database schemas, verify system integrity, and perform the data migration:

### 1. Configure Development Environment Variables
Copy the example environment template and configure database, Redis, and MinIO credentials:
```bash
cp .env.example .env
```
*(Make sure to fill in all security passwords and secret keys inside the newly created `.env` file.)*

### 2. Start Core Infrastructure Containers
Spin up containerized PostgreSQL and MinIO databases in the background:
```bash
docker-compose up -d postgres minio
```

### 3. Deploy Database Schema Migrations
Deploy Prisma database schemas and sync B-Tree index structures:
```bash
npx prisma migrate deploy
```

### 4. Verify Connection Engine Integrity
Verify PostgreSQL connections, MinIO S3 bucket autoprovisioning, and Redis health caches:
```bash
npm run storage:verify
```
*(Confirms live connectivity to PG database, confirms MinIO buckets are active, and reviews current routing stats.)*

### 5. Launch Full Orchestrated Web Applications
Start NestJS backend proxy, Next.js 14 frontend web dashboard, FastAPI vision engine, and Nginx rate-limiting gateways:
```bash
docker-compose up -d
```

### 6. Perform Base64 Data Migration
Perform the one-time, zero-data-loss base64-to-bytea storage migration:
```bash
npm run storage:migrate
```
*(Converts legacy base64 wafer maps to size-routed Postgres bytea and MinIO S3 objects safely.)*
