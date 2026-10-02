const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process');

async function waitForNativeState(read,predicate,label) {
  const deadline=Date.now()+15000;
  let current;
  while (Date.now()<deadline) {
    current=await read();
    if (predicate(current)) return current;
    await new Promise(resolve => setTimeout(resolve,100));
  }
  assert.fail(label+': '+JSON.stringify(current));
}

async function main() {
  const fixture=spawn(process.env.ATELIER_TEST_PYTHON || 'python',['tests/simple_workbench_fixture.py','--port','4340'],{env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'},stdio:['ignore','pipe','inherit'],windowsHide:true});
  let app;
  const evidence=path.resolve('.atelier/simple-workbench-evidence'),errors=[];fs.mkdirSync(evidence,{recursive:true});
  try {
    await new Promise((resolve,reject) => {fixture.stdout.on('data',output => {if (String(output).includes('fixture ready')) resolve();});fixture.on('error',reject);fixture.on('exit',code => {if (code) reject(new Error('Fixture exited: '+code));});});
    const env={...process.env,ATELIER_URL:'http://127.0.0.1:4340/',ATELIER_DESKTOP_TEST:'1',ATELIER_TEST_DATA:path.resolve('.atelier/simple-workbench-desktop-fixture','run_'+Date.now())};
    delete env.ELECTRON_RUN_AS_NODE;
    app=await electron.launch({executablePath:require('electron'),args:[path.resolve('desktop/main.cjs')],env,timeout:30000});
    const page=await app.firstWindow({timeout:20000});page.setDefaultTimeout(15000);page.on('pageerror',error => errors.push(error.message));
    await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].webContents.setBackgroundThrottling(false));
    await page.waitForURL('http://127.0.0.1:4340/**');
    await page.waitForFunction(() => typeof state !== 'undefined' && state.projects.length === 2 && provider().models.length > 0);
    await page.evaluate(async () => {await setAppZoom(100);route('terminal');});
    const ids=await page.evaluate(async () => {
      const ids=[];
      for (const name of ['Principal','Revue','Tests']) {
        await createNativeTerminal({runtime:'codex',model:'fixture-code',effort:'medium',sandbox:'read-only',name});ids.push(activeNativeTerminal);
      }
      return ids;
    });
    const terminalText=tab => Array.from({length:tab.terminal.buffer.active.length},(_,index) => tab.terminal.buffer.active.getLine(index)?.translateToString()).join('\n');
    await page.waitForFunction(() => [...nativeTerminals.values()].every(tab => Array.from({length:tab.terminal.buffer.active.length},(_,index) => tab.terminal.buffer.active.getLine(index)?.translateToString()).join('\n').includes('ATELIER_PTY_READY')));
    await page.waitForFunction(() => state.nativeSessions.filter(session => session.usageSource === 'fixture-native').length >= 3);
    assert.ok((await page.locator(`[data-terminal-pane="${ids[0]}"] .usage-chip summary`).innerText()).includes('155'));
    await page.locator(`[data-terminal-pane="${ids[0]}"] .usage-chip summary`).click();
    assert.ok((await page.locator('.usage-chip[open]').innerText()).includes('31'));
    assert.ok((await page.locator('.usage-chip[open]').innerText()).includes('500'));
    await page.screenshot({path:path.join(evidence,'native-tokens.png')});
    await page.locator(`[data-terminal-pane="${ids[0]}"] .usage-chip summary`).click();
    const first=page.locator(`[data-terminal-pane="${ids[0]}"]`),initial=await first.boundingBox();
    const header=await first.locator('header').boundingBox();
    await page.mouse.move(header.x+85,header.y+12);await page.mouse.down();
    await page.mouse.move(header.x+125,header.y+55,{steps:5});await page.mouse.up();
    const moved=await first.boundingBox();assert.ok(moved.x > initial.x+20 && moved.y > initial.y+25);
    const resize=await first.locator('.floating-resize').boundingBox();
    await page.mouse.move(resize.x+7,resize.y+7);await page.mouse.down();
    await page.mouse.move(resize.x-115,resize.y-65,{steps:5});await page.mouse.up();
    assert.ok((await first.boundingBox()).width < moved.width-70);
    await first.locator('[data-action=zoom-native-terminal]').click();
    assert.equal(await page.locator('.native-terminal-pane:visible').count(),1);
    await first.locator('[data-action=zoom-native-terminal]').click();
    await page.locator('#main>.workspace-toolbar [data-action=new-panel]').click();
    await page.getByRole('menuitem',{name:'Dashboard',exact:true}).click();
    await page.locator('.workspace-tool-pane [data-dashboard-content]').waitFor();
    const toolHeader=await page.locator('.workspace-tool-pane>header').boundingBox();
    await page.mouse.move(toolHeader.x+90,toolHeader.y+12);await page.mouse.down();
    await page.mouse.move(toolHeader.x+125,toolHeader.y-30,{steps:4});await page.mouse.up();
    await page.screenshot({path:path.join(evidence,'native-floating-panels.png')});
    await page.getByRole('button',{name:'Fermer le panneau Dashboard',exact:true}).click();
    const beforeWorkspaceChange=await page.evaluate(() => JSON.stringify(nativeWorkspaceLayout().windows));
    await page.getByLabel('Espace de travail',{exact:true}).selectOption('workspace-b');
    await page.evaluate(async () => createNativeTerminal({runtime:'codex',model:'fixture-code',effort:'medium',sandbox:'read-only',name:'Projet B'}));
    const foreignId=await page.evaluate(() => activeNativeTerminal);
    await page.getByLabel('Espace de travail',{exact:true}).selectOption('atelier');
    assert.equal(await page.evaluate(() => JSON.stringify(nativeWorkspaceLayout().windows)),beforeWorkspaceChange);
    await page.locator(`[data-terminal-pane="${ids[1]}"] .xterm-helper-textarea`).focus();
    await page.keyboard.type('simple-workbench-keyboard');
    await page.keyboard.press('Enter');
    await page.waitForFunction(id => nativeTerminals.get(id).exited,ids[1]);
    const keyboardEchoed=await page.evaluate(id => {
      const tab=nativeTerminals.get(id);return Array.from({length:tab.terminal.buffer.active.length},(_,index) => tab.terminal.buffer.active.getLine(index)?.translateToString()).join('\n').includes('ECHO:simple-workbench-keyboard');
    },ids[1]);
    assert.equal(keyboardEchoed,true,'Keyboard events reach the real PTY through xterm');
    await first.locator('[data-action=hide-native-terminal]').click();
    assert.equal(await page.locator('.native-terminal-pane').count(),2);
    await page.evaluate(id => window.atelierDesktop.writeTerminal(id,'simple-workbench-echo\r'),ids[0]);
    await page.waitForFunction(id => nativeTerminals.get(id).exited,ids[0]);
    const echoed=await page.evaluate(id => {
      const tab=nativeTerminals.get(id);return Array.from({length:tab.terminal.buffer.active.length},(_,index) => tab.terminal.buffer.active.getLine(index)?.translateToString()).join('\n').includes('ECHO:simple-workbench-echo');
    },ids[0]);
    assert.equal(echoed,true,'A hidden panel keeps its real PTY and keyboard transport');
    await page.locator(`.minimized-panels [data-id="${ids[0]}"]`).click();
    assert.equal(await first.locator('.terminal-native-status.ended').count(),1);
    await page.evaluate(async () => {for (let index=0;index<4;index++) await createNativeTerminal({runtime:'codex',model:'fixture-code',effort:'medium',sandbox:'read-only',name:'Panneau '+(index+4)});});
    await page.waitForFunction(() => Math.min(...currentNativeTerminals().map(tab => tab.terminal.options.fontSize)) < 13);
    const crowded=await page.evaluate(() => Math.min(...currentNativeTerminals().map(tab => tab.terminal.options.fontSize)));
    assert.ok(crowded >= 10 && crowded < 13,'Additional panels automatically reduce font size');
    const extra=await page.evaluate(() => currentNativeTerminals().slice(1).map(tab => tab.id));
    await page.evaluate(async ids => {for (const id of ids) await actions['close-native-terminal']({dataset:{id}});},extra);
    await page.waitForFunction(id => nativeTerminals.get(id).terminal.options.fontSize === 13,ids[0]);
    await page.locator('#main>.workspace-toolbar [data-action=new-panel]').click();
    await page.getByRole('menuitem',{name:'ChatGPT',exact:true}).click();
    await page.waitForFunction(() => webChatTabs.some(tab => tab.url === 'about:blank' && tab.loading === false));
    const inspectBrowser=() => app.evaluate(({BrowserWindow,webContents}) => {
      const browser=webContents.getAllWebContents().find(contents => contents.getURL() === 'about:blank');
      const preferences=browser?.getLastWebPreferences();
      const attached=BrowserWindow.getAllWindows()[0].contentView.children.find(child => child.webContents === browser);
      const bounds=attached?.getBounds();
      return {embedded:Boolean(bounds && bounds.width > 20 && bounds.height > 20),sandbox:preferences?.sandbox,contextIsolation:preferences?.contextIsolation,nodeIntegration:preferences?.nodeIntegration};
    });
    const browserSafety=await waitForNativeState(inspectBrowser,value => value.embedded && value.sandbox && value.contextIsolation && value.nodeIntegration === false,'Embedded browser ready');
    assert.deepEqual(browserSafety,{embedded:true,sandbox:true,contextIsolation:true,nodeIntegration:false});
    await page.locator('.workspace-tool-pane>header [data-action=new-panel]').click();
    await page.getByRole('menuitem',{name:'Fichiers',exact:true}).click();
    const embeddedHidden=await waitForNativeState(() => app.evaluate(({BrowserWindow}) => !BrowserWindow.getAllWindows()[0].contentView.children.some(child => child.webContents?.getURL() === 'about:blank')),value => value,'Local tool hides embedded browser');
    assert.equal(embeddedHidden,true,'Native web content hides when a local tool replaces it');
    await page.getByRole('button',{name:'Fermer le panneau Fichiers',exact:true}).click();
    await page.getByRole('button',{name:'Fermer le panneau ChatGPT',exact:true}).click();
    await page.locator('[data-action=workspace-options]').click();
    await page.getByRole('menuitemradio',{name:'Mosaïque',exact:true}).click();
    assert.equal(await page.locator('.free-layout').count(),1,'The existing docked layout remains available in the menu');
    await page.locator('[data-action=workspace-options]').click();
    await page.getByRole('menuitemradio',{name:'Fenêtres libres',exact:true}).click();
    await app.evaluate(({BrowserWindow}) => {const window=BrowserWindow.getAllWindows()[0];window.setMinimumSize(300,300);window.setContentSize(390,850);});
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1),false);
    await page.screenshot({path:path.join(evidence,'native-mobile.png'),fullPage:true});
    await page.evaluate(async () => {for (const id of [...nativeTerminals.keys()]) await actions['close-native-terminal']({dataset:{id}});});
    assert.equal(await page.locator('.xterm').count(),0);
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(evidence,'desktop-result.json'),JSON.stringify({passed:true,fixture:true,realPty:true,moveResizeZoom:true,workspaceIsolation:true,echoed,keyboardEchoed,crowdedFont: crowded,fontRecovery:true,browserSafety,localToolSwitch:true,mobile:true,errors},null,2));
    console.log('Simple workbench desktop recipe passed: real PTYs, windows, adaptive font, counters, embedded browser, clean closure.');
  } catch (error) {
    if (app) {
      const page=await app.firstWindow().catch(() => null);
      const diagnostics=await page?.evaluate(() => currentNativeTerminals().map(tab => {
        const host=document.getElementById('native-terminal-'+tab.id);
        return {id:tab.id,title:tab.title,font:tab.terminal.options.fontSize,host:host ? {width:host.clientWidth,height:host.clientHeight}:null};
      })).catch(() => null);
      fs.writeFileSync(path.join(evidence,'desktop-failure.json'),JSON.stringify({error:error.message,stack:error.stack,errors,terminals:diagnostics},null,2));
      await page?.screenshot({path:path.join(evidence,'desktop-failure.png')}).catch(() => {});
    }
    console.error('Page errors:',errors);throw error;
  } finally {if (app) await app.close();fixture.kill();}
}
main().catch(error => {console.error(error);process.exitCode=1;});
