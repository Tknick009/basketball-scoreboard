var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.sqlite.ts
var schema_sqlite_exports = {};
__export(schema_sqlite_exports, {
  gamePlayers: () => gamePlayers2,
  games: () => games2,
  insertGamePlayerSchema: () => insertGamePlayerSchema2,
  insertGameSchema: () => insertGameSchema2,
  insertPlayerSchema: () => insertPlayerSchema2,
  insertTeamSchema: () => insertTeamSchema2,
  players: () => players2,
  teams: () => teams2,
  updatePlayerSchema: () => updatePlayerSchema2
});
import { sqliteTable, text as text2, integer as integer2 } from "drizzle-orm/sqlite-core";
import { createInsertSchema as createInsertSchema2 } from "drizzle-zod";
import { randomUUID } from "crypto";
var teams2, players2, games2, gamePlayers2, insertTeamSchema2, insertPlayerSchema2, updatePlayerSchema2, insertGameSchema2, insertGamePlayerSchema2;
var init_schema_sqlite = __esm({
  "shared/schema.sqlite.ts"() {
    "use strict";
    teams2 = sqliteTable("teams", {
      id: text2("id").primaryKey().$defaultFn(() => randomUUID()),
      name: text2("name").notNull()
    });
    players2 = sqliteTable("players", {
      id: text2("id").primaryKey().$defaultFn(() => randomUUID()),
      teamId: text2("team_id").notNull(),
      name: text2("name").notNull(),
      number: integer2("number"),
      points: integer2("points").notNull().default(0),
      fouls: integer2("fouls").notNull().default(0)
    });
    games2 = sqliteTable("games", {
      id: text2("id").primaryKey().$defaultFn(() => randomUUID()),
      homeTeamId: text2("home_team_id").notNull(),
      awayTeamId: text2("away_team_id").notNull(),
      homeScore: integer2("home_score").notNull().default(0),
      awayScore: integer2("away_score").notNull().default(0),
      period: integer2("period").notNull().default(1),
      timeRemaining: integer2("time_remaining").notNull().default(1200),
      possession: text2("possession").notNull().default("home"),
      homeTimeouts: integer2("home_timeouts").notNull().default(3),
      awayTimeouts: integer2("away_timeouts").notNull().default(3),
      homeFouls: integer2("home_fouls").notNull().default(0),
      awayFouls: integer2("away_fouls").notNull().default(0),
      elamEndingActive: integer2("elam_ending_active", { mode: "boolean" }).notNull().default(false),
      targetScore: integer2("target_score"),
      clockRunning: integer2("clock_running", { mode: "boolean" }).notNull().default(false),
      status: text2("status").notNull().default("active"),
      createdAt: integer2("created_at").notNull().$defaultFn(() => Math.floor(Date.now() / 1e3))
    });
    gamePlayers2 = sqliteTable("game_players", {
      id: text2("id").primaryKey().$defaultFn(() => randomUUID()),
      gameId: text2("game_id").notNull(),
      teamId: text2("team_id").notNull(),
      linkedPlayerId: text2("linked_player_id"),
      name: text2("name").notNull(),
      number: integer2("number"),
      points: integer2("points").notNull().default(0),
      fouls: integer2("fouls").notNull().default(0)
    });
    insertTeamSchema2 = createInsertSchema2(teams2).omit({ id: true });
    insertPlayerSchema2 = createInsertSchema2(players2).omit({ id: true, points: true, fouls: true });
    updatePlayerSchema2 = createInsertSchema2(players2).omit({ id: true, teamId: true, points: true, fouls: true }).partial();
    insertGameSchema2 = createInsertSchema2(games2).omit({
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
    insertGamePlayerSchema2 = createInsertSchema2(gamePlayers2).omit({ id: true, points: true, fouls: true });
  }
});

// server/storage.sqlite.ts
var storage_sqlite_exports = {};
__export(storage_sqlite_exports, {
  SqliteStorage: () => SqliteStorage
});
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, desc } from "drizzle-orm";
var SqliteStorage;
var init_storage_sqlite = __esm({
  "server/storage.sqlite.ts"() {
    "use strict";
    init_schema_sqlite();
    SqliteStorage = class {
      db;
      sqlite;
      constructor(dbPath = "basketball.db") {
        this.sqlite = new Database(dbPath);
        this.db = drizzle(this.sqlite, { schema: schema_sqlite_exports });
        this.initDatabase();
        this.seedDefaultTeams();
      }
      initDatabase() {
        this.sqlite.exec(`
      PRAGMA foreign_keys = ON;
      
      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL,
        name TEXT NOT NULL,
        number INTEGER,
        points INTEGER NOT NULL DEFAULT 0,
        fouls INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        home_team_id TEXT NOT NULL,
        away_team_id TEXT NOT NULL,
        home_score INTEGER NOT NULL DEFAULT 0,
        away_score INTEGER NOT NULL DEFAULT 0,
        period INTEGER NOT NULL DEFAULT 1,
        time_remaining INTEGER NOT NULL DEFAULT 1200,
        possession TEXT NOT NULL DEFAULT 'home',
        home_timeouts INTEGER NOT NULL DEFAULT 3,
        away_timeouts INTEGER NOT NULL DEFAULT 3,
        home_fouls INTEGER NOT NULL DEFAULT 0,
        away_fouls INTEGER NOT NULL DEFAULT 0,
        elam_ending_active INTEGER NOT NULL DEFAULT 0,
        target_score INTEGER,
        clock_running INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        created_at INTEGER NOT NULL,
        FOREIGN KEY (home_team_id) REFERENCES teams(id),
        FOREIGN KEY (away_team_id) REFERENCES teams(id)
      );

      CREATE TABLE IF NOT EXISTS game_players (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL,
        team_id TEXT NOT NULL,
        linked_player_id TEXT,
        name TEXT NOT NULL,
        number INTEGER,
        points INTEGER NOT NULL DEFAULT 0,
        fouls INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
        FOREIGN KEY (team_id) REFERENCES teams(id)
      );
    `);
      }
      async seedDefaultTeams() {
        const defaultTeams = ["Black", "Orange", "Purple", "Camo", "White", "Red", "Green", "Blue"];
        try {
          const existingTeams = await this.getTeams();
          const existingNames = new Set(existingTeams.map((t) => t.name));
          for (const teamName of defaultTeams) {
            if (!existingNames.has(teamName)) {
              await this.createTeam({ name: teamName });
            }
          }
        } catch (error) {
          console.error("Error seeding default teams:", error);
        }
      }
      async createTeam(insertTeam) {
        const [team] = await this.db.insert(teams2).values(insertTeam).returning();
        return team;
      }
      async getTeams() {
        return await this.db.select().from(teams2);
      }
      async getTeam(id) {
        const [team] = await this.db.select().from(teams2).where(eq(teams2.id, id));
        return team;
      }
      async deleteTeam(id) {
        await this.db.delete(teams2).where(eq(teams2.id, id));
      }
      async createPlayer(insertPlayer) {
        const [player] = await this.db.insert(players2).values(insertPlayer).returning();
        return player;
      }
      async getPlayersByTeam(teamId) {
        return await this.db.select().from(players2).where(eq(players2.teamId, teamId));
      }
      async updatePlayer(playerId, updates) {
        const [updated] = await this.db.update(players2).set(updates).where(eq(players2.id, playerId)).returning();
        return updated;
      }
      async updatePlayerStats(playerId, points, fouls) {
        const [updated] = await this.db.update(players2).set({ points, fouls }).where(eq(players2.id, playerId)).returning();
        return updated;
      }
      async deletePlayer(playerId) {
        await this.db.delete(players2).where(eq(players2.id, playerId));
      }
      async createGame(insertGame) {
        const [game] = await this.db.insert(games2).values(insertGame).returning();
        return game;
      }
      async getGames(status) {
        if (status) {
          return await this.db.select().from(games2).where(eq(games2.status, status)).orderBy(desc(games2.createdAt));
        }
        return await this.db.select().from(games2).orderBy(desc(games2.createdAt));
      }
      async getGame(id) {
        const [game] = await this.db.select().from(games2).where(eq(games2.id, id));
        return game;
      }
      async getCurrentGame() {
        const [game] = await this.db.select().from(games2).where(eq(games2.status, "active")).orderBy(desc(games2.createdAt)).limit(1);
        return game;
      }
      async updateGame(id, updates) {
        const [updated] = await this.db.update(games2).set(updates).where(eq(games2.id, id)).returning();
        return updated;
      }
      async clearCurrentGame() {
        await this.db.update(games2).set({ status: "completed" }).where(eq(games2.status, "active"));
      }
      async createGamePlayer(insertGamePlayer) {
        const [gamePlayer] = await this.db.insert(gamePlayers2).values(insertGamePlayer).returning();
        return gamePlayer;
      }
      async getGamePlayersByGameAndTeam(gameId, teamId) {
        const players3 = await this.db.select().from(gamePlayers2).where(eq(gamePlayers2.gameId, gameId));
        return players3.filter((gp) => gp.teamId === teamId).sort((a, b) => {
          const [aLast = ""] = a.name.split(" ").slice(-1);
          const [bLast = ""] = b.name.split(" ").slice(-1);
          return aLast.localeCompare(bLast);
        });
      }
      async updateGamePlayerStats(id, points, fouls) {
        const [updated] = await this.db.update(gamePlayers2).set({ points, fouls }).where(eq(gamePlayers2.id, id)).returning();
        return updated;
      }
      async deleteGamePlayer(id) {
        await this.db.delete(gamePlayers2).where(eq(gamePlayers2.id, id));
      }
      close() {
        this.sqlite.close();
      }
    };
  }
});

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull()
});
var players = pgTable("players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull(),
  name: text("name").notNull(),
  number: integer("number"),
  points: integer("points").notNull().default(0),
  fouls: integer("fouls").notNull().default(0)
});
var games = pgTable("games", {
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
  createdAt: integer("created_at").notNull().default(sql`extract(epoch from now())`)
});
var gamePlayers = pgTable("game_players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").notNull(),
  teamId: varchar("team_id").notNull(),
  linkedPlayerId: varchar("linked_player_id"),
  name: text("name").notNull(),
  number: integer("number"),
  points: integer("points").notNull().default(0),
  fouls: integer("fouls").notNull().default(0)
});
var insertTeamSchema = createInsertSchema(teams).omit({ id: true });
var insertPlayerSchema = createInsertSchema(players).omit({ id: true, points: true, fouls: true });
var updatePlayerSchema = createInsertSchema(players).omit({ id: true, teamId: true, points: true, fouls: true }).partial();
var insertGameSchema = createInsertSchema(games).omit({
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
var insertGamePlayerSchema = createInsertSchema(gamePlayers).omit({ id: true, points: true, fouls: true });

// server/storage.ts
import { randomUUID as randomUUID2 } from "crypto";
import { drizzle as drizzle2 } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { eq as eq2, desc as desc2 } from "drizzle-orm";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
var MemStorage = class {
  teams;
  players;
  games;
  gamePlayers;
  currentGameId;
  constructor() {
    this.teams = /* @__PURE__ */ new Map();
    this.players = /* @__PURE__ */ new Map();
    this.games = /* @__PURE__ */ new Map();
    this.gamePlayers = /* @__PURE__ */ new Map();
    this.currentGameId = null;
  }
  async createTeam(insertTeam) {
    const id = randomUUID2();
    const team = { ...insertTeam, id };
    this.teams.set(id, team);
    return team;
  }
  async getTeams() {
    return Array.from(this.teams.values());
  }
  async getTeam(id) {
    return this.teams.get(id);
  }
  async deleteTeam(id) {
    this.teams.delete(id);
    Array.from(this.players.entries()).forEach(([playerId, player]) => {
      if (player.teamId === id) {
        this.players.delete(playerId);
      }
    });
  }
  async createPlayer(insertPlayer) {
    const id = randomUUID2();
    const player = {
      ...insertPlayer,
      id,
      points: 0,
      fouls: 0,
      number: insertPlayer.number ?? null
    };
    this.players.set(id, player);
    return player;
  }
  async getPlayersByTeam(teamId) {
    return Array.from(this.players.values()).filter((p) => p.teamId === teamId);
  }
  async updatePlayer(playerId, updates) {
    const player = this.players.get(playerId);
    if (!player) return void 0;
    const updated = { ...player, ...updates };
    this.players.set(playerId, updated);
    return updated;
  }
  async updatePlayerStats(playerId, points, fouls) {
    const player = this.players.get(playerId);
    if (!player) return void 0;
    const updated = { ...player, points, fouls };
    this.players.set(playerId, updated);
    return updated;
  }
  async deletePlayer(playerId) {
    this.players.delete(playerId);
  }
  async createGame(insertGame) {
    const id = randomUUID2();
    const game = {
      ...insertGame,
      id,
      homeScore: 0,
      awayScore: 0,
      period: 1,
      timeRemaining: 1200,
      possession: "home",
      homeTimeouts: 5,
      awayTimeouts: 5,
      homeFouls: 0,
      awayFouls: 0,
      elamEndingActive: false,
      targetScore: null,
      clockRunning: false,
      status: "active",
      createdAt: Math.floor(Date.now() / 1e3)
    };
    this.games.set(id, game);
    this.currentGameId = id;
    return game;
  }
  async getGames(status) {
    const allGames = Array.from(this.games.values());
    if (status) {
      return allGames.filter((g) => g.status === status);
    }
    return allGames;
  }
  async getGame(id) {
    return this.games.get(id);
  }
  async getCurrentGame() {
    if (!this.currentGameId) return void 0;
    return this.games.get(this.currentGameId);
  }
  async updateGame(id, updates) {
    const game = this.games.get(id);
    if (!game) return void 0;
    const updated = { ...game, ...updates };
    this.games.set(id, updated);
    return updated;
  }
  async clearCurrentGame() {
    this.currentGameId = null;
  }
  async createGamePlayer(insertGamePlayer) {
    const id = randomUUID2();
    const gamePlayer = {
      ...insertGamePlayer,
      id,
      points: 0,
      fouls: 0,
      number: insertGamePlayer.number ?? null,
      linkedPlayerId: insertGamePlayer.linkedPlayerId ?? null
    };
    this.gamePlayers.set(id, gamePlayer);
    return gamePlayer;
  }
  async getGamePlayersByGameAndTeam(gameId, teamId) {
    return Array.from(this.gamePlayers.values()).filter((gp) => gp.gameId === gameId && gp.teamId === teamId).sort((a, b) => {
      const [aLast = ""] = a.name.split(" ").slice(-1);
      const [bLast = ""] = b.name.split(" ").slice(-1);
      return aLast.localeCompare(bLast);
    });
  }
  async updateGamePlayerStats(id, points, fouls) {
    const gamePlayer = this.gamePlayers.get(id);
    if (!gamePlayer) return void 0;
    const updated = { ...gamePlayer, points, fouls };
    this.gamePlayers.set(id, updated);
    return updated;
  }
  async deleteGamePlayer(id) {
    this.gamePlayers.delete(id);
  }
};
var DbStorage = class {
  db;
  constructor() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.db = drizzle2(pool);
    this.seedDefaultTeams();
  }
  async seedDefaultTeams() {
    const defaultTeams = ["Black", "Orange", "Purple", "Camo", "White", "Red", "Green", "Blue"];
    try {
      const existingTeams = await this.getTeams();
      const existingNames = new Set(existingTeams.map((t) => t.name));
      for (const teamName of defaultTeams) {
        if (!existingNames.has(teamName)) {
          await this.createTeam({ name: teamName });
        }
      }
    } catch (error) {
      console.error("Error seeding default teams:", error);
    }
  }
  async createTeam(insertTeam) {
    const [team] = await this.db.insert(teams).values(insertTeam).returning();
    return team;
  }
  async getTeams() {
    return await this.db.select().from(teams);
  }
  async getTeam(id) {
    const [team] = await this.db.select().from(teams).where(eq2(teams.id, id));
    return team;
  }
  async deleteTeam(id) {
    await this.db.delete(players).where(eq2(players.teamId, id));
    await this.db.delete(teams).where(eq2(teams.id, id));
  }
  async createPlayer(insertPlayer) {
    const [player] = await this.db.insert(players).values(insertPlayer).returning();
    return player;
  }
  async getPlayersByTeam(teamId) {
    return await this.db.select().from(players).where(eq2(players.teamId, teamId));
  }
  async updatePlayer(playerId, updates) {
    const [updated] = await this.db.update(players).set(updates).where(eq2(players.id, playerId)).returning();
    return updated;
  }
  async updatePlayerStats(playerId, points, fouls) {
    const [updated] = await this.db.update(players).set({ points, fouls }).where(eq2(players.id, playerId)).returning();
    return updated;
  }
  async deletePlayer(playerId) {
    await this.db.delete(players).where(eq2(players.id, playerId));
  }
  async createGame(insertGame) {
    const [game] = await this.db.insert(games).values(insertGame).returning();
    return game;
  }
  async getGames(status) {
    if (status) {
      return await this.db.select().from(games).where(eq2(games.status, status)).orderBy(desc2(games.createdAt));
    }
    return await this.db.select().from(games).orderBy(desc2(games.createdAt));
  }
  async getGame(id) {
    const [game] = await this.db.select().from(games).where(eq2(games.id, id));
    return game;
  }
  async getCurrentGame() {
    const [game] = await this.db.select().from(games).where(eq2(games.status, "active")).orderBy(desc2(games.createdAt)).limit(1);
    return game;
  }
  async updateGame(id, updates) {
    const [updated] = await this.db.update(games).set(updates).where(eq2(games.id, id)).returning();
    return updated;
  }
  async clearCurrentGame() {
    await this.db.update(games).set({ status: "completed" }).where(eq2(games.status, "active"));
  }
  async createGamePlayer(insertGamePlayer) {
    const [gamePlayer] = await this.db.insert(gamePlayers).values(insertGamePlayer).returning();
    return gamePlayer;
  }
  async getGamePlayersByGameAndTeam(gameId, teamId) {
    const players3 = await this.db.select().from(gamePlayers).where(eq2(gamePlayers.gameId, gameId));
    return players3.filter((gp) => gp.teamId === teamId).sort((a, b) => {
      const [aLast = ""] = a.name.split(" ").slice(-1);
      const [bLast = ""] = b.name.split(" ").slice(-1);
      return aLast.localeCompare(bLast);
    });
  }
  async updateGamePlayerStats(id, points, fouls) {
    const [updated] = await this.db.update(gamePlayers).set({ points, fouls }).where(eq2(gamePlayers.id, id)).returning();
    return updated;
  }
  async deleteGamePlayer(id) {
    await this.db.delete(gamePlayers).where(eq2(gamePlayers.id, id));
  }
};
async function createStorage() {
  const sqliteDbPath = process.env.SQLITE_DB_PATH;
  if (sqliteDbPath) {
    const { SqliteStorage: SqliteStorage2 } = await Promise.resolve().then(() => (init_storage_sqlite(), storage_sqlite_exports));
    return new SqliteStorage2(sqliteDbPath);
  } else if (process.env.DATABASE_URL) {
    return new DbStorage();
  } else {
    return new MemStorage();
  }
}
var storageInstance = null;
var storagePromise = createStorage().then((s) => {
  storageInstance = s;
  storage = s;
  return s;
});
var storage = null;

// server/routes.ts
import multer from "multer";
var upload = multer({ storage: multer.memoryStorage() });
async function registerRoutes(app2) {
  app2.post("/api/teams", async (req, res) => {
    try {
      const validated = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(validated);
      res.json(team);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.get("/api/teams", async (req, res) => {
    const teams3 = await storage.getTeams();
    res.json(teams3);
  });
  app2.get("/api/teams/:id", async (req, res) => {
    const team = await storage.getTeam(req.params.id);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }
    res.json(team);
  });
  app2.delete("/api/teams/:id", async (req, res) => {
    try {
      await storage.deleteTeam(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.post("/api/players/upload", upload.single("roster"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const teamId = req.body.teamId;
      if (!teamId) {
        return res.status(400).json({ error: "Team ID required" });
      }
      const csvContent = req.file.buffer.toString("utf-8");
      const lines = csvContent.split("\n").filter((line) => line.trim());
      const players3 = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(",").map((p) => p.trim());
        if (parts.length >= 2) {
          const number = parseInt(parts[0]);
          const name = parts[1];
          if (!isNaN(number) && name) {
            const player = await storage.createPlayer({
              teamId,
              name,
              number
            });
            players3.push(player);
          }
        }
      }
      res.json({ success: true, count: players3.length, players: players3 });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.post("/api/players/bulk-import", upload.single("csv"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const csvContent = req.file.buffer.toString("utf-8");
      const lines = csvContent.split("\n").filter((line) => line.trim());
      if (lines.length < 2) {
        return res.status(400).json({ error: "CSV file must contain a header and at least one data row" });
      }
      const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
      const firstNameIndex = header.indexOf("firstname");
      const lastNameIndex = header.indexOf("lastname");
      const teamIndex = header.indexOf("team");
      if (firstNameIndex === -1 || lastNameIndex === -1 || teamIndex === -1) {
        return res.status(400).json({ error: "CSV must have FirstName, LastName, and Team columns" });
      }
      const players3 = [];
      const teams3 = await storage.getTeams();
      const teamMap = new Map(teams3.map((t) => [t.name.toLowerCase(), t]));
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(",").map((p) => p.trim());
        if (parts.length > Math.max(firstNameIndex, lastNameIndex, teamIndex)) {
          const firstName = parts[firstNameIndex];
          const lastName = parts[lastNameIndex];
          const teamName = parts[teamIndex];
          if (firstName && lastName && teamName) {
            let team = teamMap.get(teamName.toLowerCase());
            if (!team) {
              team = await storage.createTeam({ name: teamName });
              teamMap.set(teamName.toLowerCase(), team);
            }
            const player = await storage.createPlayer({
              teamId: team.id,
              name: `${firstName} ${lastName}`,
              number: null
            });
            players3.push(player);
          }
        }
      }
      res.json({ success: true, count: players3.length, players: players3 });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.get("/api/players/:teamId", async (req, res) => {
    const players3 = await storage.getPlayersByTeam(req.params.teamId);
    res.json(players3);
  });
  app2.post("/api/players", async (req, res) => {
    try {
      const validated = insertPlayerSchema.parse(req.body);
      const player = await storage.createPlayer(validated);
      res.json(player);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.patch("/api/players/:id", async (req, res) => {
    try {
      const validated = updatePlayerSchema.parse(req.body);
      const player = await storage.updatePlayer(req.params.id, validated);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      res.json(player);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.delete("/api/players/:id", async (req, res) => {
    try {
      await storage.deletePlayer(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.get("/api/games/:gameId/players/:team", async (req, res) => {
    try {
      const { gameId, team } = req.params;
      const game = await storage.getGame(gameId);
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      const teamId = team === "home" ? game.homeTeamId : game.awayTeamId;
      const gamePlayers3 = await storage.getGamePlayersByGameAndTeam(gameId, teamId);
      res.json(gamePlayers3);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.post("/api/games/:gameId/players", async (req, res) => {
    try {
      const { gameId } = req.params;
      const validated = insertGamePlayerSchema.parse({ ...req.body, gameId });
      const gamePlayer = await storage.createGamePlayer(validated);
      res.json(gamePlayer);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.patch("/api/game-players/:id/stats", async (req, res) => {
    try {
      const { points, fouls } = req.body;
      const gamePlayer = await storage.updateGamePlayerStats(req.params.id, points, fouls);
      if (!gamePlayer) {
        return res.status(404).json({ error: "Game player not found" });
      }
      res.json(gamePlayer);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.delete("/api/game-players/:id", async (req, res) => {
    try {
      await storage.deleteGamePlayer(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.post("/api/game", async (req, res) => {
    try {
      const validated = insertGameSchema.parse(req.body);
      const game = await storage.createGame(validated);
      const homePlayers = await storage.getPlayersByTeam(game.homeTeamId);
      const awayPlayers = await storage.getPlayersByTeam(game.awayTeamId);
      for (const player of homePlayers) {
        await storage.createGamePlayer({
          gameId: game.id,
          teamId: game.homeTeamId,
          linkedPlayerId: player.id,
          name: player.name,
          number: player.number
        });
      }
      for (const player of awayPlayers) {
        await storage.createGamePlayer({
          gameId: game.id,
          teamId: game.awayTeamId,
          linkedPlayerId: player.id,
          name: player.name,
          number: player.number
        });
      }
      res.json(game);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.get("/api/games", async (req, res) => {
    const status = req.query.status;
    const allGames = await storage.getGames(status);
    res.json(allGames);
  });
  app2.get("/api/game/current", async (req, res) => {
    const game = await storage.getCurrentGame();
    if (!game) {
      return res.status(404).json({ error: "No active game" });
    }
    res.json(game);
  });
  app2.get("/api/game/:id", async (req, res) => {
    const game = await storage.getGame(req.params.id);
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }
    res.json(game);
  });
  app2.post("/api/game/score", async (req, res) => {
    try {
      const { team, points, gamePlayerId, gameId } = req.body;
      const game = gameId ? await storage.getGame(gameId) : await storage.getCurrentGame();
      if (!game) {
        return res.status(404).json({ error: "No active game" });
      }
      if (gamePlayerId) {
        const teamId = team === "home" ? game.homeTeamId : game.awayTeamId;
        const gamePlayers3 = await storage.getGamePlayersByGameAndTeam(game.id, teamId);
        const gamePlayer = gamePlayers3.find((gp) => gp.id === gamePlayerId);
        if (gamePlayer) {
          const newPoints = Math.max(0, gamePlayer.points + points);
          await storage.updateGamePlayerStats(gamePlayerId, newPoints, gamePlayer.fouls);
        }
      }
      const updates = {};
      if (team === "home") {
        updates.homeScore = Math.max(0, game.homeScore + points);
      } else {
        updates.awayScore = Math.max(0, game.awayScore + points);
      }
      const updated = await storage.updateGame(game.id, updates);
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.post("/api/game/foul", async (req, res) => {
    try {
      const { team, gamePlayerId, gameId, count = 1 } = req.body;
      const game = gameId ? await storage.getGame(gameId) : await storage.getCurrentGame();
      if (!game) {
        return res.status(404).json({ error: "No active game" });
      }
      if (gamePlayerId) {
        const teamId = team === "home" ? game.homeTeamId : game.awayTeamId;
        const gamePlayers3 = await storage.getGamePlayersByGameAndTeam(game.id, teamId);
        const gamePlayer = gamePlayers3.find((gp) => gp.id === gamePlayerId);
        if (gamePlayer) {
          const newFouls = Math.max(0, gamePlayer.fouls + count);
          await storage.updateGamePlayerStats(gamePlayerId, gamePlayer.points, newFouls);
        }
      }
      const updates = {};
      if (team === "home") {
        updates.homeFouls = Math.max(0, game.homeFouls + count);
      } else {
        updates.awayFouls = Math.max(0, game.awayFouls + count);
      }
      const updated = await storage.updateGame(game.id, updates);
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.post("/api/game/clock/toggle", async (req, res) => {
    try {
      const { gameId } = req.body;
      const game = gameId ? await storage.getGame(gameId) : await storage.getCurrentGame();
      if (!game) {
        return res.status(404).json({ error: "No active game" });
      }
      const updated = await storage.updateGame(game.id, {
        clockRunning: !game.clockRunning
      });
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.post("/api/game/clock/update", async (req, res) => {
    try {
      const { timeRemaining, gameId, pauseClock = true } = req.body;
      const game = gameId ? await storage.getGame(gameId) : await storage.getCurrentGame();
      if (!game) {
        return res.status(404).json({ error: "No active game" });
      }
      const updated = await storage.updateGame(game.id, {
        timeRemaining,
        clockRunning: pauseClock ? false : game.clockRunning
      });
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.post("/api/game/clock/reset", async (req, res) => {
    try {
      const { gameId } = req.body;
      const game = gameId ? await storage.getGame(gameId) : await storage.getCurrentGame();
      if (!game) {
        return res.status(404).json({ error: "No active game" });
      }
      const updated = await storage.updateGame(game.id, {
        timeRemaining: 1200,
        clockRunning: false
      });
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.post("/api/game/period", async (req, res) => {
    try {
      const { direction, gameId } = req.body;
      const game = gameId ? await storage.getGame(gameId) : await storage.getCurrentGame();
      if (!game) {
        return res.status(404).json({ error: "No active game" });
      }
      const newPeriod = direction === "next" ? game.period + 1 : Math.max(1, game.period - 1);
      const shouldResetFouls = direction === "next" && game.period >= 1;
      const updates = {
        period: newPeriod
      };
      if (shouldResetFouls) {
        updates.homeFouls = 0;
        updates.awayFouls = 0;
      }
      const updated = await storage.updateGame(game.id, updates);
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.post("/api/game/possession/toggle", async (req, res) => {
    try {
      const { gameId } = req.body;
      const game = gameId ? await storage.getGame(gameId) : await storage.getCurrentGame();
      if (!game) {
        return res.status(404).json({ error: "No active game" });
      }
      const updated = await storage.updateGame(game.id, {
        possession: game.possession === "home" ? "away" : "home"
      });
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.post("/api/game/timeout", async (req, res) => {
    try {
      const { team, action = "subtract", gameId } = req.body;
      const game = gameId ? await storage.getGame(gameId) : await storage.getCurrentGame();
      if (!game) {
        return res.status(404).json({ error: "No active game" });
      }
      const updates = {};
      if (team === "home") {
        if (action === "add") {
          updates.homeTimeouts = game.homeTimeouts + 1;
        } else if (action === "subtract") {
          if (game.homeTimeouts <= 0) {
            return res.status(400).json({ error: "No timeouts remaining for home team" });
          }
          updates.homeTimeouts = game.homeTimeouts - 1;
        }
      } else if (team === "away") {
        if (action === "add") {
          updates.awayTimeouts = game.awayTimeouts + 1;
        } else if (action === "subtract") {
          if (game.awayTimeouts <= 0) {
            return res.status(400).json({ error: "No timeouts remaining for away team" });
          }
          updates.awayTimeouts = game.awayTimeouts - 1;
        }
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "Invalid timeout operation" });
      }
      const updated = await storage.updateGame(game.id, updates);
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.post("/api/game/swap-teams", async (req, res) => {
    try {
      const { gameId } = req.body;
      const game = gameId ? await storage.getGame(gameId) : await storage.getCurrentGame();
      if (!game) {
        return res.status(404).json({ error: "No active game" });
      }
      const updated = await storage.updateGame(game.id, {
        homeTeamId: game.awayTeamId,
        awayTeamId: game.homeTeamId,
        homeScore: game.awayScore,
        awayScore: game.homeScore,
        homeFouls: game.awayFouls,
        awayFouls: game.homeFouls,
        homeTimeouts: game.awayTimeouts,
        awayTimeouts: game.homeTimeouts,
        possession: game.possession === "home" ? "away" : "home"
      });
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.post("/api/game/elam/activate", async (req, res) => {
    try {
      const { targetScore, gameId } = req.body;
      const game = gameId ? await storage.getGame(gameId) : await storage.getCurrentGame();
      if (!game) {
        return res.status(404).json({ error: "No active game" });
      }
      const updated = await storage.updateGame(game.id, {
        elamEndingActive: true,
        targetScore: targetScore || Math.max(game.homeScore, game.awayScore) + 8,
        clockRunning: false
      });
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.post("/api/game/elam/deactivate", async (req, res) => {
    try {
      const { gameId } = req.body;
      const game = gameId ? await storage.getGame(gameId) : await storage.getCurrentGame();
      if (!game) {
        return res.status(404).json({ error: "No active game" });
      }
      const updated = await storage.updateGame(game.id, {
        elamEndingActive: false,
        targetScore: null,
        clockRunning: false
      });
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.post("/api/game/end", async (req, res) => {
    try {
      const { gameId } = req.body;
      const game = gameId ? await storage.getGame(gameId) : await storage.getCurrentGame();
      if (!game) {
        return res.status(404).json({ error: "No active game" });
      }
      const updated = await storage.updateGame(game.id, {
        status: "completed",
        clockRunning: false
      });
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  await storagePromise;
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
