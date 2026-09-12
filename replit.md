# Regieren AI

Regieren AI is a private assistant workspace with account access, persisted chat, Telegram linking, and premium file claims.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/regieren-ai run dev` — run the web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required runtime env: `DATABASE_URL` (managed), `SESSION_SECRET`
- Optional integrations: `GROQ_API_KEY`, `GROQ_MODEL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_DEV_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_ADMIN_IDS`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/regieren-ai` — React/Vite web experience
- `artifacts/api-server` — Express API and Telegram webhook
- `lib/api-spec/openapi.yaml` — API source of truth
- `lib/db/src/schema/regieren.ts` — PostgreSQL schema

## Architecture decisions

- The requested custom email/password login is implemented with scrypt-backed hashes and signed short-format session tokens.
- Login alerts never transmit plaintext passwords; the Telegram alert includes device and account metadata only.
- Groq and Telegram are optional at runtime so local auth, chat history, and claim UX remain usable without external credentials.
- Premium files store Telegram `file_id` metadata in PostgreSQL rather than copying file bytes into the database.

## Product

- Account registration and login with device context
- Assistant chat with persisted history and streaming responses
- URL-aware assistant prompts through the optional Groq integration
- Telegram linking, public claims, admin-only file commands, and developer-only serial allowlisting

## User preferences

- Keep the product scope limited to the attached Regieren AI brief.

## Gotchas

- Run API codegen after changing `lib/api-spec/openapi.yaml`.
- The web artifact requires workflow-provided `PORT` and `BASE_PATH` values.
- Telegram admin commands are hidden from non-admin users and depend on `TELEGRAM_ADMIN_IDS`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
