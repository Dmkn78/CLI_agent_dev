// Full source shell + managed Python service, with isolated data and a fake PTY.
const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const {prepareMacDesktop,sourceLaunchPlan}=require('../scripts/launch-desktop.cjs');

const root=path.resolve(__dirname,'..');
const directory=path.join(root,'.atelier','source-desktop-evidence','run-'+Date.now());
fs.mkdirSync(directory,{recursive:true});

async function waitUntil(predicate,message) {
  const deadline=Date.now()+20000;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise(resolve => setTimeout(resolve,100));
  }
  throw new Error(message);
}
async function main() {
  const executable=process.platform === 'darwin' ? await prepareMacDesktop(root) : require('electron');
  let signatureVerified=null;
  if (process.platform === 'darwin') {
    execFileSync('/usr/bin/codesign',['--verify','--deep','--strict',path.resolve(executable,'../../..')],{stdio:'pipe'});
    signatureVerified=true;
  }
  const env={...process.env,ATELIER_DESKTOP_TEST:'1',ATELIER_TEST_DATA:path.join(directory,'profile'),ATELIER_SOURCE_SERVICE:'1'};
  delete env.ATELIER_URL;
  delete env.ELECTRON_RUN_AS_NODE;
  const plan=sourceLaunchPlan(root,executable,['--atelier-code'],env);
  const application=await electron.launch({executablePath:plan.executable,args:plan.argv,
    cwd:root,env:plan.options.env,timeout:60000});
  let base,proof;
  try {
    const page=await application.firstWindow({timeout:45000});
    const errors=[];
    page.on('pageerror',error => errors.push(error.message));
    await page.locator('#native-terminal').waitFor({timeout:30000});
    assert.match(await page.title(),/Atelier/);
    proof=await application.evaluate(({app,BrowserWindow}) => ({name:app.getName(),packaged:app.isPackaged,
      version:app.getVersion(),executable:process.execPath,
      profile:app.getPath('userData'),sessionData:app.getPath('sessionData'),
      windows:BrowserWindow.getAllWindows().map(window => ({id:window.id,visible:window.isVisible(),url:window.webContents.getURL()})),
      dockVisible:process.platform === 'darwin' ? app.dock.isVisible() : null}));
    assert.equal(proof.name,'Atelier');
    assert.equal(proof.packaged,false);
    assert.equal(proof.version,require('../package.json').version);
    assert.equal(proof.profile,env.ATELIER_TEST_DATA);
    assert.equal(proof.sessionData,proof.profile);
    assert.equal(proof.windows.length,1);
    assert.equal(proof.windows[0].visible,false);
    if (process.platform === 'darwin') assert.equal(proof.dockVisible,false);
    assert.match(proof.windows[0].url,/^http:\/\/127\.0\.0\.1:\d+\/#terminal$/);
    base=new URL(proof.windows[0].url).origin;
    const token=await page.locator('meta[name="atelier-token"]').getAttribute('content');
    const get=async route => {
      const response=await fetch(base+route,{headers:{'X-Atelier-Token':token},signal:AbortSignal.timeout(5000)});
      assert.equal(response.status,200,route);
      return response.json();
    };
    const backend=await get('/api/desktop/service');
    assert.equal(backend.workspace,root);
    assert.equal(backend.dataPath,path.join(proof.profile,'service-data'));
    assert.ok(fs.existsSync(path.join(backend.dataPath,'state.sqlite')));
    const initial=await get('/api/state');
    assert.deepEqual(initial.sessions,[]);
    assert.ok(initial.providers.length > 0);
    assert.ok(initial.providers.filter(provider => provider.status).every(provider => provider.status === 'unchecked'));
    for (const id of ['codex','omp']) assert.equal(initial.providers.find(provider => provider.id === id)?.status,'unchecked');
    await page.evaluate(async () => {
      window.sourcePtyProof='';
      window.sourcePtyExited=false;
      window.atelierDesktop.onTerminalData(({id,data}) => { if (id === 'source-smoke') window.sourcePtyProof+=data; });
      window.atelierDesktop.onTerminalExit(({id}) => { if (id === 'source-smoke') window.sourcePtyExited=true; });
      await window.atelierDesktop.createTerminal('source-smoke',{projectId:'atelier'});
    });
    await page.waitForFunction(() => window.sourcePtyProof.includes('ATELIER_PTY_READY'));
    await page.evaluate(() => window.atelierDesktop.writeTerminal('source-smoke','source-atelier-ok\r'));
    await page.waitForFunction(() => window.sourcePtyExited && window.sourcePtyProof.includes('ECHO:source-atelier-ok'));
    const final=await get('/api/state');
    assert.deepEqual(final.sessions,[]);
    assert.ok(final.providers.filter(provider => provider.status).every(provider => provider.status === 'unchecked'));
    assert.deepEqual(errors,[]);
    const png=await application.evaluate(async ({BrowserWindow}) =>
      (await BrowserWindow.getAllWindows()[0].capturePage(undefined,{stayHidden:true,stayAwake:true})).toPNG().toString('base64'));
    fs.writeFileSync(path.join(directory,'source-main.png'),Buffer.from(png,'base64'));
    proof={...proof,backend,providers:initial.providers.map(provider => ({id:provider.id,status:provider.status})),
      structuredSessions:final.sessions.length,ptyEcho:true,errors,signatureVerified};
  } finally { await application.close(); }
  await waitUntil(async () => {
    try { await fetch(base,{signal:AbortSignal.timeout(500)}); return false; }
    catch { return true; }
  },'Le service Python reste ouvert après fermeture de son application.');
  fs.writeFileSync(path.join(directory,'result.json'),JSON.stringify({passed:true,fixture:true,modelInference:false,
    serviceStopped:true,proof},null,2));
  fs.writeFileSync(path.join(path.dirname(directory),'latest.json'),JSON.stringify({directory,passed:true},null,2));
  console.log('Source Atelier shell passed: signed Atelier bundle, one hidden window, isolated managed service, unchecked providers, fake PTY echo and service shutdown.');
}
main().catch(error => { console.error(error); process.exitCode=1; });
