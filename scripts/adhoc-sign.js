const { execSync } = require('child_process');
const path = require('path');

exports.default = async function (context) {
  const appOutDir = context.appOutDir;
  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  console.log(`Ad-hoc signing: ${appPath}`);

  // Remove any existing signature, then ad-hoc sign
  execSync(`codesign --remove-signature "${appPath}" || true`, { stdio: 'inherit' });
  execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' });

  // Verify
  execSync(`codesign -dvvv "${appPath}"`, { stdio: 'inherit' });
};
