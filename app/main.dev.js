// @flow

const {
  app,
  BrowserWindow,
  Tray,
  shell,
  ipcMain,
  nativeTheme,
} = require('electron');
const path = require('path');
const storage = require('electron-json-storage');
const AutoLaunch = require('auto-launch');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

const width = 375;
const height = 385;

if (process.platform === 'darwin') {
  app.dock.hide();
}

let mainWindow = null;
let showMainWindow = null;
let pendingActivate = false;

// On macOS, clicking a dock-hidden app's tray icon fires 'activate'.
// Handle the case where it fires before the window is ready.
app.on('activate', () => {
  log.info('App activated');
  if (mainWindow && showMainWindow && !mainWindow.isDestroyed()) {
    if (!mainWindow.isVisible()) showMainWindow();
  } else {
    pendingActivate = true;
  }
});

// IPC handlers for renderer process requests
ipcMain.handle('relaunch-and-exit', () => {
  app.relaunch();
  app.exit(0);
});

ipcMain.handle('close-window', () => {
  app.quit();
});

ipcMain.handle('set-auto-launch', (_event, enabled) => {
  const autoLauncher = new AutoLaunch({
    name: 'Unsplash Wallpapers',
    path: '/Applications/Unsplash Wallpapers.app', // eslint-disable-line
  });
  if (enabled) {
    autoLauncher.enable();
  } else {
    autoLauncher.disable();
  }
});

ipcMain.on('get-dark-mode', (event) => {
  event.returnValue = nativeTheme.shouldUseDarkColors;
});

nativeTheme.on('updated', () => {
  mainWindow.webContents.send('theme-changed', nativeTheme.shouldUseDarkColors);
});

app.on('ready', () => {
  setTimeout(() => {
    const tray = new Tray(
      path.join(__dirname, '../resources/menu-icons/iconTemplate.png'),
    );

    showMainWindow = () => {
      log.info('Showing window...');
      const trayPos = tray.getBounds();
      const windowPos = mainWindow.getBounds();
      log.info(`Tray bounds: x=${trayPos.x} y=${trayPos.y} w=${trayPos.width} h=${trayPos.height}`);
      log.info(`Window bounds: x=${windowPos.x} y=${windowPos.y} w=${windowPos.width} h=${windowPos.height}`);
      const { screen } = require('electron'); // eslint-disable-line
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth, height: screenHeight } = primaryDisplay.size;
      let x = 0;
      let y = 0;

      switch (process.platform) {
        case 'win32':
          x = Math.round(trayPos.x + trayPos.width / 2 - windowPos.width / 2);
          y = Math.round(trayPos.y - height);
          break;
        case 'darwin':
          x = Math.round(trayPos.x + trayPos.width / 2 - windowPos.width / 2);
          y = Math.round(trayPos.y + trayPos.height);
          break;
        case 'freebsd':
        case 'linux':
        case 'sunos':
        default:
          x = screenWidth - width - 10;
          y = 10;
          break;
      }
      log.info(`Calculated position: x=${x} y=${y} (screen: ${screenWidth}x${screenHeight})`);
      mainWindow.setPosition(x, y, false);
      mainWindow.show();
      app.focus({ steal: true });
      mainWindow.focus();
      log.info('Window shown and focused');
    };

    let lastToggle = 0;

    const toggleWindow = () => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      const now = Date.now();
      if (now - lastToggle < 500) return; // debounce (activate + mouse-down may both fire)
      lastToggle = now;
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        showMainWindow();
      }
    };

    tray.on('mouse-down', () => {
      toggleWindow();
    });

    const preloadPath = app.isPackaged
      ? path.join(process.resourcesPath, 'app.asar.unpacked', 'app', 'preload.js')
      : path.join(__dirname, 'preload.js');
    
    log.info(`Preload path: ${preloadPath}`);
    log.info(`Is packaged: ${app.isPackaged}`);
    log.info(`Resources path: ${process.resourcesPath}`);
    
    mainWindow = new BrowserWindow({
      width,
      height,
      show: false,
      frame: false,
      resizable: false,
      skipTaskbar: true,
      fullscreenable: false,
      transparent: true,
      webPreferences: {
        contextIsolation: false,
        nodeIntegration: true,
        sandbox: false,
      },
    });

    // If activate fired before the window was ready, show it now
    if (pendingActivate) {
      showMainWindow();
      pendingActivate = false;
    }

    mainWindow.loadURL(`file://${__dirname}/app.html`);

    // Forward renderer console to main process logs
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      const levels = ['silly', 'info', 'warn', 'error'];
      const logLevel = levels[level] || 'info';
      log[logLevel](`[Renderer] ${message}`);
    });

    mainWindow.webContents.once('did-finish-load', () => {
      log.info('did-finish-load fired');
      autoUpdater.checkForUpdatesAndNotify();
      if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
      }
    });

    mainWindow.webContents.on('will-navigate', (event, url) => {
      event.preventDefault();
      if (url.startsWith('http:') || url.startsWith('https:')) {
        shell.openExternal(url);
      }
    });

    autoUpdater.logger = log;
    autoUpdater.logger.transports.file.level = 'info';
    autoUpdater.on('update-downloaded', () => {
      mainWindow.webContents.send('update-message', 'Update downloaded');
    });
  }, 300);
});

app.on('window-all-closed', () => {
  app.quit();
});

storage.has('isRunAtStartup', (error, hasKey) => {
  if (error) {
    throw error;
  }
  if (!hasKey) {
    storage.set('isRunAtStartup', true);
    const minecraftAutoLauncher = new AutoLaunch({
      name: 'Unsplash Wallpapers',
      path: '/Applications/Unsplash Wallpapers.app', // eslint-disable-line
    });
    minecraftAutoLauncher.enable();
  }
});

app.commandLine.appendSwitch('ignore-certificate-errors');
