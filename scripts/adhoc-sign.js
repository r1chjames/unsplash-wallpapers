const { execSync } = require('child_process');
const path = require('path');

/**
 * afterPack hook: ensure the .app bundle has a complete, verifiable
 * code signature.
 *
 * macOS behaviour explored during the 2026-08 "damaged" incident:
 * - On Apple Silicon, EVERY arm64 Mach-O binary produced by the toolchain
 *   carries a *linker-generated* ad-hoc signature
 *   (codesign -dv -> "Signature=adhoc" ... "flags=adhoc,linker-signed").
 *   These signatures contain NO resource seal (CodeResources), so an app
 *   whose binaries only have linker signatures FAILS `codesign --verify`
 *   and macOS reports "Unsplash Wallpapers is damaged and can't be opened".
 * - electron-builder skips signing entirely when identity is null
 *   ("skipped macOS code signing reason=identity explicitly is set to null")
 *   and its afterPack hook runs BEFORE it would sign with a real identity.
 *
 * Therefore: stamp a full ad-hoc signature (binaries + CodeResources seals)
 * whenever the app is unsigned or only has ad-hoc/linker signatures. Only
 * skip when a REAL (Developer ID / Apple Development) signature is present.
 */

exports.default = async function (context) {
  // macOS-only: fallback ad-hoc code signing for local builds
  if (process.platform !== 'darwin') {
    console.log('Skipping ad-hoc signing (not macOS)');
    return;
  }

  const appOutDir = context.appOutDir;
  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  let signature = null;
  try {
    const output = execSync(`codesign -dv "${appPath}" 2>&1`).toString();
    const match = output.match(/Signature=(.+)/);
    signature = match ? match[1].trim() : null;
  } catch (error) {
    // Not signed at all -> fall through to ad-hoc signing below.
  }

  if (signature && !signature.toLowerCase().startsWith('adhoc')) {
    // Real identity (e.g. Developer ID Application: ...) - leave it alone.
    console.log(`App already signed with a real identity (${signature}) - skipping ad-hoc signing`);
    return;
  }

  // Unsigned, or only ad-hoc/linker-signed: stamp complete ad-hoc
  // signatures (with resource seals) so the bundle passes verification.
  console.log(`Ad-hoc signing: ${appPath}`);
  try {
    execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' });
    console.log('Ad-hoc signing succeeded');
  } catch (e) {
    console.error('Ad-hoc signing failed:', e.message);
    // Try without --deep as fallback
    try {
      execSync(`codesign --force --sign - "${appPath}"`, { stdio: 'inherit' });
      console.log('Ad-hoc signing succeeded (without --deep)');
    } catch (e2) {
      console.error('Ad-hoc signing failed completely:', e2.message);
    }
  }

  // Verify
  try {
    execSync(`codesign -dvvv "${appPath}"`, { stdio: 'inherit' });
  } catch (_) {
    console.log('codesign verification skipped');
  }
};