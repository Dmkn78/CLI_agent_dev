const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');

async function main() {
  const directory=path.resolve('.atelier/chat-terminal-feedback-evidence');
  fs.mkdirSync(directory,{recursive:true});
  const profile=path.join(directory,'profile-'+process.pid);
  const env={...process.env,ATELIER_URL:process.env.ATELIER_RECIPE_URL || 'http://127.0.0.1:4348/',ATELIER_DESKTOP_TEST:'1',ATELIER_TEST_DATA:profile};
  delete env.ELECTRON_RUN_AS_NODE;
  const application=await electron.launch({executablePath:require('electron'),args:[path.resolve('desktop/main.cjs')],env,timeout:30000});
  const errors=[];
  try {
    const page=await application.firstWindow();page.setDefaultTimeout(10000);
    page.on('pageerror',error => errors.push(error.message));
    await application.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].webContents.setBackgroundThrottling(false));
    await page.waitForFunction(() => typeof state !== 'undefined' && state.projects.length && provider().models.length);
    await page.evaluate(() => {localStorage.removeItem('atelier-chat-sequence:'+projectId);route('webchat');});
    await page.getByRole('button',{name:'Nouveau chat',exact:true}).click();
    await page.getByRole('button',{name:'Chat 1',exact:true}).waitFor();
    await page.getByRole('button',{name:'Dézoomer le chat',exact:true}).click();
    await page.waitForFunction(() => webChatTabs[0].zoom === 90);
    await page.waitForTimeout(200);
    assert.equal(await application.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].contentView.children.find(view => view.webContents).webContents.getZoomFactor()),.9);
    await page.getByRole('button',{name:'Zoomer le chat',exact:true}).click();
    await page.waitForFunction(() => webChatTabs[0].zoom === 100);
    for (let step=0; step<8; step++) await page.getByRole('button',{name:'Dézoomer le chat',exact:true}).click();
    await page.waitForFunction(() => webChatTabs[0].zoom === 25);
    assert.equal(await application.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].contentView.children.find(view => view.webContents).webContents.getZoomFactor()),.25);
    await page.getByRole('button',{name:'Rétablir le zoom du chat'}).click();
    await page.getByRole('button',{name:'Renommer Chat 1'}).click();
    await page.getByRole('textbox',{name:'Nom du chat'}).fill('Diagnostic interface');
    await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
    await page.getByRole('button',{name:'Diagnostic interface',exact:true}).waitFor();
    // The website changing its title must not replace the user-visible chat name.
    await application.evaluate(({BrowserWindow}) => {
      const contents=BrowserWindow.getAllWindows()[0].contentView.children.find(view => view.webContents).webContents;
      contents.executeJavaScript('document.title="Premier message très long"');
    });
    await page.waitForFunction(() => webChatTabs[0].pageTitle === 'Premier message très long');
    assert.equal(await page.evaluate(() => webChatTabs[0].title),'Diagnostic interface');
    await page.evaluate(async () => {await actions['browser-new']();});
    await page.getByRole('button',{name:'Chat 2',exact:true}).waitFor();
    await page.getByRole('button',{name:'Diagnostic interface',exact:true}).click();
    await page.getByRole('button',{name:'Dézoomer le chat',exact:true}).click();
    await page.waitForFunction(() => webChatTabs[0].zoom === 90);
    await page.getByRole('button',{name:'Chat 2',exact:true}).click();
    await page.waitForTimeout(100);
    assert.equal(await application.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].contentView.children.find(view => view.webContents).webContents.getZoomFactor()),1);
    await page.getByRole('button',{name:'Diagnostic interface',exact:true}).click();
    await page.getByRole('button',{name:'Rétablir le zoom du chat'}).click();
    await application.evaluate(({BrowserWindow}) => {
      const contents=BrowserWindow.getAllWindows()[0].contentView.children.find(view => view.webContents).webContents;
      contents.sendInputEvent({type:'keyDown',keyCode:'-',modifiers:['control']});
      contents.sendInputEvent({type:'keyUp',keyCode:'-',modifiers:['control']});
    });
    await page.waitForFunction(() => webChatTabs[0].zoom === 90);
    assert.equal(await page.evaluate(() => appZoom),100);
    await page.evaluate(() => setAppZoom(80));
    assert.ok(Math.abs(await application.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].contentView.children.find(view => view.webContents).webContents.getZoomFactor())-.72)<.001);
    await page.evaluate(() => setAppZoom(100));
    await page.screenshot({path:path.join(directory,'named-chat-zoom.png')});
    await page.evaluate(() => {route('agents');newNativeTerminalModal('codex');});
    assert.ok((await page.locator('#modal').innerText()).includes('sandbox réel'));
    const image=path.join(directory,"sélection ' image.png");
    fs.writeFileSync(image,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6nkEAAAAASUVORK5CYII=','base64'));
    await application.evaluate(({dialog,nativeImage,clipboard},image) => {
      dialog.showOpenDialog=async () => ({canceled:false,filePaths:[image]});
      clipboard.readImage=() => nativeImage.createFromBitmap(Buffer.from([132,161,216,255]),{width:1,height:1});
    },image);
    await page.getByRole('button',{name:'Joindre des images'}).click();
    await page.waitForFunction(() => JSON.parse(document.querySelector('[name="terminalImages"]').value).length === 1);
    await page.getByRole('button',{name:'Coller une image'}).click();
    await page.waitForFunction(() => JSON.parse(document.querySelector('[name="terminalImages"]').value).length === 2);
    const selected=JSON.parse(await page.locator('[name="terminalImages"]').inputValue());
    assert.equal(selected[0],image);
    assert.ok(selected[1].startsWith(profile) && fs.existsSync(selected[1]));
    await page.screenshot({path:path.join(directory,'codex-image-attachments.png')});
    await page.getByRole('button',{name:'Ouvrir ici',exact:false}).click();
    await page.waitForFunction(() => [...nativeTerminals.values()].some(tab => tab.pid));
    const launched=await page.evaluate(() => [...nativeTerminals.values()][0].launchSettings);
    assert.deepEqual(launched.images,selected);
    assert.equal(launched.sandbox,'read-only');
    const id=await page.evaluate(() => activeNativeTerminal);
    await page.evaluate(id => actions['native-terminal-images']({dataset:{id}}),id);
    assert.equal(await page.locator('[name="native_model"]').inputValue(),launched.model);
    assert.equal(await page.locator('[name="native_effort"]').inputValue(),launched.effort);
    assert.equal(await page.locator('.native-terminal-pane').count(),1);
    await page.evaluate(async () => {document.querySelector('#modal').close();for (const id of [...nativeTerminals.keys()]) await actions['close-native-terminal']({dataset:{id}});for (const tab of [...webChatTabs]) await actions['browser-close']({dataset:{id:tab.id}});});
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(directory,'result.json'),JSON.stringify({passed:true,fixture:true,remoteChatGPTTested:false,realInferenceStarted:false,chatZoom:[25,100],renamePreserved:true,independentShortcut:true,selectedImages:2,profilesPreserved:true,errors},null,2));
    console.log('Chat/terminal feedback desktop passed: chat zoom, independent shortcuts, numbered/renamed tabs, native image picker/clipboard, fixture terminal launch.');
  } finally {await application.close();}
}
main().catch(error => {console.error(error);process.exitCode=1;});
