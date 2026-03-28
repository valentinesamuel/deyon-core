# ── Stage 1: Install dependencies ────────────────────────────────────────────
FROM node:24-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ── Stage 3: Production runtime ───────────────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app

# Non-secret build-time config (override with --build-arg at build time)
ARG APP_PORT=5200
ARG NODE_ENV=production
ENV APP_PORT=${APP_PORT}
ENV NODE_ENV=${NODE_ENV}

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/dist ./dist

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE ${APP_PORT}

CMD ["node", "dist/main"]
