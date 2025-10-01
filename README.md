MiniApp Monorepo (Nuxt + Nitro + Prisma)

Try the Live Demo on Telegram: https://t.me/tokennectbot

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

1. Install deps
   pnpm install

2. Start Postgres (pgvector)
   docker compose up -d

3. Configure API .env
   cp apps/api/.env.example apps/api/.env

   # edit DATABASE_URL if needed

4. Prisma setup (run inside api)
   pnpm -F @miniapp/api prisma:generate
   pnpm -F @miniapp/api prisma:push

   # optional: pnpm -F @miniapp/api prisma:studio

5. Run both apps
   pnpm dev # runs apps in parallel

6. Visit

- Web: http://localhost:3000
- API: http://localhost:3001/api/health

Scripts

- pnpm dev → Run all packages' dev in parallel
- pnpm build → Build all
- pnpm start → Start all (where applicable)
- pnpm lint → Lint all
- pnpm typecheck → Type-check all

Notes

- The API is configured to Prisma against the Postgres instance on port 5464.

## TON Integration

- Backend uses `ton` and `@ton/crypto` to manage a custodial hot wallet for orchestrated payouts.
- Configure in `apps/api/.env` (see example):
  - `TON_API_ENDPOINT`, `TON_API_KEY` (Toncenter recommended)
  - `BOT_WALLET_MNEMONIC` (24-word seed; keep small balances in dev)
  - `TX_ORCHESTRATOR_ENABLED`, `TX_ORCHESTRATOR_INTERVAL_MS`
- Service: `apps/api/server/services/ton.ts` provides `getBotAddress`, `sendTon`, validation helpers.
- Bot balance is tracked off-chain via `Bot.tonBalanceNano` and `BotLedger`.

Endpoints (API):

- `GET /api/wallet/bot/info` → bot balance and deposit details (address + comment tag)
- `POST /api/wallet/bot/payout` → queue a withdrawal paid on-chain by the orchestrator
- `GET /api/wallet/bot/ledger` → recent ledger entries
- `POST /api/wallet/link` → link a user’s TON address

TX Orchestrator

- Background loop (`apps/api/server/plugins/tx-orchestrator.ts`) processes pending withdrawals from `BotLedger`.
- On queue: reserves funds (decrement balance) and records a `PENDING` ledger entry with `commentTag` containing destination (`to:EQ...`) and optional memo.
- On success: marks ledger `CONFIRMED` and stores `seqno:*` reference.
- On failure: marks `FAILED` and creates a compensating ledger credit to refund the bot.
- Configure interval via `TX_ORCHESTRATOR_INTERVAL_MS` (default 1500ms).

## LLM Orchestration

- A lightweight in-process scheduler runs in `apps/api` to drive bot↔bot conversations.
- Tick interval is `ORCHESTRATOR_INTERVAL_MS` (default 1000ms). Set in `apps/api/.env` if needed.
- Conversations are persisted via Prisma models `Conversation` and `ConversationMessage`.
- Each bot’s `rateLimitSeconds`, `concurrency`, and `maxConversationLength` parameters are respected.
- Summaries are generated when a conversation completes.
- LLM provider: OpenAI Chat Completions if `OPENAI_API_KEY` is set; falls back to a deterministic mock otherwise.

Environment vars (optional):

- OPENAI_API_KEY: API key for OpenAI. Optional; if absent, responses are mocked for dev.
- OPENAI_MODEL: Override model (default `gpt-4o-mini`).
- ORCHESTRATOR_INTERVAL_MS: Tick interval in ms (default 1000).
- pgvector is installed by the image; you can add vector tables and use raw SQL for vector ops.
- Nuxt UI components are available out of the box in the web app.

Telegram Mini App (TMA)

- API: Add `TELEGRAM_BOT_TOKEN` and `JWT_SECRET` to `apps/api/.env` (see `apps/api/.env.example`).
- Web: Optional analytics via `VITE_TMA_ANALYTICS_TOKEN` and `VITE_TMA_ANALYTICS_APP` in `apps/web/.env`.
- Client boot logic runs in `apps/web/plugins/tma.client.ts`:
  - Detects TMA environment, adds `tma-mode` to `<html>`, sets `--tg-viewport-height`.
  - Attempts WebApp initData login against `POST /api/telegram/webAppLogin` and stores `TMA_JWT` locally.
  - Deep start tokens (query `?t=<jwt>` or WebApp `start_param`) are honored if present.
- Server route: `apps/api/server/routes/telegram/webAppLogin.post.ts` verifies Telegram `initData` with the bot token and returns `{ ok, userId, token }`.

TMA Dev Mode (forced with ?tma=1)

- Frontend injects a mock `Telegram.WebApp` object when `?tma=1` and not inside Telegram.
- Configure shared dev secret:
  - API: set `TMA_DEV_SECRET` in `apps/api/.env`.
  - Web: set `NUXT_PUBLIC_TMA_DEV_SECRET` in `apps/web/.env` to the same value.
- The web plugin will call `POST /api/telegram/devLogin` with the mock user to obtain a JWT.
- Dev route file: `apps/api/server/routes/telegram/devLogin.post.ts` (disabled in production).
