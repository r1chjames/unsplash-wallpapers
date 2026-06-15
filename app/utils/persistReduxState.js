// @flow

import isEqual from 'lodash/isEqual';

export default (store) => {
  const reduxState = (store.getState()).toJS();
  window.electronAPI.storage.get('redux').then((data) => {
    if (!isEqual(data, reduxState)) {
      const { Settings, Categories, Home } = reduxState;
      window.electronAPI.storage.set('redux', {
        Settings,
        Categories,
        Home: {
          photoData: Home.photoData,
        },
      });
    }
  });
};
