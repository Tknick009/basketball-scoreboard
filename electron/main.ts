import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import { createSyncService } from './sync-service';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SyncConfig {
  cloudUrl: string;
  syncKey: string;
  enabled: boolean;
}

function loadSyncConfig(): SyncConfig | null {
  const configPaths = [
    path.join(app.getPath('userData'), 'sync-config.json'),
    path.join(__dirname, 'sync-config.json'),
    path.join(__dirname, '../electron/sync-config.json'),
  ];
  
  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content) as SyncConfig;
        if (config.enabled && config.syncKey && config.cloudUrl) {
          return config;
        }
      }
    } catch (err) {
      // Continue to next path
    }
  }
  return null;
}

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;
let syncService: ReturnType<typeof createSyncService> | null = null;

// Set environment variable to use SQLite
process.env.ELECTRON = 'true';

// Create log file
const logPath = path.join(app.getPath('userData'), 'app.log');
function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logPath, logMessage);
  console.log(message);
}

log('=== Basketball Scoreboard Starting ===');
log(`Log file: ${logPath}`);

function createWindow() {
  log('Creating main window...');
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../client/public/icon-512.png'),
  });

  // Always open DevTools to see errors
  mainWindow.webContents.openDevTools();
  log('DevTools opened');

  // Start Express server
  startServer();

  // Wait for server to be ready, then load
  waitForServer().then(() => {
    log('Server is ready, loading app...');
    mainWindow?.loadURL('http://localhost:5000');
    
    // Start sync service for cloud publishing (only if configured)
    const dbPath = path.join(app.getPath('userData'), 'basketball.db');
    const syncConfig = loadSyncConfig();
    
    if (syncConfig) {
      syncService = createSyncService(dbPath, {
        cloudUrl: syncConfig.cloudUrl,
        syncKey: syncConfig.syncKey,
        syncIntervalMs: 30000, // Check every 30 seconds
      });
      syncService.start();
      log(`Sync service started (cloud: ${syncConfig.cloudUrl})`);
    } else {
      log('Sync service disabled - sync-config.json not found or enabled=false');
      log('Games will be stored locally only');
      log(`To enable: create sync-config.json in ${app.getPath('userData')}`);
    }
  }).catch((err) => {
    log(`ERROR: Server failed to start: ${err.message}`);
    log(`Full error: ${JSON.stringify(err)}`);
  });

  mainWindow.on('closed', () => {
    log('Main window closed');
    mainWindow = null;
  });
}

async function waitForServer(maxAttempts = 30) {
  const http = await import('http');
  log(`Waiting for server to start (max ${maxAttempts} attempts)...`);
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const req = http.request('http://localhost:5000', { method: 'GET' }, (res) => {
          resolve();
        });
        req.on('error', reject);
        req.end();
      });
      log(`Server ready after ${i + 1} attempts`);
      return; // Server is ready
    } catch (err) {
      // Server not ready yet, wait 1 second
      if (i % 5 === 0) {
        log(`Still waiting for server... attempt ${i + 1}/${maxAttempts}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('Server failed to start after 30 seconds');
}

function startServer() {
  const serverPath = path.join(__dirname, '../dist/index.js');
  const dbPath = path.join(app.getPath('userData'), 'basketball.db');
  
  log(`Starting server...`);
  log(`  Server path: ${serverPath}`);
  log(`  Database path: ${dbPath}`);
  log(`  Electron binary: ${process.execPath}`);
  log(`  __dirname: ${__dirname}`);
  
  // Check if server file exists
  if (!fs.existsSync(serverPath)) {
    log(`ERROR: Server file not found at ${serverPath}`);
    return;
  }
  log('Server file exists ✓');
  
  // Use Electron's Node binary with ELECTRON_RUN_AS_NODE flag
  serverProcess = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      SQLITE_DB_PATH: dbPath,
      PORT: '5000',
      NODE_ENV: 'production',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout?.on('data', (data) => {
    log(`SERVER: ${data.toString().trim()}`);
  });

  serverProcess.stderr?.on('data', (data) => {
    log(`SERVER ERROR: ${data.toString().trim()}`);
  });

  serverProcess.on('error', (err) => {
    log(`ERROR: Failed to start server process: ${err.message}`);
  });

  serverProcess.on('exit', (code, signal) => {
    log(`Server process exited with code ${code}, signal ${signal}`);
  });
  
  log('Server process spawned');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (syncService) {
    syncService.stop();
  }
  if (serverProcess) {
    serverProcess.kill();
  }
});
