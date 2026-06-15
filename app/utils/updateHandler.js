// @flow

export default () => {
  window.electronAPI.onUpdateMessage((message) => {
    if (message === 'Update downloaded') {
      if (confirm('Restart for update to the latest version')) {
        window.electronAPI.relaunchApp();
      }
    }
  });
};
