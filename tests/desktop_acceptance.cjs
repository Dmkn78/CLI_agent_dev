const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
async function main() {
  fs.mkdirSync('.atelier/browser-evidence',{recursive:true});
  const deadline=setTimeout(() => { console.error('Desktop recipe exceeded 180 seconds.'); process.exit(1); },180000);
  deadline.unref();
  const env={...process.env,ATELIER_URL:'http://127.0.0.1:4320/',ATELIER_DESKTOP_TEST:'1'};
  delete env.ELECTRON_RUN_AS_NODE;
  const application=await electron.launch({executablePath:require('electron'),args:[path.resolve('desktop/main.cjs')],env,timeout:45000});
  console.log('Desktop fixture launched.');
  try {
    const page=await application.firstWindow({timeout:30000});
    assert.equal(await application.evaluate(({Menu}) => Menu.getApplicationMenu()),null);
    page.setDefaultTimeout(15000);
    await application.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].webContents.setBackgroundThrottling(false));
    const errors=[];
    page.on('pageerror',error => errors.push(error.message));
    await page.getByRole('heading',{name:'ChatGPT',exact:true}).waitFor();
    assert.ok(await page.locator('.browser-session-notice').innerText().then(text => text.includes('Codex est connecté.') && text.includes('Connecte-toi une fois')));
    console.log('Desktop local UI ready.');
    await application.evaluate(({BrowserWindow}) => {
      globalThis.dragProof=[];
      BrowserWindow.getAllWindows()[0].webContents.startDrag=options => globalThis.dragProof.push({files:options.files,iconEmpty:options.icon.isEmpty()});
    });
    await page.evaluate(() => window.atelierDesktop.dragFile({projectId:'atelier',path:'docs/memory'}));
    const folderDrag=await application.evaluate(() => globalThis.dragProof[0]);
    assert.ok(folderDrag.files.length > 3);
    assert.ok(folderDrag.files.every(file => file.includes('docs') && file.endsWith('.md')));
    assert.equal(folderDrag.iconEmpty,false);
    console.log('Desktop folder drag contract passed.');
    await page.evaluate(() => {
      window.desktopTerminalEvidence=[];
      window.atelierDesktop.onTerminalData(({id,data}) => { if (window.desktopTerminalEvidence.length < 40) window.desktopTerminalEvidence.push({id,data:data.slice(0,500)}); });
      window.atelierDesktop.onTerminalExit(({id,exitCode}) => window.desktopTerminalEvidence.push({id,exitCode}));
    });
    await page.evaluate(() => { sidebarCollapsed=false; browserResourcesCollapsed=false; chatFocused=false; applyShellLayout(); });
    await page.getByRole('button',{name:'Nouveau chat',exact:true}).first().click();
    await page.locator('.browser-tab').waitFor();
    const proof=await application.evaluate(({BrowserWindow,session}) => {
      const view=BrowserWindow.getAllWindows()[0].contentView.children.find(view => view.webContents);
      const preferences=view.webContents.getLastWebPreferences();
      return {bounds:view.getBounds(),nodeIntegration:preferences.nodeIntegration,sandbox:preferences.sandbox,contextIsolation:preferences.contextIsolation,persistentSession:view.webContents.session === session.fromPartition('persist:atelier-chatgpt'),preload:preferences.preload};
    });
    assert.equal(proof.nodeIntegration,false);
    assert.equal(proof.sandbox,true);
    assert.equal(proof.contextIsolation,true);
    assert.equal(proof.persistentSession,true);
    assert.equal(proof.persistentSession,true);
    assert.ok(!proof.preload);
    assert.ok(proof.bounds.width > 500 && proof.bounds.height > 400);
    console.log('Desktop embedded browser isolation passed.');
    await page.locator('#notifications-button').hover();
    await page.locator('#work-popover').waitFor({state:'visible'});
    await page.waitForTimeout(100);
    assert.equal(await application.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].contentView.children.filter(view => view.webContents).length),0);
    await page.getByRole('button',{name:'Fermer les notifications'}).click();
    await page.getByRole('button',{name:'Masquer la navigation',exact:true}).click();
    await page.waitForFunction(() => document.body.classList.contains('sidebar-collapsed'));
    await page.getByRole('button',{name:'Masquer les ressources',exact:true}).click();
    await page.getByRole('button',{name:'Agrandir / restaurer le chat'}).click();
    await page.waitForFunction(() => document.body.classList.contains('chat-focused'));
    await page.keyboard.press('Escape');
    await page.locator('[data-action="browser-close"]').click();
    assert.equal(await page.locator('.browser-tab').count(),0);
    await page.getByRole('button',{name:'Afficher la navigation',exact:true}).click();
    await page.getByRole('button',{name:'Agents',exact:true}).click();
    assert.equal(await page.locator('#native-terminal').count(),1);
    assert.equal(await page.locator('.session-pane').count(),0);
    await application.evaluate(({ipcMain}) => { globalThis.terminalResizes=[]; ipcMain.on('terminal:resize',(_event,id,cols,rows) => globalThis.terminalResizes.push({id,cols,rows})); });
    await page.getByRole('button',{name:'Nouveau terminal',exact:true}).click();
    assert.deepEqual(await page.locator('[name="cli"] option').evaluateAll(options => options.map(option => option.value)),['codex','claude','opencode','omp','omlx','splash']);
    for (const [runtime,port] of [['omlx','8000'],['splash','8001']]) {
      await page.locator('[name="cli"]').selectOption(runtime);
      assert.equal(await page.locator('[name="localPort"]').inputValue(),port);
      assert.equal(await page.locator('[name="native_model"]').count(),0);
      assert.equal(await page.locator('[name="sandbox"] option[value="workspace-write"]').evaluate(option => option.disabled),false);
    }
    await page.locator('[name="cli"]').selectOption('omp');
    assert.equal(await page.locator('[name="sandbox"] option[value="workspace-write"]').evaluate(option => option.disabled),true);
    await page.locator('[name="cli"]').selectOption('codex');
    await page.getByRole('button',{name:'Ouvrir ici',exact:false}).click();
    await page.waitForFunction(() => [...nativeTerminals.values()][0]?.terminal.buffer.active.getLine(0) && [...Array(nativeTerminals.values().next().value.terminal.buffer.active.length)].some((_,index) => nativeTerminals.values().next().value.terminal.buffer.active.getLine(index)?.translateToString().includes('ATELIER_PTY_READY')));
    const initialSize=await page.evaluate(() => ({id:activeNativeTerminal,cols:nativeTerminals.get(activeNativeTerminal).terminal.cols,rows:nativeTerminals.get(activeNativeTerminal).terminal.rows}));
    let observedSizes=[];
    for (let attempt=0;attempt<20;attempt++) {
      observedSizes=await application.evaluate(() => globalThis.terminalResizes);
      if (observedSizes.some(size => size.id === initialSize.id && size.cols === initialSize.cols && size.rows === initialSize.rows)) break;
      await page.waitForTimeout(100);
    }
    assert.ok(observedSizes.some(size => size.id === initialSize.id && size.cols === initialSize.cols && size.rows === initialSize.rows),JSON.stringify({expected:initialSize,observed:observedSizes}));
    await page.evaluate(() => window.atelierDesktop.writeTerminal(activeNativeTerminal,'terminal-test\r'));
    await page.waitForFunction(() => [...nativeTerminals.values()][0]?.exited);
    const transcript=await page.evaluate(() => { const buffer=nativeTerminals.values().next().value.terminal.buffer.active; return Array.from({length:buffer.length},(_,index) => buffer.getLine(index)?.translateToString()).join('\n'); });
    assert.ok(transcript.includes('ECHO:terminal-test'));
    console.log('Desktop PTY echo passed.');
    const previousColumns=await page.evaluate(() => nativeTerminals.values().next().value.terminal.cols);
    await application.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].setContentSize(1000,800));
    await page.waitForFunction(previous => nativeTerminals.values().next().value.terminal.cols < previous,previousColumns);
    const terminalSize=await page.evaluate(() => ({cols:nativeTerminals.values().next().value.terminal.cols,rows:nativeTerminals.values().next().value.terminal.rows}));
    assert.ok(terminalSize.cols > 10 && terminalSize.rows > 10);
    const terminalPixels=await application.evaluate(async ({BrowserWindow}) => (await BrowserWindow.getAllWindows()[0].capturePage()).toPNG().toString('base64'));
    fs.writeFileSync('.atelier/browser-evidence/terminal-pty-fixture.png',Buffer.from(terminalPixels,'base64'));
    await page.locator('[data-action="close-native-terminal"]').click();
    assert.equal(await page.locator('.xterm').count(),0);
    await application.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].setContentSize(1600,1050));
    await page.evaluate(async () => {
      nativeTerminalLayout='grid'; nativeTerminalColumns=3;
      for (let index=0; index < 7; index++) await createNativeTerminal({runtime:['codex','claude','opencode','omp'][index % 4],model:'fixture-code',effort:'medium',sandbox:'read-only',name:'Recette '+(index+1)});
    });
    await page.waitForFunction(() => [...nativeTerminals.values()].every(tab => { const buffer=tab.terminal.buffer.active; return Array.from({length:buffer.length},(_,index) => buffer.getLine(index)?.translateToString()).join('\n').includes('ATELIER_PTY_READY'); }),null,{timeout:45000});
    assert.equal(await page.locator('.native-terminal-pane').count(),7);
    assert.equal(await page.locator('.xterm').count(),7);
    assert.equal(await page.locator('.native-session-footer').count(),7);
    await page.waitForFunction(() => state.nativeSessions.length >= 7);
    assert.ok((await page.locator('.native-session-footer').first().innerText()).includes('Abonnement :'));
    assert.ok((await page.locator('.native-session-footer').first().innerText()).includes('Compteur non communiqué'));
    const panels=await page.locator('.native-terminal-pane').evaluateAll(elements => elements.map(element => {const rect=element.getBoundingClientRect(); return {x:rect.x,y:rect.y,width:rect.width,height:rect.height};}));
    assert.ok(panels.every(panel => panel.width > 300 && panel.height >= 160));
    for (let first=0; first < panels.length; first++) for (let second=first+1; second < panels.length; second++) {
      const a=panels[first], b=panels[second];
      assert.ok(a.x+a.width <= b.x+1 || b.x+b.width <= a.x+1 || a.y+a.height <= b.y+1 || b.y+b.height <= a.y+1,'Terminal panels must not overlap');
    }
    const splitter=page.locator('.terminal-splitter').first();
    const beforeHeight=await splitter.evaluate(element => element.previousElementSibling.clientHeight);
    const bounds=await splitter.boundingBox();
    await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
    await page.mouse.down(); await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2+40,{steps:8}); await page.mouse.up();
    assert.ok(await splitter.evaluate(element => element.previousElementSibling.clientHeight) > beforeHeight);
    const draggedId=await page.locator('[data-terminal-drag]').first().getAttribute('data-terminal-drag');
    await page.locator(`[data-terminal-drag="${draggedId}"]`).dragTo(page.locator('[data-terminal-column="2"]'),{sourcePosition:{x:15,y:15},targetPosition:{x:15,y:15}});
    assert.equal(await page.evaluate(id => nativeTerminals.get(id).column,draggedId),2);
    await page.locator('[data-action="zoom-native-terminal"]').first().click();
    assert.equal(await page.locator('.native-terminal-pane').count(),1);
    await page.locator('[data-action="zoom-native-terminal"]').click();
    assert.equal(await page.locator('.native-terminal-pane').count(),7);
    await application.evaluate(({BrowserWindow}) => { const window=BrowserWindow.getAllWindows()[0]; window.setTitle('Atelier - recette fictive'); window.showInactive(); });
    await page.waitForTimeout(250);
    const gridPixels=await application.evaluate(async ({BrowserWindow}) => (await BrowserWindow.getAllWindows()[0].capturePage()).toPNG().toString('base64'));
    fs.writeFileSync('.atelier/browser-evidence/terminal-grid-seven-fixture.png',Buffer.from(gridPixels,'base64'));
    await page.getByRole('button',{name:'Onglets',exact:true}).click();
    assert.equal(await page.locator('.xterm').count(),1);
    assert.equal(await page.locator('.browser-tab').count(),7);
    await page.getByRole('button',{name:'Grille',exact:true}).click();
    await application.evaluate(({BrowserWindow}) => { const window=BrowserWindow.getAllWindows()[0]; window.setMinimumSize(300,500); window.setContentSize(390,850); });
    await page.waitForTimeout(150);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1));
    const mobilePixels=await application.evaluate(async ({BrowserWindow}) => (await BrowserWindow.getAllWindows()[0].capturePage()).toPNG().toString('base64'));
    fs.writeFileSync('.atelier/browser-evidence/terminal-grid-mobile-fixture.png',Buffer.from(mobilePixels,'base64'));
    await page.evaluate(async () => {
      for (const tab of [...nativeTerminals.values()]) await actions['close-native-terminal']({dataset:{id:tab.id}});
    });
    assert.equal(await page.locator('.xterm').count(),0);
    assert.deepEqual(errors,[]);
    const result={passed:true,fixture:true,remoteWebsiteTested:false,proof,applicationMenuHidden:true,folderDrag,terminalEcho:true,terminalSize,sevenPanes:true,panels,dragAndResize:true,errors};
    fs.writeFileSync('.atelier/browser-evidence/desktop-result.json',JSON.stringify(result,null,2));
    const pixels=await application.evaluate(async ({BrowserWindow}) => (await BrowserWindow.getAllWindows()[0].capturePage()).toPNG().toString('base64'));
    fs.writeFileSync('.atelier/browser-evidence/desktop-shell-fixture.png',Buffer.from(pixels,'base64'));
    console.log('Desktop acceptance passed: isolated browser, hover overlay, real PTY echo/exit, seven panes, drag/resize/zoom/tabs/mobile/close. ChatGPT login/upload not automated.');
  } catch (error) { console.error('Desktop recipe failed:',error); const page=application.windows()[0]; if (page) console.error(await page.evaluate(() => ({events:window.desktopTerminalEvidence,terminals:[...nativeTerminals.values()].map(tab => ({title:tab.title,exited:tab.exited,transcript:Array.from({length:tab.terminal.buffer.active.length},(_,index) => tab.terminal.buffer.active.getLine(index)?.translateToString()).join('\n').slice(-500)}))})).catch(() => [])); throw error; }
  finally { await application.close(); clearTimeout(deadline); }
}
main().catch(error => {console.error(error); process.exitCode=1;});
