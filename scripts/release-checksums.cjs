const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {version} = require('../package.json');

const PLATFORM_NAMES = {win32: 'win', darwin: 'mac', linux: 'linux'};

async function prepareReleaseAssets(sourceDirectory, destinationDirectory) {
  const platform = PLATFORM_NAMES[process.platform];
  if (!platform) throw new Error(`Plateforme non prise en charge : ${process.platform}`);
  const artifactArchitecture = platform === 'linux' && process.arch === 'x64' ? 'x86_64' : process.arch;
  const prefix = `Atelier-${version}-${platform}-${artifactArchitecture}.`;
  const channel = version.includes('-') ? version.split('-')[1].split('.')[0] : 'latest';
  const channelSuffix = platform === 'win' ? '' : `-${platform}`;
  const metadataNames = new Set([`${channel}${channelSuffix}.yml`]);
  const installerExtensions = platform === 'win' ? ['exe'] : platform === 'mac' ? ['dmg', 'zip'] : ['AppImage'];
  const installerNames = installerExtensions.map(extension => `${prefix}${extension}`);
  const allowedNames = new Set([...installerNames, ...installerNames.map(name => `${name}.blockmap`), ...metadataNames]);
  const selectedNames = fs.readdirSync(sourceDirectory).filter(name => allowedNames.has(name)).sort();
  for (const name of installerNames) {
    if (!selectedNames.includes(name)) throw new Error(`Installateur attendu absent : ${name}`);
  }
  if (!selectedNames.includes(`${channel}${channelSuffix}.yml`)) {
    throw new Error('Métadonnées de mise à jour du canal absentes.');
  }
  if (fs.existsSync(destinationDirectory) && fs.readdirSync(destinationDirectory).length) {
    throw new Error('Le dossier de publication doit être vide pour éviter les artefacts périmés.');
  }
  fs.mkdirSync(destinationDirectory, {recursive: true});
  const checksums = [];
  for (const name of selectedNames) {
    const source = path.join(sourceDirectory, name);
    if (!fs.lstatSync(source).isFile()) throw new Error(`Artefact non régulier refusé : ${name}`);
    if (metadataNames.has(name)) {
      const manifestVersion = /^version:\s*["']?([^\s"']+)["']?\s*$/m.exec(fs.readFileSync(source, 'utf8'))?.[1];
      if (manifestVersion !== version) throw new Error(`Métadonnées périmées ou invalides : ${name}`);
    }
    const destination = path.join(destinationDirectory, name);
    fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    const hash = crypto.createHash('sha256');
    for await (const chunk of fs.createReadStream(destination)) hash.update(chunk);
    checksums.push(`${hash.digest('hex')}  ${name}`);
  }
  const checksumName = `SHA256SUMS-${platform}-${process.arch}.sha256`;
  fs.writeFileSync(path.join(destinationDirectory, checksumName), checksums.join('\n') + '\n', {flag: 'wx'});
  console.log(`${selectedNames.length} artefacts autorisés et ${checksumName} prêts dans ${destinationDirectory}`);
}

if (require.main === module) {
  const [sourceDirectory = 'dist', destinationDirectory = 'build/release-assets'] = process.argv.slice(2);
  prepareReleaseAssets(path.resolve(sourceDirectory), path.resolve(destinationDirectory))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}

module.exports = {prepareReleaseAssets};
