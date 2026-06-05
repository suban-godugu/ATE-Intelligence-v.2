# Multi-stage build for NestJS backend
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Copy package files and Prisma schema
COPY backend/package*.json ./backend/
COPY db/prisma/schema.prisma ./db/prisma/

# Install dependencies in the backend subdirectory
RUN cd backend && npm ci

# Copy backend and shared AI module source files
COPY backend/ ./backend/
COPY ai/ ./ai/

# Generate Prisma Client and build NestJS project
RUN cd backend && npx prisma generate --schema=../db/prisma/schema.prisma
RUN cd backend && npm run build

# Stage 2: production runner
FROM node:20-alpine
WORKDIR /usr/src/app

# Copy built artifacts and production node_modules from builder
COPY --from=builder /usr/src/app/backend/dist ./backend/dist
COPY --from=builder /usr/src/app/backend/node_modules ./backend/node_modules
COPY --from=builder /usr/src/app/backend/package*.json ./backend/
COPY --from=builder /usr/src/app/db/prisma/schema.prisma ./db/prisma/
COPY --from=builder /usr/src/app/ai/ ./ai/

EXPOSE 3001

# Set active run commands: apply migrations and run NestJS server
CMD cd backend && npx prisma migrate deploy && node dist/main
