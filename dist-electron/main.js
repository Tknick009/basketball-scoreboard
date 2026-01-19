"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron = require("electron");
var path = __toESM(require("path"), 1);
var import_child_process = require("child_process");
var mainWindow = null;
var serverProcess = null;
process.env.ELECTRON = "true";
function createWindow() {
  mainWindow = new import_electron.BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, "../client/public/icon-512.png")
  });
  startServer();
  setTimeout(() => {
    mainWindow?.loadURL("http://localhost:5000");
  }, 2e3);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }
}
function startServer() {
  const serverPath = path.join(__dirname, "../dist/index.js");
  const dbPath = path.join(import_electron.app.getPath("userData"), "basketball.db");
  serverProcess = (0, import_child_process.spawn)("node", [serverPath], {
    env: {
      ...process.env,
      SQLITE_DB_PATH: dbPath,
      PORT: "5000",
      NODE_ENV: "production"
    },
    stdio: "inherit"
  });
  serverProcess.on("error", (err) => {
    console.error("Failed to start server:", err);
  });
}
import_electron.app.whenReady().then(createWindow);
import_electron.app.on("window-all-closed", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  import_electron.app.quit();
});
import_electron.app.on("activate", () => {
  if (import_electron.BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
import_electron.app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
