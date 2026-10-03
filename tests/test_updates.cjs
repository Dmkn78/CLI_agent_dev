const test = require('node:test');
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {UpdateController} = require('../desktop/updates.cjs');

function fixture(context, {savedPreferences, ...options} = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-updates-'));
  context.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const updater = new EventEmitter();
  const calls = {checks: 0, downloads: 0, installs: 0};
  updater.checkForUpdates = async () => { calls.checks++; updater.emit('update-available', {version: '0.3.1'}); };
  updater.downloadUpdate = async () => { calls.downloads++; updater.emit('update-downloaded', {version: '0.3.1'}); };
  const parameters = {updater, preferencesPath: path.join(directory, 'preferences.json'),
    currentVersion: '0.3.0', available: true, onChange: () => {},
    install: async () => { calls.installs++; return true; }, ...options};
  if (savedPreferences !== undefined) fs.writeFileSync(parameters.preferencesPath, JSON.stringify(savedPreferences));
  const controller = new UpdateController(parameters);
  context.after(() => controller.stop());
  return {controller, updater, calls, parameters};
}

test('checking never downloads or installs without the chosen actions', async context => {
  const {controller, updater, calls} = fixture(context);
  await controller.check();
  assert.equal(controller.snapshot().phase, 'available');
  assert.deepEqual(calls, {checks: 1, downloads: 0, installs: 0});
  assert.equal(updater.autoDownload, false);
  assert.equal(updater.autoInstallOnAppQuit, false);
  assert.equal(updater.allowDowngrade, false);
  assert.equal(updater.allowPrerelease, false);
  await controller.download();
  assert.deepEqual(calls, {checks: 1, downloads: 1, installs: 0});
  await controller.install();
  assert.equal(calls.installs, 1);
});

test('preferences survive restart and automatic download still waits for install', async context => {
  const {controller, calls, parameters} = fixture(context);
  controller.configure({checkAutomatically: false, downloadAutomatically: true});
  const restarted = new UpdateController({...parameters, updater: new EventEmitter()});
  context.after(() => restarted.stop());
  assert.deepEqual(restarted.snapshot().preferences, {checkAutomatically: false, downloadAutomatically: true});
  assert.throws(() => controller.configure({downloadAutomatically: 'yes'}));
  assert.throws(() => controller.configure({feedURL: 'https://example.invalid'}));
  assert.throws(() => controller.configure({constructor: true}));
  await controller.check();
  assert.equal(controller.snapshot().phase, 'downloaded');
  assert.equal(calls.downloads, 1);
  assert.equal(calls.installs, 0);
});

test('invalid saved preference values fall back to defaults', context => {
  for (const savedPreferences of [null, [], true, {checkAutomatically: 'yes', downloadAutomatically: 1}]) {
    const {controller} = fixture(context, {savedPreferences});
    assert.deepEqual(controller.snapshot().preferences, {checkAutomatically: true, downloadAutomatically: false});
  }
});

test('development mode makes no network requests', async context => {
  const {controller, calls} = fixture(context, {available: false});
  await controller.check();
  await controller.download();
  assert.deepEqual(calls, {checks: 0, downloads: 0, installs: 0});
  await assert.rejects(controller.install());
});

test('network failure is visible and can be retried', async context => {
  const {controller, updater} = fixture(context);
  updater.checkForUpdates = async () => { throw new Error('Hors connexion'); };
  await controller.check();
  assert.equal(controller.snapshot().error, 'Hors connexion');
  updater.checkForUpdates = async () => updater.emit('update-not-available');
  await controller.check();
  assert.equal(controller.snapshot().phase, 'current');
  assert.equal(controller.snapshot().error, null);
});

test('busy work or a declined restart keeps the downloaded update', async context => {
  const {controller} = fixture(context, {install: async () => { throw new Error('Travail actif'); }});
  await controller.check();
  await controller.download();
  await controller.install();
  assert.equal(controller.snapshot().phase, 'downloaded');
  assert.equal(controller.snapshot().error, 'Travail actif');
  controller.installUpdate = async () => false;
  await controller.install();
  assert.equal(controller.snapshot().phase, 'downloaded');
});

test('a pending download cannot be started twice or replaced by a check', async context => {
  const {controller, updater, calls} = fixture(context);
  let finish;
  updater.downloadUpdate = () => new Promise(resolve => { calls.downloads++; finish = resolve; });
  await controller.check();
  const downloading = controller.download();
  await controller.download();
  await controller.check();
  assert.equal(calls.checks, 1);
  assert.equal(calls.downloads, 1);
  updater.emit('update-downloaded', {version: '0.3.1'});
  finish();
  await downloading;
  assert.equal(controller.snapshot().phase, 'downloaded');
});

test('updater events cannot start work outside an authorized operation', context => {
  for (const available of [false, true]) {
    const {controller, updater, calls} = fixture(context, {available});
    controller.configure({downloadAutomatically: true});
    const initial = controller.snapshot();
    for (const [event, payload] of [
      ['update-available', {version: '0.3.1'}], ['download-progress', {percent: 50}],
      ['update-downloaded', {version: '0.3.1'}], ['update-not-available'], ['error', new Error('Late event')],
    ]) {
      updater.emit(event, payload);
      assert.deepEqual(controller.snapshot(), initial, event);
    }
    assert.deepEqual(calls, {checks: 0, downloads: 0, installs: 0});
  }
});

test('an early availability event does not allow a second concurrent check', async context => {
  const {controller, updater, calls} = fixture(context);
  const pendingChecks = [];
  updater.checkForUpdates = () => {
    calls.checks++;
    updater.emit('update-available', {version: '0.3.1'});
    return new Promise(resolve => { pendingChecks.push(resolve); });
  };
  const checking = controller.check();
  const duplicateCheck = controller.check();
  try { assert.equal(calls.checks, 1); }
  finally {
    pendingChecks.forEach(finish => finish());
    await Promise.all([checking, duplicateCheck]);
  }
  assert.equal(controller.snapshot().phase, 'available');
});

test('late events cannot discard an already downloaded update', async context => {
  const {controller, updater, calls} = fixture(context);
  await controller.check();
  await controller.download();
  const downloaded = controller.snapshot();
  updater.emit('update-not-available');
  updater.emit('update-available', {version: '0.3.2'});
  updater.emit('download-progress', {percent: 20});
  updater.emit('error', new Error('Late event'));
  assert.deepEqual(controller.snapshot(), downloaded);
  await controller.install();
  assert.equal(calls.installs, 1);
});

test('a failed download can be checked and downloaded again without installing', async context => {
  const {controller, updater, calls} = fixture(context);
  updater.downloadUpdate = async () => { calls.downloads++; throw new Error('Connexion interrompue'); };
  await controller.check();
  await controller.download();
  assert.equal(controller.snapshot().phase, 'error');
  assert.equal(controller.snapshot().error, 'Connexion interrompue');
  updater.downloadUpdate = async () => { calls.downloads++; updater.emit('update-downloaded', {version: '0.3.1'}); };
  await controller.check();
  await controller.download();
  assert.equal(controller.snapshot().phase, 'downloaded');
  assert.equal(controller.snapshot().error, null);
  assert.deepEqual(calls, {checks: 2, downloads: 2, installs: 0});
});

test('a pending restart choice cannot open another installer', async context => {
  let finish;
  const {controller, calls} = fixture(context);
  controller.installUpdate = () => new Promise(resolve => { calls.installs++; finish = resolve; });
  await controller.check();
  await controller.download();
  const installing = controller.install();
  await assert.rejects(controller.install());
  await controller.download();
  await controller.check();
  assert.deepEqual(calls, {checks: 1, downloads: 1, installs: 1});
  finish(false);
  await installing;
  assert.equal(controller.snapshot().phase, 'downloaded');
});

test('an installer launch failure keeps the update available for retry', async context => {
  const {controller, updater} = fixture(context);
  await controller.check();
  await controller.download();
  await controller.install();
  updater.emit('error', new Error('Impossible de lancer le programme d’installation'));
  assert.equal(controller.snapshot().phase, 'downloaded');
  assert.equal(controller.snapshot().error, 'Impossible de lancer le programme d’installation');
});

test('malformed update metadata never starts a download', async context => {
  const {controller, updater, calls} = fixture(context);
  controller.configure({downloadAutomatically: true});
  updater.checkForUpdates = async () => { calls.checks++; updater.emit('update-available', {}); };
  await controller.check();
  assert.equal(controller.snapshot().phase, 'error');
  assert.deepEqual(calls, {checks: 1, downloads: 0, installs: 0});
});

test('download progress is bounded and another version cannot become installable', async context => {
  const {controller, updater} = fixture(context);
  let finish;
  updater.downloadUpdate = () => new Promise(resolve => { finish = resolve; });
  await controller.check();
  const downloading = controller.download();
  try {
    updater.emit('download-progress', {percent: -10});
    assert.equal(controller.snapshot().percent, 0);
    updater.emit('download-progress', {percent: 150});
    assert.equal(controller.snapshot().percent, 100);
    updater.emit('download-progress', {percent: NaN});
    assert.equal(controller.snapshot().percent, 100);
    updater.emit('update-downloaded', {version: '0.3.2'});
    assert.equal(controller.snapshot().phase, 'error');
    await assert.rejects(controller.install());
  } finally {
    finish();
    await downloading;
  }
});

test('a check failure arriving after automatic download cannot discard that download', async context => {
  const {controller, updater} = fixture(context);
  controller.configure({downloadAutomatically: true});
  updater.checkForUpdates = async () => {
    updater.emit('update-available', {version: '0.3.1'});
    throw new Error('Late check failure');
  };
  await controller.check();
  assert.equal(controller.snapshot().phase, 'downloaded');
  assert.equal(controller.snapshot().error, null);
});

test('stopping suppresses pending events and further operations', async context => {
  const {controller, updater, calls} = fixture(context);
  let finish;
  updater.checkForUpdates = () => new Promise(resolve => { calls.checks++; finish = resolve; });
  const checking = controller.check();
  controller.stop();
  const stopped = controller.snapshot();
  updater.emit('update-available', {version: '0.3.1'});
  updater.emit('error', new Error('Late event'));
  finish();
  await checking;
  await controller.check();
  await controller.download();
  assert.deepEqual(controller.snapshot(), stopped);
  assert.deepEqual(calls, {checks: 1, downloads: 0, installs: 0});
});
