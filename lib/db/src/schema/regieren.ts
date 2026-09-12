import { pgTable, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const usersTable = pgTable("regieren_users", {
  userId: text("user_id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  tokenVersion: integer("token_version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLogin: timestamp("last_login", { withTimezone: true }),
  deviceModel: text("device_model"),
  deviceProcessor: text("device_processor"),
  rootStatus: text("root_status"),
  telegramId: text("telegram_id").unique(),
  telegramUsername: text("telegram_username"),
  telegramLinkedAt: timestamp("telegram_linked_at", { withTimezone: true }),
  plan: text("plan").notNull().default("free"),
});

export const chatMessagesTable = pgTable("regieren_chat_messages", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const claimsTable = pgTable("regieren_claims", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  serial: text("serial").notNull(),
  fileId: text("file_id"),
  fileName: text("file_name").notNull(),
  claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const premiumFilesTable = pgTable("regieren_premium_files", {
  serial: text("serial").primaryKey(),
  fileId: text("file_id").notNull(),
  fileName: text("file_name").notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  claimedBy: text("claimed_by"),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  isDevOnly: boolean("is_dev_only").notNull().default(false),
});

export const allowlistSerialTable = pgTable("regieren_allowlist_serial", {
  serial: text("serial").primaryKey(),
  addedBy: text("added_by").notNull(),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  note: text("note"),
});

export const telegramLinksTable = pgTable("regieren_telegram_links", {
  token: text("token").primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});