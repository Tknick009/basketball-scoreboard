import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, desc } from "drizzle-orm";
import * as schema from "@shared/schema.sqlite";
import type { IStorage } from "./storage";
import type { Team, InsertTeam, Player, InsertPlayer, UpdatePlayer, Game, InsertGame, GamePlayer, InsertGamePlayer } from "@shared/schema";

export class SqliteStorage implements IStorage {
  private db;
  private sqlite;

  constructor(dbPath: string = "basketball.db") {
    this.sqlite = new Database(dbPath);
    this.db = drizzle(this.sqlite, { schema });
    
    // Initialize database schema
    this.initDatabase();
    this.seedDefaultTeams();
  }

  private initDatabase() {
    // Create tables if they don't exist with proper constraints and cascading
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

  private async seedDefaultTeams() {
    const defaultTeams = ['Black', 'Orange', 'Purple', 'Camo', 'White', 'Red', 'Green', 'Blue'];
    
    try {
      const existingTeams = await this.getTeams();
      const existingNames = new Set(existingTeams.map(t => t.name));
      
      for (const teamName of defaultTeams) {
        if (!existingNames.has(teamName)) {
          await this.createTeam({ name: teamName });
        }
      }
    } catch (error) {
      console.error('Error seeding default teams:', error);
    }
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const [team] = await this.db.insert(schema.teams).values(insertTeam).returning();
    return team;
  }

  async getTeams(): Promise<Team[]> {
    return await this.db.select().from(schema.teams);
  }

  async getTeam(id: string): Promise<Team | undefined> {
    const [team] = await this.db.select().from(schema.teams).where(eq(schema.teams.id, id));
    return team;
  }

  async deleteTeam(id: string): Promise<void> {
    // Foreign key CASCADE will handle player deletion automatically
    await this.db.delete(schema.teams).where(eq(schema.teams.id, id));
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const [player] = await this.db.insert(schema.players).values(insertPlayer).returning();
    return player;
  }

  async getPlayersByTeam(teamId: string): Promise<Player[]> {
    return await this.db.select().from(schema.players).where(eq(schema.players.teamId, teamId));
  }

  async updatePlayer(playerId: string, updates: UpdatePlayer): Promise<Player | undefined> {
    const [updated] = await this.db
      .update(schema.players)
      .set(updates)
      .where(eq(schema.players.id, playerId))
      .returning();
    return updated;
  }

  async updatePlayerStats(playerId: string, points: number, fouls: number): Promise<Player | undefined> {
    const [updated] = await this.db
      .update(schema.players)
      .set({ points, fouls })
      .where(eq(schema.players.id, playerId))
      .returning();
    return updated;
  }

  async deletePlayer(playerId: string): Promise<void> {
    await this.db.delete(schema.players).where(eq(schema.players.id, playerId));
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    const [game] = await this.db.insert(schema.games).values(insertGame).returning();
    return game;
  }

  async getGames(status?: string): Promise<Game[]> {
    if (status) {
      return await this.db
        .select()
        .from(schema.games)
        .where(eq(schema.games.status, status))
        .orderBy(desc(schema.games.createdAt));
    }
    return await this.db.select().from(schema.games).orderBy(desc(schema.games.createdAt));
  }

  async getGame(id: string): Promise<Game | undefined> {
    const [game] = await this.db.select().from(schema.games).where(eq(schema.games.id, id));
    return game;
  }

  async getCurrentGame(): Promise<Game | undefined> {
    const [game] = await this.db
      .select()
      .from(schema.games)
      .where(eq(schema.games.status, 'active'))
      .orderBy(desc(schema.games.createdAt))
      .limit(1);
    return game;
  }

  async updateGame(id: string, updates: Partial<Game>): Promise<Game | undefined> {
    const [updated] = await this.db
      .update(schema.games)
      .set(updates)
      .where(eq(schema.games.id, id))
      .returning();
    return updated;
  }

  async clearCurrentGame(): Promise<void> {
    await this.db
      .update(schema.games)
      .set({ status: 'completed' })
      .where(eq(schema.games.status, 'active'));
  }

  async createGamePlayer(insertGamePlayer: InsertGamePlayer): Promise<GamePlayer> {
    const [gamePlayer] = await this.db.insert(schema.gamePlayers).values(insertGamePlayer).returning();
    return gamePlayer;
  }

  async getGamePlayersByGameAndTeam(gameId: string, teamId: string): Promise<GamePlayer[]> {
    const players = await this.db
      .select()
      .from(schema.gamePlayers)
      .where(eq(schema.gamePlayers.gameId, gameId));
    
    return players
      .filter(gp => gp.teamId === teamId)
      .sort((a, b) => {
        const [aLast = ''] = a.name.split(' ').slice(-1);
        const [bLast = ''] = b.name.split(' ').slice(-1);
        return aLast.localeCompare(bLast);
      });
  }

  async getGamePlayersByGame(gameId: string): Promise<GamePlayer[]> {
    const players = await this.db
      .select()
      .from(schema.gamePlayers)
      .where(eq(schema.gamePlayers.gameId, gameId));
    
    return players.sort((a, b) => {
      const [aLast = ''] = a.name.split(' ').slice(-1);
      const [bLast = ''] = b.name.split(' ').slice(-1);
      return aLast.localeCompare(bLast);
    });
  }

  async updateGamePlayerStats(id: string, points: number, fouls: number): Promise<GamePlayer | undefined> {
    const [updated] = await this.db
      .update(schema.gamePlayers)
      .set({ points, fouls })
      .where(eq(schema.gamePlayers.id, id))
      .returning();
    return updated;
  }

  async updateGamePlayerMissing(id: string, missing: boolean): Promise<GamePlayer | undefined> {
    const [updated] = await this.db
      .update(schema.gamePlayers)
      .set({ missing })
      .where(eq(schema.gamePlayers.id, id))
      .returning();
    return updated;
  }

  async deleteGamePlayer(id: string): Promise<void> {
    await this.db.delete(schema.gamePlayers).where(eq(schema.gamePlayers.id, id));
  }

  close() {
    this.sqlite.close();
  }
}
