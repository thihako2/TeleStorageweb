import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  uid: text("uid").notNull().unique(),
  displayName: text("display_name"),
  photoURL: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow(),
  quota: integer("quota").default(5368709120), // 5GB in bytes
  usedStorage: integer("used_storage").default(0),
});

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  fileLink: text("file_link"),
  uploaderId: integer("uploader_id").notNull(),
  uploadTimestamp: timestamp("upload_timestamp").defaultNow(),
  telegramMessageId: text("telegram_message_id").notNull(),
  channelId: text("channel_id").notNull(),
  isDeleted: boolean("is_deleted").default(false),
  isStarred: boolean("is_starred").default(false),
});

export const sharedFiles = pgTable("shared_files", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").notNull(),
  shareLink: text("share_link").notNull().unique(),
  expiryDate: timestamp("expiry_date"),
  createdAt: timestamp("created_at").defaultNow(),
  accessCount: integer("access_count").default(0),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  quota: true,
  usedStorage: true,
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  uploadTimestamp: true,
  isDeleted: true,
  isStarred: true,
});

export const insertSharedFileSchema = createInsertSchema(sharedFiles).omit({
  id: true,
  createdAt: true,
  accessCount: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;

export type InsertSharedFile = z.infer<typeof insertSharedFileSchema>;
export type SharedFile = typeof sharedFiles.$inferSelect;

// Response types for API
export interface UserWithStorage {
  user: User;
  storageInfo: {
    used: number;
    total: number;
    percentage: number;
  };
}

export interface FileWithShareInfo extends File {
  shareInfo?: {
    shareLink: string;
    expiryDate?: Date;
  };
}
