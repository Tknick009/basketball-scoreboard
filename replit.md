# Basketball Scoreboard Application

## Overview
A comprehensive basketball scoreboard application designed for real-time game management and large-screen display. Available in **two versions**:
1. **Web Version**: Browser-based app running on Replit with PostgreSQL database
2. **Desktop Version**: Standalone Windows application with offline SQLite database

The app features a single-view architecture with an integrated 480×120px scoreboard display, professional sports aesthetics, and supports multiple concurrent games with database persistence. The project aims to provide an intuitive tool for managing basketball games, tracking statistics, and offering a clear, visible display suitable for sports venues.

## User Preferences
I prefer detailed explanations. I want iterative development. Ask before making major changes. I prefer clear and concise communication. Do not make changes to the `server/storage.ts` file. Do not make changes to the `shared/schema.ts` file without prior approval.

## System Architecture

### UI/UX Decisions
The application utilizes a single-view architecture where the control panel integrates the scoreboard display. The design emphasizes professional sports aesthetics with maximized font sizes (Roboto Mono fixed-width for scoreboard elements optimized for LED video boards, Inter for UI) for optimal visibility on a 480×120px display, suitable for hardware duplication. A professional blue primary color and clean neutral backgrounds ensure high contrast. Key features include smooth 400ms fade animations for clock/Elam mode transitions, a shiny gold Elam Ending display, and dynamic team colors.

### Technical Implementations
The frontend is built with React + TypeScript, using Wouter for routing and TanStack Query for data fetching. The UI leverages Shadcn UI components and Tailwind CSS. The backend is an Express.js application with dual-database support:
- **Web Version**: PostgreSQL (Neon serverless) via Drizzle ORM
- **Desktop Version**: SQLite (better-sqlite3) via Drizzle ORM

The system automatically detects which database to use based on environment variables (SQLITE_DB_PATH for desktop, DATABASE_URL for web). Both versions support multiple concurrent games with independent state persisted in their respective databases. All game operations are managed through a REST API.

### Desktop Application (Electron)
A Windows desktop version is available that runs completely offline with no internet required. Built with Electron 39, it includes:
- Standalone .exe installer for Windows
- SQLite database stored in user's AppData folder
- Express server running locally on port 5000
- Same features as web version (teams, games, scoring, Elam Ending, etc.)
- Independent data storage (doesn't affect web version)
- **Optional Cloud Sync**: Automatically publishes completed games to the web version when internet is available

**Cloud Sync Feature**:
- Runs in background every 30 seconds
- Only syncs completed games (doesn't require internet for regular use)
- Uses exponential backoff with retry logic (up to 5 attempts)
- Requires SYNC_KEY and CLOUD_URL environment variables to be configured
- Sync statuses: pending, synced, failed, failed_permanent

**Build Instructions**: See `ELECTRON_BUILD_INSTRUCTIONS.md` for complete details on building the Windows installer.

**Key Files**:
- `shared/schema.ts` - PostgreSQL schema (web version)
- `shared/schema.sqlite.ts` - SQLite schema (desktop version)
- `server/storage.ts` - Auto-detection and storage interface
- `server/storage.sqlite.ts` - SQLite storage implementation
- `electron/main.ts` - Electron main process
- `electron-builder.json` - Windows installer configuration
- `build-electron.sh` - Build script for desktop version

### Feature Specifications
- **Team and Roster Management**: Create teams, edit rosters with inline editor using separate First Name and Last Name fields, and view teams. The roster editor displays current players sorted alphabetically by last name. Jersey numbers are completely optional (nullable in database). Players can be created and edited with or without numbers. Jersey number 0 is supported as a valid number (displays as "#0", distinct from null which displays as "-"). Inline editing allows updating both names and numbers after player creation.
- **Game Setup**: Select home/away teams, start new games with initialized states (20:00 clock, 3 timeouts), supporting multiple active games. Player stats reset upon new game creation.
- **Multi-Game Management**: A dedicated `/games` page lists all active and completed games, allowing selection via URL parameters (`?game=gameId`). Each game maintains independent state. Active games can be marked as complete from the Games page. Completed games can be deleted with PIN protection (PIN: 1324, configurable via DELETE_PIN environment variable).
- **Live Game Controls**:
    - **Scoring**: Quick team-level scoring (+1, +2, +3, -1) even without rosters, with optional player-level scoring (+1, +2, +3, -1). All scoring supports subtraction to correct mistakes.
    - **Fouls**: Team-level and optional player-level foul tracking (+F, -F). Includes visual "BONUS" and "BONUS+" indicators at 6 and 9 opposing team fouls, respectively. Team fouls reset per period, but player fouls persist. Player rosters sort alphabetically by last name.
    - **Game Clock**: Start/stop/reset, automatic countdown, manual time setting, and a `Spacebar` shortcut.
    - **Game Flow**: Period management (H1, H2, OT), possession toggle, timeout tracking with +/- controls in roster headers (default 3 per team), and a "Swap Teams" function.
- **Elam Ending**: Activation with a custom target score, replacing the clock display. Deactivation returns to the regular clock. Period controls are hidden when Elam Ending is active.
- **Integrated Scoreboard Display**: Fixed 480x120px display at the top, featuring scores, clock, period, possession indicator, team fouls, timeouts, and Elam target. Includes a small white Pastime logo.
- **Player Statistics**: A dedicated `/stats` page displays season statistics for all players across completed games. Stats include total points, total fouls, games played, and points per game average. Players added mid-game as substitutes (without linkedPlayerId) are excluded from statistics. The table is sortable by any column for easy analysis.
- **Team Standings**: A dedicated `/standings` page displays league standings for all teams based on completed games. Shows wins, losses, win percentage, points for/against, point differential, and points per game. Teams are sorted by win percentage (descending), then by point differential. Teams with identical win percentages receive the same rank. Ties are not counted as wins or losses.
- **Public League Page**: A shareable `/public` page combines player statistics and team standings in a single view. This read-only page is designed for external sharing with league members via link, displaying both standings and player stats with sortable tables. Perfect for distributing current league information to all participants.
- **PIN-Protected Game Deletion**: Games can be deleted from the `/games` page after entering a PIN (default: 1324). The PIN is verified per-action without session management for simplicity. The PIN can be configured via the DELETE_PIN environment variable.
- **Progressive Web App (PWA)**: The app is installable on desktop and mobile devices with offline functionality. Features include web manifest, app icons, and a service worker with network-first caching strategy that provides offline fallback for previously visited content.

### System Design Choices
The project uses a client-server architecture with a clear separation of concerns. Data models include `Team`, `Player`, and `Game`, with `Game` encompassing detailed state (scores, clock, period, fouls, Elam status). Zod validation is used for API inputs, and TypeScript ensures type safety across the application. The system prioritizes a robust multi-game architecture with PostgreSQL persistence using Drizzle ORM.

**Important Implementation Notes:**
- Jersey number 0 handling: All numeric input parsing uses `value.trim() !== '' ? parseInt(value) : null` instead of falsy checks to properly preserve 0 as a valid number.
- Display logic uses `player.number != null` to correctly distinguish between 0 (displays "#0") and null (displays "-").
- PATCH /api/players/:id endpoint supports partial updates for player names and numbers.
- Player statistics aggregation: The `/api/player-stats` endpoint filters players using `linkedPlayerId !== null` to exclude mid-game substitutes from season statistics.
- Team standings calculation: The `/api/standings` endpoint aggregates all completed games to calculate win-loss records, point differentials, and win percentages. Teams are sorted by win% (descending), then by point differential. Teams with identical win percentages receive the same rank (e.g., two teams tied for 2nd both show rank 2, next team is rank 4). Ties are not counted as wins or losses.
- Game deletion security: Uses per-action PIN verification (DELETE_PIN env var, default "1324") instead of session-based authentication for simplicity.
- Admin Mode was removed in favor of simplified PIN-protected features (stats and deletion) to avoid session authentication complexity.

## External Dependencies

### Web Version
- **PostgreSQL**: Primary database for all persistent data, including game states, teams, and players. Utilized with Drizzle ORM.
- **Neon serverless**: Used for PostgreSQL hosting.

### Desktop Version
- **Electron**: Desktop application framework (v39)
- **better-sqlite3**: Fast native SQLite3 binding for Node.js
- **SQLite**: File-based database for offline data storage

### Shared
- **React**: Frontend library for building user interfaces.
- **Express.js**: Backend web application framework.
- **Wouter**: A small routing library for React.
- **TanStack Query**: For data fetching, caching, and state management in the frontend.
- **Shadcn UI**: UI component library.
- **Tailwind CSS**: Utility-first CSS framework for styling.
- **Framer Motion**: For animations, specifically smooth transitions between clock and Elam modes.
- **Drizzle ORM**: Type-safe ORM supporting both PostgreSQL and SQLite.