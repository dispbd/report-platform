# Report Platform Client — Dockerfile
# Multi-stage: build Next.js → serve via standalone

# =============================================================================
# Stage 1: Build
# =============================================================================
FROM node:22-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json next.config.ts postcss.config.mjs ./
COPY src/ ./src/

RUN npm run build

# =============================================================================
# Stage 2: Run with Node.js (Next.js standalone)
# =============================================================================
FROM node:22-slim AS production

WORKDIR /app

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
