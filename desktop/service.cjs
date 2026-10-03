const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
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
    this.child = spawn(executable, ['--no-open', '--port', '0', '--desktop-managed',
      '--workspace', workspace, '--data', path.join(this.dataPath, '.atelier'), ...(this.skipDiscovery ? ['--no-discovery'] : [])],
    {cwd: workspace, env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true});
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

module.exports = {DesktopService};
