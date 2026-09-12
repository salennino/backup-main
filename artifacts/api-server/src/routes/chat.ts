import { Router } from "express";
import { pool } from "@workspace/db";
import { SendChatBody, StreamChatBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { generateAssistantReply } from "../lib/groq";
import { newId } from "../lib/auth";

const router = Router();

router.get("/v1/chat/history", requireAuth, async (req, res) => {
  const result = await pool.query(
    "select id, role, content, created_at from regieren_chat_messages where user_id = $1 order by created_at asc limit 100",
    [req.sessionUser!.userId],
  );
  res.json(result.rows.map((row) => ({ id: row.id, role: row.role, content: row.content, createdAt: row.created_at })));
});

async function createReply(userId: string, email: string, message: string) {
  const previous = await pool.query(
    "select role, content from regieren_chat_messages where user_id = $1 order by created_at desc limit 12",
    [userId],
  );
  await pool.query(
    "insert into regieren_chat_messages (id, user_id, role, content) values ($1, $2, 'user', $3)",
    [newId("msg"), userId, message],
  );
  const reply = await generateAssistantReply(message, previous.rows.reverse(), email);
  const row = await pool.query(
    "insert into regieren_chat_messages (id, user_id, role, content) values ($1, $2, 'assistant', $3) returning id, role, content, created_at",
    [newId("msg"), userId, reply],
  );
  return { id: row.rows[0].id, role: "assistant", content: reply, createdAt: row.rows[0].created_at };
}

router.post("/v1/chat", requireAuth, async (req, res) => {
  const parsed = SendChatBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Message cannot be empty." });
  return res.json(await createReply(req.sessionUser!.userId, req.sessionUser!.email, parsed.data.message));
});

router.post("/v1/chat/stream", requireAuth, async (req, res) => {
  const parsed = StreamChatBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Message cannot be empty." });
  const message = await createReply(req.sessionUser!.userId, req.sessionUser!.email, parsed.data.message);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  const chunks = message.content.match(/.{1,24}/g) || [message.content];
  for (const chunk of chunks) {
    res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    await new Promise((resolve) => setTimeout(resolve, 12));
  }
  res.write(`data: ${JSON.stringify({ done: true, message })}\n\n`);
  return res.end();
});

export default router;