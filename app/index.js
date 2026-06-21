// @flow

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Renderer error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

import './utils/electronAPI';
import React from 'react';
import { render } from 'react-dom';
import updateHandler from 'app/utils/updateHandler';
import Root from './containers/Root';
import { configureStore, history } from './redux/store/configureStore';

console.log('Renderer starting...');

updateHandler();
configureStore()
  .then((store) => {
    console.log('Store configured, rendering...');
    render(
      <Root store={store} history={history} />,
      document.getElementById('root'),
    );
    console.log('Render complete');
    if (module.hot) {
      module.hot.accept('./containers/Root', () => {
        // eslint-disable-next-line global-require
        const NextRoot = require('./containers/Root').default;
        render(
          <NextRoot store={store} history={history} />,
          document.getElementById('root'),
        );
      });
    }
  })
  .catch((err) => {
    console.error('Store configuration failed:', err);
  });
