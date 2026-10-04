const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');

async function main() {
  const evidence=path.resolve('.atelier/compact-terminal-feedback-evidence');
  fs.mkdirSync(evidence,{recursive:true});
  const profile=path.join(evidence,'profile-'+Date.now()+'-'+process.pid);
  const env={...process.env,ATELIER_URL:process.env.ATELIER_RECIPE_URL || 'http://127.0.0.1:4351/',ATELIER_DESKTOP_TEST:'1',ATELIER_TEST_DATA:profile};
  delete env.ELECTRON_RUN_AS_NODE;
  const application=await electron.launch({executablePath:require('electron'),args:[path.resolve('desktop/main.cjs')],env,timeout:30000});
  const errors=[],measurements=[];
  const page=await application.firstWindow();
  page.setDefaultTimeout(15000);
  page.on('pageerror',error => errors.push(error.message));
  try {
    await application.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].webContents.setBackgroundThrottling(false));
    await page.waitForFunction(() => typeof state !== 'undefined' && state.projects.length && provider().models.length);
    await page.evaluate(() => {setAppZoom(100);route('agents');newNativeTerminalModal('codex');});
    await page.locator('[name="terminalName"]').fill('Terminal principal');
    await page.locator('[name="native_model"]').selectOption('fixture-review');
    await page.locator('[name="sandbox"]').selectOption('workspace-write');
    await page.getByRole('button',{name:'Ouvrir ici',exact:false}).click();
    await page.waitForFunction(() => [...nativeTerminals.values()].some(tab => tab.pid));
    await page.waitForFunction(() => [...nativeTerminals.values()].every(tab => Array.from({length:tab.terminal.buffer.active.length},(_,index) => tab.terminal.buffer.active.getLine(index)?.translateToString()).join('\n').includes('ATELIER_PTY_READY')));
    const id=await page.evaluate(() => activeNativeTerminal);
    const pane=page.locator(`[data-terminal-pane="${id}"]`);
    const launched=await page.evaluate(id => nativeTerminals.get(id).launchSettings,id);
    assert.equal(launched.model,'fixture-review');
    assert.equal(launched.sandbox,'workspace-write');
    for (const width of [1500,900,390]) {
      await application.evaluate(({BrowserWindow},width) => {const window=BrowserWindow.getAllWindows()[0];window.setMinimumSize(300,300);window.setContentSize(width,850);},width);
      await page.waitForTimeout(300);
      const measurement=await pane.locator('header').evaluate(header => {
        const box=element => {const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
        return {viewport:innerWidth,header:box(header),icons:[...header.querySelectorAll('button .icon')].map(box),buttons:[...header.querySelectorAll('button')].map(box),overflow:document.documentElement.scrollWidth > innerWidth+1,headerOverflow:header.scrollWidth > header.clientWidth+1};
      });
      assert.ok(measurement.header.height <= 22,`Header ${width}px is ${measurement.header.height}px`);
      assert.ok(measurement.header.height >= 18,'Header retains visible icons');
      assert.ok(measurement.icons.length >= 3,'Terminal controls remain visible');
      for (const icon of measurement.icons) {
        assert.ok(icon.width > 0 && icon.height > 0,'Icons have visible dimensions');
        assert.ok(icon.y >= measurement.header.y-1 && icon.bottom <= measurement.header.bottom+1,'Icons fit inside compact header');
      }
      for (const button of measurement.buttons) assert.ok(button.x >= measurement.header.x-1 && button.right <= measurement.header.right+1,'Controls fit inside header');
      assert.equal(measurement.overflow,false,`Page overflow at ${width}px`);
      assert.equal(measurement.headerOverflow,false,`Header overflow at ${width}px`);
      await pane.getByRole('button',{name:'Joindre des images à Codex',exact:true}).waitFor({state:'visible'});
      await page.screenshot({path:path.join(evidence,`compact-header-${width}.png`),fullPage:true});
      if (width === 1500) await pane.locator('header').screenshot({path:path.join(evidence,'terminal-header.png')});
      measurements.push(measurement);
    }
    await application.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].setContentSize(1500,850));
    await pane.getByRole('button',{name:'Joindre des images à Codex',exact:true}).click();
    const images=page.locator('#modal .terminal-images');
    await images.waitFor({state:'visible'});
    const imageBox=await images.boundingBox();
    assert.ok(imageBox.y+imageBox.height <= await page.evaluate(() => innerHeight),'Images section is immediately visible');
    assert.equal(await page.locator('[name="native_model"]').inputValue(),launched.model);
    assert.equal(await page.locator('[name="native_effort"]').inputValue(),launched.effort);
    assert.equal(await page.locator('[name="sandbox"]').inputValue(),launched.sandbox);
    assert.equal(await page.locator('.native-terminal-pane').count(),1,'Opening attachments preserves current terminal');
    await page.screenshot({path:path.join(evidence,'visible-image-entry.png')});
    const image=path.join(evidence,'image-synthetique.png');
    fs.writeFileSync(image,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6nkEAAAAASUVORK5CYII=','base64'));
    await application.evaluate(({dialog},image) => {dialog.showOpenDialog=async () => ({canceled:false,filePaths:[image]});},image);
    await page.getByRole('button',{name:'Joindre des images',exact:true}).click();
    await page.waitForFunction(() => JSON.parse(document.querySelector('[name="terminalImages"]').value).length === 1);
    await page.screenshot({path:path.join(evidence,'image-selected.png')});
    await page.getByRole('button',{name:'Ouvrir avec ces images',exact:true}).click();
    await page.waitForFunction(() => [...nativeTerminals.values()].filter(tab => tab.pid).length === 2);
    assert.equal(await page.locator('.native-terminal-pane').count(),2,'Opening attachments creates a separate terminal');
    const second=await page.evaluate(() => nativeTerminals.get(activeNativeTerminal).launchSettings);
    assert.deepEqual(second.images,[image]);
    assert.equal(second.model,launched.model);
    assert.equal(second.effort,launched.effort);
    assert.equal(second.sandbox,launched.sandbox);
    await page.waitForTimeout(250);
    await page.screenshot({path:path.join(evidence,'compact-headers-two-terminals.png'),fullPage:true});
    await page.evaluate(async () => {for (const id of [...nativeTerminals.keys()]) await actions['close-native-terminal']({dataset:{id}});});
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(evidence,'result.json'),JSON.stringify({passed:true,fixture:true,realInferenceStarted:false,measurements,imagesVisible:true,currentTerminalPreserved:true,imagePassedToNewTerminal:true,launchSettingsPreserved:true,errors},null,2));
    console.log('Compact terminal recipe passed: headers <=22px, visible icons at 1500/900/390, discoverable attachments, preserved terminal and permissions.');
  } catch (error) {
    await page.screenshot({path:path.join(evidence,'failure.png'),fullPage:true}).catch(() => {});
    fs.writeFileSync(path.join(evidence,'failure.json'),JSON.stringify({error:error.message,stack:error.stack,measurements,errors},null,2));
    throw error;
  } finally {await application.close();}
}
main().catch(error => {console.error(error);process.exitCode=1;});
