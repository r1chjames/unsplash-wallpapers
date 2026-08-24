/**
 * Pure-JavaScript wallpaper control for macOS, Windows and Linux.
 *
 * Replaces the `wallpaper` npm package (v4.4.2). That package shipped a
 * precompiled Swift helper (`source/macos-wallpaper`) that was a THIN
 * x86_64 Mach-O binary, so it ended up inside the arm64 `.app` bundle and
 * macOS showed the "Support Ending for Intel-Based Apps" warning on Apple
 * silicon. This module uses only built-in OS facilities, so the packaged
 * app contains zero Intel code on every platform.
 *
 * NOTE (macOS): setting the desktop picture via AppleScript may trigger a
 * one-time "Unsplash Wallpapers wants to control System Events" permission
 * prompt. Granting it is required for the script to work.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execFileP = promisify(execFile);
const EXEC_TIMEOUT = 30000;

function escapeAppleScriptString(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// --- macOS: pure AppleScript through `osascript` (no native binary) -------

async function macSet(imagePath) {
  const script = [
    'tell application "System Events"',
    '  tell every desktop',
    `    set picture to POSIX file "${escapeAppleScriptString(path.resolve(imagePath))}"`,
    '  end tell',
    'end tell',
  ].join('\n');
  await execFileP('osascript', ['-e', script], { timeout: EXEC_TIMEOUT });
}

async function macGet() {
  const script = 'tell application "System Events" to get picture of every desktop';
  const { stdout } = await execFileP('osascript', ['-e', script], {
    timeout: EXEC_TIMEOUT,
  });
  const lines = stdout
    .trim()
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines[0] : '';
}

// --- Windows: PowerShell P/Invoke (no native binary) -----------------------

async function winSet(imagePath) {
  const resolved = path.resolve(imagePath).replace(/"/g, '\\"');
  const script = [
    "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class UWPW { [DllImport(\"user32.dll\", CharSet = CharSet.Auto)] public static extern bool SystemParametersInfo(uint uAction, uint uParam, string lpvParam, uint fuWinIni); }';",
    `[UWPW]::SystemParametersInfo(20, 0, "${resolved}", 3)`,
  ].join('\n');
  await execFileP(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', script],
    { timeout: EXEC_TIMEOUT },
  );
}

async function winGet() {
  try {
    const { stdout } = await execFileP(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        "(Get-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop' -Name WallPaper).WallPaper",
      ],
      { timeout: EXEC_TIMEOUT },
    );
    return stdout.trim();
  } catch (error) {
    return '';
  }
}

// --- Linux: desktop-environment tools (all pure shell commands) ------------

async function linuxSet(imagePath) {
  const resolved = path.resolve(imagePath);
  const uri = `file://${encodeURI(resolved)}`;
  const attempts = [
    // GNOME
    execFileP(
      'gsettings',
      ['set', 'org.gnome.desktop.background', 'picture-uri', uri],
      { timeout: EXEC_TIMEOUT },
    ).then(() => true).catch(() => false),
    // XFCE
    execFileP(
      'xfconf-query',
      [
        '-c', 'xfce4-desktop',
        '-p', '/backdrop/screen0/monitor0/workspace0/last-image',
        '-s', resolved,
      ],
      { timeout: EXEC_TIMEOUT },
    ).then(() => true).catch(() => false),
    // Window managers without a desktop session (i3, etc.)
    execFileP('feh', ['--bg-fill', resolved], { timeout: EXEC_TIMEOUT })
      .then(() => true)
      .catch(() => false),
  ];

  const results = await Promise.all(attempts);
  if (!results.some(Boolean)) {
    throw new Error(
      'Could not set the wallpaper: no supported desktop tool found '
        + '(tried gsettings, xfconf-query, feh)',
    );
  }
}

async function linuxGet() {
  try {
    const { stdout } = await execFileP(
      'gsettings',
      ['get', 'org.gnome.desktop.background', 'picture-uri'],
      { timeout: EXEC_TIMEOUT },
    );
    return stdout.trim().replace(/^['"]|['"]$/g, '');
  } catch (error) {
    return '';
  }
}

// --- public API (mirrors the `wallpaper` package surface used by the app) --

export function set(imagePath) {
  if (process.platform === 'darwin') return macSet(imagePath);
  if (process.platform === 'win32') return winSet(imagePath);
  return linuxSet(imagePath);
}

export function get() {
  if (process.platform === 'darwin') return macGet();
  if (process.platform === 'win32') return winGet();
  return linuxGet();
}

export default { set, get };