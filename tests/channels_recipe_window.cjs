"use strict";
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs');
const {registerComputerController}=require('../desktop/computer.cjs');

const origin=new URL(process.env.ATELIER_RECIPE_URL);
if (origin.protocol !== 'http:' || origin.hostname !== '127.0.0.1') throw new Error('Fixture locale requise.');
app.setPath('userData',process.env.ATELIER_RECIPE_PROFILE);
const stats={staleRejections:0,mouseDowns:0,movedControl:false};
const trace=[];
const SHUTDOWN_POLL_MS=100;
let mainWindow,stopComputer,shutdownTimer;

app.on('browser-window-created',(_event,window) => {
  const contents=window.webContents,send=contents.sendInputEvent.bind(contents);
  contents.setBackgroundThrottling(false);
  contents.sendInputEvent=event => {
    if (event.type === 'mouseDown') stats.mouseDowns++;
    send(event);
  };
});

const jobs=new Map();
async function request(route,body) {
  const job=jobs.get(body.id);
  if (route.endsWith('/check') && job?.payload?.action?.kind === 'click' && !stats.movedControl) {
    const target=BrowserWindow.getAllWindows().find(window =>
      window !== mainWindow && window.webContents.getURL() === new URL('#channels',origin).href);
    if (!target) throw new Error('Fenêtre de recette isolée absente.');
    // Force a real geometry change between observation and validation, before input.
    await target.webContents.insertCSS('button[data-view="settings"] { transform: translateY(8px) !important; }');
    stats.movedControl=true;
  }
  if (route.endsWith('/complete')) {
    if (body.errorCode === 'stale_observation') stats.staleRejections++;
    trace.push({operation:job?.operation,action:job?.payload?.action,error:body.error,
      connections:body.result?.controls?.filter(control => control.label === 'Connexions')});
    fs.writeFileSync(process.env.ATELIER_RECIPE_STATS,JSON.stringify(stats,null,2));
    fs.writeFileSync(process.env.ATELIER_RECIPE_TRACE,JSON.stringify(trace,null,2));
    jobs.delete(body.id);
  }
  const response=await fetch(new URL(route,origin),{method:'POST',
    headers:{'Content-Type':'application/json','X-Atelier-Token':'channels-recipe-fixture-nonce'},
    body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  const result=await response.json();
  if (!response.ok) throw new Error(result.error);
  if (result.job) jobs.set(result.job.id,result.job);
  return result;
}

function stopFixture() {
  clearInterval(shutdownTimer);
  fs.writeFileSync(process.env.ATELIER_RECIPE_STATS,JSON.stringify(stats,null,2));
  stopComputer?.();
  app.exit(0);
}
app.whenReady().then(async () => {
  mainWindow=new BrowserWindow({show:false,width:1100,height:820,
    webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
  await mainWindow.loadURL(new URL('#channels',origin).href);
  stopComputer=registerComputerController({getWindow:() => mainWindow,request,fixture:true});
  shutdownTimer=setInterval(() => {
    if (fs.existsSync(process.env.ATELIER_RECIPE_STOP)) stopFixture();
  },SHUTDOWN_POLL_MS);
}).catch(error => { console.error(error); app.exit(1); });
app.on('window-all-closed',() => app.quit());
