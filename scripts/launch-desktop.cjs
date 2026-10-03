// All source desktop entry points use the same Atelier identity and instance lock.
const fs = require('node:fs/promises');
const path = require('node:path');
const {execFileSync, spawn} = require('node:child_process');
const {createHash, randomUUID} = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const PLIST_BUDDY = '/usr/libexec/PlistBuddy';

async function prepareMacDesktop(root = ROOT) {
  const source = path.join(root, 'node_modules/electron/dist/Electron.app');
  const icon = path.join(root, 'packaging/icon.png');
  const version = (await fs.readFile(path.join(root, 'node_modules/electron/dist/version'), 'utf8')).trim();
  // Versioned copies preserve any running runtime and are reusable across source edits.
  const signature = createHash('sha256').update(await fs.readFile(icon)).update('atelier-desktop-v2').digest('hex').slice(0, 12);
  const directory = path.join(root, '.atelier/desktop-runtime', `${version}-${signature}`);
  const bundle = path.join(directory, 'Atelier.app');
  const executable = path.join(bundle, 'Contents/MacOS/Electron');
  const readyMarker = path.join('Contents/Resources/atelier-ready');
  try { await fs.access(path.join(bundle, readyMarker)); return executable; } catch {}
  const temporary = path.join(directory, `.preparing-${randomUUID()}`);
  const staged = path.join(temporary, 'Atelier.app');
  await fs.mkdir(temporary, {recursive: true});
  try {
    execFileSync('/usr/bin/ditto', [source, staged], {stdio: 'pipe'});
    const plist = path.join(staged, 'Contents/Info.plist');
    for (const [key, value] of Object.entries({CFBundleName: 'Atelier', CFBundleDisplayName: 'Atelier',
      CFBundleIdentifier: 'fr.atelier.workbench', CFBundleIconFile: 'Atelier.icns'})) {
      execFileSync(PLIST_BUDDY, ['-c', `Set :${key} ${value}`, plist], {stdio: 'pipe'});
    }
    // Keep CFBundleExecutable=Electron: Electron uses that name to detect source mode.
    const iconset = path.join(temporary, 'Atelier.iconset');
    await fs.mkdir(iconset);
    for (const size of [16, 32, 128, 256, 512]) {
      for (const scale of [1, 2]) {
        execFileSync('/usr/bin/sips', ['-z', String(size * scale), String(size * scale), icon,
          '--out', path.join(iconset, `icon_${size}x${size}${scale === 2 ? '@2x' : ''}.png`)], {stdio: 'pipe'});
      }
    }
    execFileSync('/usr/bin/iconutil', ['-c', 'icns', iconset, '-o', path.join(staged, 'Contents/Resources/Atelier.icns')], {stdio: 'pipe'});
    // Keep the readiness marker in sealed resources and write it before signing.
    await fs.writeFile(path.join(staged, readyMarker), version + '\n');
    // The plist/icon changed; give this local development copy a valid ad-hoc signature.
    execFileSync('/usr/bin/codesign', ['--force', '--deep', '--sign', '-', staged], {stdio: 'pipe'});
    try { await fs.rename(staged, bundle); }
    catch (error) {
      // Concurrent launchers may prepare the same copy; only a complete winner is reused.
      if (!['EEXIST', 'ENOTEMPTY'].includes(error.code)) throw error;
      await fs.access(path.join(bundle, readyMarker));
    }
    return executable;
  } finally { await fs.rm(temporary, {recursive: true, force: true}); }
}

function sourceLaunchPlan(root, executable, args = [], environment = process.env) {
  if (args.some(arg => !/^--atelier-(chat|code|project)$/.test(arg))) throw new Error('Mode Atelier invalide.');
  const env = {...environment};
  delete env.ELECTRON_RUN_AS_NODE;
  if (!env.ATELIER_URL) env.ATELIER_SOURCE_SERVICE = '1';
  return {executable, argv: [root, ...args], options: {cwd: root, env, stdio: 'inherit', windowsHide: true}};
}

async function launchDesktop(root = ROOT, args = process.argv.slice(2)) {
  const executable = process.platform === 'darwin' ? await prepareMacDesktop(root) :
    path.join(root, 'node_modules/electron/dist', process.platform === 'win32' ? 'electron.exe' : 'electron');
  const plan = sourceLaunchPlan(root, executable, args);
  const child = spawn(plan.executable, plan.argv, plan.options);
  child.once('error', error => { console.error(`Atelier — démarrage impossible : ${error.message}`); process.exitCode = 1; });
  child.once('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
  return child;
}

if (require.main === module) launchDesktop().catch(error => {
  console.error(`Atelier — démarrage impossible : ${error.message}`);
  console.error('Vérifiez les dépendances locales avec npm ci et npm run vendor.');
  process.exitCode = 1;
});

module.exports = {prepareMacDesktop, sourceLaunchPlan, launchDesktop};
