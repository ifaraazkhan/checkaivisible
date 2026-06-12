# checkaivisible.com

> The only AI-visibility tool built for local restaurant owners.
> See if ChatGPT and Gemini recommend your business when people search your category in your city.

**Status:** v1 in development. See [`Planning/v1-plan.md`](Planning/v1-plan.md) for the full plan.

---

## Monorepo layout

```
apps/
  web/    Next.js 15 frontend (deploys to Vercel)
  api/    Hono backend + workers (deploys to Railway)
packages/
  db/     Drizzle ORM schema (shared between api + scripts)
Planning/
  v1-plan.md             ← single source of truth
  core-idea.md           ← original LLM-generated draft (do not trust)
  design-research.md     ← original LLM-generated draft (do not trust)
```

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Provision external services (see Planning/v1-plan.md §12)
#    - Railway: create Postgres + Node service
#    - Vercel: create project linked to apps/web
#    - OpenAI, Gemini, Resend, Cloudflare Turnstile, Google Places: get API keys

# 3. Copy env example and fill in your keys
cp .env.example apps/web/.env.local
cp .env.example apps/api/.env

# 4. Push schema to your Postgres
pnpm db:generate
pnpm db:migrate

# 5. Run both dev servers (in separate terminals)
pnpm dev:api    # → http://localhost:8787
pnpm dev:web    # → http://localhost:3000
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev:web` | Next.js dev server (port 3000) |
| `pnpm dev:api` | Hono dev server (port 8787) |
| `pnpm build:web` | Production build of frontend |
| `pnpm build:api` | Production build of backend |
| `pnpm db:generate` | Generate SQL migrations from Drizzle schema |
| `pnpm db:migrate` | Apply migrations to `DATABASE_URL` |
| `pnpm db:studio` | Open Drizzle Studio (DB inspector) |
| `pnpm typecheck` | Type-check all packages |

## Deployment

- **Frontend (`apps/web`)** → Vercel. Set root directory to `apps/web` in Vercel project settings.
- **Backend (`apps/api`)** → Railway. Root directory `apps/api`. Build: `pnpm install && pnpm build`. Start: `node dist/index.js`.
- **Database** → Railway Postgres add-on. `DATABASE_URL` is auto-injected.

See [`Planning/v1-plan.md`](Planning/v1-plan.md) §6 for the full architecture rationale.
