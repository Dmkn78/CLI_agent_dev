const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');

async function main(){
  const env={...process.env,ATELIER_URL:'http://127.0.0.1:4332/',ATELIER_DESKTOP_TEST:'1'};
  delete env.ELECTRON_RUN_AS_NODE;
  const app=await electron.launch({executablePath:require('electron'),args:[path.resolve('desktop/main.cjs'),'--atelier-code'],env,timeout:30000});
  const evidence=path.resolve('.atelier/feedback-evidence'),errors=[];
  try{
    const page=await app.firstWindow({timeout:20000});page.setDefaultTimeout(15000);
    page.on('pageerror',error=>errors.push(error.message));
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.setBackgroundThrottling(false));
    await page.locator('#native-terminal').waitFor();
    await page.waitForFunction(()=>provider().models.length > 0);
    assert.equal(await app.evaluate(({Menu})=>Menu.getApplicationMenu()),null);
    assert.equal(await page.evaluate(()=>typeof structureDuplicaInstruction),'function');
    await app.evaluate(({BrowserWindow})=>{
      globalThis.dragProof=[];
      BrowserWindow.getAllWindows()[0].webContents.startDrag=options=>globalThis.dragProof.push({files:options.files,iconEmpty:options.icon.isEmpty()});
    });
    await page.evaluate(()=>window.atelierDesktop.dragFile({projectId:'atelier',path:'ressources'}));
    const drag=await app.evaluate(()=>globalThis.dragProof[0]);
    assert.equal(drag.files.length,2);assert.equal(drag.iconEmpty,false);
    await page.evaluate(async()=>{
      nativeTerminalColumns=2;
      await createNativeTerminal({runtime:'codex',model:'fixture-code',sandbox:'read-only',name:'Recette terminal 1'});
      await createNativeTerminal({runtime:'omp',model:'fixture-code',sandbox:'read-only',name:'Recette terminal 2'});
    });
    await page.waitForFunction(()=>[...nativeTerminals.values()].every(tab=>Array.from({length:tab.terminal.buffer.active.length},(_,i)=>tab.terminal.buffer.active.getLine(i)?.translateToString()).join('\n').includes('ATELIER_PTY_READY')));
    const layout=await page.locator('.native-terminal-pane').evaluateAll(panes=>panes.map(pane=>({width:pane.clientWidth,height:pane.clientHeight})));
    assert.ok(layout.every(pane=>pane.width > 400 && pane.height > 500));
    await page.evaluate(()=>window.atelierDesktop.writeTerminal([...nativeTerminals.keys()][0],'terminal-feedback\r'));
    await page.waitForFunction(()=>[...nativeTerminals.values()][0].exited);
    const echoed=await page.evaluate(()=>Array.from({length:[...nativeTerminals.values()][0].terminal.buffer.active.length},(_,i)=>[...nativeTerminals.values()][0].terminal.buffer.active.getLine(i)?.translateToString()).join('\n').includes('ECHO:terminal-feedback'));
    assert.equal(echoed,true);
    fs.mkdirSync(evidence,{recursive:true});
    const desktopWidth=await page.evaluate(()=>innerWidth);
    await page.screenshot({path:path.join(evidence,'compact-native-terminals.png')});
    await app.evaluate(({BrowserWindow})=>{const window=BrowserWindow.getAllWindows()[0];window.setMinimumSize(300,300);window.setContentSize(390,850);});
    await page.waitForTimeout(200);
    const mobileWidth=await page.evaluate(()=>innerWidth);
    assert.equal(mobileWidth,390);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth+1),false);
    await page.screenshot({path:path.join(evidence,'compact-native-mobile.png'),fullPage:true});
    await page.evaluate(async()=>{for(const id of [...nativeTerminals.keys()])await actions['close-native-terminal']({dataset:{id}});});
    assert.equal(await page.locator('.xterm').count(),0);assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(evidence,'desktop-result.json'),JSON.stringify({passed:true,fixture:true,menuHidden:true,drag,layout,echoed,widths:[desktopWidth,mobileWidth],errors},null,2));
    console.log('Feedback desktop passed: menu hidden, folder drag, two real PTY panels, echo/exit, compact desktop/mobile layout, clean closure.');
  }finally{await app.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
