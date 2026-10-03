const {app,BrowserWindow,session} = require('electron');
const path = require('node:path');
app.setPath('userData',path.resolve(process.env.ATELIER_BRAIN_TEST_PROFILE));
app.whenReady().then(async () => {
  const target = new URL(process.env.ATELIER_BRAIN_TEST_URL);
  if (target.hostname !== '127.0.0.1') throw new Error('Local fixture required.');
  const window = new BrowserWindow({width:1500,height:1000,minWidth:280,minHeight:400,frame:false,show:false,
    webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
  session.defaultSession.webRequest.onBeforeRequest((details,callback) => {
    callback({cancel:!details.url.startsWith(target.origin+'/') && !details.url.startsWith('data:') && !details.url.startsWith('blob:')});
  });
  await window.loadURL(target.href+'#brain');
});
app.on('window-all-closed',() => app.quit());
