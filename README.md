# Regieren AI

Regieren AI is a private AI assistant workspace with email/password accounts, device context, persisted chat, Telegram linking, and premium file claims.

## Run locally in Replit

The project uses the managed PostgreSQL database and two workflows:

```bash
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/regieren-ai run dev
```

For the complete workspace check:

```bash
pnpm run typecheck
```

## Environment

`DATABASE_URL` is managed by Replit. Set `SESSION_SECRET` with the Secrets pane. The following are optional:

- `GROQ_API_KEY` and `GROQ_MODEL` enable live Groq responses and URL summarization. The current default is `openai/gpt-oss-120b`.
- `TELEGRAM_BOT_TOKEN` enables the Telegram bot.
- `TELEGRAM_DEV_CHAT_ID` receives secure login metadata alerts.
- `TELEGRAM_WEBHOOK_SECRET` protects the webhook.
- `TELEGRAM_ADMIN_IDS` is a comma-separated list of Telegram user IDs with admin access. If it is omitted, `TELEGRAM_DEV_CHAT_ID` is used as the single admin ID.

Login alerts intentionally do not send or log plaintext passwords.

## Telegram setup

1. Create a bot with `@BotFather` and save the bot token as a Replit Secret.
2. Find your numeric chat ID with `@userinfobot`.
3. Add that ID to `TELEGRAM_ADMIN_IDS` and use it for `TELEGRAM_DEV_CHAT_ID` if you want login alerts.
4. Set the webhook to:

```text
https://<published-domain>/api/v1/telegram/webhook
```

Include the `X-Telegram-Bot-Api-Secret-Token` header value when registering the webhook if `TELEGRAM_WEBHOOK_SECRET` is set.

Users generate a short-lived link token in the dashboard, then open the bot with `/start <token>`. Once connected, `/claim <serial>` redeems a premium file. Admins can attach a file and send `/upload <serial> yes|no`, then manage the developer allowlist with `/allowlist add|remove|list`.

## Replit deployment

Run the typecheck, confirm both workflows are running, add the optional secrets you want to use, and publish the `Regieren AI` web artifact. Configure the Telegram webhook against the published domain after publishing.