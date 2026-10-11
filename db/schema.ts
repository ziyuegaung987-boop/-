import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const gameProgress = sqliteTable("game_progress", {
  userId: text("user_id").primaryKey(),
  completedCourse: integer("completed_course").notNull().default(0),
  currentCourse: integer("current_course").notNull().default(1),
  checkpoint: integer("checkpoint").notNull().default(0),
  bestScore: integer("best_score").notNull().default(0),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const levelProgress = sqliteTable("level_progress", {
  userId: text("user_id").notNull(),
  levelId: integer("level_id").notNull(),
  bestScore: integer("best_score").notNull().default(0),
  bestStars: integer("best_stars").notNull().default(0),
  completedAt: text("completed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [primaryKey({ columns: [table.userId, table.levelId] })]);

export const dailyFlights = sqliteTable("daily_flights", {
  userId: text("user_id").notNull(),
  day: text("day").notNull(),
  levelId: integer("level_id").notNull(),
  bestScore: integer("best_score").notNull().default(0),
  completedAt: text("completed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [primaryKey({ columns: [table.userId, table.day] })]);
