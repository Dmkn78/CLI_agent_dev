const {_electron: electron} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const executable = process.env.ATELIER_PACKAGED_EXECUTABLE;
  if (!executable) throw new Error('ATELIER_PACKAGED_EXECUTABLE requis.');
  const directory = path.resolve('.atelier/release-desktop-fixture');
  fs.mkdirSync(directory, {recursive: true});
  const env = {...process.env, ATELIER_DESKTOP_TEST: '1', ATELIER_TEST_DATA: directory};
  delete env.ELECTRON_RUN_AS_NODE;
  const application = await electron.launch({executablePath: executable, env, timeout: 60000});
  try {
    const page = await application.firstWindow({timeout: 30000});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.locator('#desktop-updates').waitFor({timeout: 30000});
    assert.match(await page.title(), /Atelier/);
    const proof = await application.evaluate(({app, BrowserWindow}) => ({
      packaged: app.isPackaged, userData: app.getPath('userData'),
      url: BrowserWindow.getAllWindows()[0].webContents.getURL(),
    }));
    assert.equal(proof.packaged, true);
    assert.equal(proof.userData, directory);
    assert.match(proof.url, /^http:\/\/127\.0\.0\.1:\d+\/#settings$/);
    const checkbox = page.locator('[data-update-preference="downloadAutomatically"]');
    await checkbox.setChecked(true);
    await page.waitForFunction(() => desktopUpdateStatus?.preferences.downloadAutomatically === true);
    await checkbox.setChecked(false);
    await page.waitForFunction(() => desktopUpdateStatus?.preferences.downloadAutomatically === false);
    await page.evaluate(async () => {
      window.ptyProof = '';
      window.atelierDesktop.onTerminalData(({data}) => { window.ptyProof += data; });
      await window.atelierDesktop.createTerminal('release-smoke', {projectId: 'atelier'});
    });
    await page.waitForFunction(() => window.ptyProof.includes('ATELIER_PTY_READY'));
    await page.evaluate(() => window.atelierDesktop.writeTerminal('release-smoke', 'release-ok\r'));
    await page.waitForFunction(() => window.ptyProof.includes('ECHO:release-ok'));
    await page.screenshot({path: path.join(directory, 'connections.png'), fullPage: true});
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(directory, 'proof.json'), JSON.stringify({...proof, errors, pty: true}, null, 2));
    console.log('Packaged desktop, isolated data, updates preferences and native PTY: passed.');
  } finally {
    await application.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
