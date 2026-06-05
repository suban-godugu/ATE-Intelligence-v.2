const { app, BrowserWindow, dialog, shell } = require('electron');
const { spawn, fork } = require('child_process');
const path = require('path');
const net = require('net');
const fs = require('fs');

// ── Paths ──────────────────────────────────────────────────────────────────
const isDev = !app.isPackaged;
const ROOT = isDev ? path.join(__dirname, '..') : path.join(process.resourcesPath, 'app');
const BACKEND_DIR = path.join(ROOT, 'backend');
const FRONTEND_DIR = path.join(ROOT, 'frontend');
const REDIS_EXE = isDev
  ? path.join(__dirname, 'assets', 'redis', 'redis-server.exe')
  : path.join(process.resourcesPath, 'redis', 'redis-server.exe');

const BACKEND_PORT = 3001;
const FRONTEND_PORT = 3000;
const REDIS_PORT = 6379;

let mainWindow = null;
const children = [];

// ── Load External `.env` File (Allows configuring DB/Storage on other PCs) ──
const externalEnvPath = isDev
  ? path.join(ROOT, '.env')
  : path.join(path.dirname(process.resourcesPath), '.env');

if (fs.existsSync(externalEnvPath)) {
  console.log(`[Config] Loading external environment variables from: ${externalEnvPath}`);
  try {
    const envContent = fs.readFileSync(externalEnvPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const firstEquals = trimmed.indexOf('=');
      if (firstEquals === -1) return;
      const key = trimmed.slice(0, firstEquals).trim();
      const value = trimmed.slice(firstEquals + 1).trim();
      // Remove wrapping quotes if present
      const cleanValue = value.replace(/^['"]|['"]$/g, '');
      process.env[key] = cleanValue;
    });
  } catch (err) {
    console.error('[Config] Failed to read external .env:', err);
  }
}

// ── Utility: wait for a TCP port to be open ────────────────────────────────
function waitForPort(port, host = '127.0.0.1', timeout = 60000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeout;
    const tryConnect = () => {
      const sock = new net.Socket();
      sock.setTimeout(1000);
      sock
        .on('connect', () => { sock.destroy(); resolve(); })
        .on('error', () => {
          sock.destroy();
          if (Date.now() > deadline) return reject(new Error(`Port ${port} not ready`));
          setTimeout(tryConnect, 500);
        })
        .on('timeout', () => {
          sock.destroy();
          if (Date.now() > deadline) return reject(new Error(`Port ${port} timed out`));
          setTimeout(tryConnect, 500);
        })
        .connect(port, host);
    };
    tryConnect();
  });
}

// ── Start Redis ────────────────────────────────────────────────────────────
function startRedis() {
  // Use WSL redis in dev, bundled exe in production
  let proc;
  if (isDev) {
    proc = spawn('wsl', [
      '--', 'bash', '-c',
      'redis-server --port 6379 --daemonize yes --bind 127.0.0.1 2>/dev/null; redis-cli ping'
    ], { stdio: 'pipe' });
  } else {
    if (!fs.existsSync(REDIS_EXE)) {
      console.warn('[Redis] redis-server.exe not found, skipping bundled Redis start');
      return null;
    }
    proc = spawn(REDIS_EXE, ['--port', String(REDIS_PORT), '--bind', '127.0.0.1'], {
      stdio: 'pipe',
      windowsHide: true,
    });
  }
  proc.stdout?.on('data', d => console.log('[Redis]', d.toString().trim()));
  proc.stderr?.on('data', d => console.error('[Redis]', d.toString().trim()));
  children.push(proc);
  return proc;
}

// ── Run Prisma Database Migrations ─────────────────────────────────────────
function runMigrations() {
  if (isDev) return Promise.resolve(); // In dev mode, migrations are managed via CLI

  const prismaCli = path.join(BACKEND_DIR, 'node_modules', 'prisma', 'build', 'index.js');
  const schemaFile = path.join(ROOT, 'db', 'prisma', 'schema.prisma');

  if (!fs.existsSync(prismaCli) || !fs.existsSync(schemaFile)) {
    console.warn('[Migration] Prisma CLI or schema file not found, skipping auto-migration');
    return Promise.resolve();
  }

  console.log('[Migration] Running database migrations...');
  return new Promise((resolve) => {
    const proc = fork(prismaCli, ['migrate', 'deploy', `--schema=${schemaFile}`], {
      cwd: BACKEND_DIR,
      silent: true,
      env: {
        ...process.env,
      },
    });

    proc.stdout?.on('data', d => console.log('[Migration]', d.toString().trim()));
    proc.stderr?.on('data', d => console.error('[Migration]', d.toString().trim()));

    proc.on('close', code => {
      if (code === 0) {
        console.log('[Migration] Database migrations applied successfully.');
      } else {
        console.error(`[Migration] Migrations failed with exit code: ${code}`);
      }
      resolve(); // Continue startup anyway (app will report DB errors if failed)
    });
  });
}

// ── Start NestJS Backend ───────────────────────────────────────────────────
function startBackend() {
  const entryFile = isDev
    ? path.join(BACKEND_DIR, 'node_modules', '.bin', 'ts-node')
    : path.join(BACKEND_DIR, 'dist', 'backend', 'src', 'main.js');

  let proc;
  if (isDev) {
    proc = spawn('node', [
      path.join(BACKEND_DIR, 'node_modules', '@nestjs', 'cli', 'bin', 'nest.js'),
      'start',
      '--entryFile', 'backend/src/main'
    ], {
      cwd: BACKEND_DIR,
      env: { ...process.env, PORT: String(BACKEND_PORT) },
      stdio: 'pipe',
      shell: true,
    });
  } else {
    // In production, use fork() because it natively supports loading JS files inside the ASAR archive
    proc = fork(entryFile, [], {
      cwd: BACKEND_DIR,
      silent: true,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(BACKEND_PORT),
      },
    });
  }

  proc.stdout?.on('data', d => console.log('[Backend]', d.toString().trim()));
  proc.stderr?.on('data', d => console.error('[Backend]', d.toString().trim()));
  children.push(proc);
  return proc;
}

// ── Start Next.js Frontend ─────────────────────────────────────────────────
function startFrontend() {
  if (isDev) return null; // In dev, Next.js dev server is run separately

  const frontendEntry = path.join(FRONTEND_DIR, 'node_modules', 'next', 'dist', 'bin', 'next');
  
  // Use fork() to run Next.js inside the ASAR archive
  const proc = fork(frontendEntry, ['start', '--port', String(FRONTEND_PORT)], {
    cwd: FRONTEND_DIR,
    silent: true,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(FRONTEND_PORT),
      NEXT_PUBLIC_API_URL: `http://localhost:${BACKEND_PORT}/api`,
    },
  });

  proc.stdout?.on('data', d => console.log('[Frontend]', d.toString().trim()));
  proc.stderr?.on('data', d => console.error('[Frontend]', d.toString().trim()));
  children.push(proc);
  return proc;
}

// ── Create Window ──────────────────────────────────────────────────────────
function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    title: 'ATE Intelligence',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Hide menu bar
  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadURL(url);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── Cleanup ────────────────────────────────────────────────────────────────
function cleanup() {
  console.log('Shutting down child processes...');
  for (const child of children) {
    try { child.kill('SIGTERM'); } catch (_) {}
  }
  // Kill Redis via WSL in dev mode
  if (isDev) {
    try {
      spawn('wsl', ['--', 'bash', '-c', 'redis-cli shutdown nosave 2>/dev/null'], { stdio: 'ignore' });
    } catch (_) {}
  }
}

// ── App Lifecycle ──────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  try {
    // 1. Show loading splash
    const splash = new BrowserWindow({
      width: 480,
      height: 300,
      frame: false,
      alwaysOnTop: true,
      center: true,
      resizable: false,
      webPreferences: { contextIsolation: true },
    });
    splash.loadFile(path.join(__dirname, 'splash.html'));

    // 2. Start services
    startRedis();
    await waitForPort(REDIS_PORT).catch(() => console.warn('Redis not ready, continuing...'));

    // Run database migrations on startup
    await runMigrations();

    startBackend();
    await waitForPort(BACKEND_PORT, '127.0.0.1', 90000);

    if (!isDev) {
      startFrontend();
      await waitForPort(FRONTEND_PORT, '127.0.0.1', 60000);
    }

    // 3. Open main window
    const appUrl = isDev
      ? `http://localhost:${FRONTEND_PORT}`
      : `http://localhost:${FRONTEND_PORT}`;

    createWindow(appUrl);
    splash.close();

  } catch (err) {
    console.error('Startup error:', err);
    dialog.showErrorBox(
      'Startup Failed',
      `The app failed to start:\n\n${err.message}\n\nPlease check that PostgreSQL is running.`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  cleanup();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', cleanup);
app.on('will-quit', cleanup);
