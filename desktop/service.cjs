const fs = require('node:fs');
const path = require('node:path');
const {spawn, execFileSync} = require('node:child_process');
const {createInterface} = require('node:readline');

class DesktopService {
  constructor({runtimePath, dataPath, version, desktopExecutable, onFailure, skipDiscovery = false}) {
    this.runtimePath = runtimePath;
    this.dataPath = dataPath;
    this.version = version;
    this.desktopExecutable = desktopExecutable;
    this.onFailure = onFailure;
    this.skipDiscovery = skipDiscovery;
    this.child = null;
    this.stopping = false;
  }

  async start() {
    const suffix = process.platform === 'win32' ? '.exe' : '';
    const executable = path.join(this.runtimePath, 'atelier-service', `atelier-service${suffix}`);
    const codex = path.join(this.runtimePath, 'codex', 'bin', `codex${suffix}`);
    for (const binary of [executable, codex]) {
      if (!fs.existsSync(binary)) throw new Error(`Installation incomplète : ${path.basename(binary)} absent. Réinstallez Atelier.`);
    }
    const workspace = path.join(this.dataPath, 'workspace');
    fs.mkdirSync(workspace, {recursive: true});
    const env = {...process.env, PYTHONUTF8: '1', PYTHONDONTWRITEBYTECODE: '1',
      ATELIER_CODEX_EXECUTABLE: codex, ATELIER_VERSION: this.version,
      ATELIER_DESKTOP_EXECUTABLE: this.desktopExecutable};
    delete env.ELECTRON_RUN_AS_NODE;
    if (!env.CODEX_CA_CERTIFICATE && !env.SSL_CERT_FILE) {
      const tls = require('node:tls');
      const certificates = [...new Set([...tls.rootCertificates, ...(tls.getCACertificates?.('system') || [])])];
      const bundle = path.join(this.dataPath, 'trusted-roots.pem');
      fs.writeFileSync(bundle, certificates.join('\n') + '\n');
      env.CODEX_CA_CERTIFICATE = bundle;
      env.SSL_CERT_FILE = bundle;
    }
    return this.startChild(executable, ['--no-open', '--port', '0', '--desktop-managed',
      '--workspace', workspace, '--data', path.join(this.dataPath, '.atelier'), ...(this.skipDiscovery ? ['--no-discovery'] : [])], {cwd: workspace, env});
  }

  startChild(executable, arguments_, {cwd, env}) {
    this.child = spawn(executable, arguments_, {cwd, env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true});
    this.child.stdin.on('error', () => {});
    let recentErrors = '';
    this.child.stderr.setEncoding('utf8');
    this.child.stderr.on('data', chunk => { recentErrors = (recentErrors + chunk).slice(-6000); });
    const lines = createInterface({input: this.child.stdout});
    return new Promise((resolve, reject) => {
      let ready = false;
      const timeout = setTimeout(() => {
        reject(new Error('Le service Atelier ne répond pas au démarrage.'));
        this.stop();
      }, 60000);
      this.child.once('error', error => { clearTimeout(timeout); reject(error); });
      this.child.once('exit', code => {
        clearTimeout(timeout);
        lines.close();
        if (this.stopping) return;
        const error = new Error(`Le service Atelier s’est arrêté (${code}). ${recentErrors}`);
        if (ready) this.onFailure(error);
        else reject(error);
      });
      lines.on('line', line => {
        let message;
        try { message = JSON.parse(line); } catch { return; }
        const port = message.atelierReady?.port;
        if (ready || !Number.isInteger(port) || port < 1 || port > 65535) return;
        ready = true;
        clearTimeout(timeout);
        resolve(new URL(`http://127.0.0.1:${port}/`));
      });
    });
  }

  stop() {
    if (this.stopPromise) return this.stopPromise;
    this.stopping = true;
    const child = this.child;
    if (!child || child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
    this.stopPromise = new Promise(resolve => {
      const timeout = setTimeout(() => {
        if (process.platform === 'win32') spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {windowsHide: true, stdio: 'ignore'});
        else child.kill('SIGKILL');
        resolve();
      }, 10000);
      child.once('exit', () => { clearTimeout(timeout); resolve(); });
      child.stdin.end('shutdown\n');
    });
    return this.stopPromise;
  }
}

function sourcePython(environment = process.env) {
  const candidates = environment.ATELIER_PYTHON_EXECUTABLE ? [environment.ATELIER_PYTHON_EXECUTABLE] :
    process.platform === 'win32' ? ['python.exe', 'python3.exe'] :
      ['/opt/homebrew/bin/python3.12', '/usr/local/bin/python3.12', '/opt/homebrew/bin/python3', '/usr/local/bin/python3',
        'python3.14', 'python3.13', 'python3.12', 'python3'];
  for (const candidate of candidates) {
    try {
      const version = execFileSync(candidate, ['-c', 'import sys; print("%d.%d" % sys.version_info[:2])'],
        {env: environment, encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'pipe']}).trim().split('.').map(Number);
      if (version[0] === 3 && version[1] >= 12) return candidate;
    } catch {}
  }
  throw new Error('Le lancement depuis les sources nécessite Python 3.12 ou plus. Installez-le ou utilisez Atelier dans Applications.');
}

class SourceDesktopService extends DesktopService {
  constructor({rootPath, dataPath, onFailure, skipDiscovery = false, existingURL = 'http://127.0.0.1:4317/'}) {
    super({onFailure, skipDiscovery});
    this.rootPath = path.resolve(rootPath);
    this.dataPath = dataPath || (skipDiscovery && process.env.ATELIER_TEST_DATA ?
      path.join(process.env.ATELIER_TEST_DATA, '.atelier') : path.join(this.rootPath, '.atelier'));
    this.existingURL = existingURL;
  }

  async existingService() {
    // Source browser mode may already own this store. Reuse it without stopping
    // it later, and refuse an ambiguous Atelier on the well-known source port.
    const url = new URL(this.existingURL);
    if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)) throw new Error('Serveur Atelier local requis.');
    let html;
    try { html = await (await fetch(url, {signal: AbortSignal.timeout(1500)})).text(); }
    catch { return null; }
    const token = /name="atelier-token" content="([^"]+)"/.exec(html)?.[1];
    if (!token) return null;
    const response = await fetch(new URL('/api/desktop/service', url), {headers: {'X-Atelier-Token': token}, signal: AbortSignal.timeout(3000)});
    if (!response.ok) throw new Error('Le service Atelier existant ne peut pas être réutilisé.');
    const identity = await response.json();
    if (typeof identity.workspace !== 'string' || typeof identity.dataPath !== 'string' ||
      path.resolve(identity.workspace) !== this.rootPath || path.resolve(identity.dataPath) !== path.resolve(this.dataPath)) {
      throw new Error(`Un autre service Atelier utilise le port ${url.port}. Fermez-le avant de lancer ces sources.`);
    }
    return url;
  }

  async start() {
    // Test stores are isolated and must never attach to the user's service.
    if (!this.skipDiscovery && this.dataPath === path.join(this.rootPath, '.atelier')) {
      const existing = await this.existingService();
      if (existing) return existing;
    }
    const env = {...process.env, PYTHONUTF8: '1', PYTHONDONTWRITEBYTECODE: '1'};
    delete env.ELECTRON_RUN_AS_NODE;
    return this.startChild(sourcePython(env), ['-B', path.join(this.rootPath, 'run.py'),
      '--no-open', '--port', '0', '--desktop-managed', '--workspace', this.rootPath,
      '--data', this.dataPath, ...(this.skipDiscovery ? ['--no-discovery'] : [])], {cwd: this.rootPath, env});
  }
}

module.exports = {DesktopService, SourceDesktopService, sourcePython};
