// @flow

const {
  app,
  BrowserWindow,
  Tray,
  shell,
  ipcMain,
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

// IPC handlers for renderer process requests
ipcMain.handle('relaunch-and-exit', () => {
  app.relaunch();
  app.exit(0);
});

ipcMain.handle('close-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

app.on('ready', () => {
  setTimeout(() => {
    const tray = new Tray(
      path.join(__dirname, '../resources/menu-icons/iconTemplate.png'),
    );
    let window = null;
    const showWindow = () => {
      log.info('Showing window...');
      const trayPos = tray.getBounds();
      log.info(`Tray bounds: x=${trayPos.x} y=${trayPos.y} w=${trayPos.width} h=${trayPos.height}`);
      const windowPos = window.getBounds();
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
      window.setPosition(x, y, false);
      window.show();
      window.focus();
      log.info('Window shown and focused');
    };

    const toggleWindow = () => {
      if (window.isVisible()) {
        window.hide();
      } else {
        showWindow();
      }
    };

    tray.on('click', (event) => {
      log.info('Tray clicked');
      toggleWindow();

      if (window.isVisible() && process.defaultApp && event.metaKey) {
        window.openDevTools({ mode: 'detach' });
      }
    });

    tray.on('right-click', () => {
      log.info('Tray right-clicked');
      toggleWindow();
    });

    tray.on('double-click', () => {
      log.info('Tray double-clicked');
      toggleWindow();
    });

    window = new BrowserWindow({
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
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    window.loadURL(`file://${__dirname}/app.html`);

    window.on('blur', () => {
      log.info('Window blurred, devtools open:', window.webContents.isDevToolsOpened());
      setTimeout(() => {
        if (!window.isDestroyed() && !window.webContents.isDevToolsOpened()) {
          window.hide();
          log.info('Window hidden due to blur');
        }
      }, 150);
    });

    window.webContents.once('did-finish-load', () => {
      log.info('Window finished loading');
      autoUpdater.checkForUpdatesAndNotify();
      if (process.env.NODE_ENV === 'development') {
        window.webContents.openDevTools();
      }
      // Auto-show on startup for diagnostics
      log.info('Auto-showing window on startup...');
      showWindow();
    });

    window.webContents.on('will-navigate', (event, url) => {
      event.preventDefault();
      if (url.startsWith('http:') || url.startsWith('https:')) {
        shell.openExternal(url);
      }
    });

    autoUpdater.logger = log;
    autoUpdater.logger.transports.file.level = 'info';
    autoUpdater.on('update-downloaded', () => {
      window.webContents.send('update-message', 'Update downloaded');
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
