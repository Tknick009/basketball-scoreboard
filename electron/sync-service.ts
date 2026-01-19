interface SyncConfig {
  cloudUrl: string;
  syncKey: string;
  syncIntervalMs: number;
  maxRetries: number;
  baseRetryDelayMs: number;
}

interface SyncService {
  start: () => void;
  stop: () => void;
  syncNow: () => Promise<void>;
  getStatus: () => SyncStatus;
}

interface SyncStatus {
  isRunning: boolean;
  lastSyncAttempt: Date | null;
  pendingGames: number;
  failedGames: number;
  syncedGames: number;
}

const DEFAULT_CONFIG: SyncConfig = {
  cloudUrl: 'https://basketball-scoreboard.replit.app',
  syncKey: '',
  syncIntervalMs: 30000,
  maxRetries: 5,
  baseRetryDelayMs: 5000,
};

let syncInterval: NodeJS.Timeout | null = null;
let isSyncing = false;
let syncStatus: SyncStatus = {
  isRunning: false,
  lastSyncAttempt: null,
  pendingGames: 0,
  failedGames: 0,
  syncedGames: 0,
};

export function createSyncService(dbPath: string, config: Partial<SyncConfig> = {}): SyncService {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  if (!finalConfig.syncKey) {
    console.warn('Sync service: No sync key provided, sync will fail');
  }
  
  async function getDb() {
    const Database = (await import('better-sqlite3')).default;
    return new Database(dbPath);
  }

  function calculateBackoffDelay(retryCount: number): number {
    const delay = finalConfig.baseRetryDelayMs * Math.pow(2, retryCount);
    const jitter = Math.random() * 1000;
    return Math.min(delay + jitter, 300000);
  }

  async function syncCompletedGames() {
    if (isSyncing) {
      console.log('Sync already in progress, skipping');
      return;
    }
    
    isSyncing = true;
    const db = await getDb();
    
    try {
      const unsyncedGames = db.prepare(`
        SELECT * FROM games 
        WHERE status = 'completed' 
        AND sync_status != 'synced'
        AND (sync_retry_count IS NULL OR sync_retry_count < ?)
      `).all(finalConfig.maxRetries) as any[];

      syncStatus.pendingGames = unsyncedGames.length;
      
      for (const game of unsyncedGames) {
        const retryCount = game.sync_retry_count || 0;
        const lastAttempt = game.last_sync_attempt || 0;
        const backoffDelay = calculateBackoffDelay(retryCount);
        const now = Math.floor(Date.now() / 1000);
        
        if (lastAttempt > 0 && (now - lastAttempt) * 1000 < backoffDelay) {
          continue;
        }
        
        try {
          const gamePlayers = db.prepare(`
            SELECT * FROM game_players WHERE game_id = ?
          `).all(game.id) as any[];
          
          const homeTeam = db.prepare(`SELECT * FROM teams WHERE id = ?`).get(game.home_team_id) as any;
          const awayTeam = db.prepare(`SELECT * FROM teams WHERE id = ?`).get(game.away_team_id) as any;
          
          const teams = [homeTeam, awayTeam].filter(Boolean);
          
          const payload = {
            syncKey: finalConfig.syncKey,
            sourceGameId: game.id,
            game: {
              id: game.id,
              homeTeamId: game.home_team_id,
              awayTeamId: game.away_team_id,
              homeScore: game.home_score,
              awayScore: game.away_score,
              period: game.period,
              timeRemaining: game.time_remaining,
              homeFouls: game.home_fouls,
              awayFouls: game.away_fouls,
              homeTimeouts: game.home_timeouts,
              awayTimeouts: game.away_timeouts,
              elamEndingActive: game.elam_ending_active,
              targetScore: game.target_score,
              isTournament: game.is_tournament,
              createdAt: game.created_at,
            },
            gamePlayers: gamePlayers.map(gp => ({
              id: gp.id,
              gameId: gp.game_id,
              teamId: gp.team_id,
              linkedPlayerId: gp.linked_player_id,
              name: gp.name,
              number: gp.number,
              points: gp.points,
              fouls: gp.fouls,
            })),
            teams: teams.map(t => ({
              id: t.id,
              name: t.name,
            })),
          };
          
          const response = await fetch(`${finalConfig.cloudUrl}/api/sync/game`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
          
          if (response.ok) {
            db.prepare(`
              UPDATE games 
              SET sync_status = 'synced', 
                  last_sync_attempt = ?, 
                  sync_error = NULL,
                  sync_retry_count = 0
              WHERE id = ?
            `).run(now, game.id);
            
            syncStatus.syncedGames++;
            console.log(`Game ${game.id} synced successfully`);
          } else {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}`);
          }
        } catch (error: any) {
          const newRetryCount = retryCount + 1;
          const status = newRetryCount >= finalConfig.maxRetries ? 'failed_permanent' : 'failed';
          
          db.prepare(`
            UPDATE games 
            SET sync_status = ?, 
                last_sync_attempt = ?, 
                sync_error = ?,
                sync_retry_count = ?
            WHERE id = ?
          `).run(status, Math.floor(Date.now() / 1000), error.message, newRetryCount, game.id);
          
          if (status === 'failed_permanent') {
            syncStatus.failedGames++;
            console.error(`Game ${game.id} permanently failed after ${newRetryCount} retries: ${error.message}`);
          } else {
            console.warn(`Game ${game.id} sync failed (attempt ${newRetryCount}/${finalConfig.maxRetries}): ${error.message}`);
          }
        }
      }
      
      syncStatus.lastSyncAttempt = new Date();
    } finally {
      db.close();
      isSyncing = false;
    }
  }

  return {
    start() {
      if (syncInterval) {
        return;
      }
      
      syncStatus.isRunning = true;
      console.log(`Starting sync service, interval: ${finalConfig.syncIntervalMs}ms, cloudUrl: ${finalConfig.cloudUrl}`);
      
      syncCompletedGames().catch(console.error);
      
      syncInterval = setInterval(() => {
        syncCompletedGames().catch(console.error);
      }, finalConfig.syncIntervalMs);
    },
    
    stop() {
      if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
      }
      syncStatus.isRunning = false;
      console.log('Sync service stopped');
    },
    
    async syncNow() {
      await syncCompletedGames();
    },
    
    getStatus() {
      return { ...syncStatus };
    },
  };
}
