const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
async function main() {
  const env={...process.env,ATELIER_URL:'http://127.0.0.1:4320/',ATELIER_DESKTOP_TEST:'1'};
  delete env.ELECTRON_RUN_AS_NODE;
  const application=await electron.launch({executablePath:require('electron'),args:[path.resolve('desktop/main.cjs')],env});
  try {
    const page=await application.firstWindow();
    await page.getByRole('heading',{name:'ChatGPT',exact:true}).waitFor();
    await page.getByRole('button',{name:'Nouveau chat',exact:true}).click();
    await page.locator('.browser-tab').waitFor();
    const proof=await application.evaluate(({BrowserWindow}) => {
      const view=BrowserWindow.getAllWindows()[0].contentView.children.find(view => view.webContents);
      const preferences=view.webContents.getLastWebPreferences();
      return {bounds:view.getBounds(),nodeIntegration:preferences.nodeIntegration,sandbox:preferences.sandbox,contextIsolation:preferences.contextIsolation,preload:preferences.preload};
    });
    assert.equal(proof.nodeIntegration,false);
    assert.equal(proof.sandbox,true);
    assert.equal(proof.contextIsolation,true);
    assert.ok(!proof.preload);
    assert.ok(proof.bounds.width > 500 && proof.bounds.height > 400);
    await page.locator('#notifications-button').click();
    await page.getByRole('heading',{name:'Notifications',exact:true}).waitFor();
    await page.waitForTimeout(100);
    assert.equal(await application.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].contentView.children.filter(view => view.webContents).length),0);
    await page.getByRole('button',{name:'Fermer la fenêtre'}).click();
    await page.locator('[data-action="browser-close"]').click();
    assert.equal(await page.locator('.browser-tab').count(),0);
    const result={passed:true,fixture:true,remoteWebsiteTested:false,proof};
    fs.writeFileSync('.atelier/browser-evidence/desktop-result.json',JSON.stringify(result,null,2));
    const pixels=await application.evaluate(async ({BrowserWindow}) => (await BrowserWindow.getAllWindows()[0].capturePage()).toPNG().toString('base64'));
    fs.writeFileSync('.atelier/browser-evidence/desktop-shell-fixture.png',Buffer.from(pixels,'base64'));
    console.log('Desktop acceptance passed: isolated browser view, bounds, modal overlay, tab close. ChatGPT login/upload not automated.');
  } finally { await application.close(); }
}
main().catch(error => {console.error(error); process.exitCode=1;});
