const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {setTimeout:delay}=require('node:timers/promises');

const ZOOM_APPLY_TIMEOUT_MS=5000;
const NATIVE_CAPTURE_SETTLE_MS=100;

async function main() {
  const evidence=path.resolve('.atelier/shell-evidence');
  fs.mkdirSync(evidence,{recursive:true});
  const env={...process.env,ATELIER_URL:process.env.ATELIER_SHELL_TEST_URL || 'http://127.0.0.1:4349/',ATELIER_DESKTOP_TEST:'1'};
  delete env.ELECTRON_RUN_AS_NODE;
  const application=await electron.launch({executablePath:require('electron'),args:[path.resolve('desktop/main.cjs')],env,timeout:30000});
  const errors=[];
  try {
    const page=await application.firstWindow({timeout:20000});
    page.setDefaultTimeout(15000);
    page.on('pageerror',error => errors.push(error.message));
    await application.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].webContents.setBackgroundThrottling(false));
    const readShellZoom=() => application.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].webContents.getZoomFactor());
    const sendZoomKey=async keyCode => application.evaluate(({BrowserWindow},key) => {
      const contents=BrowserWindow.getAllWindows()[0].webContents;
      contents.sendInputEvent({type:'keyDown',keyCode:key,modifiers:['control']});
      contents.sendInputEvent({type:'keyUp',keyCode:key,modifiers:['control']});
    },keyCode);
    await page.getByRole('heading',{name:'ChatGPT',exact:true}).waitFor();
    await page.getByRole('button',{name:'Code',exact:true}).click();
    await page.locator('#native-terminal').waitFor();
    await sendZoomKey('0');
    await page.waitForFunction(() => appZoom === 100);
    await waitForZoomFactor(readShellZoom,1);
    assert.equal(await page.locator('.topbar [data-action="app-zoom"]').count(),0);
    await sendZoomKey('-');
    await page.waitForFunction(() => appZoom === 90);
    await waitForZoomFactor(readShellZoom,0.9);
    await sendZoomKey('+');
    await page.waitForFunction(() => appZoom === 100);
    await waitForZoomFactor(readShellZoom,1);
    await page.getByRole('button',{name:'Chat',exact:true}).click();
    await page.getByRole('heading',{name:'ChatGPT',exact:true}).waitFor();
    await page.getByRole('button',{name:'Nouveau chat',exact:true}).first().click();
    await page.locator('.browser-tab').waitFor();
    const browserContents=await application.evaluateHandle(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].contentView.children.find(view => view.webContents).webContents);
    const readBrowserZoom=() => application.evaluate((_electron,contents) => contents.getZoomFactor(),browserContents);
    await application.evaluate((_electron,contents) => {
      contents.focus();
      contents.sendInputEvent({type:'keyDown',keyCode:'-',modifiers:['control']});
      contents.sendInputEvent({type:'keyUp',keyCode:'-',modifiers:['control']});
    },browserContents);
    await page.waitForFunction(() => appZoom === 90);
    await waitForZoomFactor(readBrowserZoom,0.9);
    await application.evaluate((_electron,contents) => {
      contents.sendInputEvent({type:'keyDown',keyCode:'0',modifiers:['control']});
      contents.sendInputEvent({type:'keyUp',keyCode:'0',modifiers:['control']});
    },browserContents);
    await page.waitForFunction(() => appZoom === 100);
    await waitForZoomFactor(readBrowserZoom,1);
    await page.locator('[data-action="browser-close"]').click();
    await browserContents.dispose();

    await page.getByRole('button',{name:'Rechercher dans le projet',exact:true}).click();
    await page.getByRole('textbox',{name:'Rechercher dans le projet',exact:true}).fill('Attendre');
    assert.equal(await page.locator('#quick-search-results .quick-result').count(),1);
    await captureDesktop(application,path.join(evidence,'desktop-search.png'));
    await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'Code',exact:true}).click();
    await page.locator('#native-terminal').waitFor();
    await captureDesktop(application,path.join(evidence,'desktop-code.png'));
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(evidence,'desktop-result.json'),JSON.stringify({passed:true,fixture:true,keyboardZoom:true,embeddedBrowserZoom:true,search:true,errors},null,2));
    console.log('Shell desktop recipe passed: keyboard zoom in the shell and embedded browser, search and Code.');
  } finally {
    await application.close();
  }
}

async function waitForZoomFactor(readZoom,expectedFactor) {
  const deadline=Date.now()+ZOOM_APPLY_TIMEOUT_MS;
  let observedFactor;
  do {
    observedFactor=await readZoom();
    if (observedFactor === expectedFactor) return;
    await delay(25);
  } while (Date.now() < deadline);
  assert.equal(observedFactor,expectedFactor,'Electron doit appliquer le facteur de zoom attendu.');
}

async function captureDesktop(application,filePath) {
  const png=await application.evaluate(async ({BrowserWindow},settleMs) => {
    const window=BrowserWindow.getAllWindows()[0];
    await window.webContents.capturePage(undefined,{stayAwake:true});
    await new Promise(resolve => setTimeout(resolve,settleMs));
    const capture=await window.webContents.capturePage(undefined,{stayAwake:true});
    if (window.isVisible()) throw new Error('La fenêtre de recette doit rester masquée.');
    return capture.toPNG().toString('base64');
  },NATIVE_CAPTURE_SETTLE_MS);
  assert.ok(png.length > 100,'La capture native doit contenir des pixels.');
  fs.writeFileSync(filePath,Buffer.from(png,'base64'));
}

main().catch(error => {console.error(error);process.exitCode=1;});
