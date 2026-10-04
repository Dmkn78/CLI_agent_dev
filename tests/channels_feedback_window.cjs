const {app,BrowserWindow}=require('electron');
app.whenReady().then(()=>{
  const window=new BrowserWindow({width:1500,height:1000,show:false,webPreferences:{backgroundThrottling:false}});
  window.loadURL('about:blank');
});
app.on('window-all-closed',()=>app.quit());
