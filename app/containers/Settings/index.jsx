// @flow

import React, { Fragment, memo, useState, useEffect } from 'react';
import type { SyntheticEvent } from 'react';
import { connect } from 'react-redux';
import moment from 'moment';
import appPackage from '../../../package';
import StyledSettings from './style';
import { setActiveTheme, setAutomaticChangeActiveTheme } from './redux';

type Props = {
  setActiveThemeAction : (data : string) => void,
  setAutomaticChangeActiveThemeAction : (data : boolean) => void,
  activeTheme : string,
  isChangeAutomaticActiveTheme : boolean,
};

const updateMethods = ['Hourly', 'Daily', 'Weekly', 'Manually'];

const Settings = memo(({
  activeTheme,
  isChangeAutomaticActiveTheme,
  setActiveThemeAction,
  setAutomaticChangeActiveThemeAction,
} : Props) => {
  const [autoUpdateWallpaperSchedule, setAutoUpdateWallpaperSchedule] = useState(null);
  const [isRunAtStartup, setIsRunAtStartup] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiKeySaved, setApiKeySaved] = useState(false);

  useEffect(() => {
    window.electronAPI.storage.getMany(['isRunAtStartup', 'autoUpdateWallpaperSchedule'])
      .then((data) => {
        setIsRunAtStartup(data.isRunAtStartup);
        setAutoUpdateWallpaperSchedule(data.autoUpdateWallpaperSchedule || 'Manually');
      });
    if (window.electronAPI && window.electronAPI.getApiKey) {
      window.electronAPI.getApiKey().then((key) => {
        setApiKey(key || '');
      }).catch(() => {});
    }
  }, []);

  const handleQuit = () => {
    if (window.electronAPI) window.electronAPI.closeWindow();
  };

  const handleRunInStartup = ({ target: { checked } }) => {
    setIsRunAtStartup(checked);
    if (window.electronAPI && window.electronAPI.storage) {
      window.electronAPI.storage.set('isRunAtStartup', checked);
      window.electronAPI.setAutoLaunch(checked);
    }
  };

  const handleChangeUpdateWallpaperScadule = (e : SyntheticEvent<HTMLButtonElement>) => {
    if (window.electronAPI && window.electronAPI.storage) {
      window.electronAPI.storage.set('autoUpdateWallpaperSchedule', e.target.value);
      window.electronAPI.storage.set('autoUpdateWallpaperLastUpdate', moment().format('MM/DD/YYYY HH:mm:ss'));
    }
  };

  const handleChangeTheme = (e : SyntheticEvent<HTMLInputElement>) => {
    setActiveThemeAction(e.target.value);
  };

  const handleSetAutoChangeTheme = (e : SyntheticEvent<HTMLInputElement>) => {
    setAutomaticChangeActiveThemeAction(e.target.checked);
  };

  const handleApiKeyChange = (e : SyntheticEvent<HTMLInputElement>) => {
    const newKey = e.currentTarget.value;
    setApiKey(newKey);
    window.electronAPI.setApiKey(newKey);
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 2000);
  };

  return (
    <StyledSettings>
      <h3>Settings</h3>
      <label
        className="run-at-startup"
        htmlFor="run-at-startup"
      >
        Run at startup
        <input
          id="run-at-startup"
          type="checkbox"
          onChange={handleRunInStartup}
          checked={isRunAtStartup}
        />
      </label>
      <label
        className="api-key"
        htmlFor="api-key-input"
      >
        Unsplash Access Key
        <input
          id="api-key-input"
          type="password"
          value={apiKey}
          onChange={handleApiKeyChange}
          placeholder="Paste your Unsplash access key"
        />
        {apiKeySaved && <span className="saved-indicator">Saved</span>}
      </label>
      {/* eslint-disable-next-line */}
      <label
        className="auto-update"
        htmlFor="update-method"
      >
        Update
        {
          !!autoUpdateWallpaperSchedule && (
            <select
              id="update-method"
              onChange={handleChangeUpdateWallpaperScadule}
              defaultValue={autoUpdateWallpaperSchedule}
            >
              {
                updateMethods.map((updateMethod : string) => (
                  <option key={updateMethod} value={updateMethod}>
                    {updateMethod}
                  </option>
                ))
              }
            </select>
          )
        }
      </label>
      <div className="choose-theme">
        <p>
          Theme:
          {
            (window.electronAPI && window.electronAPI.platform === 'darwin')
            && (
              <Fragment>
                <span>Change auto by OS</span>
                <input
                  className="changeAutoSetTheme"
                  type="checkbox"
                  onChange={handleSetAutoChangeTheme}
                  checked={isChangeAutomaticActiveTheme}
                />
              </Fragment>
            )
          }
        </p>
        {
          !isChangeAutomaticActiveTheme
          && (
            <Fragment>
              <label htmlFor="light">
                Light
                <input
                  id="light"
                  type="radio"
                  onChange={handleChangeTheme}
                  value="Light"
                  checked={activeTheme === 'Light'}
                />
              </label>
              <label htmlFor="dark">
                Dark
                <input
                  id="dark"
                  type="radio"
                  onChange={handleChangeTheme}
                  value="Dark"
                  checked={activeTheme === 'Dark'}
                />
              </label>
            </Fragment>
          )
        }
      </div>
      <button onClick={handleQuit} className="quit">
        Quit Unsplash Wallpapers
      </button>
      <a className="author" href="https://github.com/soroushchehresa/unsplash-wallpapers">
        Made with <i className="fa fa-heart" /> on GitHub (v{appPackage.version})
      </a>
    </StyledSettings>
  );
});

export default connect(
  state => ({
    activeTheme: state.getIn(['Settings', 'activeTheme']),
    isChangeAutomaticActiveTheme: state.getIn(['Settings', 'isChangeAutomaticActiveTheme']),
  }),
  {
    setActiveThemeAction: setActiveTheme,
    setAutomaticChangeActiveThemeAction: setAutomaticChangeActiveTheme,
  },
)(Settings);
