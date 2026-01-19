#!/bin/bash
# Run Electron app in development mode

echo "Preparing to run Basketball Scoreboard in Electron..."

# Build the frontend
echo "Step 1/3: Building frontend..."
npm run build

# Build the server
echo "Step 2/3: Building server..."
esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Build electron main process
echo "Step 3/3: Building Electron main process..."
esbuild electron/main.ts --platform=node --packages=external --bundle --format=cjs --outdir=dist-electron

# Run Electron
echo "Starting Electron app..."
npx electron .
