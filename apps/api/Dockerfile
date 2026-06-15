# syntax=docker/dockerfile:1
# Build context MUST be the repo root (pnpm workspace). In Railway set the
# service Root Directory to "/" and Dockerfile Path to apps/api/Dockerfile.
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

# Install full workspace (frozen lockfile needs every workspace member present,
# so copy the whole repo — partial copies break --frozen-lockfile).
FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
# Typecheck/compile to catch errors early (runtime still uses tsx, see below).
RUN pnpm --filter @cav/api build

# Runtime: run TypeScript directly with tsx because @cav/db is consumed as raw
# .ts source (its package exports point at ./src/index.ts), which plain
# `node dist/index.js` cannot resolve.
FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 8787
CMD ["sh", "-c", "cd apps/api && exec node_modules/.bin/tsx src/index.ts"]
