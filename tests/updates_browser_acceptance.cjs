const {chromium, _electron} = require('playwright');
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const {EventEmitter} = require('node:events');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const {UpdateController} = require('../desktop/updates.cjs');

const ROOT = path.resolve(__dirname, '..');
const EVIDENCE_DIRECTORY = path.join(ROOT, '.atelier', 'updates-browser-evidence');
const STARTUP_TIMEOUT_MS = 30000;

async function startFixture() {
  const portReservation = net.createServer();
  await new Promise((resolve, reject) => {
    portReservation.once('error', reject);
    portReservation.listen(0, '127.0.0.1', resolve);
  });
  const port = portReservation.address().port;
  await new Promise(resolve => portReservation.close(resolve));
  const child = spawn(process.env.ATELIER_PYTHON || 'python',
    ['-B', path.join(ROOT, 'tests', 'browser_fixture.py'), '--port', String(port)],
    {cwd: ROOT, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
      env: {...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONUTF8: '1'}});
  let output = '';
  child.stderr.on('data', chunk => { output = (output + chunk).slice(-5000); });
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Fixture startup timed out.\n' + output)), STARTUP_TIMEOUT_MS);
      const ready = () => { clearTimeout(timeout); resolve(); };
      child.once('error', error => { clearTimeout(timeout); reject(error); });
      child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Fixture exited (${code}).\n${output}`)); });
      child.stdout.on('data', chunk => {
        output = (output + chunk).slice(-5000);
        if (output.includes('Browser fixture ready')) ready();
      });
    });
    return {origin: `http://127.0.0.1:${port}`, stop: () => child.kill()};
  } catch (error) {
    child.kill();
    throw error;
  }
}

async function main() {
  fs.mkdirSync(EVIDENCE_DIRECTORY, {recursive: true});
  const directory = fs.mkdtempSync(path.join(EVIDENCE_DIRECTORY, 'run-'));
  const fixture = await startFixture();
  let browser, page, controller;
  const errors = [], externalRequests = [], calls = {checks: 0, downloads: 0, installs: 0};
  const widths = [1500, 900, 390, 300];
  try {
    const useElectron = process.env.ATELIER_BROWSER_CHANNEL === 'electron';
    if (useElectron) {
      const env = {...process.env};
      delete env.ELECTRON_RUN_AS_NODE;
      browser = await _electron.launch({executablePath: require('electron'),
        args: [path.join(ROOT, 'tests', 'channels_feedback_window.cjs')], env});
      page = await browser.firstWindow();
    } else {
      browser = await chromium.launch({headless: true, channel: process.env.ATELIER_BROWSER_CHANNEL || 'chrome'});
      const context = await browser.newContext({viewport: {width: 1500, height: 980}});
      page = await context.newPage();
    }
    const setViewport = async width => {
      if (useElectron) {
        await browser.evaluate(({BrowserWindow}, width) => BrowserWindow.getAllWindows()[0].setContentSize(width, 980), width);
        await page.waitForFunction(width => innerWidth === width, width);
      } else await page.setViewportSize({width, height: 980});
    };
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      if (new URL(route.request().url()).origin !== fixture.origin) {
        externalRequests.push(route.request().url());
        await route.abort();
      } else await route.continue();
    });
    const updater = new EventEmitter();
    let checkFails = true, installFails = false, finishDownload;
    updater.checkForUpdates = async () => {
      calls.checks++;
      if (checkFails) throw new Error('Connexion indisponible — recette fictive');
      updater.emit('update-available', {version: '0.3.1'});
    };
    updater.downloadUpdate = () => new Promise(resolve => { calls.downloads++; finishDownload = resolve; });
    controller = new UpdateController({updater, preferencesPath: path.join(directory, 'preferences.json'),
      currentVersion: '0.3.0', available: true,
      onChange: status => {
        page.evaluate(update => window.receiveFixtureUpdate?.(update), status)
          .catch(error => { if (!page.isClosed()) errors.push(error.message); });
      },
      install: async () => {
        calls.installs++;
        if (installFails) {
          updater.emit('error', new Error('Installation indisponible — recette fictive'));
          return true;
        }
        return false;
      }});
    await page.exposeBinding('fixtureUpdates', (_source, operation, preferences) => {
      if (operation === 'state') return controller.snapshot();
      if (operation === 'preferences') return controller.configure(preferences);
      if (operation === 'check') return controller.check();
      if (operation === 'download') return controller.download();
      if (operation === 'install') return controller.install();
      throw new Error('Unexpected fixture operation: ' + operation);
    });
    await page.addInitScript(() => {
      const subscribe = () => () => {};
      window.atelierDesktop = {
        updateState: () => window.fixtureUpdates('state'),
        updatePreferences: preferences => window.fixtureUpdates('preferences', preferences),
        checkUpdates: () => window.fixtureUpdates('check'),
        downloadUpdate: () => window.fixtureUpdates('download'),
        installUpdate: () => window.fixtureUpdates('install'),
        onUpdateState: callback => {
          window.receiveFixtureUpdate = callback;
          return () => { window.receiveFixtureUpdate = null; };
        },
        onZoomShortcut: subscribe, onLaunchMode: subscribe, onTerminalData: subscribe,
        onTerminalExit: subscribe, onBrowserState: subscribe, onBrowserZoomShortcut: subscribe,
        onTerminalImagePaste: subscribe, showBrowser: () => {},
      };
    });
    await page.goto(fixture.origin + '/#settings');
    const panel = page.locator('#desktop-updates');
    await panel.getByRole('heading', {name: 'Atelier 0.3.0', exact: true}).waitFor();
    const checkAutomatically = panel.getByRole('switch', {name: 'Vérification automatique', exact: true});
    const downloadAutomatically = panel.getByRole('switch', {name: 'Téléchargement automatique', exact: true});
    assert.equal(await checkAutomatically.isChecked(), true);
    assert.equal(await downloadAutomatically.isChecked(), false);
    assert.equal(await panel.locator('[data-action="updates-download"]').count(), 0);
    assert.equal(await panel.locator('[data-action="updates-install"]').count(), 0);
    await setViewport(1500);
    await panel.screenshot({path: path.join(directory, 'updates-initial-1500.png')});
    await checkAutomatically.focus();
    await page.keyboard.press('Space');
    await page.waitForFunction(() => desktopUpdateStatus?.preferences.checkAutomatically === false);
    assert.equal(await checkAutomatically.evaluate(input => input === document.activeElement), true, 'Focus survives the preference update');
    await page.keyboard.press('Tab');
    assert.equal(await downloadAutomatically.evaluate(input => input === document.activeElement), true, 'Both switches are keyboard accessible');
    await downloadAutomatically.setChecked(true);
    await page.waitForFunction(() => desktopUpdateStatus?.preferences.downloadAutomatically === true);
    await page.reload();
    await panel.getByRole('heading', {name: 'Atelier 0.3.0', exact: true}).waitFor();
    assert.equal(await checkAutomatically.isChecked(), false);
    assert.equal(await downloadAutomatically.isChecked(), true);
    await downloadAutomatically.setChecked(false);
    await page.waitForFunction(() => desktopUpdateStatus?.preferences.downloadAutomatically === false);
    assert.deepEqual(calls, {checks: 0, downloads: 0, installs: 0});
    for (const width of widths) {
      await setViewport(width);
      await panel.screenshot({path: path.join(directory, `updates-idle-${width}.png`)});
    }
    await setViewport(1500);

    await panel.getByRole('button', {name: 'Rechercher une mise à jour', exact: true}).click();
    await panel.getByText('Connexion indisponible — recette fictive', {exact: true}).waitFor();
    checkFails = false;
    await panel.getByRole('button', {name: 'Rechercher une mise à jour', exact: true}).click();
    await panel.getByText('La version 0.3.1 est disponible.', {exact: true}).waitFor();
    assert.deepEqual(calls, {checks: 2, downloads: 0, installs: 0});
    assert.equal(await panel.locator('.inline-error').count(), 0);
    await panel.getByRole('button', {name: 'Télécharger', exact: true}).click();
    await page.waitForFunction(() => desktopUpdateStatus?.phase === 'downloading');
    updater.emit('download-progress', {percent: 37});
    await panel.getByText('Téléchargement : 37 %', {exact: true}).waitFor();
    assert.equal(await panel.getByRole('progressbar').getAttribute('value'), '37');
    assert.equal(await panel.locator('[data-action="updates-download"]').count(), 0);
    assert.equal(await panel.locator('[data-action="updates-install"]').count(), 0);
    assert.deepEqual(calls, {checks: 2, downloads: 1, installs: 0});

    for (const width of widths) {
      await setViewport(width);
      const overflow = await page.evaluate(() => ({
        document: document.documentElement.scrollWidth > innerWidth + 1,
        panel: document.querySelector('#desktop-updates').scrollWidth > document.querySelector('#desktop-updates').clientWidth + 1,
      }));
      assert.deepEqual(overflow, {document: false, panel: false}, `Update layout at ${width}px`);
      await panel.screenshot({path: path.join(directory, `updates-${width}.png`)});
    }
    updater.emit('update-downloaded', {version: '0.3.1'});
    finishDownload();
    await panel.getByRole('button', {name: 'Installer et redémarrer', exact: true}).waitFor();
    assert.equal(await panel.locator('[data-action="updates-download"]').count(), 0);
    assert.equal(calls.installs, 0);
    await panel.getByRole('button', {name: 'Installer et redémarrer', exact: true}).click();
    await page.waitForFunction(() => desktopUpdateStatus?.phase === 'downloaded');
    assert.equal(calls.installs, 1);
    installFails = true;
    await panel.getByRole('button', {name: 'Installer et redémarrer', exact: true}).click();
    await panel.getByText('Installation indisponible — recette fictive', {exact: true}).waitFor();
    assert.equal(await panel.locator('[data-action="updates-install"]').count(), 1);
    assert.equal(calls.installs, 2);
    await panel.screenshot({path: path.join(directory, 'updates-install-error.png')});
    assert.deepEqual(errors, []);
    assert.deepEqual(externalRequests, []);
    const proof = {passed: true, fixture: true, realUpdaterController: true, realInstaller: false,
      externalRequests, widths, preferences: true, switches: true, keyboard: true, focusPreserved: true, progress: true, explicitActions: true,
      networkRetry: true, installerRetry: true, calls, errors, directory};
    fs.writeFileSync(path.join(EVIDENCE_DIRECTORY, 'result.json'), JSON.stringify(proof, null, 2));
    console.log('Updates browser acceptance passed: preferences, progress, explicit actions, error recovery and widths ' + widths.join('/'));
  } catch (error) {
    console.error('Page errors:', errors);
    if (page && !page.isClosed()) await page.screenshot({path: path.join(directory, 'failure.png'), fullPage: true});
    throw error;
  } finally {
    controller?.stop();
    if (browser) await browser.close();
    fixture.stop();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
