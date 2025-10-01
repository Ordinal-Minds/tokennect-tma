MiniApp Monorepo (Nuxt + Nitro + Prisma)

This is a pnpm-based Apps & Packages monorepo with:
- apps/web → Nuxt 3 + Nuxt UI + Tailwind (strict TS)
- apps/api → Nitro server with Prisma (strict TS)
- packages/types → Shared TypeScript types

Includes Docker Compose for PostgreSQL with pgvector.

Prereqs
- Node 18.18+ (Node 20+ recommended)
- pnpm 9+
- Docker Desktop or compatible runtime

Getting Started
1) Install deps
   pnpm install

2) Start Postgres (pgvector)
   docker compose up -d

3) Configure API .env
   cp apps/api/.env.example apps/api/.env
   # edit DATABASE_URL if needed

4) Prisma setup (run inside api)
   pnpm -F @miniapp/api prisma:generate
   pnpm -F @miniapp/api prisma:migrate
   # optional: pnpm -F @miniapp/api prisma:studio

5) Run both apps
   pnpm dev    # runs apps in parallel

6) Visit
- Web: http://localhost:3000
- API: http://localhost:3001/api/health

Scripts
- pnpm dev          → Run all packages' dev in parallel
- pnpm build        → Build all
- pnpm start        → Start all (where applicable)
- pnpm lint         → Lint all
- pnpm typecheck    → Type-check all

Notes
- The API is configured to Prisma against the Postgres instance on port 5464.
- pgvector is installed by the image; you can add vector tables and use raw SQL for vector ops.
- Nuxt UI components are available out of the box in the web app.

