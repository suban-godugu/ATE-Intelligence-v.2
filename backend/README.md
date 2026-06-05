# Compty ATE Backend (NestJS)

This directory houses the NestJS microservices and API gateways for the Compty ATE Yield Optimization platform.

For the complete infrastructure setup, database migration, and verification instructions, please refer to the master [README.md](../README.md) in the workspace root directory.

## Master Setup Sequence Quick Reference:

1. **Configure Variables**:
   ```bash
   cp .env.example .env
   ```
2. **Start Database Containers**:
   ```bash
   docker-compose up -d postgres minio
   ```
3. **Deploy Schema**:
   ```bash
   npx prisma migrate deploy
   ```
4. **Verify Storage Connections**:
   ```bash
   npm run storage:verify
   ```
5. **Start Orchestrated Stack**:
   ```bash
   docker-compose up -d
   ```
6. **Migrate Base64 Data**:
   ```bash
   npm run storage:migrate
   ```
