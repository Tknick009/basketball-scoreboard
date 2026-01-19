import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Gonzo Cup bracket slots for tournament structure
export const bracketSlots = pgTable("bracket_slots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  round: integer("round").notNull(), // 1=Finals, 2=Semifinals, 3=Quarterfinals, etc.
  position: integer("position").notNull(), // Position within the round (0-indexed)
  teamId: varchar("team_id"), // Team assigned to this slot (null if TBD)
  gameId: varchar("game_id"), // Game linked to this slot
  nextSlotId: varchar("next_slot_id"), // Winner advances to this slot
  isTopSlot: boolean("is_top_slot").notNull().default(true), // Whether this feeds as home or away in next match
  scheduledTime: text("scheduled_time"), // User-entered display time for the match (e.g., "Sat 2pm")
});

export const insertBracketSlotSchema = createInsertSchema(bracketSlots).omit({ id: true });
export type InsertBracketSlot = z.infer<typeof insertBracketSlotSchema>;
export type BracketSlot = typeof bracketSlots.$inferSelect;

export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
});

export const players = pgTable("players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull(),
  name: text("name").notNull(),
  number: integer("number"),
  points: integer("points").notNull().default(0),
  fouls: integer("fouls").notNull().default(0),
});

export const games = pgTable("games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  homeTeamId: varchar("home_team_id").notNull(),
  awayTeamId: varchar("away_team_id").notNull(),
  homeScore: integer("home_score").notNull().default(0),
  awayScore: integer("away_score").notNull().default(0),
  period: integer("period").notNull().default(1),
  timeRemaining: integer("time_remaining").notNull().default(1200),
  possession: text("possession").notNull().default("home"),
  homeTimeouts: integer("home_timeouts").notNull().default(3),
  awayTimeouts: integer("away_timeouts").notNull().default(3),
  homeFouls: integer("home_fouls").notNull().default(0),
  awayFouls: integer("away_fouls").notNull().default(0),
  elamEndingActive: boolean("elam_ending_active").notNull().default(false),
  targetScore: integer("target_score"),
  clockRunning: boolean("clock_running").notNull().default(false),
  status: text("status").notNull().default("active"),
  createdAt: integer("created_at").notNull().default(sql`extract(epoch from now())`),
  isTournament: boolean("is_tournament").notNull().default(false),
});

export const gamePlayers = pgTable("game_players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").notNull(),
  teamId: varchar("team_id").notNull(),
  linkedPlayerId: varchar("linked_player_id"),
  name: text("name").notNull(),
  number: integer("number"),
  points: integer("points").notNull().default(0),
  fouls: integer("fouls").notNull().default(0),
  missing: boolean("missing").notNull().default(false),
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
