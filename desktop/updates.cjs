const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_PREFERENCES = Object.freeze({checkAutomatically: true, downloadAutomatically: false});
const STARTUP_CHECK_DELAY_MS = 15000;
const PERIODIC_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

class UpdateController {
  constructor({updater, preferencesPath, currentVersion, available, onChange, install}) {
    this.updater = updater;
    this.preferencesPath = preferencesPath;
    this.onChange = onChange;
    this.installUpdate = install;
    this.checkPending = false;
    this.downloadPending = false;
    this.stopped = false;
    this.preferences = {...DEFAULT_PREFERENCES};
    try {
      const saved = JSON.parse(fs.readFileSync(preferencesPath, 'utf8'));
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
        for (const key of Object.keys(DEFAULT_PREFERENCES)) {
          if (typeof saved[key] === 'boolean') this.preferences[key] = saved[key];
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
    }
    this.state = {phase: available ? 'idle' : 'disabled', currentVersion, nextVersion: null, percent: null, error: null};
    updater.autoDownload = false;
    updater.autoInstallOnAppQuit = false;
    updater.allowDowngrade = false;
    updater.allowPrerelease = currentVersion.includes('-');
    updater.on('error', error => {
      if (this.stopped) return;
      if (this.state.phase === 'installing') this.publish({phase: 'downloaded', error: error.message});
      else if (this.checkPending && this.state.phase === 'checking'
        || this.downloadPending && this.state.phase === 'downloading') this.publish({phase: 'error', error: error.message});
    });
    updater.on('update-not-available', () => {
      if (!this.stopped && this.checkPending && this.state.phase === 'checking') this.publish({phase: 'current', nextVersion: null});
    });
    updater.on('update-available', info => {
      if (this.stopped || !this.checkPending || this.state.phase !== 'checking') return;
      if (typeof info?.version !== 'string' || !info.version.trim()) {
        this.publish({phase: 'error', error: 'La version de mise à jour reçue est invalide.'});
        return;
      }
      this.publish({phase: 'available', nextVersion: info.version});
      if (this.preferences.downloadAutomatically) this.download();
    });
    updater.on('download-progress', progress => {
      if (!this.stopped && this.downloadPending && this.state.phase === 'downloading' && Number.isFinite(progress?.percent)) {
        this.publish({percent: Math.max(0, Math.min(100, Math.round(progress.percent)))});
      }
    });
    updater.on('update-downloaded', info => {
      if (this.stopped || !this.downloadPending || this.state.phase !== 'downloading') return;
      if (info?.version !== this.state.nextVersion) {
        this.publish({phase: 'error', error: 'La version téléchargée ne correspond pas à la mise à jour choisie.'});
        return;
      }
      this.publish({phase: 'downloaded', percent: 100});
    });
  }

  snapshot() {
    return {...this.state, preferences: {...this.preferences}};
  }

  publish(change) {
    this.state = {...this.state, ...change};
    this.onChange(this.snapshot());
    return this.snapshot();
  }

  configure(preferences) {
    if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)
      || Object.entries(preferences).some(([key, enabled]) => !Object.hasOwn(DEFAULT_PREFERENCES, key) || typeof enabled !== 'boolean')) {
      throw new Error('Préférence de mise à jour invalide.');
    }
    const updated = {...this.preferences, ...preferences};
    fs.mkdirSync(path.dirname(this.preferencesPath), {recursive: true});
    const temporary = `${this.preferencesPath}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(updated, null, 2) + '\n', {mode: 0o600});
    fs.renameSync(temporary, this.preferencesPath);
    this.preferences = updated;
    return this.publish({});
  }

  async check() {
    if (this.stopped || this.checkPending || this.downloadPending
      || ['disabled', 'checking', 'downloading', 'downloaded', 'installing'].includes(this.state.phase)) return this.snapshot();
    this.checkPending = true;
    this.publish({phase: 'checking', error: null, percent: null});
    try { await this.updater.checkForUpdates(); }
    catch (error) {
      if (!this.stopped && ['checking', 'available', 'current', 'error'].includes(this.state.phase)) this.publish({phase: 'error', error: error.message});
    } finally { this.checkPending = false; }
    return this.snapshot();
  }

  async download() {
    if (this.stopped || this.downloadPending || this.state.phase !== 'available') return this.snapshot();
    this.downloadPending = true;
    this.publish({phase: 'downloading', percent: 0, error: null});
    try { await this.updater.downloadUpdate(); }
    catch (error) {
      if (!this.stopped && ['downloading', 'error'].includes(this.state.phase)) this.publish({phase: 'error', error: error.message});
    } finally { this.downloadPending = false; }
    return this.snapshot();
  }

  async install() {
    if (this.stopped || this.state.phase !== 'downloaded') throw new Error('Téléchargez d’abord la mise à jour.');
    this.publish({phase: 'installing', error: null});
    try {
      if (!await this.installUpdate()) this.publish({phase: 'downloaded'});
    } catch (error) {
      this.publish({phase: 'downloaded', error: error.message});
    }
    return this.snapshot();
  }

  start() {
    if (this.startTimer || this.periodicTimer) return;
    this.stopped = false;
    const check = () => { if (this.preferences.checkAutomatically) this.check(); };
    this.startTimer = setTimeout(check, STARTUP_CHECK_DELAY_MS);
    this.periodicTimer = setInterval(check, PERIODIC_CHECK_INTERVAL_MS);
    this.startTimer.unref();
    this.periodicTimer.unref();
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.startTimer);
    clearInterval(this.periodicTimer);
    this.startTimer = null;
    this.periodicTimer = null;
  }
}

module.exports = {UpdateController};
