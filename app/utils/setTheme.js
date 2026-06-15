import { setActiveTheme } from 'app/containers/Settings/redux';

export default (store) => {
  if (window.electronAPI.platform === 'darwin') {
    const setOSTheme = () => {
      const reduxState = store.getState();
      const operationSystemTheme = window.electronAPI.isDarkMode() ? 'Dark' : 'Light';
      if (
        reduxState.getIn(['Settings', 'isChangeAutomaticActiveTheme'])
        && operationSystemTheme !== reduxState.getIn(['Settings', 'activeTheme'])
      ) {
        store.dispatch(setActiveTheme(operationSystemTheme));
      }
    };
    window.electronAPI.onThemeUpdated(setOSTheme);
    setOSTheme();
  }
};
