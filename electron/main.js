"use strict";

const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const net = require("net");
const http = require("http");
const { spawn } = require("child_process");
const treeKill = require("tree-kill");

// ─── Path resolution ────────────────────────────────────────────────────────
// When packaged by electron-builder, extra resources land at process.resourcesPath
const isPackaged = app.isPackaged;

const resourcesBase = isPackaged
  ? process.resourcesPath          // …/resources  (inside the .exe bundle)
  : path.join(__dirname, "..", "resources"); // dev: project root/resources

const mongodExe = path.join(resourcesBase, "mongodb", "mongod.exe");

// Use the OS-specific user data directory (AppData/Roaming on Windows) for permanent storage.
// This prevents Permission Denied errors and ensures data survives app updates.
const dbPath = path.join(app.getPath("userData"), "Database");

const serverJs = path.join(__dirname, "..", "server", "server.js");

// Node executable: packaged apps must use the bundled node from electron itself
const nodeExe = process.execPath; // electron binary doubles as node in dev;
// For packaged: we actually need to use the bundled server differently — see spawnServer()

// ─── Global handles ──────────────────────────────────────────────────────────
let mongodProc = null;
let serverProc = null;
let mainWindow = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────
/** Poll a TCP port until it accepts connections (max maxMs ms). */
function waitForPort(port, host, maxMs = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function attempt() {
      const sock = new net.Socket();
      sock.setTimeout(500);
      sock.on("connect", () => { sock.destroy(); resolve(); });
      sock.on("error", () => { sock.destroy(); retry(); });
      sock.on("timeout", () => { sock.destroy(); retry(); });
      sock.connect(port, host);
    }
    attempt();
    function retry() {
      if (Date.now() - start > maxMs) {
        reject(new Error(`Timed out waiting for ${host}:${port}`));
      } else {
        setTimeout(attempt, 500);
      }
    }
  });
}

/** Poll HTTP endpoint until it responds 2xx (max maxMs ms). */
function waitForHttp(url, maxMs = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function attempt() {
      http.get(url, (res) => {
        if (res.statusCode < 500) { resolve(); }
        else { setTimeout(attempt, 500); }
        res.resume();
      }).on("error", () => {
        if (Date.now() - start > maxMs) reject(new Error(`Timed out waiting for ${url}`));
        else setTimeout(attempt, 500);
      });
    }
    attempt();
  });
}

// ─── Start MongoDB ────────────────────────────────────────────────────────────
async function startMongod() {
  return new Promise((resolve, reject) => {
    console.log("[PakTeeth] Starting mongod…");
    console.log("[PakTeeth] mongod path:", mongodExe);
    console.log("[PakTeeth] dbPath     :", dbPath);

    // Prevent Error 14: Ensure DB folder exists
    if (!fs.existsSync(dbPath)) {
      fs.mkdirSync(dbPath, { recursive: true });
      console.log("[PakTeeth] Automatically created missing MongoDB data directory:", dbPath);
    } else {
      // Prevent Error 14: Clear stale lock file if the app abruptly closed previously
      const lockFile = path.join(dbPath, "mongod.lock");
      if (fs.existsSync(lockFile)) {
        try { fs.unlinkSync(lockFile); console.log("[PakTeeth] Cleared stale mongod.lock"); } 
        catch (e) { console.error("[PakTeeth] Warning: Could not clear mongod.lock:", e.message); }
      }
    }

    mongodProc = spawn(mongodExe, [
      "--dbpath", dbPath,
      "--port", "27017",
      "--bind_ip", "127.0.0.1",
      "--noauth",
    ], { stdio: ["ignore", "pipe", "pipe"] });

    mongodProc.stdout.on("data", (d) => console.log("[mongod]", d.toString().trimEnd()));
    mongodProc.stderr.on("data", (d) => console.error("[mongod]", d.toString().trimEnd()));

    mongodProc.on("error", (err) => reject(new Error("Failed to start mongod: " + err.message)));
    mongodProc.on("exit", (code) => {
      if (code !== null && code !== 0) reject(new Error("mongod exited with code " + code));
    });

    waitForPort(27017, "127.0.0.1", 20000)
      .then(resolve)
      .catch(reject);
  });
}

// ─── Start Express server ────────────────────────────────────────────────────
async function startServer() {
  return new Promise((resolve, reject) => {
    console.log("[PakTeeth] Starting Express server…");
    console.log("[PakTeeth] server.js  :", serverJs);

    // In packaged mode electron-builder includes node_modules but not a separate
    // node binary. We use electron's own node (process.execPath) with –-run flag
    // BUT electron doesn't support that. Instead we require the server in-process
    // when packaged, or spawn with the system node in dev.
    if (isPackaged) {
      // Run server in-process (safe because it's isolated from the renderer)
      try {
        require(serverJs);
        waitForHttp("http://localhost:3000", 20000).then(resolve).catch(reject);
      } catch (err) {
        reject(err);
      }
    } else {
      // Dev: spawn a separate node process
      serverProc = spawn("node", [serverJs], {
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env },
      });
      serverProc.stdout.on("data", (d) => console.log("[server]", d.toString().trimEnd()));
      serverProc.stderr.on("data", (d) => console.error("[server]", d.toString().trimEnd()));
      serverProc.on("error", (err) => reject(new Error("Failed to start server: " + err.message)));
      serverProc.on("exit", (code) => {
        if (code !== null && code !== 0) console.error("[server] exited with code", code);
      });
      waitForHttp("http://localhost:3000", 20000).then(resolve).catch(reject);
    }
  });
}

// ─── IPC Handlers for Reports ───────────────────────────────────────────────
ipcMain.handle('select-report-files', async (event, patientId) => {
  try {
    const configPath = path.join(app.getPath("userData"), "pakteeth-upload-config.json");
    let lastUploadPath = app.getPath("documents");
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        lastUploadPath = config.lastUploadPath || lastUploadPath;
      } catch (e) { }
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Select Patient Report(s)",
      defaultPath: lastUploadPath,
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'All Files', extensions: ['*'] }]
    });

    if (result.canceled || result.filePaths.length === 0) return [];

    const filePaths = result.filePaths;
    // Save the new directory
    const newDir = path.dirname(filePaths[0]);
    fs.writeFileSync(configPath, JSON.stringify({ lastUploadPath: newDir }));

    // Create permanent reports directory in resources/data/reports
    const baseReportsDir = app.isPackaged
      ? path.join(process.resourcesPath, "data", "reports")
      : path.join(__dirname, "..", "data", "reports");
    const reportsDir = path.join(baseReportsDir, patientId);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    let savedFiles = [];
    for (const src of filePaths) {
      const ext = path.extname(src);
      const baseName = path.basename(src, ext);
      // Append timestamp to avoid collisions
      const newName = `${baseName}_${Date.now()}${ext}`;
      const dest = path.join(reportsDir, newName);

      // Copy the file
      fs.copyFileSync(src, dest);

      // Determine type
      const lowerExt = ext.toLowerCase();
      let type = 'application/octet-stream';
      if (['.jpg', '.jpeg'].includes(lowerExt)) type = 'image/jpeg';
      else if (lowerExt === '.png') type = 'image/png';
      else if (lowerExt === '.pdf') type = 'application/pdf';

      savedFiles.push({
        originalName: path.basename(src),
        filePath: dest,
        type: type
      });
    }
    return savedFiles;
  } catch (err) {
    console.error("[IPC] Failed to save report files:", err);
    throw err;
  }
});

// Send file buffers as base64 to frontend since file:// is restricted
ipcMain.handle('read-report-file', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      return buffer.toString('base64');
    }
    return null;
  } catch (e) {
    console.error("[IPC] Read report failed:", e);
    return null;
  }
});

ipcMain.on('quit-app', () => {
  app.quit();
});

ipcMain.on('restart-app', () => {
  app.relaunch();
  app.exit(0);
});

// Helper to scan directory for image files
function scanImageFiles(dirPath) {
  let results = [];
  try {
    const list = fs.readdirSync(dirPath);
    list.forEach((file) => {
      const ext = path.extname(file).toLowerCase();
      if (['.jpg', '.jpeg', '.png'].includes(ext)) {
        let type = 'application/octet-stream';
        if (['.jpg', '.jpeg'].includes(ext)) type = 'image/jpeg';
        else if (ext === '.png') type = 'image/png';
        
        results.push({
          originalName: file,
          filePath: path.join(dirPath, file),
          type: type
        });
      }
    });
  } catch (err) {
    console.error("[IPC] Failed to scan directory:", err);
  }
  return results;
}

// ─── Direct Folder Sync Handlers ───────────────────────────────────────────────
ipcMain.handle('link-sync-folder', async (event, patientId) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Select Sync Folder for Patient",
      properties: ['openDirectory']
    });

    if (result.canceled || result.filePaths.length === 0) return null;

    const selectedFolder = result.filePaths[0];
    const configPath = path.join(app.getPath("userData"), "pakteeth-upload-config.json");
    
    // Read or init config
    let config = { syncFolders: {} };
    if (fs.existsSync(configPath)) {
      try { config = Object.assign(config, JSON.parse(fs.readFileSync(configPath, 'utf8'))); } 
      catch (e) { }
    }
    
    // Save mapping
    if (!config.syncFolders) config.syncFolders = {};
    config.syncFolders[patientId] = selectedFolder;
    fs.writeFileSync(configPath, JSON.stringify(config));

    // Scan folder for images
    const files = scanImageFiles(selectedFolder);
    return { folder: selectedFolder, files: files };
  } catch (err) {
    console.error("[IPC] Failed to link sync folder:", err);
    throw err;
  }
});

ipcMain.handle('get-sync-folder', async (event, patientId) => {
  try {
    const configPath = path.join(app.getPath("userData"), "pakteeth-upload-config.json");
    if (!fs.existsSync(configPath)) return null;
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const folder = config.syncFolders && config.syncFolders[patientId] ? config.syncFolders[patientId] : null;
    
    if (!folder || !fs.existsSync(folder)) return null; // Not found or deleted
    
    const files = scanImageFiles(folder);
    return { folder: folder, files: files };
  } catch (err) {
    console.error("[IPC] Failed to get sync folder:", err);
    throw err;
  }
});

ipcMain.handle('process-sync-files', async (event, patientId, fileObjs) => {
  // fileObjs is [{ originalName, filePath, type }]
  if (!fileObjs || fileObjs.length === 0) return [];
  
  const baseReportsDir = app.isPackaged
    ? path.join(process.resourcesPath, "data", "reports")
    : path.join(__dirname, "..", "data", "reports");
  const reportsDir = path.join(baseReportsDir, patientId);
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  let savedFiles = [];
  for (const f of fileObjs) {
    if (!fs.existsSync(f.filePath)) continue; // Double check

    const ext = path.extname(f.filePath);
    const baseName = path.basename(f.filePath, ext);
    // Append timestamp to avoid collisions
    const newName = `${baseName}_${Date.now()}${ext}`;
    const dest = path.join(reportsDir, newName);

    try {
      fs.copyFileSync(f.filePath, dest);
      savedFiles.push({
        ...f,
        filePath: dest // Reassign to internal persistent path
      });
    } catch(err) {
      console.error("[IPC] Error copying synced file:", err);
    }
  }
  return savedFiles;
});


// ─── Create Window ───────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    kiosk: true, 
    fullscreen: true,
    frame: false,
    autoHideMenuBar: true,
    title: "PakTeeth",
    icon: path.join(__dirname, "..", "assets", "images", "tooth.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false, // revealed after load
    backgroundColor: "#1a1a2e",
  });

  mainWindow.loadURL("http://localhost:3000");

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on("closed", () => { mainWindow = null; });
}

// ─── Splash / Loading window ─────────────────────────────────────────────────
function createSplash() {
  const splash = new BrowserWindow({
    width: 420, height: 260,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: false,
    backgroundColor: "#1a1a2e",
  });
  splash.loadURL(`data:text/html,
    <html><body style="margin:0;background:#1a1a2e;display:flex;flex-direction:column;
      align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#fff;">
      <h2 style="font-size:2rem;margin-bottom:.5rem;">🦷 PakTeeth</h2>
      <p style="color:#aaa;font-size:.9rem;">Starting services, please wait…</p>
      <div style="margin-top:1.5rem;width:180px;height:4px;background:#333;border-radius:2px;">
        <div id="bar" style="width:0%;height:100%;background:#4f8ef7;border-radius:2px;
          transition:width .4s;"></div>
      </div>
      <script>
        let pct=0; const bar=document.getElementById('bar');
        const iv=setInterval(()=>{pct=Math.min(pct+2,90);bar.style.width=pct+'%';},200);
      </script>
    </body></html>
  `);
  return splash;
}

// ─── App lifecycle ───────────────────────────────────────────────────────────
app.on("ready", async () => {
  const splash = createSplash();

  // Ensure the reports storage folder exists on startup
  const reportsRootDir = app.isPackaged
    ? path.join(process.resourcesPath, "data", "reports")
    : path.join(__dirname, "..", "data", "reports");

  if (!fs.existsSync(reportsRootDir)) {
    fs.mkdirSync(reportsRootDir, { recursive: true });
    console.log("[PakTeeth] Created reports directory:", reportsRootDir);
  }

  try {
    await startMongod();
    console.log("[PakTeeth] MongoDB ready ✓");

    await startServer();
    console.log("[PakTeeth] Express ready ✓");

    createWindow();
    splash.close();
  } catch (err) {
    splash.close();
    console.error("[PakTeeth] Startup error:", err);
    dialog.showErrorBox(
      "PakTeeth – Startup Failed",
      `Could not start the application:\n\n${err.message}\n\nPlease contact support.`
    );
    app.quit();
  }
});

app.on("window-all-closed", () => {
  cleanup();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", cleanup);

let cleanupDone = false;
function cleanup() {
  if (cleanupDone) return;
  cleanupDone = true;

  if (serverProc && serverProc.pid) {
    treeKill(serverProc.pid, "SIGTERM");
  }
  if (mongodProc && mongodProc.pid) {
    treeKill(mongodProc.pid, "SIGTERM");
  }
}
