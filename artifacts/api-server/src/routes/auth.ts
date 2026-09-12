import { Router } from "express";
import { pool } from "@workspace/db";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { createToken, hashPassword, newUserId, verifyPassword } from "../lib/auth";
import { requireAuth } from "../middlewares/auth";
import { sendLoginAlert } from "../lib/telegram";

const router = Router();
const toUser = (row: Record<string, unknown>) => ({
  userId: row.user_id,
  email: row.email,
  plan: row.plan,
  deviceModel: row.device_model,
  deviceProcessor: row.device_processor,
  rootStatus: row.root_status,
  telegramUsername: row.telegram_username,
  telegramLinked: Boolean(row.telegram_id),
});

router.post("/v1/auth/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Email and a password of at least 8 characters are required." });
  const { email, password, deviceModel, deviceProcessor, rootStatus } = parsed.data;
  const userId = newUserId();
  try {
    const result = await pool.query(
      `insert into regieren_users (user_id, email, password_hash, device_model, device_processor, root_status)
       values ($1, lower($2), $3, $4, $5, $6) returning *`,
      [userId, email, hashPassword(password), deviceModel || null, deviceProcessor || null, rootStatus || null],
    );
    const row = result.rows[0];
    return res.status(201).json({ token: createToken({ userId, email: row.email, tokenVersion: 0 }), user: toUser(row) });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") return res.status(400).json({ error: "An account with that email already exists." });
    throw error;
  }
});

router.post("/v1/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter a valid email and password." });
  const result = await pool.query("select * from regieren_users where email = lower($1)", [parsed.data.email]);
  const row = result.rows[0];
  if (!row || !verifyPassword(parsed.data.password, row.password_hash)) return res.status(401).json({ error: "Email or password is incorrect." });
  await pool.query("update regieren_users set last_login = now() where user_id = $1", [row.user_id]);
  await sendLoginAlert(row);
  return res.json({ token: createToken({ userId: row.user_id, email: row.email, tokenVersion: row.token_version }), user: toUser(row) });
});

router.get("/v1/auth/me", requireAuth, async (req, res) => {
  const result = await pool.query("select * from regieren_users where user_id = $1", [req.sessionUser!.userId]);
  return res.json(toUser(result.rows[0]));
});

router.post("/v1/auth/logout", requireAuth, async (req, res) => {
  await pool.query("update regieren_users set token_version = token_version + 1 where user_id = $1", [req.sessionUser!.userId]);
  return res.json({ message: "Signed out." });
});

export default router;