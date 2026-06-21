try {
  const { ipcRenderer, nativeTheme } = require('electron');
  const fs = require('fs');
  const path = require('path');
  const os = require('os');

  const STORAGE_DIR = path.join(
    os.homedir(),
    'Library', 'Application Support',
    'Unsplash Wallpapers', 'storage'
  );

  function ensureDir() {
    try {
      if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
      }
    } catch (_) {}
  }
  ensureDir();

  function readJSON(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
    } catch (_) {}
    return undefined;
  }

  function writeJSON(filePath, data) {
    try {
      ensureDir();
      fs.writeFileSync(filePath, JSON.stringify(data), 'utf8');
    } catch (_) {}
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

  let cachedApiKey = '';
  try {
    const data = readJSON(path.join(STORAGE_DIR, 'apiKey.json'));
    if (data && data.value) cachedApiKey = data.value;
  } catch (_) {}

  window.electronAPI = {
    platform: process.platform,

    isDarkMode: () => nativeTheme.shouldUseDarkColors,
    onThemeUpdated: (callback) => {
      const handler = () => callback();
      nativeTheme.on('updated', handler);
      return () => nativeTheme.removeListener('updated', handler);
    },

    relaunchApp: () => ipcRenderer.invoke('relaunch-and-exit'),
    closeWindow: () => ipcRenderer.invoke('close-window'),
    setAutoLaunch: (enabled) => ipcRenderer.invoke('set-auto-launch', enabled),

    getApiKey: () => Promise.resolve(cachedApiKey),
    setApiKey: (key) => {
      cachedApiKey = key;
      storage.set('apiKey', { value: key });
    },

    onUpdateMessage: (callback) => {
      const handler = (_event, message) => callback(message);
      ipcRenderer.on('update-message', handler);
      return () => ipcRenderer.removeListener('update-message', handler);
    },

    storage,
  };
} catch (err) {
  console.error('Preload error:', err);
  // Fallback stub
  window.electronAPI = {
    platform: 'darwin',
    isDarkMode: () => false,
    onThemeUpdated: () => () => {},
    relaunchApp: () => {},
    closeWindow: () => {},
    setAutoLaunch: () => {},
    getApiKey: () => Promise.resolve(''),
    setApiKey: () => {},
    onUpdateMessage: () => () => {},
    storage: {
      get: () => Promise.resolve({}),
      getMany: () => Promise.resolve({}),
      set: () => Promise.resolve(),
      has: () => Promise.resolve(false),
    },
  };
}
