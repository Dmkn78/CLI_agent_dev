// Real native lock acceptance, isolated under /tmp; never opens the user's app.
const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict');
const {spawn,execFileSync}=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const shell=path.join(__dirname,'fixtures','desktop_identity_shell.cjs');
const executable=process.env.ATELIER_IDENTITY_EXECUTABLE || require('electron');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'atelier-identity-'));
const evidence=path.join(root,'.atelier','desktop-identity-evidence');
fs.mkdirSync(evidence,{recursive:true});

function readEvents(file) {
  return fs.existsSync(file) ? fs.readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
}
async function waitUntil(predicate,message) {
  const deadline=Date.now()+20000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve,50));
  }
  throw new Error(message);
}
function environment(fixture) {
  const env={...process.env,ATELIER_IDENTITY_FIXTURE:JSON.stringify(fixture)};
  delete env.ELECTRON_RUN_AS_NODE;
  return env;
}
async function secondary(fixture,mode) {
  const child=spawn(executable,[shell,...(mode ? ['--atelier-'+mode] : [])],
    {cwd:root,env:environment(fixture),stdio:['ignore','pipe','pipe']});
  let output='';
  child.stdout.on('data',data => { output+=data; });
  child.stderr.on('data',data => { output+=data; });
  const code=await new Promise((resolve,reject) => {
    const timeout=setTimeout(() => { child.kill(); reject(new Error('Le second lancement reste actif : '+output)); },20000);
    child.once('error',error => { clearTimeout(timeout); reject(error); });
    child.once('exit',code => { clearTimeout(timeout); resolve(code); });
  });
  assert.equal(code,0,output);
}
async function scenario(name,legacy=false) {
  const base=path.join(directory,name);
  const events=path.join(base,'events.jsonl');
  const gate=path.join(base,'ready');
  const appData=path.join(base,'app-data');
  fs.mkdirSync(appData,{recursive:true});
  const fixture={root:path.join(base,'source-a'),appData,events,gate,legacy};
  const application=await electron.launch({executablePath:executable,args:[shell],
    cwd:root,env:environment(fixture),timeout:45000});
  try {
    await waitUntil(() => readEvents(events).some(event => event.event === 'service-start'),'Le service fictif ne démarre pas.');
    // Arrive before the first BrowserWindow exists, using another private profile.
    await secondary({...fixture,root:path.join(base,'source-b'),legacy:false},'code');
    await waitUntil(() => readEvents(events).some(event => event.event === 'second-instance'),'Le lancement pendant le démarrage ne rejoint pas le verrou.');
    fs.writeFileSync(gate,'ready');
    const page=await application.firstWindow({timeout:30000});
    assert.equal(await page.title(),'Atelier fixture');
    await waitUntil(() => readEvents(events).some(event => event.event === 'message' && event.args[0] === 'code'),'Le mode Code reçu pendant le démarrage est perdu.');
    // A packaged profile also joins this lock instead of starting another service.
    await secondary({...fixture,root:path.join(base,'source-c'),packaged:true,legacy:false},'project');
    await waitUntil(() => readEvents(events).some(event => event.event === 'message' && event.args[0] === 'project'),'Le mode Projet ne rejoint pas la fenêtre.');
    const proof=await application.evaluate(({app,BrowserWindow,session}) => ({name:app.getName(),
      pid:process.pid,packaged:app.isPackaged,profile:app.getPath('userData'),sessionData:app.getPath('sessionData'),
      browserStorage:session.fromPartition('persist:atelier-identity-proof').getStoragePath(),
      windows:BrowserWindow.getAllWindows().map(window => ({id:window.id,visible:window.isVisible()})),
      dockVisible:process.platform === 'darwin' ? app.dock.isVisible() : null,
      executable:process.execPath}));
    const entries=readEvents(events);
    const identities=entries.filter(event => event.event === 'identity');
    assert.equal(identities.length,3);
    assert.deepEqual(identities.map(identity => identity.primary),[true,false,false]);
    assert.ok(identities.every(identity => identity.instancePath === path.join(appData,'Atelier')));
    assert.notEqual(identities[0].profilePath,identities[1].profilePath);
    assert.equal(entries.filter(event => event.event === 'service-start').length,1);
    assert.equal(entries.filter(event => event.event === 'window-ready').length,1);
    assert.equal(proof.name,'Atelier');
    assert.equal(proof.packaged,false,'Le bundle de développement doit conserver le mode source Electron.');
    assert.equal(proof.profile,identities[0].profilePath);
    if (!legacy) {
      assert.equal(proof.sessionData,proof.profile);
      assert.ok(proof.browserStorage.startsWith(proof.profile+path.sep),'La session Chromium reste dans le profil privé de la source.');
    }
    assert.equal(proof.windows.length,1);
    assert.equal(proof.windows[0].visible,false);
    if (process.platform === 'darwin') assert.equal(proof.dockVisible,false);
    return {name,legacy,proof,events:entries};
  } finally { await application.close(); }
}
async function main() {
  try {
    let branding,signatureVerified=null;
    if (process.platform === 'darwin' && process.env.ATELIER_IDENTITY_EXECUTABLE) {
      const plist=path.resolve(executable,'../../Info.plist');
      branding=Object.fromEntries(['CFBundleName','CFBundleDisplayName','CFBundleIdentifier'].map(key =>
        [key,execFileSync('/usr/libexec/PlistBuddy',['-c','Print :'+key,plist],{encoding:'utf8'}).trim()]));
      assert.deepEqual(branding,{CFBundleName:'Atelier',CFBundleDisplayName:'Atelier',CFBundleIdentifier:'fr.atelier.workbench'});
      execFileSync('/usr/bin/codesign',['--verify','--deep','--strict',path.resolve(executable,'../../..')],{stdio:'pipe'});
      signatureVerified=true;
    }
    const scenarios=[await scenario('new-primary'),await scenario('released-primary',true)];
    fs.writeFileSync(path.join(evidence,'result.json'),JSON.stringify({passed:true,fixture:true,
      modelInference:false,branding,signatureVerified,scenarios},null,2));
    console.log('Native Atelier identity passed: shared lock, legacy compatibility, startup modes, private profiles, one window and one fictitious service.');
  } finally { fs.rmSync(directory,{recursive:true,force:true}); }
}
main().catch(error => { console.error(error); process.exitCode=1; });
