const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {configureIdentity,modeFromArgs,createActivationController,applyReadyIdentity}=require('../desktop/identity.cjs');

function fixture(t,{primary=true,packaged=false}={}) {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'atelier-identity-'));
  t.after(() => fs.rmSync(directory,{recursive:true,force:true}));
  const paths={appData:path.join(directory,'system')};
  const calls=[];
  const app={isPackaged:packaged,setName:name => calls.push(['name',name]),
    getPath:key => paths[key],setPath:(key,value) => { paths[key]=value; },
    setAppUserModelId:id => calls.push(['appId',id]),setDesktopName:id => calls.push(['desktopId',id]),
    setActivationPolicy:policy => calls.push(['policy',policy]),
    requestSingleInstanceLock:data => { calls.push(['lock',paths.userData,data]); return primary; }};
  return {directory,paths,calls,app};
}

test('source and packaged launches share the installed lock but keep distinct session storage',t => {
  const source=fixture(t);
  const installed=path.join(source.paths.appData,'Atelier');
  const result=configureIdentity(source.app,{rootPath:source.directory,platform:'darwin',mode:'code'});
  assert.equal(result.primary,true);
  assert.equal(result.instancePath,installed);
  assert.deepEqual(source.calls.find(call => call[0] === 'lock'),['lock',installed,{mode:'code'}]);
  assert.equal(source.paths.userData,path.join(source.directory,'.atelier','desktop-profile'));
  assert.equal(source.paths.sessionData,source.paths.userData);
  assert.notEqual(source.paths.userData,installed);

  source.app.isPackaged=true;
  const packaged=configureIdentity(source.app,{rootPath:source.directory,platform:'darwin'});
  assert.equal(packaged.instancePath,result.instancePath);
  assert.equal(packaged.profilePath,installed);
});

test('isolated recipes neither capture the user lock nor advertise a Dock application',t => {
  const source=fixture(t);
  const profile=path.join(source.directory,'recipe');
  const result=configureIdentity(source.app,{rootPath:source.directory,desktopTest:true,testData:profile,platform:'darwin'});
  assert.equal(result.profilePath,profile);
  assert.equal(result.instancePath,profile);
  assert.equal(source.paths.sessionData,profile);
  assert.ok(source.calls.some(call => call[0] === 'policy' && call[1] === 'accessory'));
  const calls=[];
  applyReadyIdentity({app:{dock:{hide:() => calls.push('hidden')}},Menu:{setApplicationMenu:value => calls.push(value)},desktopTest:true,platform:'darwin'});
  assert.deepEqual(calls,['hidden',null]);
});

test('a refused second launch and a lock error restore the profile paths',t => {
  const source=fixture(t,{primary:false});
  const result=configureIdentity(source.app,{rootPath:source.directory,platform:'linux'});
  assert.equal(result.primary,false);
  assert.equal(source.paths.userData,result.profilePath);
  assert.equal(source.paths.sessionData,result.profilePath);
  assert.ok(source.calls.some(call => call[0] === 'desktopId' && call[1] === 'fr.atelier.workbench.desktop'));
  source.app.requestSingleInstanceLock=() => { throw new Error('lock unavailable'); };
  assert.throws(() => configureIdentity(source.app,{rootPath:source.directory,platform:'win32'}),/lock unavailable/);
  assert.equal(source.paths.userData,result.profilePath);
  assert.equal(source.paths.sessionData,result.profilePath);
  assert.ok(source.calls.some(call => call[0] === 'appId' && call[1] === 'fr.atelier.workbench'));
});

test('second launch during startup is applied only after loading and restores the same window',() => {
  const calls=[];
  const window={isDestroyed:() => false,isMinimized:() => true,restore:() => calls.push('restore'),
    show:() => calls.push('show'),focus:() => calls.push('window-focus'),
    webContents:{send:(...args) => calls.push(args)}};
  const activation=createActivationController({app:{focus:() => calls.push('app-focus')},getWindow:() => window});
  activation.request('chat');
  activation.request('code');
  assert.deepEqual(calls,[]);
  activation.ready();
  assert.deepEqual(calls,['restore','show','window-focus','app-focus',['desktop:mode','code']]);
  calls.length=0;
  activation.request();
  assert.deepEqual(calls,['restore','show','window-focus','app-focus']);
});

test('recipe reactivation changes the requested mode while keeping its window hidden',() => {
  const calls=[];
  const activation=createActivationController({desktopTest:true,app:{},getWindow:() => ({
    isDestroyed:() => false,webContents:{send:(...args) => calls.push(args)}})});
  activation.ready();
  activation.request('project');
  activation.request('invalid');
  assert.deepEqual(calls,[['desktop:mode','project']]);
  assert.equal(modeFromArgs(['electron','main.cjs','--atelier-code']),'code');
  assert.equal(modeFromArgs(['electron','--atelier-invalid']),undefined);
});
