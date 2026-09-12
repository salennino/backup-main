import type { NextFunction, Request, Response } from "express";
import { pool } from "@workspace/db";
import { verifyToken, type SessionUser } from "../lib/auth";

declare global {
  namespace Express {
    interface Request {
      sessionUser?: SessionUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
  const sessionUser = token ? verifyToken(token) : null;
  if (!sessionUser) return res.status(401).json({ error: "Authentication required." });

  const result = await pool.query(
    "select user_id, email, token_version from regieren_users where user_id = $1",
    [sessionUser.userId],
  );
  const user = result.rows[0] as { user_id: string; email: string; token_version: number } | undefined;
  if (!user || user.token_version !== sessionUser.tokenVersion) {
    return res.status(401).json({ error: "Session expired." });
  }
  req.sessionUser = { userId: user.user_id, email: user.email, tokenVersion: user.token_version };
  return next();
}