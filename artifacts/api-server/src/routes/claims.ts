import { Router } from "express";
import { pool } from "@workspace/db";
import { RedeemClaimBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { newId } from "../lib/auth";

const router = Router();

router.get("/v1/claims", requireAuth, async (req, res) => {
  const result = await pool.query(
    "select serial, file_id, file_name, claimed_at from regieren_claims where user_id = $1 order by claimed_at desc",
    [req.sessionUser!.userId],
  );
  res.json(result.rows.map((row) => ({ serial: row.serial, fileId: row.file_id, fileName: row.file_name, claimedAt: row.claimed_at })));
});

router.post("/v1/claims/redeem", requireAuth, async (req, res) => {
  const parsed = RedeemClaimBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter a serial number." });
  const userId = req.sessionUser!.userId;
  const fileResult = await pool.query("select * from regieren_premium_files where serial = $1", [parsed.data.serial.trim()]);
  const file = fileResult.rows[0];
  if (!file) return res.status(400).json({ error: "Invalid serial." });
  if (file.claimed_by && file.claimed_by !== userId) return res.status(400).json({ error: "Serial already used." });
  const prior = await pool.query("select 1 from regieren_claims where serial = $1 and user_id = $2", [file.serial, userId]);
  if (prior.rowCount) return res.status(400).json({ error: "Already claimed." });
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("update regieren_premium_files set claimed_by = $1, claimed_at = now() where serial = $2 and claimed_by is null", [userId, file.serial]);
    await client.query("insert into regieren_claims (id, user_id, serial, file_id, file_name) values ($1, $2, $3, $4, $5)", [newId("claim"), userId, file.serial, file.file_id, file.file_name]);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
  return res.json({ serial: file.serial, fileId: file.file_id, fileName: file.file_name, claimedAt: new Date().toISOString() });
});

export default router;