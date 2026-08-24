const { execSync } = require('child_process');
const path = require('path');

exports.default = async function (context) {
  // macOS-only: fallback ad-hoc code signing for local builds
  if (process.platform !== 'darwin') {
    console.log('Skipping ad-hoc signing (not macOS)');
    return;
  }

  const appOutDir = context.appOutDir;
  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  // If electron-builder already signed the app with a real identity
  // (Developer ID, provided via CSC_LINK in CI), do NOT touch it —
  // re-signing ad-hoc would strip the signature and block notarization.
  let signature = null;
  try {
    const output = execSync(`codesign -dv "${appPath}" 2>&1`).toString();
    const match = output.match(/Signature=(.+)/);
    signature = match ? match[1].trim() : null;
  } catch (error) {
    // Not signed at all -> fall through to ad-hoc signing below.
  }

  if (signature && !signature.startsWith('adhoc')) {
    console.log(`App already signed (${signature}) - skipping ad-hoc signing`);
    return;
  }

  if (!signature) {
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
  } else {
    console.log('App is already ad-hoc signed - skipping');
  }

  // Verify
  try {
    execSync(`codesign -dvvv "${appPath}"`, { stdio: 'inherit' });
  } catch (_) {
    console.log('codesign verification skipped');
  }
};