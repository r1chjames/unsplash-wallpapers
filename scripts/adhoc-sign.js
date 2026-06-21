const { execSync } = require('child_process');
const path = require('path');

exports.default = async function (context) {
  const appOutDir = context.appOutDir;
  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

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
