# Data Layer Product Requirements Document (PRD)
## Compty ATE Wafer AI & Yield Optimization Platform - Data Layer

---

## 1. Document Control & Scope

### 1.1 Introduction
This document defines the functional, non-functional, and technical requirements for the **Data Layer** of the ATE Test Analysis & Yield Optimization Platform. The storage tier uses a hybrid database setup:
*   **PostgreSQL**: Structured transactional and relational logging.
*   **MinIO**: Object storage for large binary files and unstructured log dumps.
*   **Redis**: Temporary cache store, background execution message queue, and real-time Pub/Sub broker.

---

## 2. Requirement IDs for PostgreSQL Storage (Relational Database)

PostgreSQL stores telemetry parameters, tester parameters, coordinate lists, and metrics calculated by AI agents.

| Requirement ID | Target Area / Model | Detailed Specifications |
| :--- | :--- | :--- |
| **REQ-DATA-PG-1.1** | Schema Migrations | Define schemas via Prisma. All migrations must be deployed using B-Tree indexing constraints. |
| **REQ-DATA-PG-1.2** | Wafer-to-Die Cascade | Deleting a `Wafer` record must execute a database CASCADE deletion on all associated `Die` and `WaferImage` entities. |
| **REQ-DATA-PG-1.3** | Coordinate Coordinates | Die coordinate combinations `(waferId, x, y)` must be bound by a compound unique index constraint to prevent telemetry duplicates. |
| **REQ-DATA-PG-1.4** | Indexing Constraints | Provide optimized indexes for high-frequency search lookups: <ul><li>`Lot(fabId, status)`</li><li>`Die(waferId)`</li><li>`TestResult(dieId, patternId)`</li><li>`WaferImage(waferId, imageType)`</li></ul> |
| **REQ-DATA-PG-1.5** | Decimal Scaling | Financial indicators inside `DashboardSnapshot` must use Decimal data structures with precise scaling limits: <ul><li>`totalTestCost`: `Decimal(12, 2)`</li><li>`costPerWafer`: `Decimal(10, 4)`</li><li>`costPerDie`: `Decimal(10, 6)`</li></ul> |
| **REQ-DATA-PG-1.6** | Job Status Handling | `OptimizationJob` execution records must follow transactional state tracking via Enum limits: `QUEUED` $\rightarrow$ `RUNNING` $\rightarrow$ `COMPLETE` / `FAILED`. |
| **REQ-DATA-PG-1.7** | Historical Archiving | Aggegrated telemetry summaries must be archived in `DashboardSnapshot` tables to avoid scanning millions of `TestResult` rows on daily summaries. |

---

## 3. Requirement IDs for Redis Storage (Caching & Queue)

Redis manages high-concurrency API performance, websocket event publishing, and background worker queues.

| Requirement ID | Target Area / Feature | Detailed Specifications |
| :--- | :--- | :--- |
| **REQ-DATA-RD-2.1** | Connection Pooling | Limit client connection pool allocations to a maximum of 10 concurrent pools, with a checkout timeout constraint of 30 seconds. |
| **REQ-DATA-RD-2.2** | Task Queue Storage | Back the NestJS Bull and Celery queue state parameters in Redis, keeping job metadata parameters intact under network failures. |
| **REQ-DATA-RD-2.3** | WebSockets Pub/Sub | Broadcast live worker status changes (e.g. file parsing progress) using Redis Pub/Sub channels to the Next.js frontend gateway. |
| **REQ-DATA-RD-2.4** | Caching Retention | Session configurations and API routing cache parameters must have an automatic TTL (Time-To-Live) expiration of **15 minutes**. |

---

## 4. Requirement IDs for MinIO Storage (Object Storage)

MinIO handles large binary archives, diagnostic files, and machine-learning models.

| Requirement ID | Target Area / Bucket | Detailed Specifications |
| :--- | :--- | :--- |
| **REQ-DATA-MO-3.1** | Bucket Allocation | Ingestion pipelines must store unstructured files in partitioned buckets: <ul><li>`raw-ate-logs`: Text reports from test hardware</li><li>`wafer-images`: Defect mask PNGs and overlays</li><li>`model-weights`: PyTorch/U-Net weight files</li></ul> |
| **REQ-DATA-MO-3.2** | Secure Key References | Direct URL file access to MinIO is prohibited. Files must be retrieved by mapping standard UUID string parameters (`storageKey`) stored in database tables. |
| **REQ-DATA-MO-3.3** | Auto-Provisioning | On start verification routines (`npm run storage:verify`), the system must auto-provision missing MinIO buckets if they do not exist. |
| **REQ-DATA-MO-3.4** | Clean Migration | Support automated Base64 to binary conversions (`npm run storage:migrate`) when migrating coordinates from legacy raw text files. |

---

## 5. Non-Functional Requirements (NFR) for the Data Layer

| Requirement ID | Category | Performance & Security Targets |
| :--- | :--- | :--- |
| **NFR-DATA-1.1** | Ingestion Latency | Writing 10,000 parsed test coordinates into the database via batch transaction queries must execute in **less than 1.5 seconds**. |
| **NFR-DATA-1.2** | High Availability | Database data volumes must map to physical folders outside Docker networks to prevent telemetry losses on container rebuilds. |
| **NFR-DATA-1.3** | Query Rate Limits | Database read routines must support cursor pagination. Batch queries of `TestResult` coordinates must carry strict capping limits (max **1,000 rows per request**). |
