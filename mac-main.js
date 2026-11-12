// Ctrl Z for macOS: a native window around the Zerodocs control web app.
const { app, BrowserWindow, shell, Menu, nativeTheme, session, systemPreferences } = require('electron');
const fs = require('fs');
const path = require('path');

const HOME = 'https://9effrr.github.io/zero/';
const BG = '#0B0B0C';
const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

// Google refuses sign-in from embedded browsers, so present as plain Chrome.
app.userAgentFallback = CHROME_UA;
nativeTheme.themeSource = 'dark';

if (!app.requestSingleInstanceLock()) app.quit();

let win;
const stateFile = () => path.join(app.getPath('userData'), 'window.json');
const loadState = () => { try { return JSON.parse(fs.readFileSync(stateFile(), 'utf8')); } catch { return {}; } };
const saveState = () => {
  if (!win || win.isDestroyed()) return;
  try { fs.writeFileSync(stateFile(), JSON.stringify(win.getBounds())); } catch {}
};

// Pages that must stay inside the app (Google sign-in popups and the app itself).
const isAuth = (u) => /^https:\/\/(accounts\.google\.com|accounts\.youtube\.com|www\.google\.com\/accounts)/.test(u);
const isApp = (u) => u.startsWith(HOME);

function createWindow() {
  const s = loadState();
  win = new BrowserWindow({
    width: s.width || 1180,
    height: s.height || 820,
    x: s.x, y: s.y,
    minWidth: 380,
    minHeight: 520,
    title: 'Ctrl Z',
    backgroundColor: BG,
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true, spellcheck: true },
  });

  win.once('ready-to-show', () => win.show());
  win.on('close', saveState);

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAuth(url) || url === 'about:blank') {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 500, height: 640, parent: win, backgroundColor: '#ffffff',
          title: 'Sign in with Google', autoHideMenuBar: true,
        },
      };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (e, url) => {
    if (!isApp(url) && !isAuth(url)) { e.preventDefault(); shell.openExternal(url); }
  });

  // Exports save straight to Downloads.
  session.defaultSession.on('will-download', (_e, item) => {
    item.setSavePath(path.join(app.getPath('downloads'), item.getFilename()));
  });

  // The microphone, for voice notes: macOS asks once, the first time you record.
  session.defaultSession.setPermissionRequestHandler(async (_wc, perm, cb, details) => {
    if (perm === 'media' && process.platform === 'darwin' && (!details || !details.mediaTypes || details.mediaTypes.includes('audio'))) {
      try { cb(await systemPreferences.askForMediaAccess('microphone')); } catch { cb(false); }
      return;
    }
    cb(true);
  });

  win.loadURL(HOME);
}

function buildMenu() {
  const template = [
    { role: 'appMenu' },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { label: 'Home', accelerator: 'CmdOrCtrl+Shift+H', click: () => win && win.loadURL(HOME) },
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.on('second-instance', () => {
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
});

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); else win.show(); });
});

// Like most Mac apps: closing the window keeps the app in the Dock.
app.on('window-all-closed', () => {});
app.on('before-quit', saveState);
