const fs=require('node:fs');
const path=require('node:path');

const APP_NAME='Atelier';
const APP_ID='fr.atelier.workbench';
const MODES=new Set(['chat','code','project']);

function modeFromArgs(argv) {
  return argv.find(arg => /^--atelier-(chat|code|project)$/.test(arg))?.slice(10);
}

function configureIdentity(app,{rootPath,desktopTest=false,testData,packaged=app.isPackaged,platform=process.platform,mode}={}) {
  app.setName(APP_NAME);
  if (platform === 'win32') app.setAppUserModelId(APP_ID);
  if (platform === 'linux') app.setDesktopName(APP_ID+'.desktop');
  if (platform === 'darwin' && desktopTest) app.setActivationPolicy('accessory');

  const installedProfile=path.join(app.getPath('appData'),APP_NAME);
  const profilePath=desktopTest && testData ? path.resolve(testData)
    : !packaged ? path.join(rootPath,'.atelier',desktopTest ? 'desktop-fixture' : 'desktop-profile')
    : installedProfile;
  // Electron captures userData when it constructs ProcessSingleton. Keep the
  // same lock as the installed app, then restore the private source/test profile
  // before Chromium creates any sessions. No profile contents are copied.
  const instancePath=desktopTest ? profilePath : installedProfile;
  fs.mkdirSync(instancePath,{recursive:true});
  fs.mkdirSync(profilePath,{recursive:true});
  app.setPath('userData',instancePath);
  let primary;
  try { primary=app.requestSingleInstanceLock({mode:MODES.has(mode) ? mode : null}); }
  finally {
    app.setPath('userData',profilePath);
    app.setPath('sessionData',profilePath);
  }
  return {primary,profilePath,instancePath};
}

function applyReadyIdentity({app,Menu,nativeImage,iconPath,desktopTest=false,platform=process.platform}) {
  if (platform === 'darwin') {
    if (desktopTest) app.dock.hide();
    else if (iconPath) {
      const icon=nativeImage.createFromPath(iconPath);
      if (!icon.isEmpty()) app.dock.setIcon(icon);
    }
  }
  if (platform !== 'darwin' || desktopTest) { Menu.setApplicationMenu(null); return; }
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {label:APP_NAME,submenu:[{role:'about',label:'À propos d’Atelier'},{type:'separator'},
      {role:'services',label:'Services'},{type:'separator'},{role:'hide',label:'Masquer Atelier'},
      {role:'hideOthers',label:'Masquer les autres'},{role:'unhide',label:'Tout afficher'},
      {type:'separator'},{role:'quit',label:'Quitter Atelier'}]},
    {label:'Édition',submenu:[{role:'undo',label:'Annuler'},{role:'redo',label:'Rétablir'},
      {type:'separator'},{role:'cut',label:'Couper'},{role:'copy',label:'Copier'},
      {role:'paste',label:'Coller'},{role:'selectAll',label:'Tout sélectionner'}]},
    {label:'Fenêtre',submenu:[{role:'minimize',label:'Réduire'},{role:'zoom',label:'Agrandir'},
      {type:'separator'},{role:'front',label:'Tout ramener au premier plan'}]},
  ]));
}

function createActivationController({app,getWindow,desktopTest=false}) {
  let loaded=false,requested=false,pendingMode;
  function apply() {
    const window=getWindow();
    if (!loaded || !requested || !window || window.isDestroyed()) return;
    requested=false;
    if (!desktopTest) {
      if (window.isMinimized()) window.restore();
      window.show();
      window.focus();
      app.focus();
    }
    if (pendingMode) window.webContents.send('desktop:mode',pendingMode);
    pendingMode=undefined;
  }
  return {
    request(mode) { requested=true; if (MODES.has(mode)) pendingMode=mode; apply(); },
    ready() { loaded=true; apply(); },
  };
}

module.exports={APP_NAME,APP_ID,modeFromArgs,configureIdentity,applyReadyIdentity,createActivationController};
