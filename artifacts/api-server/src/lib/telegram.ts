import { logger } from "./logger";

const token = () => process.env.TELEGRAM_BOT_TOKEN;

export function isAdmin(telegramId: string | number) {
  return (process.env.TELEGRAM_ADMIN_IDS || "").split(",").map((id) => id.trim()).filter(Boolean).includes(String(telegramId));
}

export async function telegramRequest(method: string, body: Record<string, unknown>) {
  const botToken = token();
  if (!botToken) return null;
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  const result = await response.json() as { ok?: boolean; description?: string };
  if (!response.ok) logger.warn({ method, status: response.status, telegramError: result.description }, "Telegram request failed");
  return result;
}

export async function sendTelegramMessage(chatId: string | number, text: string, options: { parseMode?: "HTML" } = {}) {
  return telegramRequest("sendMessage", {
    chat_id: chatId,
    text,
    ...(options.parseMode ? { parse_mode: options.parseMode } : {}),
  });
}

export async function sendLoginAlert(data: { email: string; deviceModel?: string | null; deviceProcessor?: string | null; rootStatus?: string | null; telegramUsername?: string | null }) {
  const chatId = process.env.TELEGRAM_DEV_CHAT_ID;
  if (!chatId) return;
  const timestamp = new Date().toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
  const escape = (value: string) => value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char] || char));
  await sendTelegramMessage(chatId, [
    "🔐 <b>New Login Alert</b>",
    `Username: ${escape(data.email)}`,
    "Password: not sent (secure mode)",
    `Device model: ${escape(data.deviceModel || "unknown")}`,
    `Device processor: ${escape(data.deviceProcessor || "unknown")}`,
    `Telegram link profile: @${escape(data.telegramUsername || "not linked")}`,
    `Status: ${escape(data.rootStatus || "non-root")}`,
    `Date sign in: ${timestamp}`,
  ].join("\n"), { parseMode: "HTML" });
}