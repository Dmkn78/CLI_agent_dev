const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

const root = path.resolve(__dirname, '..');
const runtime = path.join(root, 'build/runtime');
const target = `${process.platform}-${process.arch}`;
const triples = {
  'win32-x64': 'x86_64-pc-windows-msvc', 'win32-arm64': 'aarch64-pc-windows-msvc',
  'darwin-x64': 'x86_64-apple-darwin', 'darwin-arm64': 'aarch64-apple-darwin',
  'linux-x64': 'x86_64-unknown-linux-musl', 'linux-arm64': 'aarch64-unknown-linux-musl',
};
const triple = triples[target];
if (!triple) throw new Error(`Plateforme non prise en charge : ${target}`);
fs.mkdirSync(runtime, {recursive: true});
const python = process.env.ATELIER_BUILD_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const build = spawnSync(python, ['-m', 'PyInstaller', '--noconfirm', '--distpath', runtime,
  '--workpath', path.join(root, 'build/pyinstaller'), path.join(root, 'packaging/service.spec')],
{cwd: root, stdio: 'inherit', windowsHide: true});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status || 1);
const codexPackage = path.dirname(require.resolve(`@openai/codex-${target}/package.json`));
const nativeRoot = path.join(codexPackage, 'vendor', triple);
if (!fs.existsSync(nativeRoot)) throw new Error(`Distribution Codex native absente : ${nativeRoot}`);
// Include the complete native payload: ripgrep and Windows sandbox helpers matter too.
fs.cpSync(nativeRoot, path.join(runtime, 'codex'), {recursive: true});
const codexMetadata = JSON.parse(fs.readFileSync(path.join(codexPackage, 'package.json'), 'utf8'));
fs.cpSync(path.join(root, 'packaging/licenses'), path.join(runtime, 'licenses'), {recursive: true});
if (!fs.existsSync(path.join(runtime, 'licenses/CODEX-LICENSE'))) throw new Error('Licence de redistribution Codex absente.');
const pythonLicense = spawnSync(python, ['-c', 'import sys,pathlib; p=pathlib.Path(sys.base_prefix); print(next((str(x) for x in [p/"LICENSE.txt",p/"LICENSE",p/"lib"/f"python{sys.version_info.major}.{sys.version_info.minor}"/"LICENSE.txt"] if x.is_file()), ""))'],
  {encoding: 'utf8', windowsHide: true});
if (pythonLicense.status !== 0) throw new Error('Lecture de la licence Python impossible.');
if (pythonLicense.stdout.trim()) fs.copyFileSync(pythonLicense.stdout.trim(), path.join(runtime, 'licenses/PYTHON-LICENSE.txt'));
else fs.copyFileSync(path.join(root, 'packaging/licenses/PYTHON-LICENSE.txt'), path.join(runtime, 'licenses/PYTHON-LICENSE.txt'));
fs.writeFileSync(path.join(runtime, 'versions.json'), JSON.stringify({
  atelier: require('../package.json').version, codex: codexMetadata.version, target,
}, null, 2) + '\n');
console.log(`Runtime prêt pour ${target}`);
