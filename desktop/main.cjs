const {app,BrowserWindow,WebContentsView,ipcMain,shell,nativeImage,dialog,Menu,clipboard}=require('electron');
const {registerTerminals,closeTerminals}=require('./pty.cjs');
const {registerComputerController}=require('./computer.cjs');
const {registerDisplay,bindZoomShortcuts}=require('./display.cjs');
const {DesktopService,SourceDesktopService}=require('./service.cjs');
const {UpdateController}=require('./updates.cjs');
const {modeFromArgs,configureIdentity,applyReadyIdentity,createActivationController}=require('./identity.cjs');
const path=require('node:path');
const fs=require('node:fs/promises');
const {randomUUID}=require('node:crypto');
let origin=new URL(process.env.ATELIER_URL || 'http://127.0.0.1:4317/');
if (origin.protocol !== 'http:' || !['127.0.0.1','localhost'].includes(origin.hostname)) throw new Error('Serveur Atelier local requis.');
origin.pathname='/'; origin.search=''; origin.hash='';
let mainWindow, activeBrowser=null, nonce=null;
let service=null, updates=null, quitting=false;
const browsers=new Map();
const desktopTest=process.env.ATELIER_DESKTOP_TEST === '1';
const requestedMode=modeFromArgs(process.argv);
const identity=configureIdentity(app,{rootPath:path.resolve(__dirname,'..'),desktopTest,testData:process.env.ATELIER_TEST_DATA,mode:requestedMode});
const activation=createActivationController({app,getWindow:() => mainWindow,desktopTest});
const securePreferences={sandbox:true,contextIsolation:true,nodeIntegration:false};
if (!identity.primary) { app.quit(); process.exit(0); }
app.on('second-instance',(_event,argv,_directory,data) => activation.request(data?.mode || modeFromArgs(argv)));
app.on('activate',() => activation.request());
async function request(route,data) {
  for (let attempt=0; attempt < 2; attempt++) {
    const response=await fetch(new URL(route,origin),{method:data === undefined ? 'GET' : 'POST',headers:{'X-Atelier-Token':nonce,'Content-Type':'application/json'},body:data === undefined ? undefined : JSON.stringify(data),signal:AbortSignal.timeout(15000)});
    const result=await response.json();
    if (response.ok) return result;
    if (attempt === 0 && response.status === 403 && result.error === 'Session locale requise.') { await refreshNonce(); continue; }
    throw new Error(result.error);
  }
}
async function refreshNonce() {
  const html=await (await fetch(origin)).text();
  nonce=/name="atelier-token" content="([^"]+)"/.exec(html)?.[1];
  if (!nonce) throw new Error('Serveur Atelier indisponible. Lance scripts/start-atelier.ps1.');
}
function trusted(event) {
  if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame || new URL(event.sender.getURL()).origin !== origin.origin) throw new Error('Émetteur IPC refusé.');
}
function browserId(id) {
  if (typeof id !== 'string' || !/^[a-z0-9-]{1,80}$/i.test(id)) throw new Error('Identifiant invalide.');
}
function hideBrowser() {
  if (activeBrowser) mainWindow.contentView.removeChildView(activeBrowser);
  activeBrowser=null;
}
function secureNavigation(contents) {
  contents.on('will-navigate',(event,url) => { if (new URL(url).protocol !== 'https:') event.preventDefault(); });
  contents.setWindowOpenHandler(({url}) => {
    if (new URL(url).protocol !== 'https:') return {action:'deny'};
    return {action:'allow',overrideBrowserWindowOptions:{webPreferences:{...securePreferences,partition:'persist:atelier-chatgpt'}}};
  });
  contents.on('did-create-window',window => secureNavigation(window.webContents));
}
app.whenReady().then(async () => {
  const iconPath=app.isPackaged ? path.join(process.resourcesPath,'atelier-icon.png') : path.join(__dirname,'../packaging/icon.png');
  applyReadyIdentity({app,Menu,nativeImage,iconPath,desktopTest});
  if (app.isPackaged) {
    service=new DesktopService({runtimePath:path.join(process.resourcesPath,'runtime'),dataPath:app.getPath('userData'),
      version:app.getVersion(),desktopExecutable:process.execPath,skipDiscovery:desktopTest,
      onFailure:error => { dialog.showErrorBox('Atelier — service interrompu',error.message); app.quit(); }});
    origin=await service.start();
  } else if (process.env.ATELIER_SOURCE_SERVICE === '1' && !process.env.ATELIER_URL) {
    service=new SourceDesktopService({rootPath:path.resolve(__dirname,'..'),skipDiscovery:desktopTest,
      dataPath:desktopTest ? path.join(app.getPath('userData'),'service-data') : undefined,
      onFailure:error => { dialog.showErrorBox('Atelier — service interrompu',error.message); app.quit(); }});
    origin=await service.start();
  }
  const autoUpdater=desktopTest ? new (require('node:events').EventEmitter)() : require('electron-updater').autoUpdater;
  updates=new UpdateController({updater:autoUpdater,preferencesPath:path.join(app.getPath('userData'),'updates.json'),
    currentVersion:app.getVersion(),available:app.isPackaged && !desktopTest,
    onChange:status => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('updates:state',status); },
    install:async () => {
      const current=await request('/api/state');
      const activeSessions=(current.sessions || []).some(session => session.workEnabled || ['running','initializing','waiting','starting','waiting_approval','waiting_input'].includes(session.status));
      const activeWork=['workflows','benchmarks','channels','requests'].some(key => (current[key] || []).some(job => ['running','queued','planning','implementing','verifying','auditing','waiting_plan'].includes(job.status)));
      if (activeSessions || activeWork || require('./pty.cjs').terminalCount() > 0) throw new Error('Arrêtez les travaux actifs et fermez les terminaux avant de redémarrer Atelier.');
      const choice=await dialog.showMessageBox(mainWindow,{type:'question',title:'Installer la mise à jour',
        message:'Installer la mise à jour et redémarrer Atelier ?',detail:'Vos projets et données locales seront conservés.',
        buttons:['Plus tard','Installer et redémarrer'],defaultId:0,cancelId:0});
      if (choice.response !== 1) return false;
      // before-quit stops the owned service only after the updater accepts installation.
      autoUpdater.quitAndInstall(false,true);
      return true;
    }});
  mainWindow=new BrowserWindow({show:process.env.ATELIER_DESKTOP_TEST !== '1',width:1500,height:980,minWidth:700,minHeight:580,autoHideMenuBar:true,backgroundColor:'#1d1d1c',title:'Atelier',webPreferences:{...securePreferences,preload:path.join(__dirname,'preload.cjs')}});
  bindZoomShortcuts(mainWindow.webContents,() => mainWindow);
  mainWindow.webContents.on('will-navigate',(event,url) => { if (new URL(url).origin !== origin.origin) event.preventDefault(); });
  mainWindow.webContents.setWindowOpenHandler(({url}) => { if (new URL(url).protocol === 'https:') shell.openExternal(url); return {action:'deny'}; });
  await refreshNonce();
  const mode=requestedMode || (app.isPackaged ? 'settings' : 'chat');
  await mainWindow.loadURL(new URL(mode === 'settings' ? '#settings' : mode === 'code' ? '#terminal' : '#webchat',origin).href);
  updates.start();
  if (requestedMode) mainWindow.webContents.send('desktop:mode',mode);
  activation.ready();
  const stopComputer=registerComputerController({getWindow:() => mainWindow,request,fixture:process.env.ATELIER_DESKTOP_TEST === '1'});
  mainWindow.on('closed',() => { stopComputer(); closeTerminals(); for (const view of browsers.values()) if (!view.webContents.isDestroyed()) view.webContents.close(); browsers.clear(); });
}).catch(async error => {
  if (desktopTest) console.error('Atelier — démarrage impossible:',error);
  else dialog.showErrorBox('Atelier — démarrage impossible',error.message);
  await service?.stop(); app.quit();
});
app.on('before-quit',event => {
  updates?.stop();
  if (!service || quitting) return;
  event.preventDefault();
  quitting=true;
  closeTerminals();
  service.stop().finally(() => app.quit());
});
ipcMain.handle('updates:state',event => { trusted(event); return updates.snapshot(); });
ipcMain.handle('updates:preferences',(event,preferences) => { trusted(event); return updates.configure(preferences); });
ipcMain.handle('updates:check',event => { trusted(event); return updates.check(); });
ipcMain.handle('updates:download',event => { trusted(event); return updates.download(); });
ipcMain.handle('updates:install',event => { trusted(event); return updates.install(); });
ipcMain.handle('browser:create',async (event,id) => {
  trusted(event); browserId(id);
  if (browsers.size >= 12 || browsers.has(id)) throw new Error('Limite : 12 onglets.');
  const view=new WebContentsView({webPreferences:{...securePreferences,partition:'persist:atelier-chatgpt'}});
  view.webContents.setZoomFactor(mainWindow.webContents.getZoomFactor());
  bindZoomShortcuts(view.webContents,() => mainWindow,direction => mainWindow?.webContents.send('browser:zoom-shortcut',{id,direction}));
  view.webContents.on('did-finish-load',() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      view.webContents.setZoomFactor(mainWindow.webContents.getZoomFactor() * (view.atelierZoomFactor || 1));
      if (activeBrowser && activeBrowser !== view && !activeBrowser.webContents.isDestroyed()) activeBrowser.webContents.setZoomFactor(mainWindow.webContents.getZoomFactor() * (activeBrowser.atelierZoomFactor || 1));
    }
  });
  view.webContents.session.setPermissionRequestHandler((_contents,_permission,callback) => callback(false));
  view.webContents.session.setPermissionCheckHandler(() => false);
  secureNavigation(view.webContents);
  browsers.set(id,view);
  const publish=error => {
    if (mainWindow?.isDestroyed() || !mainWindow) return;
    mainWindow.webContents.send('browser:state',{id,url:view.webContents.getURL(),title:view.webContents.getTitle(),loading:view.webContents.isLoading(),back:view.webContents.navigationHistory.canGoBack(),forward:view.webContents.navigationHistory.canGoForward(),error:error || null});
  };
  view.webContents.on('did-start-loading',() => publish());
  view.webContents.on('did-stop-loading',() => publish());
  view.webContents.on('did-navigate-in-page',() => publish());
  view.webContents.on('page-title-updated',() => publish());
  view.webContents.on('did-fail-load',(_event,code,description,_url,isMainFrame) => { if (isMainFrame && code !== -3) publish(description); });
  // Do not await navigation: login/network failures must not freeze local controls.
  view.webContents.loadURL(process.env.ATELIER_DESKTOP_TEST === '1' ? 'about:blank' : 'https://chatgpt.com/').catch(() => {});
  return {id};
});
ipcMain.handle('browser:close',(event,id) => {
  trusted(event); browserId(id);
  const view=browsers.get(id);
  if (view === activeBrowser) hideBrowser();
  if (view && !view.webContents.isDestroyed()) view.webContents.close();
  browsers.delete(id);
});
ipcMain.on('browser:show',(event,id) => {
  trusted(event);
  const view=id ? browsers.get(id) : null;
  if (view === activeBrowser) return;
  hideBrowser();
  if (view) {
    mainWindow.contentView.addChildView(view); activeBrowser=view;
    view.webContents.setZoomFactor(mainWindow.webContents.getZoomFactor() * (view.atelierZoomFactor || 1));
  }
});
ipcMain.on('browser:bounds',(event,bounds) => {
  trusted(event);
  if (!activeBrowser || !['x','y','width','height'].every(key => Number.isFinite(bounds?.[key]))) return;
  const [width,height]=mainWindow.getContentSize();
  const factor=mainWindow.webContents.getZoomFactor();
  bounds=Object.fromEntries(Object.entries(bounds).map(([key,value]) => [key,value*factor]));
  const x=Math.max(0,Math.min(width,Math.round(bounds.x))), y=Math.max(0,Math.min(height,Math.round(bounds.y)));
  activeBrowser.setBounds({x,y,width:Math.max(0,Math.min(width-x,Math.round(bounds.width))),height:Math.max(0,Math.min(height-y,Math.round(bounds.height)))});
});
ipcMain.handle('resource:drag',async (event,resource) => {
  trusted(event);
  const url=new URL('/api/desktop-file',origin);
  url.searchParams.set('project',String(resource.projectId)); url.searchParams.set('path',String(resource.path));
  const result=await request(url);
  const image=nativeImage.createFromBitmap(Buffer.from([132,161,216,255]),{width:1,height:1});
  event.sender.startDrag({files:result.files,icon:image});
});
app.on('window-all-closed',() => app.quit());
ipcMain.handle('browser:navigate',(event,id,action) => {
  trusted(event);
  const contents=browsers.get(id)?.webContents;
  if (!contents) throw new Error('Onglet fermé.');
  if (action === 'back' && contents.navigationHistory.canGoBack()) contents.navigationHistory.goBack();
  else if (action === 'forward' && contents.navigationHistory.canGoForward()) contents.navigationHistory.goForward();
  else if (action === 'reload') contents.reload();
  else if (action === 'home') contents.loadURL('https://chatgpt.com/');
});
ipcMain.handle('browser:zoom',(event,id,percent) => {
  trusted(event); browserId(id);
  const view=browsers.get(id);
  if (!view || view.webContents.isDestroyed()) throw new Error('Onglet fermé.');
  if (!Number.isFinite(percent) || percent < 25 || percent > 200) throw new Error('Zoom du chat invalide.');
  view.atelierZoomFactor=percent/100;
  view.webContents.setZoomFactor(mainWindow.webContents.getZoomFactor() * view.atelierZoomFactor);
  return percent;
});
ipcMain.handle('terminal:images-pick',async event => {
  trusted(event);
  const result=await dialog.showOpenDialog(mainWindow,{title:'Joindre des images à Codex',properties:['openFile','multiSelections'],filters:[{name:'Images',extensions:['png','jpg','jpeg','webp']}]});
  if (!result.canceled && result.filePaths.length > 12) throw new Error('Choisis au maximum 12 images.');
  return result.canceled ? [] : result.filePaths;
});
ipcMain.handle('terminal:image-paste',async event => {
  trusted(event);
  const image=clipboard.readImage();
  if (image.isEmpty()) throw new Error('Le presse-papiers ne contient pas d’image.');
  const png=image.toPNG();
  if (png.length > 8*1024*1024) throw new Error('Image trop volumineuse (8 Mo maximum).');
  const directory=path.join(app.getPath('userData'),'terminal-images');
  await fs.mkdir(directory,{recursive:true});
  const target=path.join(directory,randomUUID()+'.png');
  await fs.writeFile(target,png,{mode:0o600});
  return target;
});
ipcMain.handle('project:pick',async event => {
  trusted(event);
  const result=await dialog.showOpenDialog(mainWindow,{title:'Choisir le dossier du projet',properties:['openDirectory']});
  return {path:result.canceled ? null : result.filePaths[0]};
});
registerTerminals({ipcMain,trusted,getWindow:() => mainWindow,request,fixture:process.env.ATELIER_DESKTOP_TEST === '1'});
registerDisplay({ipcMain,trusted,getWindow:() => mainWindow,browsers});
