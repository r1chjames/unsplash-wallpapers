# Unsplash Wallpapers

> **⚠️ This is a fork of [soroushchehresa/unsplash-wallpapers](https://github.com/soroushchehresa/unsplash-wallpapers).** Much of the codebase and configuration is from the original project (circa 2019) and is outdated — dependencies, build tooling, and some features may no longer be relevant or maintained. The README content below is largely preserved from the original for reference.

---

A menubar application for Mac, Windows and Linux that brings stunning wallpapers from [Unsplash](https://unsplash.com) right to your desktop.
Works on macOS 10.12+, Windows 10+ and Linux.

## Features

* Load high-quality wallpapers based on Unsplash popular categories.
* Wallpapers history list.
* Automatic wallpaper rotation (hourly, daily, weekly, or manual).
* Run at system startup (optional).
* Dark mode (optional or auto by OS).
* Download directly ability for each wallpaper.

## Run locally

#### 1. Clone the project

```bash
git clone https://github.com/r1chjames/unsplash-wallpapers.git unsplash-wallpapers
```

#### 2. Add Unsplash access key

The app reads your key at runtime — it is **not** baked into the build. After starting the app, go to **Settings** and paste your Unsplash access key. The key is stored locally in the app's user data directory.

**How to create an Unsplash API key:**

1. Go to [unsplash.com](https://unsplash.com) and create an account (or sign in).
2. Navigate to the [Unsplash Developer Dashboard](https://unsplash.com/oauth/applications).
3. Click **New Application**.
4. Fill in the required fields:
   - **Application Name** — anything you like (e.g. "Unsplash Wallpapers Desktop").
   - **Description** — brief summary of what the app does.
   - **Callback URL** — use `http://localhost` (the app doesn't use OAuth redirects).
5. Accept the API Terms and click **Create application**.
6. On the app page, copy the **Access Key** from the "Keys" section.
7. Paste it into the app's **Settings** screen.

#### 3. Start

```bash
yarn && yarn dev
```

## Packaging

```bash
yarn && yarn package
```

Output lands in the `release/` directory.

## Technologies

* [Electron](https://github.com/electron)
* [React](https://github.com/facebook/react)
* [Redux](https://github.com/reduxjs/redux)
* [redux-saga](https://github.com/redux-saga/redux-saga)
* [styled-components](https://github.com/styled-components/styled-components)
* [Axios](https://github.com/axios/axios)
* [Wallpaper](https://github.com/sindresorhus/wallpaper)

## Original project

This is a fork of [soroushchehresa/unsplash-wallpapers](https://github.com/soroushchehresa/unsplash-wallpapers) — an unofficial cross-platform desktop application originally based on the [Unsplash Wallpapers official Mac app](https://unsplash.com/wallpaper#mac-app). Licensed under MIT.
