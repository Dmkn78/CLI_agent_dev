const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('atelierDesktop',Object.freeze({
  createBrowser:id => ipcRenderer.invoke('browser:create',id),
  closeBrowser:id => ipcRenderer.invoke('browser:close',id),
  showBrowser:id => ipcRenderer.send('browser:show',id),
  browserBounds:bounds => ipcRenderer.send('browser:bounds',bounds),
  dragFile:resource => ipcRenderer.invoke('resource:drag',resource),
}));
