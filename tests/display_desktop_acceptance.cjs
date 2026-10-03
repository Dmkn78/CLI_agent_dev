const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');

async function main() {
  const profile=path.resolve('.atelier',`telegram-desktop-fixture-${process.pid}`);
  const env={...process.env,ATELIER_URL:'http://127.0.0.1:4336/',ATELIER_DESKTOP_TEST:'1',ATELIER_TEST_DATA:profile};
  delete env.ELECTRON_RUN_AS_NODE;
  const app=await electron.launch({executablePath:require('electron'),args:[path.resolve('desktop/main.cjs'),'--atelier-code'],env,timeout:30000});
  const directory=path.resolve('.atelier/telegram-evidence'),errors=[];
  fs.mkdirSync(directory,{recursive:true});
  const capture=async name => {
    const png=await app.evaluate(async ({BrowserWindow}) => {
      const window=BrowserWindow.getAllWindows()[0];
      // Flush the hidden renderer's previous frame before collecting the current UI.
      await window.webContents.capturePage(undefined,{stayAwake:true});
      await new Promise(resolve => setTimeout(resolve,100));
      const image=await window.webContents.capturePage(undefined,{stayAwake:true});
      if (window.isVisible()) throw new Error('The desktop fixture must remain hidden.');
      return image.toPNG().toString('base64');
    });
    assert.ok(png.length > 100,'Native capture contains image pixels');
    fs.writeFileSync(path.join(directory,name),Buffer.from(png,'base64'));
  };
  try {
    const page=await app.firstWindow({timeout:20000});page.setDefaultTimeout(15000);
    page.on('pageerror',error => errors.push(error.message));
    await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].webContents.setBackgroundThrottling(false));
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => typeof state !== 'undefined' && state.projects.length > 0);
    console.log('Desktop fixture ready.');
    const sendZoomKey=key => app.evaluate(({BrowserWindow},keyCode) => {
      const contents=BrowserWindow.getAllWindows()[0].webContents;
      contents.sendInputEvent({type:'keyDown',keyCode,modifiers:['control']});
      contents.sendInputEvent({type:'keyUp',keyCode,modifiers:['control']});
    },key);
    assert.equal(await page.locator('.topbar [data-action="app-zoom"],.topbar #app-zoom-label').count(),0);
    await page.evaluate(() => setAppZoom(100));
    await sendZoomKey('-');
    await page.waitForFunction(() => appZoom === 90);
    assert.equal(await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].webContents.getZoomFactor()),.9);
    await sendZoomKey('+');
    await page.waitForFunction(() => appZoom === 100);
    assert.equal(await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].webContents.getZoomFactor()),1);
    await sendZoomKey('-');
    await page.waitForFunction(() => appZoom === 90);
    await sendZoomKey('-');
    await page.waitForFunction(() => appZoom === 80);
    assert.equal(await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].webContents.getZoomFactor()),.8);
    await page.reload();
    await page.waitForFunction(() => typeof state !== 'undefined' && state.projects.length > 0 && appZoom === 80);
    assert.equal(await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].webContents.getZoomFactor()),.8);
    await page.evaluate(async () => {route('webchat');await actions['browser-new']();});
    await page.waitForTimeout(400);
    const panel=await page.locator('#browser-panel').evaluate(element => {
      const rect=element.getBoundingClientRect(),top=document.querySelector('.topbar').getBoundingClientRect().bottom;
      const footer=document.querySelector('.statusbar').getBoundingClientRect(),y=Math.max(rect.y,top);
      return {x:rect.x,y,width:rect.width,height:Math.max(0,Math.min(rect.bottom,footer.height ? footer.top : innerHeight)-y)};
    });
    const browser=await app.evaluate(({BrowserWindow}) => {
      const view=BrowserWindow.getAllWindows()[0].contentView.children.find(child => child.webContents?.getURL() === 'about:blank');
      return {bounds:view.getBounds(),zoom:view.webContents.getZoomFactor()};
    });
    for (const key of ['x','y','width','height']) assert.ok(Math.abs(browser.bounds[key]-panel[key]*.8) <= 2,'Embedded browser '+key+' follows zoom');
    assert.equal(browser.zoom,.8);
    await app.evaluate(({BrowserWindow}) => {
      const view=BrowserWindow.getAllWindows()[0].contentView.children.find(child => child.webContents?.getURL() === 'about:blank');
      view.webContents.sendInputEvent({type:'keyDown',keyCode:'-',modifiers:['control']});
      view.webContents.sendInputEvent({type:'keyUp',keyCode:'-',modifiers:['control']});
    });
    await page.waitForFunction(() => webChatTabs.find(tab => tab.id === activeWebChatId)?.zoom === 90);
    assert.equal(await page.evaluate(() => appZoom),80);
    await page.evaluate(() => {duplicaPanel='telegram';route('duplica');});
    await page.getByRole('heading',{name:'Votre bot, à portée de main.'}).waitFor();
    console.log('Zoom shortcuts, persistence and embedded bounds passed.');
    await capture('desktop-telegram-80.png');
    await sendZoomKey('0');
    await page.waitForFunction(() => appZoom === 100);
    assert.equal(await page.evaluate(() => CSS.supports('appearance','base-select')),true);
    // Real keyboard selection in the styled native menu.
    const select=page.locator('#workspace-selector');
    await select.waitFor({state:'visible'});
    assert.equal(await select.evaluate(element => getComputedStyle(element).appearance),'base-select');
    const initialProject=await select.inputValue();
    await select.focus();await page.keyboard.press('Space');
    await page.waitForFunction(() => document.querySelector('#workspace-selector').matches(':open'));
    await capture('desktop-project-picker.png');
    await page.keyboard.press('End');await page.keyboard.press('Enter');
    await page.waitForFunction(initial => projectId !== initial,initialProject);
    assert.equal(await select.inputValue(),'fixture-other');
    await page.evaluate(() => setAppZoom(90));
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(directory,'desktop-result.json'),JSON.stringify({passed:true,fixture:true,zoomShortcuts:true,zoomControlsHidden:true,persistence:true,embeddedBounds:true,embeddedShortcut:true,styledSelect:true,keyboardSelection:true,errors},null,2));
    console.log('Desktop display acceptance passed: native zoom, persistence, embedded browser bounds/shortcuts, styled choices.');
  } finally {await app.close();}
}
main().catch(error => {console.error(error);process.exitCode=1;});
