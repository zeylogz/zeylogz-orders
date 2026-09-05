# ---------------------------------------------------------------------------
# Zeylogz Orders — Dockerfile
# Multi-tenant WhatsApp Ordering Platform by Zeylogz
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3 native compilation
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runner

WORKDIR /app

# SQLite runtime libraries
RUN apk add --no-cache libstdc++

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/ordering.db

COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY src/ ./src/

# Ensure persistent data directory exists
RUN mkdir -p /app/data

# Mount persistent volume for SQLite database in production:
# docker run -v my-db-data:/app/data -p 3000:3000 zeylogz-orders
VOLUME ["/app/data"]

EXPOSE 3000

CMD ["node", "src/server.js"]
