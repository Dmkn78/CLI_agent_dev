const pty=require('node-pty');
const terminals=new Map();

function registerTerminals({ipcMain,trusted,getWindow,request,fixture}) {
  ipcMain.handle('terminal:create',async (event,id,settings) => {
    trusted(event);
    if (typeof id !== 'string' || !/^[a-z0-9-]{1,80}$/i.test(id) || terminals.has(id) || terminals.size >= 8) throw new Error('Identifiant ou limite de terminaux invalide.');
    const windows=process.platform === 'win32';
    const fixtureScript=windows ? 'echo ATELIER_PTY_READY & set /p line= & echo ECHO:!line!' : 'printf "ATELIER_PTY_READY\\n"; read -r line; printf "ECHO:%s\\n" "$line"';
    const plan=fixture ? {cwd:process.cwd(),script:fixtureScript} : await request('/api/terminal/prepare',settings);
    if (terminals.has(id) || terminals.size >= 8 || getWindow()?.isDestroyed()) throw new Error('Terminal indisponible.');
    const env={...process.env,TERM:'xterm-256color'};
    delete env.ELECTRON_RUN_AS_NODE;
    const command=windows ? fixture ? 'cmd.exe' : 'powershell.exe' : '/bin/sh';
    const args=windows ? fixture ? ['/d','/q','/v:on','/c',plan.script] : ['-NoLogo','-NoProfile','-EncodedCommand',Buffer.from(plan.script,'utf16le').toString('base64')] : ['-c',plan.script];
    const terminal=pty.spawn(command,args,{name:'xterm-256color',cols:100,rows:30,cwd:plan.cwd,env});
    terminals.set(id,terminal);
    terminal.onData(data => { const window=getWindow(); if (window && !window.isDestroyed()) window.webContents.send('terminal:data',{id,data}); });
    terminal.onExit(({exitCode}) => {
      terminals.delete(id);
      const window=getWindow();
      if (window && !window.isDestroyed()) window.webContents.send('terminal:exit',{id,exitCode});
    });
    return {id,pid:terminal.pid,cwd:plan.cwd};
  });
  ipcMain.on('terminal:write',(event,id,data) => {
    trusted(event);
    if (typeof data === 'string' && data.length <= 8192) terminals.get(id)?.write(data);
  });
  ipcMain.on('terminal:resize',(event,id,cols,rows) => {
    trusted(event);
    if (Number.isInteger(cols) && Number.isInteger(rows) && cols >= 2 && cols <= 500 && rows >= 2 && rows <= 200) terminals.get(id)?.resize(cols,rows);
  });
  ipcMain.handle('terminal:close',(event,id) => { trusted(event); const terminal=terminals.get(id); terminals.delete(id); terminal?.kill(); });
}
function closeTerminals() {
  for (const terminal of terminals.values()) { try { terminal.kill(); } catch (_) {} }
  terminals.clear();
}
module.exports={registerTerminals,closeTerminals};
