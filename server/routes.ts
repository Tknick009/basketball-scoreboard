import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTeamSchema, insertPlayerSchema, updatePlayerSchema, insertGameSchema, insertGamePlayerSchema, bracketSlots, insertBracketSlotSchema } from "@shared/schema";
import multer from "multer";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { eq, and } from "drizzle-orm";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/teams", async (req, res) => {
    try {
      const validated = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(validated);
      res.json(team);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/teams", async (req, res) => {
    const teams = await storage.getTeams();
    res.json(teams);
  });

  app.get("/api/teams/:id", async (req, res) => {
    const team = await storage.getTeam(req.params.id);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }
    res.json(team);
  });

  app.delete("/api/teams/:id", async (req, res) => {
    try {
      await storage.deleteTeam(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/players/upload", upload.single("roster"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const teamId = req.body.teamId;
      if (!teamId) {
        return res.status(400).json({ error: "Team ID required" });
      }

      const csvContent = req.file.buffer.toString('utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      const players = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          const number = parseInt(parts[0]);
          const name = parts[1];
          
          if (!isNaN(number) && name) {
            const player = await storage.createPlayer({
              teamId,
              name,
              number,
            });
            players.push(player);
          }
        }
      }

      res.json({ success: true, count: players.length, players });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/players/bulk-import", upload.single("csv"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const csvContent = req.file.buffer.toString('utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        return res.status(400).json({ error: "CSV file must contain a header and at least one data row" });
      }

      // Parse header
      const header = lines[0].toLowerCase().split(',').map(h => h.trim());
      const firstNameIndex = header.indexOf('firstname');
      const lastNameIndex = header.indexOf('lastname');
      const teamIndex = header.indexOf('team');

      if (firstNameIndex === -1 || lastNameIndex === -1 || teamIndex === -1) {
        return res.status(400).json({ error: "CSV must have FirstName, LastName, and Team columns" });
      }

      const players = [];
      const teams = await storage.getTeams();
      const teamMap = new Map(teams.map(t => [t.name.toLowerCase(), t]));

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(',').map(p => p.trim());
        if (parts.length > Math.max(firstNameIndex, lastNameIndex, teamIndex)) {
          const firstName = parts[firstNameIndex];
          const lastName = parts[lastNameIndex];
          const teamName = parts[teamIndex];
          
          if (firstName && lastName && teamName) {
            // Find or create team
            let team = teamMap.get(teamName.toLowerCase());
            if (!team) {
              team = await storage.createTeam({ name: teamName });
              teamMap.set(teamName.toLowerCase(), team);
            }

            // Create player
            const player = await storage.createPlayer({
              teamId: team.id,
              name: `${firstName} ${lastName}`,
              number: null,
            });
            players.push(player);
          }
        }
      }

      res.json({ success: true, count: players.length, players });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/players/:teamId", async (req, res) => {
    const players = await storage.getPlayersByTeam(req.params.teamId);
    res.json(players);
  });

  app.post("/api/players", async (req, res) => {
    try {
      const validated = insertPlayerSchema.parse(req.body);
      const player = await storage.createPlayer(validated);
      res.json(player);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/players/:id", async (req, res) => {
    try {
      const validated = updatePlayerSchema.parse(req.body);
      const player = await storage.updatePlayer(req.params.id, validated);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      res.json(player);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/players/:id", async (req, res) => {
    try {
      await storage.deletePlayer(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/games/:gameId/players/:team", async (req, res) => {
    try {
      const { gameId, team } = req.params;
      const game = await storage.getGame(gameId);
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      
      const teamId = team === 'home' ? game.homeTeamId : game.awayTeamId;
      const gamePlayers = await storage.getGamePlayersByGameAndTeam(gameId, teamId);
      res.json(gamePlayers);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/games/:gameId/players", async (req, res) => {
    try {
      const { gameId } = req.params;
      const validated = insertGamePlayerSchema.parse({ ...req.body, gameId });
      const gamePlayer = await storage.createGamePlayer(validated);
      res.json(gamePlayer);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/game-players/:id/stats", async (req, res) => {
    try {
      const { points, fouls } = req.body;
      const gamePlayer = await storage.updateGamePlayerStats(req.params.id, points, fouls);
      if (!gamePlayer) {
        return res.status(404).json({ error: "Game player not found" });
      }
      res.json(gamePlayer);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/game-players/:id/missing", async (req, res) => {
    try {
      const { missing } = req.body;
      if (typeof missing !== 'boolean') {
        return res.status(400).json({ error: "Missing must be a boolean" });
      }
      const gamePlayer = await storage.updateGamePlayerMissing(req.params.id, missing);
      if (!gamePlayer) {
        return res.status(404).json({ error: "Game player not found" });
      }
      res.json(gamePlayer);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/game-players/:id", async (req, res) => {
    try {
      await storage.deleteGamePlayer(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/game", async (req, res) => {
    try {
      const validated = insertGameSchema.parse(req.body);
      const game = await storage.createGame(validated);
      
      // Populate game players from team rosters
      const homePlayers = await storage.getPlayersByTeam(game.homeTeamId);
      const awayPlayers = await storage.getPlayersByTeam(game.awayTeamId);
      
      for (const player of homePlayers) {
        await storage.createGamePlayer({
          gameId: game.id,
          teamId: game.homeTeamId,
          linkedPlayerId: player.id,
          name: player.name,
          number: player.number,
        });
      }
      
      for (const player of awayPlayers) {
        await storage.createGamePlayer({
          gameId: game.id,
          teamId: game.awayTeamId,
          linkedPlayerId: player.id,
          name: player.name,
          number: player.number,
        });
      }
      
      res.json(game);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/games", async (req, res) => {
    const status = req.query.status as string | undefined;
    const allGames = await storage.getGames(status);
    res.json(allGames);
  });

  app.get("/api/game/current", async (req, res) => {
    const game = await storage.getCurrentGame();
    if (!game) {
      return res.status(404).json({ error: "No active game" });
    }
    res.json(game);
  });

  app.get("/api/game/:id", async (req, res) => {
    const game = await storage.getGame(req.params.id);
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }
    res.json(game);
  });

  app.get("/api/game/:id/stats", async (req, res) => {
    try {
      const gamePlayers = await storage.getGamePlayersByGame(req.params.id);
      res.json(gamePlayers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/player-stats", async (req, res) => {
    try {
      const allGames = await storage.getGames("completed");
      // Exclude tournament games from player statistics
      const leagueGames = allGames.filter(game => !game.isTournament);
      const allGamePlayers = await Promise.all(
        leagueGames.map(game => storage.getGamePlayersByGame(game.id))
      );
      
      // Flatten and aggregate by player (excluding mid-game subs)
      const playerStats = new Map<string, { 
        name: string; 
        number: number | null; 
        totalPoints: number; 
        totalFouls: number;
        gamesPlayed: number;
      }>();
      
      for (const gamePlayers of allGamePlayers) {
        for (const gp of gamePlayers) {
          // Exclude mid-game substitutes (players without linkedPlayerId)
          if (!gp.linkedPlayerId) continue;
          
          // Exclude players marked as missing from the game
          if (gp.missing) continue;
          
          const key = gp.linkedPlayerId;
          const existing = playerStats.get(key);
          
          if (existing) {
            existing.totalPoints += gp.points;
            existing.totalFouls += gp.fouls;
            existing.gamesPlayed += 1;
          } else {
            playerStats.set(key, {
              name: gp.name,
              number: gp.number,
              totalPoints: gp.points,
              totalFouls: gp.fouls,
              gamesPlayed: 1,
            });
          }
        }
      }
      
      // Convert to array and add average points per game
      const stats = Array.from(playerStats.values()).map(player => ({
        ...player,
        avgPoints: player.gamesPlayed > 0 ? (player.totalPoints / player.gamesPlayed).toFixed(1) : '0.0'
      }));
      
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/standings", async (req, res) => {
    try {
      const completedGames = await storage.getGames("completed");
      // Exclude tournament games from standings
      const leagueGames = completedGames.filter(game => !game.isTournament);
      const allTeams = await storage.getTeams();
      
      // Calculate standings for each team
      const standingsMap = new Map<string, {
        teamId: string;
        teamName: string;
        wins: number;
        losses: number;
        pointsFor: number;
        pointsAgainst: number;
        gamesPlayed: number;
      }>();
      
      // Initialize all teams with zero stats
      for (const team of allTeams) {
        standingsMap.set(team.id, {
          teamId: team.id,
          teamName: team.name,
          wins: 0,
          losses: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          gamesPlayed: 0,
        });
      }
      
      // Process each league game (excluding tournament games)
      for (const game of leagueGames) {
        const homeTeam = standingsMap.get(game.homeTeamId);
        const awayTeam = standingsMap.get(game.awayTeamId);
        
        if (homeTeam && awayTeam) {
          // Update games played
          homeTeam.gamesPlayed += 1;
          awayTeam.gamesPlayed += 1;
          
          // Update points for/against
          homeTeam.pointsFor += game.homeScore;
          homeTeam.pointsAgainst += game.awayScore;
          awayTeam.pointsFor += game.awayScore;
          awayTeam.pointsAgainst += game.homeScore;
          
          // Determine winner and update win/loss
          if (game.homeScore > game.awayScore) {
            homeTeam.wins += 1;
            awayTeam.losses += 1;
          } else if (game.awayScore > game.homeScore) {
            awayTeam.wins += 1;
            homeTeam.losses += 1;
          }
          // Note: ties are not counted as wins or losses
        }
      }
      
      // Convert to array and calculate win percentage and point differential
      const sortedStandings = Array.from(standingsMap.values())
        .map(team => ({
          ...team,
          winPct: team.gamesPlayed > 0 ? (team.wins / team.gamesPlayed).toFixed(3) : '.000',
          pointDiff: team.pointsFor - team.pointsAgainst,
          ppg: team.gamesPlayed > 0 ? (team.pointsFor / team.gamesPlayed).toFixed(1) : '0.0',
          pag: team.gamesPlayed > 0 ? (team.pointsAgainst / team.gamesPlayed).toFixed(1) : '0.0',
        }))
        .sort((a, b) => {
          // Sort by win percentage (descending), then by point differential (descending)
          const winPctDiff = parseFloat(b.winPct) - parseFloat(a.winPct);
          if (winPctDiff !== 0) return winPctDiff;
          return b.pointDiff - a.pointDiff;
        });
      
      // Assign ranks with proper tie handling
      const standings: Array<typeof sortedStandings[0] & { rank: number }> = [];
      let currentRank = 1;
      for (let i = 0; i < sortedStandings.length; i++) {
        const team = sortedStandings[i];
        
        // If this team has same win percentage as previous, use previous rank
        if (i > 0 && parseFloat(team.winPct) === parseFloat(sortedStandings[i - 1].winPct)) {
          standings.push({ ...team, rank: standings[i - 1].rank });
        } else {
          standings.push({ ...team, rank: currentRank });
        }
        
        currentRank = i + 2; // Next potential rank
      }
      
      res.json(standings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/games/:id", async (req, res) => {
    try {
      const { pin } = req.body;
      const correctPin = process.env.DELETE_PIN || "1324";
      
      if (pin !== correctPin) {
        return res.status(401).json({ error: "Invalid PIN" });
      }

      await storage.deleteGame(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/game/score", async (req, res) => {
    try {
      const { team, points, gamePlayerId, gameId } = req.body;
      const game = gameId ? await storage.getGame(gameId) : await storage.getCurrentGame();
      
      if (!game) {
        return res.status(404).json({ error: "No active game" });
      }

      // If gamePlayerId is provided, update game player stats
      if (gamePlayerId) {
        const teamId = team === 'home' ? game.homeTeamId : game.awayTeamId;
        const gamePlayers = await storage.getGamePlayersByGameAndTeam(game.id, teamId);
        const gamePlayer = gamePlayers.find(gp => gp.id === gamePlayerId);

        if (gamePlayer) {
          const newPoints = Math.max(0, gamePlayer.points + points);
          await storage.updateGamePlayerStats(gamePlayerId, newPoints, gamePlayer.fouls);
        }
      }

      // Always update team score
      const updates: any = {};
      if (team === 'home') {
        updates.homeScore = Math.max(0, game.homeScore + points);
      } else {
        updates.awayScore = Math.max(0, game.awayScore + points);
      }

      // Check if Elam Ending target is reached in a tournament game
      let shouldAdvanceWinner = false;
      let winnerTeamId: string | null = null;
      
      if (game.isTournament && game.elamEndingActive && game.targetScore) {
        const newHomeScore = updates.homeScore ?? game.homeScore;
        const newAwayScore = updates.awayScore ?? game.awayScore;
        
        if (newHomeScore >= game.targetScore || newAwayScore >= game.targetScore) {
          updates.status = 'completed';
          updates.clockRunning = false;
          shouldAdvanceWinner = true;
          winnerTeamId = newHomeScore >= game.targetScore ? game.homeTeamId : game.awayTeamId;
        }
      }

      const updated = await storage.updateGame(game.id, updates);
      
      // Auto-advance winner in the bracket
      if (shouldAdvanceWinner && winnerTeamId) {
        const slot = await db.select().from(bracketSlots).where(eq(bracketSlots.gameId, game.id));
        if (slot[0]?.nextSlotId) {
          await db.update(bracketSlots)
            .set({ teamId: winnerTeamId })
            .where(eq(bracketSlots.id, slot[0].nextSlotId));
        }
      }
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/game/foul", async (req, res) => {
    try {
      const { team, gamePlayerId, gameId, count = 1 } = req.body;
      const game = gameId ? await storage.getGame(gameId) : await storage.getCurrentGame();
      
      if (!game) {
        return res.status(404).json({ error: "No active game" });
      }

      // If gamePlayerId is provided, update game player stats
      if (gamePlayerId) {
        const teamId = team === 'home' ? game.homeTeamId : game.awayTeamId;
        const gamePlayers = await storage.getGamePlayersByGameAndTeam(game.id, teamId);
        const gamePlayer = gamePlayers.find(gp => gp.id === gamePlayerId);

        if (gamePlayer) {
          const newFouls = Math.max(0, gamePlayer.fouls + count);
          await storage.updateGamePlayerStats(gamePlayerId, gamePlayer.points, newFouls);
        }
      }

      // Always update team fouls
      const updates: any = {};
      if (team === 'home') {
        updates.homeFouls = Math.max(0, game.homeFouls + count);
      } else {
        updates.awayFouls = Math.max(0, game.awayFouls + count);
      }

      const updated = await storage.updateGame(game.id, updates);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/game/clock/toggle", async (req, res) => {
    try {
      const { gameId } = req.body;
      const game = gameId ? await storage.getGame(gameId) : await storage.getCurrentGame();
      if (!game) {
        return res.status(404).json({ error: "No active game" });
      }

      const updated = await storage.updateGame(game.id, {
        clockRunning: !game.clockRunning,
      });
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/game/clock/update", async (req, res) => {
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/game/clock/reset", async (req, res) => {
    try {
      const { gameId } = req.body;
      const game = gameId ? await storage.getGame(gameId) : await storage.getCurrentGame();
      if (!game) {
        return res.status(404).json({ error: "No active game" });
      }

      const updated = await storage.updateGame(game.id, {
        timeRemaining: 1200,
        clockRunning: false,
      });
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/game/period", async (req, res) => {
    try {
      const { direction, gameId } = req.body;
      const game = gameId ? await storage.getGame(gameId) : await storage.getCurrentGame();
      
      if (!game) {
        return res.status(404).json({ error: "No active game" });
      }

      const newPeriod = direction === 'next' ? game.period + 1 : Math.max(1, game.period - 1);
      
      // Reset team fouls when moving to a new half or overtime period
      // Period 1 = H1, Period 2 = H2, Period 3+ = OT1, OT2, OT3, etc.
      // Reset on: H1->H2 (period 1), H2->OT1 (period 2), OT1->OT2 (period 3), etc.
      const shouldResetFouls = direction === 'next' && game.period >= 1;
      
      const updates: any = {
        period: newPeriod,
      };
      
      if (shouldResetFouls) {
        updates.homeFouls = 0;
        updates.awayFouls = 0;
      }
      
      const updated = await storage.updateGame(game.id, updates);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/game/possession/toggle", async (req, res) => {
    try {
      const { gameId } = req.body;
      const game = gameId ? await storage.getGame(gameId) : await storage.getCurrentGame();
      if (!game) {
        return res.status(404).json({ error: "No active game" });
      }

      const updated = await storage.updateGame(game.id, {
        possession: game.possession === 'home' ? 'away' : 'home',
      });
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/game/timeout", async (req, res) => {
    try {
      const { team, action = 'subtract', gameId } = req.body;
      const game = gameId ? await storage.getGame(gameId) : await storage.getCurrentGame();
      
      if (!game) {
        return res.status(404).json({ error: "No active game" });
      }

      const updates: any = {};
      if (team === 'home') {
        if (action === 'add') {
          updates.homeTimeouts = game.homeTimeouts + 1;
        } else if (action === 'subtract') {
          if (game.homeTimeouts <= 0) {
            return res.status(400).json({ error: "No timeouts remaining for home team" });
          }
          updates.homeTimeouts = game.homeTimeouts - 1;
        }
      } else if (team === 'away') {
        if (action === 'add') {
          updates.awayTimeouts = game.awayTimeouts + 1;
        } else if (action === 'subtract') {
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/game/swap-teams", async (req, res) => {
    try {
      const { gameId } = req.body;
      const game = gameId ? await storage.getGame(gameId) : await storage.getCurrentGame();
      
      if (!game) {
        return res.status(404).json({ error: "No active game" });
      }

      // Swap all team-related data
      const updated = await storage.updateGame(game.id, {
        homeTeamId: game.awayTeamId,
        awayTeamId: game.homeTeamId,
        homeScore: game.awayScore,
        awayScore: game.homeScore,
        homeFouls: game.awayFouls,
        awayFouls: game.homeFouls,
        homeTimeouts: game.awayTimeouts,
        awayTimeouts: game.homeTimeouts,
        possession: game.possession === 'home' ? 'away' : 'home',
      });

      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/game/elam/activate", async (req, res) => {
    try {
      const { targetScore, gameId } = req.body;
      const game = gameId ? await storage.getGame(gameId) : await storage.getCurrentGame();
      
      if (!game) {
        return res.status(404).json({ error: "No active game" });
      }

      const updated = await storage.updateGame(game.id, {
        elamEndingActive: true,
        targetScore: targetScore || Math.max(game.homeScore, game.awayScore) + 8,
        clockRunning: false,
      });
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/game/elam/deactivate", async (req, res) => {
    try {
      const { gameId } = req.body;
      const game = gameId ? await storage.getGame(gameId) : await storage.getCurrentGame();
      
      if (!game) {
        return res.status(404).json({ error: "No active game" });
      }

      const updated = await storage.updateGame(game.id, {
        elamEndingActive: false,
        targetScore: null,
        clockRunning: false,
      });
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/game/end", async (req, res) => {
    try {
      const { gameId } = req.body;
      const game = gameId ? await storage.getGame(gameId) : await storage.getCurrentGame();
      
      if (!game) {
        return res.status(404).json({ error: "No active game" });
      }

      const updated = await storage.updateGame(game.id, {
        status: 'completed',
        clockRunning: false,
      });
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============ GONZO CUP BRACKET ROUTES ============

  // Get all bracket slots
  app.get("/api/gonzo-cup/bracket", async (req, res) => {
    try {
      const slots = await db.select().from(bracketSlots);
      res.json(slots);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Initialize bracket with East/West divisions (4 teams each)
  app.post("/api/gonzo-cup/bracket/init", async (req, res) => {
    try {
      const { east, west } = req.body;
      
      if (!east || east.length !== 4 || !west || west.length !== 4) {
        return res.status(400).json({ error: "Exactly 4 teams required for each division (East and West)" });
      }
      
      // Clear existing bracket
      await db.delete(bracketSlots);
      
      // Create bracket structure for 8-team single elimination with East vs West divisions
      // Quarterfinals: E1vE4, E2vE3 (East), W1vW4, W2vW3 (West)
      // Semifinals: Winner of E1vE4 vs Winner of E2vE3, Winner of W1vW4 vs Winner of W2vW3
      // Finals: East SF winner vs West SF winner
      // Round 3 (Quarterfinals): 4 games, positions 0-7 (pairs of slots per match)
      // Round 2 (Semifinals): 2 games, positions 0-3 (pairs of slots per match)
      // Round 1 (Finals): 1 game, positions 0-1 (pair of slots)
      
      const allSlots: any[] = [];
      
      // Finals (Round 1) - 2 slots for the final match
      const [finalsTop] = await db.insert(bracketSlots).values({
        round: 1,
        position: 0,
        teamId: null,
        gameId: null,
        nextSlotId: null,
        isTopSlot: true,
      }).returning();
      const [finalsBottom] = await db.insert(bracketSlots).values({
        round: 1,
        position: 1,
        teamId: null,
        gameId: null,
        nextSlotId: null,
        isTopSlot: false,
      }).returning();
      allSlots.push(finalsTop, finalsBottom);
      
      // Semifinals (Round 2) - 4 slots (2 per match)
      // East Semifinal: positions 0,1
      const [semi1Top] = await db.insert(bracketSlots).values({
        round: 2,
        position: 0,
        teamId: null,
        gameId: null,
        nextSlotId: finalsTop.id,
        isTopSlot: true,
      }).returning();
      const [semi1Bottom] = await db.insert(bracketSlots).values({
        round: 2,
        position: 1,
        teamId: null,
        gameId: null,
        nextSlotId: finalsTop.id,
        isTopSlot: false,
      }).returning();
      // West Semifinal: positions 2,3
      const [semi2Top] = await db.insert(bracketSlots).values({
        round: 2,
        position: 2,
        teamId: null,
        gameId: null,
        nextSlotId: finalsBottom.id,
        isTopSlot: true,
      }).returning();
      const [semi2Bottom] = await db.insert(bracketSlots).values({
        round: 2,
        position: 3,
        teamId: null,
        gameId: null,
        nextSlotId: finalsBottom.id,
        isTopSlot: false,
      }).returning();
      allSlots.push(semi1Top, semi1Bottom, semi2Top, semi2Bottom);
      
      // Quarterfinals (Round 3) - Within-division matchups
      // QF1: E1 vs E4 -> Winner goes to East Semi top slot
      const qf1 = await db.insert(bracketSlots).values({
        round: 3,
        position: 0,
        teamId: east[0], // E1
        gameId: null,
        nextSlotId: semi1Top.id,
        isTopSlot: true,
      }).returning();
      const qf2 = await db.insert(bracketSlots).values({
        round: 3,
        position: 1,
        teamId: east[3], // E4
        gameId: null,
        nextSlotId: semi1Top.id,
        isTopSlot: false,
      }).returning();
      
      // QF2: E2 vs E3 -> Winner goes to East Semi bottom slot
      const qf3 = await db.insert(bracketSlots).values({
        round: 3,
        position: 2,
        teamId: east[1], // E2
        gameId: null,
        nextSlotId: semi1Bottom.id,
        isTopSlot: true,
      }).returning();
      const qf4 = await db.insert(bracketSlots).values({
        round: 3,
        position: 3,
        teamId: east[2], // E3
        gameId: null,
        nextSlotId: semi1Bottom.id,
        isTopSlot: false,
      }).returning();
      
      // QF3: W1 vs W4 -> Winner goes to West Semi top slot
      const qf5 = await db.insert(bracketSlots).values({
        round: 3,
        position: 4,
        teamId: west[0], // W1
        gameId: null,
        nextSlotId: semi2Top.id,
        isTopSlot: true,
      }).returning();
      const qf6 = await db.insert(bracketSlots).values({
        round: 3,
        position: 5,
        teamId: west[3], // W4
        gameId: null,
        nextSlotId: semi2Top.id,
        isTopSlot: false,
      }).returning();
      
      // QF4: W2 vs W3 -> Winner goes to West Semi bottom slot
      const qf7 = await db.insert(bracketSlots).values({
        round: 3,
        position: 6,
        teamId: west[1], // W2
        gameId: null,
        nextSlotId: semi2Bottom.id,
        isTopSlot: true,
      }).returning();
      const qf8 = await db.insert(bracketSlots).values({
        round: 3,
        position: 7,
        teamId: west[2], // W3
        gameId: null,
        nextSlotId: semi2Bottom.id,
        isTopSlot: false,
      }).returning();
      
      allSlots.push(qf1[0], qf2[0], qf3[0], qf4[0], qf5[0], qf6[0], qf7[0], qf8[0]);
      
      res.json({ success: true, slots: allSlots });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete all bracket slots (reset bracket)
  app.delete("/api/gonzo-cup/bracket", async (req, res) => {
    try {
      await db.delete(bracketSlots);
      res.json({ success: true, message: "Bracket reset successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update a bracket slot (assign team, game, or scheduled time)
  app.patch("/api/gonzo-cup/bracket/:slotId", async (req, res) => {
    try {
      const { slotId } = req.params;
      const { teamId, gameId, scheduledTime } = req.body;
      
      const updates: any = {};
      if (teamId !== undefined) updates.teamId = teamId;
      if (gameId !== undefined) updates.gameId = gameId;
      if (scheduledTime !== undefined) updates.scheduledTime = scheduledTime;
      
      const [updated] = await db.update(bracketSlots)
        .set(updates)
        .where(eq(bracketSlots.id, slotId))
        .returning();
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create a game for a bracket match
  app.post("/api/gonzo-cup/bracket/:position/game", async (req, res) => {
    try {
      const { position } = req.params;
      const { round } = req.body;
      
      // Find the two teams for this match position
      const posNum = parseInt(position);
      const topSlot = await db.select().from(bracketSlots)
        .where(and(eq(bracketSlots.round, round), eq(bracketSlots.position, posNum * 2)));
      const bottomSlot = await db.select().from(bracketSlots)
        .where(and(eq(bracketSlots.round, round), eq(bracketSlots.position, posNum * 2 + 1)));
      
      if (!topSlot[0]?.teamId || !bottomSlot[0]?.teamId) {
        return res.status(400).json({ error: "Both teams must be assigned before creating a game" });
      }
      
      // Create the game as a tournament game
      const game = await storage.createGame({
        homeTeamId: topSlot[0].teamId,
        awayTeamId: bottomSlot[0].teamId,
        isTournament: true,
      });
      
      // Populate game players from team rosters
      const homePlayers = await storage.getPlayersByTeam(game.homeTeamId);
      const awayPlayers = await storage.getPlayersByTeam(game.awayTeamId);
      
      for (const player of homePlayers) {
        await storage.createGamePlayer({
          gameId: game.id,
          teamId: game.homeTeamId,
          linkedPlayerId: player.id,
          name: player.name,
          number: player.number,
        });
      }
      
      for (const player of awayPlayers) {
        await storage.createGamePlayer({
          gameId: game.id,
          teamId: game.awayTeamId,
          linkedPlayerId: player.id,
          name: player.name,
          number: player.number,
        });
      }
      
      // Link game to the top slot
      await db.update(bracketSlots)
        .set({ gameId: game.id })
        .where(eq(bracketSlots.id, topSlot[0].id));
      
      res.json(game);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get Gonzo Cup tournament stats (similar to player-stats but for tournament games only)
  app.get("/api/gonzo-cup/stats", async (req, res) => {
    try {
      const allGames = await storage.getGames("completed");
      // Only tournament games
      const tournamentGames = allGames.filter(game => game.isTournament);
      const allGamePlayers = await Promise.all(
        tournamentGames.map(game => storage.getGamePlayersByGame(game.id))
      );
      
      // Flatten and aggregate by player
      const playerStats = new Map<string, { 
        name: string; 
        number: number | null; 
        totalPoints: number; 
        totalFouls: number;
        gamesPlayed: number;
      }>();
      
      for (const gamePlayers of allGamePlayers) {
        for (const gp of gamePlayers) {
          if (!gp.linkedPlayerId) continue;
          if (gp.missing) continue;
          
          const key = gp.linkedPlayerId;
          const existing = playerStats.get(key);
          
          if (existing) {
            existing.totalPoints += gp.points;
            existing.totalFouls += gp.fouls;
            existing.gamesPlayed += 1;
          } else {
            playerStats.set(key, {
              name: gp.name,
              number: gp.number,
              totalPoints: gp.points,
              totalFouls: gp.fouls,
              gamesPlayed: 1,
            });
          }
        }
      }
      
      const stats = Array.from(playerStats.values()).map(player => ({
        ...player,
        avgPoints: player.gamesPlayed > 0 ? (player.totalPoints / player.gamesPlayed).toFixed(1) : '0.0'
      }));
      
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get Gonzo Cup tournament games
  app.get("/api/gonzo-cup/games", async (req, res) => {
    try {
      const allGames = await storage.getGames();
      const tournamentGames = allGames.filter(game => game.isTournament);
      res.json(tournamentGames);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Sync endpoint for desktop app to publish completed games to cloud
  app.post("/api/sync/game", async (req, res) => {
    try {
      const { syncKey, game, gamePlayers, teams: syncTeams, sourceGameId } = req.body;
      
      // Require sync key from environment - fail closed if not set
      const requiredSyncKey = process.env.SYNC_KEY;
      if (!requiredSyncKey) {
        return res.status(500).json({ error: "Sync key not configured on server" });
      }
      if (syncKey !== requiredSyncKey) {
        return res.status(401).json({ error: "Invalid sync key" });
      }
      
      if (!game || !sourceGameId) {
        return res.status(400).json({ error: "Game data and sourceGameId required" });
      }
      
      // Check if this source game has already been synced (idempotent by source ID)
      const allGames = await storage.getGames("completed");
      // Use a simple check - if there's a game with matching teams and exact scores from same time period
      // In production, you'd store sourceGameId in the cloud DB
      const existingGame = allGames.find(g => 
        g.homeScore === game.homeScore &&
        g.awayScore === game.awayScore &&
        Math.abs(g.createdAt - game.createdAt) < 86400 // Within 24 hours
      );
      
      if (existingGame) {
        return res.json({ success: true, message: "Game already synced", gameId: existingGame.id, duplicate: true });
      }
      
      // Cache teams lookup once
      const existingTeams = await storage.getTeams();
      const teamIdMap = new Map<string, string>();
      
      if (syncTeams && Array.isArray(syncTeams)) {
        for (const syncTeam of syncTeams) {
          const existing = existingTeams.find(t => t.name.toLowerCase() === syncTeam.name.toLowerCase());
          
          if (existing) {
            teamIdMap.set(syncTeam.id, existing.id);
          } else {
            const newTeam = await storage.createTeam({ name: syncTeam.name });
            teamIdMap.set(syncTeam.id, newTeam.id);
          }
        }
      }
      
      const cloudHomeTeamId = teamIdMap.get(game.homeTeamId) || game.homeTeamId;
      const cloudAwayTeamId = teamIdMap.get(game.awayTeamId) || game.awayTeamId;
      
      // Create the game
      const newGame = await storage.createGame({
        homeTeamId: cloudHomeTeamId,
        awayTeamId: cloudAwayTeamId,
        isTournament: game.isTournament || false,
      });
      
      // Update game with final scores and status
      await storage.updateGame(newGame.id, {
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        period: game.period,
        timeRemaining: game.timeRemaining,
        homeFouls: game.homeFouls,
        awayFouls: game.awayFouls,
        homeTimeouts: game.homeTimeouts,
        awayTimeouts: game.awayTimeouts,
        elamEndingActive: game.elamEndingActive,
        targetScore: game.targetScore,
        status: "completed",
      });
      
      // Create game players with their stats - batch player lookup per team
      if (gamePlayers && Array.isArray(gamePlayers)) {
        const playersByTeam = new Map<string, any[]>();
        
        for (const gp of gamePlayers) {
          const cloudTeamId = teamIdMap.get(gp.teamId) || gp.teamId;
          
          // Cache player lookup per team
          if (!playersByTeam.has(cloudTeamId)) {
            playersByTeam.set(cloudTeamId, await storage.getPlayersByTeam(cloudTeamId));
          }
          const cloudPlayers = playersByTeam.get(cloudTeamId) || [];
          const matchedPlayer = cloudPlayers.find(p => 
            p.name.toLowerCase() === gp.name.toLowerCase()
          );
          
          // Create game player and get back the created record
          const createdGp = await storage.createGamePlayer({
            gameId: newGame.id,
            teamId: cloudTeamId,
            name: gp.name,
            number: gp.number,
            linkedPlayerId: matchedPlayer?.id || null,
          });
          
          // Update with points and fouls using the returned ID
          if (createdGp) {
            await storage.updateGamePlayerStats(createdGp.id, gp.points, gp.fouls);
          }
        }
      }
      
      res.json({ success: true, message: "Game synced successfully", gameId: newGame.id });
    } catch (error: any) {
      console.error("Sync error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
