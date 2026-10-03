"use strict";
const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');

async function saveCapture(application,filename) {
  const png=await application.evaluate(async ({BrowserWindow}) => {
    const window=BrowserWindow.getAllWindows().find(window => window.webContents.getURL().startsWith('http://127.0.0.1:4328/'));
    const capture=await window.webContents.capturePage();
    return capture.toPNG().toString('base64');
  });
  fs.writeFileSync(filename,Buffer.from(png,'base64'));
}

async function main() {
  const env={...process.env,ATELIER_URL:'http://127.0.0.1:4328/',ATELIER_DESKTOP_TEST:'1'};
  delete env.ELECTRON_RUN_AS_NODE;
  const application=await electron.launch({executablePath:require('electron'),args:[path.resolve('desktop/main.cjs')],env});
  let page, fixture;
  const errors=[];
  try {
    page=await application.firstWindow();
    page.setDefaultTimeout(20000);
    page.on('pageerror',error => errors.push(error.message));
    page.on('requestfailed',request => console.error('Network:',new URL(request.url()).pathname,request.failure()?.errorText));
    await page.waitForFunction(() => typeof api === 'function');
    fixture=await page.evaluate(() => api('fixture'));
    await page.waitForFunction(() => state.projects.length > 0 && !loading);
    await page.locator('#duplica-global').click();
    await page.getByRole('heading',{name:'Duplica',exact:true}).waitFor();
    await page.getByRole('button',{name:/^Suivi/}).click();
    await page.waitForFunction(() => state.duplica.computer.available);
    await page.getByRole('button',{name:'Permissions',exact:true}).click();
    for (const category of ['computer_control','keyboard_mouse','browser_control','run_local_application']) {
      await page.locator(`[name="permission_${category}"]`).selectOption('auto');
    }
    await page.locator('[name="interactionMode"]').selectOption('computer');
    await page.getByRole('button',{name:'Enregistrer les permissions',exact:true}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    await page.getByRole('button',{name:'Mémoriser une réponse',exact:true}).click();
    await page.locator('[name="questions"]').fill('Quel format doit utiliser l’export ?');
    await page.locator('[name="answer"]').fill('CSV');
    await page.getByRole('button',{name:'Mémoriser',exact:true}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    await page.getByRole('button',{name:'Confier une mission',exact:true}).click();
    await page.locator('[name="goal"]').fill(fixture.goal);
    await page.locator('[name="requirements"]').fill(fixture.recipe.requirements.map(requirement => requirement.path+' | '+requirement.contains).join('\n'));
    await page.locator('[name="tests"]').fill(JSON.stringify(fixture.recipe.tests));
    await page.locator('[name="buildNotApplicable"]').check();
    await page.locator('[name="application"]').fill(JSON.stringify(fixture.recipe.application));
    await page.locator('[name="gui"]').fill(JSON.stringify(fixture.recipe.gui));
    await page.locator('[name="startMission"]').uncheck();
    await page.getByRole('button',{name:'Confier à Duplica',exact:true}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    const initial=await page.evaluate(() => api('state'));
    const mission=initial.duplica.missions[0];
    assert.equal(initial.duplica.settings.globalEnabled,false);
    // Only initial user transmission uses the API. All responses/clicks and retests come from Duplica.
    await page.evaluate(fixture => api('sessions/prompt',{id:fixture.sessionId,text:fixture.goal}),fixture);
    const deadline=Date.now()+120000;
    let observed;
    do {
      observed=await page.evaluate(() => api('state'));
      if (observed.duplica.settings.status !== 'active') throw new Error('Superviseur interrompu : '+JSON.stringify(observed.duplica.timeline[0]));
      if (observed.sessions[0].status === 'failed') throw new Error('Agent échoué : '+JSON.stringify(observed.sessions[0].lastTurnError));
      if (observed.duplica.missions[0].status === 'completed') break;
      await new Promise(resolve => setTimeout(resolve,500));
    } while (Date.now()<deadline);
    assert.equal(observed.duplica.missions[0].status,'completed',JSON.stringify({status:observed.duplica.missions[0].status,
      reason:observed.duplica.missions[0].reason,requests:observed.duplica.requests.map(request => request.title)},null,2));
    const completed=await page.evaluate(() => api('state'));
    const proof=completed.duplica;
    if (fixture.provider === 'fixture') {
      assert.equal(proof.missions[0].continuations,2);
      assert.equal(proof.verifications.length,3);
    } else if (fixture.provider === 'real') assert.ok(proof.missions[0].continuations >= 1);
    if (fixture.provider !== 'contribution') assert.equal(proof.verifications[0].passed,false);
    const finalVerification=proof.verifications.at(-1);
    assert.equal(finalVerification.passed,true);
    if (fixture.provider !== 'contribution') assert.ok(proof.observations.length >= 1);
    assert.ok(proof.observations.every(bug => bug.status === 'resolved' && bug.retestId === finalVerification.id));
    const permission=proof.timeline.find(event => event.type === 'duplica.permission_resolved');
    const question=proof.timeline.find(event => event.type === 'duplica.question_answered');
    if (fixture.provider === 'fixture') {
      assert.equal(permission.data.channel,'computer');
      assert.equal(question.data.channel,'computer');
      assert.deepEqual(question.data.answers,{format:'CSV'});
    }
    assert.equal(finalVerification.checks.find(check => check.stage === 'tests').exitCode,0);
    if (fixture.provider !== 'contribution') assert.ok(proof.verifications.every(result => result.checks.find(check => check.stage === 'tests').exitCode === 0));
    assert.ok(proof.verifications.every(result => result.checks.find(check => check.stage === 'gui').screenshot));
    for (const verification of proof.verifications) {
      const artifacts=[verification.artifact,...verification.checks.filter(check => check.artifact).map(check => check.artifact),
        ...verification.checks.filter(check => check.screenshot).map(check => check.screenshot)];
      for (const artifact of artifacts) {
        assert.equal(createHash('sha256').update(fs.readFileSync(artifact.path)).digest('hex'),artifact.sha256,artifact.path);
      }
    }
    fs.mkdirSync(fixture.directory,{recursive:true});
    fs.writeFileSync(path.join(fixture.directory,'acceptance.json'),JSON.stringify({provider:fixture.provider,model:fixture.model,workspace:fixture.workspace,computer:'real-electron-input',permissionObserved:!!permission,questionObserved:!!question,proof},null,2));
    await page.waitForFunction(() => state.duplica.missions[0]?.status === 'completed');
    await page.evaluate(() => route('duplica'));
    await saveCapture(application,path.join(fixture.directory,'manager.png'));
    for (const width of [1100,800]) {
      await application.evaluate(({BrowserWindow},width) => BrowserWindow.getAllWindows().find(window => window.webContents.getURL().startsWith('http://127.0.0.1:4328/')).setContentSize(width,900),width);
      await page.waitForTimeout(100);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1),'Débordement horizontal Duplica à '+width);
      await saveCapture(application,path.join(fixture.directory,'manager-'+width+'.png'));
    }
    await page.getByLabel('Options Duplica',{exact:true}).click();
    await page.getByRole('button',{name:'Reprendre la main',exact:true}).click();
    assert.equal((await page.evaluate(() => api('state'))).duplica.settings.status,'manual');
    const before=proof.timeline.length;
    await page.waitForTimeout(800);
    assert.equal((await page.evaluate(() => api('state'))).duplica.timeline.filter(event => event.type === 'duplica.agent_continued').length,proof.missions[0].continuations);
    assert.equal(errors.length,0,errors.join('\n'));
    console.log(JSON.stringify({status:'passed',provider:fixture.provider,model:fixture.model,computer:'real-electron',continuations:proof.missions[0].continuations,bugs:proof.observations.length,verifications:proof.verifications.length,permissionObserved:!!permission,questionObserved:!!question,errors,directory:fixture.directory},null,2));
  } catch (error) {
    if (page && fixture) {
      fs.writeFileSync(path.join(fixture.directory,'failure.json'),JSON.stringify(await page.evaluate(() => api('state')),null,2));
      fs.writeFileSync(path.join(fixture.directory,'browser-errors.json'),JSON.stringify({errors,text:await page.locator('body').innerText()},null,2));
      await saveCapture(application,path.join(fixture.directory,'failure.png')).catch(() => {});
    }
    throw error;
  } finally {
    if (page && fixture) await page.evaluate(() => api('fixture/shutdown',{})).catch(() => {});
    await application.close();
  }
}
main().catch(error => { console.error(error); process.exitCode=1; });
