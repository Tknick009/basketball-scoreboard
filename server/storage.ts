import { type Team, type InsertTeam, type Player, type InsertPlayer, type UpdatePlayer, type Game, type InsertGame, type GamePlayer, type InsertGamePlayer, teams, players, games, gamePlayers } from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { eq, desc } from "drizzle-orm";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

export interface IStorage {
  createTeam(team: InsertTeam): Promise<Team>;
  getTeams(): Promise<Team[]>;
  getTeam(id: string): Promise<Team | undefined>;
  deleteTeam(id: string): Promise<void>;
  
  createPlayer(player: InsertPlayer): Promise<Player>;
  getPlayersByTeam(teamId: string): Promise<Player[]>;
  updatePlayer(playerId: string, updates: UpdatePlayer): Promise<Player | undefined>;
  updatePlayerStats(playerId: string, points: number, fouls: number): Promise<Player | undefined>;
  deletePlayer(playerId: string): Promise<void>;
  
  createGame(game: InsertGame): Promise<Game>;
  getGames(status?: string): Promise<Game[]>;
  getGame(id: string): Promise<Game | undefined>;
  getCurrentGame(): Promise<Game | undefined>;
  updateGame(id: string, updates: Partial<Game>): Promise<Game | undefined>;
  clearCurrentGame(): Promise<void>;
  deleteGame(id: string): Promise<void>;
  
  createGamePlayer(gamePlayer: InsertGamePlayer): Promise<GamePlayer>;
  getGamePlayersByGameAndTeam(gameId: string, teamId: string): Promise<GamePlayer[]>;
  getGamePlayersByGame(gameId: string): Promise<GamePlayer[]>;
  updateGamePlayerStats(id: string, points: number, fouls: number): Promise<GamePlayer | undefined>;
  updateGamePlayerMissing(id: string, missing: boolean): Promise<GamePlayer | undefined>;
  deleteGamePlayer(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private teams: Map<string, Team>;
  private players: Map<string, Player>;
  private games: Map<string, Game>;
  private gamePlayers: Map<string, GamePlayer>;
  private currentGameId: string | null;

  constructor() {
    this.teams = new Map();
    this.players = new Map();
    this.games = new Map();
    this.gamePlayers = new Map();
    this.currentGameId = null;
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const id = randomUUID();
    const team: Team = { ...insertTeam, id };
    this.teams.set(id, team);
    return team;
  }

  async getTeams(): Promise<Team[]> {
    return Array.from(this.teams.values());
  }

  async getTeam(id: string): Promise<Team | undefined> {
    return this.teams.get(id);
  }

  async deleteTeam(id: string): Promise<void> {
    this.teams.delete(id);
    Array.from(this.players.entries()).forEach(([playerId, player]) => {
      if (player.teamId === id) {
        this.players.delete(playerId);
      }
    });
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const id = randomUUID();
    const player: Player = { 
      ...insertPlayer, 
      id, 
      points: 0, 
      fouls: 0,
      number: insertPlayer.number ?? null 
    };
    this.players.set(id, player);
    return player;
  }

  async getPlayersByTeam(teamId: string): Promise<Player[]> {
    return Array.from(this.players.values()).filter(p => p.teamId === teamId);
  }

  async updatePlayer(playerId: string, updates: UpdatePlayer): Promise<Player | undefined> {
    const player = this.players.get(playerId);
    if (!player) return undefined;
    
    const updated = { ...player, ...updates };
    this.players.set(playerId, updated);
    return updated;
  }

  async updatePlayerStats(playerId: string, points: number, fouls: number): Promise<Player | undefined> {
    const player = this.players.get(playerId);
    if (!player) return undefined;
    
    const updated = { ...player, points, fouls };
    this.players.set(playerId, updated);
    return updated;
  }

  async deletePlayer(playerId: string): Promise<void> {
    this.players.delete(playerId);
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    const id = randomUUID();
    const game: Game = {
      ...insertGame,
      id,
      homeScore: 0,
      awayScore: 0,
      period: 1,
      timeRemaining: 1200,
      possession: 'home',
      homeTimeouts: 5,
      awayTimeouts: 5,
      homeFouls: 0,
      awayFouls: 0,
      elamEndingActive: false,
      targetScore: null,
      clockRunning: false,
      status: 'active',
      createdAt: Math.floor(Date.now() / 1000),
    };
    this.games.set(id, game);
    this.currentGameId = id;
    return game;
  }

  async getGames(status?: string): Promise<Game[]> {
    const allGames = Array.from(this.games.values());
    if (status) {
      return allGames.filter(g => g.status === status);
    }
    return allGames;
  }

  async getGame(id: string): Promise<Game | undefined> {
    return this.games.get(id);
  }

  async getCurrentGame(): Promise<Game | undefined> {
    if (!this.currentGameId) return undefined;
    return this.games.get(this.currentGameId);
  }

  async updateGame(id: string, updates: Partial<Game>): Promise<Game | undefined> {
    const game = this.games.get(id);
    if (!game) return undefined;
    
    const updated = { ...game, ...updates };
    this.games.set(id, updated);
    return updated;
  }

  async clearCurrentGame(): Promise<void> {
    this.currentGameId = null;
  }

  async deleteGame(id: string): Promise<void> {
    this.games.delete(id);
    // Delete all game players for this game
    Array.from(this.gamePlayers.entries()).forEach(([gpId, gp]) => {
      if (gp.gameId === id) {
        this.gamePlayers.delete(gpId);
      }
    });
    // Clear current game if it was this one
    if (this.currentGameId === id) {
      this.currentGameId = null;
    }
  }

  async createGamePlayer(insertGamePlayer: InsertGamePlayer): Promise<GamePlayer> {
    const id = randomUUID();
    const gamePlayer: GamePlayer = {
      ...insertGamePlayer,
      id,
      points: 0,
      fouls: 0,
      number: insertGamePlayer.number ?? null,
      linkedPlayerId: insertGamePlayer.linkedPlayerId ?? null,
      missing: false,
    };
    this.gamePlayers.set(id, gamePlayer);
    return gamePlayer;
  }

  async getGamePlayersByGameAndTeam(gameId: string, teamId: string): Promise<GamePlayer[]> {
    return Array.from(this.gamePlayers.values())
      .filter(gp => gp.gameId === gameId && gp.teamId === teamId)
      .sort((a, b) => {
        const [aLast = ''] = a.name.split(' ').slice(-1);
        const [bLast = ''] = b.name.split(' ').slice(-1);
        return aLast.localeCompare(bLast);
      });
  }

  async getGamePlayersByGame(gameId: string): Promise<GamePlayer[]> {
    return Array.from(this.gamePlayers.values())
      .filter(gp => gp.gameId === gameId)
      .sort((a, b) => {
        const [aLast = ''] = a.name.split(' ').slice(-1);
        const [bLast = ''] = b.name.split(' ').slice(-1);
        return aLast.localeCompare(bLast);
      });
  }

  async updateGamePlayerStats(id: string, points: number, fouls: number): Promise<GamePlayer | undefined> {
    const gamePlayer = this.gamePlayers.get(id);
    if (!gamePlayer) return undefined;
    
    const updated = { ...gamePlayer, points, fouls };
    this.gamePlayers.set(id, updated);
    return updated;
  }

  async updateGamePlayerMissing(id: string, missing: boolean): Promise<GamePlayer | undefined> {
    const gamePlayer = this.gamePlayers.get(id);
    if (!gamePlayer) return undefined;
    
    const updated = { ...gamePlayer, missing };
    this.gamePlayers.set(id, updated);
    return updated;
  }

  async deleteGamePlayer(id: string): Promise<void> {
    this.gamePlayers.delete(id);
  }
}

export class DbStorage implements IStorage {
  private db;

  constructor() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.db = drizzle(pool);
    this.seedDefaultTeams();
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
    const [team] = await this.db.insert(teams).values(insertTeam).returning();
    return team;
  }

  async getTeams(): Promise<Team[]> {
    return await this.db.select().from(teams);
  }

  async getTeam(id: string): Promise<Team | undefined> {
    const [team] = await this.db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async deleteTeam(id: string): Promise<void> {
    await this.db.delete(players).where(eq(players.teamId, id));
    await this.db.delete(teams).where(eq(teams.id, id));
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const [player] = await this.db.insert(players).values(insertPlayer).returning();
    return player;
  }

  async getPlayersByTeam(teamId: string): Promise<Player[]> {
    return await this.db.select().from(players).where(eq(players.teamId, teamId));
  }

  async updatePlayer(playerId: string, updates: UpdatePlayer): Promise<Player | undefined> {
    const [updated] = await this.db
      .update(players)
      .set(updates)
      .where(eq(players.id, playerId))
      .returning();
    return updated;
  }

  async updatePlayerStats(playerId: string, points: number, fouls: number): Promise<Player | undefined> {
    const [updated] = await this.db
      .update(players)
      .set({ points, fouls })
      .where(eq(players.id, playerId))
      .returning();
    return updated;
  }

  async deletePlayer(playerId: string): Promise<void> {
    await this.db.delete(players).where(eq(players.id, playerId));
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    const [game] = await this.db.insert(games).values(insertGame).returning();
    return game;
  }

  async getGames(status?: string): Promise<Game[]> {
    if (status) {
      return await this.db
        .select()
        .from(games)
        .where(eq(games.status, status))
        .orderBy(desc(games.createdAt));
    }
    return await this.db.select().from(games).orderBy(desc(games.createdAt));
  }

  async getGame(id: string): Promise<Game | undefined> {
    const [game] = await this.db.select().from(games).where(eq(games.id, id));
    return game;
  }

  async getCurrentGame(): Promise<Game | undefined> {
    const [game] = await this.db
      .select()
      .from(games)
      .where(eq(games.status, 'active'))
      .orderBy(desc(games.createdAt))
      .limit(1);
    return game;
  }

  async updateGame(id: string, updates: Partial<Game>): Promise<Game | undefined> {
    const [updated] = await this.db
      .update(games)
      .set(updates)
      .where(eq(games.id, id))
      .returning();
    return updated;
  }

  async clearCurrentGame(): Promise<void> {
    await this.db
      .update(games)
      .set({ status: 'completed' })
      .where(eq(games.status, 'active'));
  }

  async deleteGame(id: string): Promise<void> {
    // Delete all game players for this game
    await this.db.delete(gamePlayers).where(eq(gamePlayers.gameId, id));
    // Delete the game
    await this.db.delete(games).where(eq(games.id, id));
  }

  async createGamePlayer(insertGamePlayer: InsertGamePlayer): Promise<GamePlayer> {
    const [gamePlayer] = await this.db.insert(gamePlayers).values(insertGamePlayer).returning();
    return gamePlayer;
  }

  async getGamePlayersByGameAndTeam(gameId: string, teamId: string): Promise<GamePlayer[]> {
    const players = await this.db
      .select()
      .from(gamePlayers)
      .where(eq(gamePlayers.gameId, gameId));
    
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
      .from(gamePlayers)
      .where(eq(gamePlayers.gameId, gameId));
    
    return players.sort((a, b) => {
      const [aLast = ''] = a.name.split(' ').slice(-1);
      const [bLast = ''] = b.name.split(' ').slice(-1);
      return aLast.localeCompare(bLast);
    });
  }

  async updateGamePlayerStats(id: string, points: number, fouls: number): Promise<GamePlayer | undefined> {
    const [updated] = await this.db
      .update(gamePlayers)
      .set({ points, fouls })
      .where(eq(gamePlayers.id, id))
      .returning();
    return updated;
  }

  async updateGamePlayerMissing(id: string, missing: boolean): Promise<GamePlayer | undefined> {
    const [updated] = await this.db
      .update(gamePlayers)
      .set({ missing })
      .where(eq(gamePlayers.id, id))
      .returning();
    return updated;
  }

  async deleteGamePlayer(id: string): Promise<void> {
    await this.db.delete(gamePlayers).where(eq(gamePlayers.id, id));
  }
}

// Auto-detect environment and use appropriate storage
async function createStorage(): Promise<IStorage> {
  // Check if running in Electron (database path will be provided)
  const sqliteDbPath = process.env.SQLITE_DB_PATH;
  
  if (sqliteDbPath) {
    // Use SQLite for Electron - dynamic import for ESM
    // Node will resolve .ts in dev (tsx) and .js in production (esbuild)
    const { SqliteStorage } = await import('./storage.sqlite');
    return new SqliteStorage(sqliteDbPath);
  } else if (process.env.DATABASE_URL) {
    // Use PostgreSQL for web
    return new DbStorage();
  } else {
    // Use in-memory for development
    return new MemStorage();
  }
}

// Single storage instance
let storageInstance: IStorage | null = null;
export const storagePromise = createStorage().then(s => {
  storageInstance = s;
  // Also set the backward-compatible export
  storage = s;
  return s;
});

// Synchronous accessor that throws if storage not initialized
export const getStorage = (): IStorage => {
  if (!storageInstance) {
    throw new Error('Storage not initialized. Make sure to await storagePromise before using storage.');
  }
  return storageInstance;
};

// For backward compatibility with synchronous imports
// Will be set once storagePromise resolves
export let storage: IStorage = null as any;
