const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('atelierDesktop',Object.freeze({
  createBrowser:id => ipcRenderer.invoke('browser:create',id),
  closeBrowser:id => ipcRenderer.invoke('browser:close',id),
  showBrowser:id => ipcRenderer.send('browser:show',id),
  browserBounds:bounds => ipcRenderer.send('browser:bounds',bounds),
  dragFile:resource => ipcRenderer.invoke('resource:drag',resource),
  navigateBrowser:(id,action) => ipcRenderer.invoke('browser:navigate',id,action),
  onBrowserState:callback => { const listener=(_event,data) => callback(data); ipcRenderer.on('browser:state',listener); return () => ipcRenderer.removeListener('browser:state',listener); },
  pickDirectory:() => ipcRenderer.invoke('project:pick'),
  createTerminal:(id,settings) => ipcRenderer.invoke('terminal:create',id,settings),
  writeTerminal:(id,data) => ipcRenderer.send('terminal:write',id,data),
  resizeTerminal:(id,cols,rows) => ipcRenderer.send('terminal:resize',id,cols,rows),
  closeTerminal:id => ipcRenderer.invoke('terminal:close',id),
  onTerminalData:callback => { const listener=(_event,data) => callback(data); ipcRenderer.on('terminal:data',listener); return () => ipcRenderer.removeListener('terminal:data',listener); },
  onTerminalExit:callback => { const listener=(_event,data) => callback(data); ipcRenderer.on('terminal:exit',listener); return () => ipcRenderer.removeListener('terminal:exit',listener); },
  onLaunchMode:callback => { const listener=(_event,mode) => callback(mode); ipcRenderer.on('desktop:mode',listener); return () => ipcRenderer.removeListener('desktop:mode',listener); },
}));
