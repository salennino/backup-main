import crypto from "node:crypto";

export type SessionUser = {
  userId: string;
  email: string;
  tokenVersion: number;
};

const secret = () => process.env.SESSION_SECRET || "development-only-session-secret";

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

export function createToken(user: SessionUser) {
  const payload = encode({ ...user, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  const signature = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyToken(token: string): SessionUser | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionUser & { exp: number };
    return parsed.exp > Date.now() ? parsed : null;
  } catch {
    return null;
  }
}

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString("hex");
  return actual.length === expected.length && crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export function newUserId() {
  return `fri_${crypto.randomBytes(5).toString("hex")}`;
}

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomBytes(10).toString("hex")}`;
}