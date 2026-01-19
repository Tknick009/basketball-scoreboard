@echo off
echo Building Basketball Scoreboard Electron App...
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: package.json not found!
    echo Please run this script from the project folder.
    pause
    exit /b 1
)

REM Check if node_modules exists, if not run npm install
if not exist "node_modules" (
    echo Installing dependencies first...
    call npm install
    if errorlevel 1 (
        echo ERROR: npm install failed!
        pause
        exit /b 1
    )
    echo.
)

REM Install electron as dev dependency if needed
call npm list electron >nul 2>&1
if errorlevel 1 (
    echo Installing Electron...
    call npm install --save-dev electron electron-builder
    echo.
)

echo Step 1/4: Building frontend...
call npm run build

echo Step 2/4: Building server...
call npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo Step 3/4: Building Electron main process...
call npx esbuild electron/main.ts electron/sync-service.ts --platform=node --packages=external --bundle --format=esm --outdir=dist-electron

echo Step 4/4: Building Windows installer...
call npx electron-builder --win

echo.
echo Build complete! Installer is in the 'release' folder
pause
