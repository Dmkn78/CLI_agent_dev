const fs = require('node:fs/promises');
const path = require('node:path');

const MAC_PTY_HELPER_MODE = 0o755;

module.exports = {
  appId: 'fr.atelier.workbench',
  productName: 'Atelier',
  icon: 'packaging/icon.png',
  directories: {output: 'dist', buildResources: 'packaging'},
  artifactName: 'Atelier-${version}-${os}-${arch}.${ext}',
  // node-pty ships Node-API prebuilds; the packaged PTY smoke test verifies each host.
  npmRebuild: false,
  electronDist: 'node_modules/electron/dist',
  forceCodeSigning: process.env.ATELIER_REQUIRE_SIGNING === '1',
  files: ['desktop/**/*.cjs', 'package.json', '!node_modules/@openai/**'],
  asarUnpack: ['node_modules/node-pty/**'],
  afterPack: prepareMacPtyHelpers,
  extraResources: [{from: 'build/runtime', to: 'runtime', filter: ['**/*']}],
  publish: [{provider: 'github', owner: 'Dmkn78', repo: 'CLI_agent_dev', releaseType: 'draft',
    channel: require('./package.json').version.split('-')[1]?.split('.')[0] || 'latest'}],
  win: {target: ['nsis'], icon: 'packaging/icon.ico', verifyUpdateCodeSignature: true},
  nsis: {oneClick: false, perMachine: false, allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true, createStartMenuShortcut: true, deleteAppDataOnUninstall: false},
  mac: {target: ['dmg', 'zip'], category: 'public.app-category.developer-tools', hardenedRuntime: true,
    notarize: process.env.ATELIER_REQUIRE_SIGNING === '1'},
  linux: {target: ['AppImage'], category: 'Development', executableName: 'atelier'},
};

/** @param {import('app-builder-lib').AfterPackContext} context */
async function prepareMacPtyHelpers(context) {
  if (context.electronPlatformName !== 'darwin') return;
  const ptyDirectory = path.join(context.packager.getResourcesDir(context.appOutDir),
    'app.asar.unpacked', 'node_modules', 'node-pty', 'prebuilds');
  // node-pty 1.1.0 publishes the macOS helpers as 0644 (microsoft/node-pty#850).
  for (const architecture of ['darwin-arm64', 'darwin-x64']) {
    const helper = path.join(ptyDirectory, architecture, 'spawn-helper');
    const helperStats = await fs.lstat(helper);
    if (!helperStats.isFile()) throw new Error(`Helper PTY macOS absent : ${architecture}`);
    await fs.chmod(helper, MAC_PTY_HELPER_MODE);
  }
}
