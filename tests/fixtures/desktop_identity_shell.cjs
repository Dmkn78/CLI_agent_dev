// Native Electron fixture: no Atelier backend, credentials, or model providers.
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {app,BrowserWindow}=require('electron');
const {configureIdentity,createActivationController,modeFromArgs}=require('../../desktop/identity.cjs');

const fixture=JSON.parse(process.env.ATELIER_IDENTITY_FIXTURE);
function record(event,details={}) {
  fs.appendFileSync(fixture.events,JSON.stringify({event,pid:process.pid,root:fixture.root,...details})+'\n');
}
app.setPath('appData',fixture.appData);
if (process.platform === 'darwin') app.setActivationPolicy('accessory');
let identity;
if (fixture.legacy) {
  // Reproduce the released application's original lock without new helpers.
  app.setName('Atelier');
  const profilePath=path.join(fixture.appData,'Atelier');
  fs.mkdirSync(profilePath,{recursive:true});
  app.setPath('userData',profilePath);
  identity={primary:app.requestSingleInstanceLock(),profilePath,instancePath:profilePath};
} else {
  identity=configureIdentity(app,{rootPath:fixture.root,packaged:!!fixture.packaged,
    mode:modeFromArgs(process.argv)});
}
record('identity',{...identity,name:app.getName(),sessionData:app.getPath('sessionData')});
if (!identity.primary) { app.quit(); process.exit(0); }

let window,service;
const activation=createActivationController({app,getWindow:() => window,desktopTest:true});
app.on('second-instance',(_event,argv,_directory,additionalData) => {
  const mode=modeFromArgs(argv) || additionalData?.mode;
  record('second-instance',{mode});
  activation.request(mode);
});
app.on('window-all-closed',() => app.quit());
app.on('before-quit',() => service?.close());

app.whenReady().then(async () => {
  if (process.platform === 'darwin') app.dock.hide();
  service=http.createServer((_request,response) => {
    response.writeHead(200,{'Content-Type':'application/json'});
    response.end(JSON.stringify({fixture:true,pid:process.pid}));
  });
  await new Promise(resolve => service.listen(0,'127.0.0.1',resolve));
  record('service-start',{port:service.address().port});
  while (!fs.existsSync(fixture.gate)) await new Promise(resolve => setTimeout(resolve,30));
  window=new BrowserWindow({show:false,width:500,height:350,
    webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
  const send=window.webContents.send.bind(window.webContents);
  window.webContents.send=(channel,...args) => { record('message',{channel,args}); return send(channel,...args); };
  await window.loadURL('data:text/html,<title>Atelier fixture</title><main>Atelier identity fixture</main>');
  activation.ready();
  record('window-ready',{id:window.id,name:app.getName(),profile:app.getPath('userData'),
    sessionData:app.getPath('sessionData'),visible:window.isVisible(),
    dockVisible:process.platform === 'darwin' ? app.dock.isVisible() : null});
}).catch(error => { record('error',{message:error.message}); console.error(error); app.quit(); });
