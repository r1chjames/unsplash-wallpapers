const { ipcRenderer, nativeTheme, app } = require('electron');
const fs = require('fs');
const path = require('path');

const STORAGE_DIR = path.join(app.getPath('userData'), 'storage');

function ensureDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}
ensureDir();

function readJSON(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (_) {
    // ignore corrupt files
  }
  return undefined;
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data), 'utf8');
}

const storage = {
  get: (key) =>
    new Promise((resolve) => {
      const filePath = path.join(STORAGE_DIR, `${key}.json`);
      const data = readJSON(filePath);
      resolve(data !== undefined ? data : {});
    }),
  getMany: (keys) =>
    new Promise((resolve) => {
      const result = {};
      keys.forEach((key) => {
        const filePath = path.join(STORAGE_DIR, `${key}.json`);
        const data = readJSON(filePath);
        if (data !== undefined) result[key] = data;
      });
      resolve(result);
    }),
  set: (key, value) =>
    new Promise((resolve) => {
      const filePath = path.join(STORAGE_DIR, `${key}.json`);
      writeJSON(filePath, value);
      resolve();
    }),
  has: (key) =>
    new Promise((resolve) => {
      const filePath = path.join(STORAGE_DIR, `${key}.json`);
      resolve(fs.existsSync(filePath));
    }),
};

// contextIsolation: false — set directly on window, no contextBridge needed
window.electronAPI = {
  platform: process.platform,

  // Theme
  isDarkMode: () => nativeTheme.shouldUseDarkColors,
  onThemeUpdated: (callback) => {
    const handler = () => callback();
    nativeTheme.on('updated', handler);
    return () => nativeTheme.removeListener('updated', handler);
  },

  // App lifecycle
  relaunchApp: () => ipcRenderer.invoke('relaunch-and-exit'),
  closeWindow: () => ipcRenderer.invoke('close-window'),

  // Update messages
  onUpdateMessage: (callback) => {
    const handler = (_event, message) => callback(message);
    ipcRenderer.on('update-message', handler);
    return () => ipcRenderer.removeListener('update-message', handler);
  },

  // Storage
  storage,
};
