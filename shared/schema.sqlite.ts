import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { randomUUID } from "crypto";

// Gonzo Cup bracket slots for tournament structure
export const bracketSlots = sqliteTable("bracket_slots", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  round: integer("round").notNull(), // 1=Finals, 2=Semifinals, 3=Quarterfinals, etc.
  position: integer("position").notNull(), // Position within the round (0-indexed)
  teamId: text("team_id"), // Team assigned to this slot (null if TBD)
  gameId: text("game_id"), // Game linked to this slot
  nextSlotId: text("next_slot_id"), // Winner advances to this slot
  isTopSlot: integer("is_top_slot", { mode: "boolean" }).notNull().default(true), // Whether this feeds as home or away in next match
});

export const insertBracketSlotSchema = createInsertSchema(bracketSlots).omit({ id: true });
export type InsertBracketSlot = z.infer<typeof insertBracketSlotSchema>;
export type BracketSlot = typeof bracketSlots.$inferSelect;

// SQLite version of schema (for Electron)
export const teams = sqliteTable("teams", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  name: text("name").notNull(),
});

export const players = sqliteTable("players", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  teamId: text("team_id").notNull(),
  name: text("name").notNull(),
  number: integer("number"),
  points: integer("points").notNull().default(0),
  fouls: integer("fouls").notNull().default(0),
});

export const games = sqliteTable("games", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  homeTeamId: text("home_team_id").notNull(),
  awayTeamId: text("away_team_id").notNull(),
  homeScore: integer("home_score").notNull().default(0),
  awayScore: integer("away_score").notNull().default(0),
  period: integer("period").notNull().default(1),
  timeRemaining: integer("time_remaining").notNull().default(1200),
  possession: text("possession").notNull().default("home"),
  homeTimeouts: integer("home_timeouts").notNull().default(3),
  awayTimeouts: integer("away_timeouts").notNull().default(3),
  homeFouls: integer("home_fouls").notNull().default(0),
  awayFouls: integer("away_fouls").notNull().default(0),
  elamEndingActive: integer("elam_ending_active", { mode: "boolean" }).notNull().default(false),
  targetScore: integer("target_score"),
  clockRunning: integer("clock_running", { mode: "boolean" }).notNull().default(false),
  status: text("status").notNull().default("active"),
  createdAt: integer("created_at").notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
  isTournament: integer("is_tournament", { mode: "boolean" }).notNull().default(false),
  // Sync metadata for cloud publishing
  syncStatus: text("sync_status").notNull().default("pending"), // pending, synced, failed, failed_permanent
  lastSyncAttempt: integer("last_sync_attempt"), // timestamp of last sync attempt
  syncError: text("sync_error"), // error message if sync failed
  syncRetryCount: integer("sync_retry_count").notNull().default(0), // number of sync attempts
});

export const gamePlayers = sqliteTable("game_players", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  gameId: text("game_id").notNull(),
  teamId: text("team_id").notNull(),
  linkedPlayerId: text("linked_player_id"),
  name: text("name").notNull(),
  number: integer("number"),
  points: integer("points").notNull().default(0),
  fouls: integer("fouls").notNull().default(0),
  missing: integer("missing", { mode: "boolean" }).notNull().default(false),
});

export const insertTeamSchema = createInsertSchema(teams).omit({ id: true });
export const insertPlayerSchema = createInsertSchema(players).omit({ id: true, points: true, fouls: true });
export const updatePlayerSchema = createInsertSchema(players).omit({ id: true, teamId: true, points: true, fouls: true }).partial();
export const insertGameSchema = createInsertSchema(games).omit({ 
  id: true, 
  homeScore: true, 
  awayScore: true, 
  period: true, 
  timeRemaining: true, 
  possession: true, 
  homeTimeouts: true, 
  awayTimeouts: true,
  homeFouls: true,
  awayFouls: true,
  elamEndingActive: true,
  targetScore: true,
  clockRunning: true,
  status: true,
  createdAt: true
});
export const insertGamePlayerSchema = createInsertSchema(gamePlayers).omit({ id: true, points: true, fouls: true, missing: true });
export const updateGamePlayerSchema = createInsertSchema(gamePlayers).omit({ id: true, gameId: true, teamId: true, linkedPlayerId: true, name: true, number: true, points: true, fouls: true }).partial();

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type UpdatePlayer = z.infer<typeof updatePlayerSchema>;
export type Player = typeof players.$inferSelect;

export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;

export type InsertGamePlayer = z.infer<typeof insertGamePlayerSchema>;
export type UpdateGamePlayer = z.infer<typeof updateGamePlayerSchema>;
export type GamePlayer = typeof gamePlayers.$inferSelect;
