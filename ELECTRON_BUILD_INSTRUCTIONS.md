# Basketball Scoreboard - Desktop App Build Instructions

## Overview
Your Basketball Scoreboard app now supports **both web and desktop versions**:
- **Web Version**: Runs on Replit with PostgreSQL (published URL)
- **Desktop Version**: Standalone Windows app with offline SQLite database

## Building the Windows Desktop App

### Prerequisites
You need a **Windows computer** with:
- Node.js 18+ installed ([download here](https://nodejs.org/))
- Git installed (optional, for cloning)
- **Windows Build Tools** (required for SQLite):
  ```cmd
  npm install -g windows-build-tools
  ```
  OR install Visual Studio Build Tools with "Desktop development with C++" workload

### Step 1: Download the Code

**Option A: Download ZIP from Replit**
1. In Replit, click the three dots (⋮) menu
2. Select "Download as ZIP"
3. Extract the ZIP file on your Windows computer

**Option B: Clone via Git** (if you have Git installed)
```bash
git clone <your-replit-git-url>
cd basketball-scoreboard
```

### Step 2: Install Dependencies

Open Command Prompt or PowerShell in the project folder and run:
```bash
npm install
```

This will install all required packages including Electron and SQLite.

### Step 3: Configure Cloud Sync (Optional)

If you want completed games to automatically sync to your online version:

1. Open `electron/sync-config.json`
2. Edit the settings:
   ```json
   {
     "cloudUrl": "https://your-app-name.replit.app",
     "syncKey": "your-secret-sync-key-here",
     "enabled": true
   }
   ```
3. Set `enabled` to `true` and fill in your cloud URL and sync key

**Note:** The sync key must match the `SYNC_KEY` secret configured on your Replit server.

**After Installation:** Users can also configure sync by creating `sync-config.json` in their app data folder:
- Windows: `C:\Users\<YourName>\AppData\Roaming\basketball-scoreboard\sync-config.json`

Without this configuration, the app still works perfectly offline - games just won't sync to the cloud automatically.

### Step 4: Build the Desktop App

**On Windows:** Double-click `build-electron.bat` or run in Command Prompt:
```cmd
build-electron.bat
```

**On Mac/Linux:**
```bash
bash build-electron.sh
```

This process will:
1. Build the frontend (React + Vite)
2. Build the backend server (Express)
3. Build the Electron main process
4. Create a Windows installer (.exe)

**Build time**: 2-5 minutes depending on your computer

### Step 4: Find Your Installer

After the build completes, you'll find the installer in:
```
release/Basketball Scoreboard Setup <version>.exe
```

**File size**: Approximately 150-200 MB (includes Node.js runtime and dependencies)

## Installing on Other Computers

### For End Users:
1. Copy the `.exe` installer file to any Windows computer
2. Double-click to install
3. The app will install to `C:\Program Files\Basketball Scoreboard\`
4. Desktop and Start Menu shortcuts are created automatically

### First Launch:
- The app will create a SQLite database in your user data folder
- Default teams (Black, Orange, Purple, Camo, White, Red, Green, Blue) are auto-created
- All data is stored locally - **no internet required**

## Database Location

The SQLite database is stored at:
```
C:\Users\<YourName>\AppData\Roaming\basketball-scoreboard\basketball.db
```

This ensures each user has their own data, and it persists between app updates.

## Testing Locally (Development Mode)

To test the Electron app without building an installer:
```bash
bash run-electron-dev.sh
```

This will:
- Build the frontend and backend
- Launch the Electron app in development mode
- Open with DevTools for debugging

## Cloud Sync Feature

The desktop app can automatically publish completed games to your online version when internet is available.

### How It Works:
1. You run games offline on the desktop app
2. When a game is marked "completed", it's queued for sync
3. Every 30 seconds, the app checks for internet and tries to sync
4. Successfully synced games appear on your public web version
5. Failed syncs retry with exponential backoff (up to 5 attempts)

### Sync Status:
- **pending**: Game completed, waiting to sync
- **synced**: Successfully uploaded to cloud
- **failed**: Temporary failure, will retry
- **failed_permanent**: Failed after 5 attempts

### Requirements:
- Same SYNC_KEY configured on both desktop app and Replit server
- Internet connection (only when syncing, not for regular use)

## Key Differences: Web vs Desktop

| Feature | Web Version | Desktop Version |
|---------|-------------|-----------------|
| Database | PostgreSQL (Neon) | SQLite (local file) |
| Requires Internet | Yes | No (sync optional) |
| Installation | None (browser) | Windows installer |
| Updates | Automatic (publish to Replit) | Manual (new installer) |
| Data Location | Replit cloud | User's computer |
| Multi-device | Yes (same URL) | No (each device separate) |
| Cloud Sync | N/A | Optional (auto-uploads completed games) |

## Distribution Options

### Option 1: Direct Download
- Upload the `.exe` to Google Drive, Dropbox, or your website
- Share the download link with users
- Users download and install manually

### Option 2: Microsoft Store (Advanced)
- Requires Microsoft Developer account ($19 one-time fee)
- Longer approval process (1-3 days)
- Users can find and install from the Store
- Automatic updates possible

### Option 3: USB/Flash Drive
- Copy the `.exe` to a USB drive
- Physically distribute to users
- Good for offline venues or tournaments

## Updating the Desktop App

When you make code changes:
1. Make changes in Replit (or locally)
2. Download/pull the latest code
3. Run `npm run electron:build` again
4. Distribute the new `.exe` file to users
5. Users run the new installer (data is preserved)

## Troubleshooting

### Build Fails with "electron not found"
```bash
npm install electron electron-builder --save-dev
```

### SQLite Database Errors
Delete the database and restart the app:
```
C:\Users\<YourName>\AppData\Roaming\basketball-scoreboard\basketball.db
```

### App Won't Start
- Check Windows Defender/antivirus didn't block it
- Try "Run as Administrator"
- Check Event Viewer for error details

### "Missing DLL" Errors
Run the Visual C++ Redistributable installer:
https://aka.ms/vs/17/release/vc_redist.x64.exe

## Support

For issues:
1. Check the console logs (Help > Toggle Developer Tools)
2. Look for errors in Event Viewer (Windows Logs > Application)
3. Contact your developer or open an issue

## Technical Notes

- Built with Electron 39
- Uses better-sqlite3 for database
- Express server runs on port 5000 internally
- Frontend served from localhost
- No external APIs required (fully offline)

---

**Your web version on Replit continues to work independently!**
The desktop version uses a separate SQLite database and doesn't affect your published web app.
