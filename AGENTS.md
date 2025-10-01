Agent Notes for MiniApp Monorepo

Scope: repository root (apps/*, packages/*)

- Command execution: Prefer calling binaries directly (no "bash -lc" wrappers). Use pnpm workspace commands (e.g., `pnpm -F @miniapp/api ...`).
- Package manager: pnpm 9+. Do not use npm/yarn.
- TypeScript: strict across frontend and backend; extend `tsconfig.base.json`.
- Prisma (development workflow): Do not create migrations for dev. Use `prisma db push` to sync schema. A clean push is acceptable during development.
  - Scripts provided: `pnpm -F @miniapp/api prisma:generate`, `pnpm -F @miniapp/api prisma:push`, and `pnpm -F @miniapp/api prisma:push:clean`.
- Databases: Postgres with pgvector via Docker Compose (`docker compose up -d`).
- Ports: Web 3000, API 3001, Postgres 5464.

