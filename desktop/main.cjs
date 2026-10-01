const {app,BrowserWindow,WebContentsView,ipcMain,shell,nativeImage,dialog}=require('electron');
const {registerTerminals,closeTerminals}=require('./pty.cjs');
const path=require('node:path');
const origin=new URL(process.env.ATELIER_URL || 'http://127.0.0.1:4317/');
if (origin.protocol !== 'http:' || !['127.0.0.1','localhost'].includes(origin.hostname)) throw new Error('Serveur Atelier local requis.');
origin.pathname='/'; origin.search=''; origin.hash='';
let mainWindow, activeBrowser=null, nonce=null;
const browsers=new Map();
app.setName('Atelier');
app.setPath('userData',path.resolve(__dirname,'../.atelier',process.env.ATELIER_DESKTOP_TEST === '1' ? 'desktop-fixture' : 'desktop-profile'));
const securePreferences={sandbox:true,contextIsolation:true,nodeIntegration:false};
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }
else app.on('second-instance',(_event,argv) => {
  if (!mainWindow) return;
  mainWindow.show(); mainWindow.focus();
  mainWindow.webContents.send('desktop:mode',argv.find(arg => /^--atelier-(chat|code|project)$/.test(arg))?.slice(10) || 'chat');
});
async function request(route,data) {
  for (let attempt=0; attempt < 2; attempt++) {
    const response=await fetch(new URL(route,origin),{method:'POST',headers:{'X-Atelier-Token':nonce,'Content-Type':'application/json'},body:JSON.stringify(data)});
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
  if (event.sender !== mainWindow.webContents || new URL(event.sender.getURL()).origin !== origin.origin) throw new Error('Émetteur IPC refusé.');
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
  mainWindow=new BrowserWindow({show:process.env.ATELIER_DESKTOP_TEST !== '1',width:1500,height:980,minWidth:700,minHeight:580,backgroundColor:'#111619',title:'Atelier',webPreferences:{...securePreferences,preload:path.join(__dirname,'preload.cjs')}});
  mainWindow.webContents.on('will-navigate',(event,url) => { if (new URL(url).origin !== origin.origin) event.preventDefault(); });
  mainWindow.webContents.setWindowOpenHandler(({url}) => { if (new URL(url).protocol === 'https:') shell.openExternal(url); return {action:'deny'}; });
  await refreshNonce();
  const requestedMode=process.argv.find(arg => /^--atelier-(chat|code|project)$/.test(arg))?.slice(10);
  const mode=requestedMode || 'chat';
  await mainWindow.loadURL(new URL(mode === 'code' ? '#terminal' : '#webchat',origin).href);
  if (requestedMode) mainWindow.webContents.send('desktop:mode',mode);
  mainWindow.on('closed',() => { closeTerminals(); for (const view of browsers.values()) if (!view.webContents.isDestroyed()) view.webContents.close(); browsers.clear(); });
});
ipcMain.handle('browser:create',async (event,id) => {
  trusted(event); browserId(id);
  if (browsers.size >= 12 || browsers.has(id)) throw new Error('Limite : 12 onglets.');
  const view=new WebContentsView({webPreferences:{...securePreferences,partition:'persist:atelier-chatgpt'}});
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
  if (view) { mainWindow.contentView.addChildView(view); activeBrowser=view; }
});
ipcMain.on('browser:bounds',(event,bounds) => {
  trusted(event);
  if (!activeBrowser || !['x','y','width','height'].every(key => Number.isFinite(bounds?.[key]))) return;
  const [width,height]=mainWindow.getContentSize();
  const x=Math.max(0,Math.min(width,Math.round(bounds.x))), y=Math.max(0,Math.min(height,Math.round(bounds.y)));
  activeBrowser.setBounds({x,y,width:Math.max(0,Math.min(width-x,Math.round(bounds.width))),height:Math.max(0,Math.min(height-y,Math.round(bounds.height)))});
});
ipcMain.handle('resource:drag',async (event,resource) => {
  trusted(event);
  const url=new URL('/api/desktop-file',origin);
  url.searchParams.set('project',String(resource.projectId)); url.searchParams.set('path',String(resource.path));
  const response=await fetch(url,{headers:{'X-Atelier-Token':nonce}});
  const result=await response.json();
  if (!response.ok) throw new Error(result.error);
  const image=nativeImage.createFromBuffer(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0coAAAAASUVORK5CYII=','base64'));
  event.sender.startDrag({file:result.path,icon:image});
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
ipcMain.handle('project:pick',async event => {
  trusted(event);
  const result=await dialog.showOpenDialog(mainWindow,{title:'Choisir le dossier du projet',properties:['openDirectory']});
  return {path:result.canceled ? null : result.filePaths[0]};
});
registerTerminals({ipcMain,trusted,getWindow:() => mainWindow,request,fixture:process.env.ATELIER_DESKTOP_TEST === '1'});
