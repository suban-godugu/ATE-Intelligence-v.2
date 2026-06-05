# Multi-stage build for Next.js 14 Web Frontend
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

# Copy source and config files
COPY frontend/ ./frontend/

# Set env to build next.js statically
ENV NEXT_TELEMETRY_DISABLED=1
RUN cd frontend && npm run build

# Stage 2: production runner
FROM node:20-alpine AS runner
WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3000

# Copy built code, package definitions, and node_modules
COPY --from=builder /usr/src/app/frontend/package*.json ./frontend/
COPY --from=builder /usr/src/app/frontend/.next ./frontend/.next
COPY --from=builder /usr/src/app/frontend/node_modules ./frontend/node_modules
COPY --from=builder /usr/src/app/frontend/public ./frontend/public
COPY --from=builder /usr/src/app/frontend/next.config.mjs ./frontend/

EXPOSE 3000

CMD cd frontend && npm start
