#!/bin/bash
# Build script for Electron app

echo "Building Basketball Scoreboard Electron App..."

# Build the frontend
echo "Step 1/4: Building frontend..."
npm run build

# Build the server
echo "Step 2/4: Building server..."
esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Build electron main process
echo "Step 3/4: Building Electron main process..."
esbuild electron/main.ts electron/sync-service.ts --platform=node --packages=external --bundle --format=esm --outdir=dist-electron

# Build the installer
echo "Step 4/4: Building Windows installer..."
npx electron-builder --win

echo "✓ Build complete! Installer is in the 'release' folder"
