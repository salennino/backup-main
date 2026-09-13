import { Router } from "express";
import { pool } from "@workspace/db";
import { GetTelegramLinkResponse, TelegramWebhookBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { newId } from "../lib/auth";
import { generateAssistantReply } from "../lib/groq";
import { isAdmin, sendTelegramMessage, telegramRequest } from "../lib/telegram";

const router = Router();
const claimAttempts = new Map<string, number[]>();

function allowedClaim(chatId: string) {
  const now = Date.now();
  const recent = (claimAttempts.get(chatId) || []).filter((timestamp) => now - timestamp < 60_000);
  if (recent.length >= 5) return false;
  recent.push(now);
  claimAttempts.set(chatId, recent);
  return true;
}

router.get("/v1/telegram/link", requireAuth, async (req, res) => {
  const token = newId("link");
  await pool.query("insert into regieren_telegram_links (token, user_id, expires_at) values ($1, $2, now() + interval '15 minutes')", [token, req.sessionUser!.userId]);
  res.json(GetTelegramLinkResponse.parse({ token, botConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN) }));
});

router.post("/v1/telegram/unlink", requireAuth, async (req, res) => {
  await pool.query("update regieren_users set telegram_id = null, telegram_username = null, telegram_linked_at = null where user_id = $1", [req.sessionUser!.userId]);
  res.json({ message: "Telegram unlinked." });
});

router.post("/v1/telegram/webhook", async (req, res) => {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expected && req.header("X-Telegram-Bot-Api-Secret-Token") !== expected) return res.status(401).json({ error: "Invalid webhook secret." });
  const parsed = TelegramWebhookBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid update." });
  const update = parsed.data as { message?: { chat?: { id?: number }; from?: { id?: number; username?: string }; text?: string; caption?: string; document?: { file_id?: string; file_name?: string } } };
  const message = update.message;
  const chatId = message?.chat?.id;
  const fromId = message?.from?.id;
  const text = (message?.text || message?.caption || "").trim();
  if (!chatId || !fromId) return res.json({ message: "Ignored." });
  const admin = isAdmin(fromId);
  if (text.startsWith("/start")) {
    const linkToken = text.split(/\s+/)[1];
    if (linkToken) {
      const link = (await pool.query("select * from regieren_telegram_links where token = $1 and expires_at > now()", [linkToken])).rows[0];
      if (link) {
        await pool.query("update regieren_users set telegram_id = $1, telegram_username = $2, telegram_linked_at = now() where user_id = $3", [String(fromId), message?.from?.username || null, link.user_id]);
        await pool.query("delete from regieren_telegram_links where token = $1", [linkToken]);
        await sendTelegramMessage(chatId, "Telegram connected. You can now claim files with /claim <serial>.");
      } else {
        await sendTelegramMessage(chatId, "That link has expired. Generate a new one from your dashboard.");
      }
    } else {
      await sendTelegramMessage(chatId, admin ? "Welcome to Regieren AI.\n\nAvailable commands:\n/start, /help, /claim <serial>\n\nAdmin commands:\n/upload, /allowlist, /list, /revoke, /users, /devs" : "Welcome to Regieren AI.\n\nUse /claim <serial> to claim a premium file, or chat with me anytime.");
    }
    return res.json({ message: "Handled." });
  }
  if (text === "/help") {
    return sendTelegramMessage(chatId, admin ? "Available commands:\n/start, /help, /claim <serial>\n\nAdmin commands:\n/upload <serial> <yes|no> (attach file)\n/allowlist add|remove|list\n/list, /revoke <serial>, /users, /devs" : "Available commands:\n/start — welcome\n/help — this message\n/claim <serial> — claim your premium file\n\nChat with me anytime.").then(() => res.json({ message: "Handled." }));
  }
  if (text.startsWith("/")) {
    if (!admin && !text.startsWith("/claim")) return sendTelegramMessage(chatId, "Unknown command.").then(() => res.json({ message: "Handled." }));
    if (text.startsWith("/claim")) {
      if (!allowedClaim(String(chatId))) {
        await sendTelegramMessage(chatId, "Too many claim attempts. Try again in a minute.");
        return res.json({ message: "Handled." });
      }
      const serial = text.split(/\s+/)[1];
      const file = serial ? (await pool.query("select * from regieren_premium_files where serial = $1", [serial])).rows[0] : null;
      const user = (await pool.query("select * from regieren_users where telegram_id = $1", [String(fromId)])).rows[0];
      const allowlisted = file && (await pool.query("select 1 from regieren_allowlist_serial where serial = $1", [file.serial])).rowCount;
      if (!file) await sendTelegramMessage(chatId, "Invalid serial.");
      else if (file.claimed_by) await sendTelegramMessage(chatId, "Serial already used.");
      else if (!user) await sendTelegramMessage(chatId, "Connect Telegram from your dashboard before claiming a file.");
      else if (file.is_dev_only && (!admin || !allowlisted)) await sendTelegramMessage(chatId, "This serial is restricted.");
      else {
        await pool.query("update regieren_premium_files set claimed_by = $1, claimed_at = now() where serial = $2", [user.user_id, file.serial]);
        await pool.query("insert into regieren_claims (id, user_id, serial, file_id, file_name) values ($1, $2, $3, $4, $5)", [newId("claim"), user.user_id, file.serial, file.file_id, file.file_name]);
        await sendTelegramMessage(chatId, `Claimed: ${file.file_name}`);
        await telegramRequest("sendDocument", { chat_id: chatId, document: file.file_id });
      }
      return res.json({ message: "Handled." });
    }
    if (text.startsWith("/upload")) {
      const document = message?.document;
      const [, serial, devOnly] = text.split(/\s+/);
      if (!serial || !document?.file_id || !["yes", "no"].includes(devOnly || "")) await sendTelegramMessage(chatId, "Usage: /upload <serial> <yes|no> with a file attached.");
      else {
        await pool.query("insert into regieren_premium_files (serial, file_id, file_name, uploaded_by, is_dev_only) values ($1, $2, $3, $4, $5) on conflict (serial) do update set file_id = excluded.file_id, file_name = excluded.file_name, uploaded_by = excluded.uploaded_by, is_dev_only = excluded.is_dev_only", [serial, document.file_id, document.file_name || "premium-file", String(fromId), devOnly === "yes"]);
        await sendTelegramMessage(chatId, `Uploaded. Serial: ${serial}`);
      }
    } else if (text.startsWith("/allowlist")) {
      const [, action, serial, ...noteParts] = text.split(/\s+/);
      if (action === "add" && serial) {
        await pool.query("insert into regieren_allowlist_serial (serial, added_by, note) values ($1, $2, $3) on conflict (serial) do update set note = excluded.note", [serial, String(fromId), noteParts.join(" ") || null]);
        await sendTelegramMessage(chatId, "Allowlisted.");
      } else if (action === "remove" && serial) {
        await pool.query("delete from regieren_allowlist_serial where serial = $1", [serial]);
        await sendTelegramMessage(chatId, "Removed from allowlist.");
      } else if (action === "list") {
        const rows = await pool.query("select serial, note from regieren_allowlist_serial order by added_at desc");
        await sendTelegramMessage(chatId, rows.rows.length ? rows.rows.map((row) => `${row.serial}${row.note ? ` — ${row.note}` : ""}`).join("\n") : "Allowlist is empty.");
      } else await sendTelegramMessage(chatId, "Usage: /allowlist add <serial> [note], /allowlist remove <serial>, or /allowlist list");
    } else if (text === "/list") {
      const rows = await pool.query("select serial, file_name, claimed_by from regieren_premium_files order by uploaded_at desc");
      await sendTelegramMessage(chatId, rows.rows.length ? rows.rows.map((row) => `${row.serial} — ${row.file_name} — ${row.claimed_by ? "claimed" : "available"}`).join("\n") : "No premium files uploaded.");
    } else if (text.startsWith("/revoke")) {
      const serial = text.split(/\s+/)[1];
      if (!serial) await sendTelegramMessage(chatId, "Usage: /revoke <serial>");
      else {
        await pool.query("update regieren_premium_files set claimed_by = null, claimed_at = null where serial = $1", [serial]);
        await pool.query("delete from regieren_claims where serial = $1", [serial]);
        await sendTelegramMessage(chatId, "Claim revoked.");
      }
    } else if (text === "/users") {
      const rows = await pool.query("select user_id, email, plan from regieren_users order by created_at desc limit 50");
      await sendTelegramMessage(chatId, rows.rows.length ? rows.rows.map((row) => `${row.user_id} — ${row.email} — ${row.plan}`).join("\n") : "No registered users.");
    } else if (text === "/devs") {
      await sendTelegramMessage(chatId, `Admin IDs: ${process.env.TELEGRAM_ADMIN_IDS || "none configured"}`);
    } else {
      await sendTelegramMessage(chatId, "Unknown command.");
    }
    return res.json({ message: "Handled." });
  }
  const linked = (await pool.query("select * from regieren_users where telegram_id = $1", [String(fromId)])).rows[0];
  const reply = await generateAssistantReply(text, [], linked?.email || "guest");
  await sendTelegramMessage(chatId, reply);
  return res.json({ message: "Handled." });
});

export default router;