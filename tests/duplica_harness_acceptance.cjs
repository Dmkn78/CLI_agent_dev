"use strict";
const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');

async function main() {
  const env={...process.env,ATELIER_URL:'http://127.0.0.1:4362/',ATELIER_DESKTOP_TEST:'1',
    ATELIER_TEST_DATA:path.resolve('.atelier/duplica-harness-e2e/profile-'+Date.now())};
  delete env.ELECTRON_RUN_AS_NODE;
  const application=await electron.launch({executablePath:require('electron'),args:[path.resolve('desktop/main.cjs')],env});
  let page,fixture;
  const errors=[];
  try {
    page=await application.firstWindow();
    page.setDefaultTimeout(20000);
    page.on('pageerror',error=>errors.push(error.message));
    await page.waitForFunction(()=>typeof api==='function' && !loading && state.projects.length);
    fixture=await page.evaluate(()=>api('fixture'));
    assert.equal(fixture.provider,'fixture');
    await page.getByRole('button',{name:'Agent',exact:true}).click();
    await page.getByRole('heading',{name:'Duplica',exact:true}).waitFor();
    await page.getByRole('button',{name:'Travailler pour moi',exact:true}).first().click();
    await page.locator('[name="goal"]').fill('Vérifier huit mini-tâches en parallèle et leurs preuves.');
    await page.locator('[name="effort"]').selectOption('max');
    assert.equal(await page.locator('[name="maxParallel"]').inputValue(),'4');
    assert.equal(await page.locator('[name="maxTasks"]').inputValue(),'12');
    await page.locator('[name="continuous"]').uncheck();
    await page.getByRole('button',{name:'Démarrer l’équipe',exact:true}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    await page.getByRole('button',{name:/^Suivi/}).click();
    await page.waitForFunction(()=>state.duplica.runs[0]?.status==='waiting_plan');
    await page.getByRole('button',{name:'Valider le plan',exact:true}).waitFor();
    assert.equal(await page.locator('.duplica-run li').count(),8);
    await page.screenshot({path:path.join(fixture.directory,'plan-eight-tasks.png')});
    assert.equal(await page.evaluate(()=>state.workflows[0].steps.filter(step=>step.role==='Implémentation').length),0);
    await page.getByRole('button',{name:'Valider le plan',exact:true}).click();
    await page.waitForFunction(()=>state.workflows[0]?.steps.filter(step=>step.role==='Implémentation' && step.status==='running').length===4);
    await page.waitForFunction(async()=>((await api('fixture')).metrics.barrierPassed.length===4),null,{polling:250});
    const held=await page.evaluate(()=>api('fixture'));
    assert.equal(held.metrics.peak,4);
    assert.equal(held.metrics.barrierPassed.length,4);
    await page.evaluate(()=>document.querySelector('.duplica-run').scrollIntoView({block:'start'}));
    await page.screenshot({path:path.join(fixture.directory,'four-workers-active.png')});
    await page.evaluate(()=>api('fixture/release',{}));
    await page.waitForFunction(()=>state.duplica.runs[0]?.status==='needs_evidence',{timeout:30000});
    const observed=await page.evaluate(()=>api('state'));
    const flow=observed.workflows[0],run=observed.duplica.runs[0];
    const finalFixture=await page.evaluate(()=>api('fixture'));
    assert.equal(finalFixture.metrics.peak,4);
    assert.equal(finalFixture.metrics.barrierPassed.length,8);
    assert.equal(flow.status,'completed');
    assert.equal(flow.steps.filter(step=>step.role==='Implémentation').length,8);
    assert.ok(flow.steps.every(step=>step.status==='completed'));
    assert.equal(run.effort,'max');
    assert.equal(run.validation,'UNVERIFIED');
    assert.equal(observed.tasks.find(task=>task.id===run.taskIds[0]).status,'review');
    assert.ok(observed.sessions.every(session=>session.effort==='max' && session.sandbox==='read-only'));
    assert.equal(observed.duplica.verifications.length,0);
    // Complete the same run with a real hover recipe and a real subprocess.
    // This keeps its discovered model, effort and read-only worker profile.
    await page.getByRole('button',{name:'Permissions',exact:true}).first().click();
    for(const category of ['computer_control','keyboard_mouse','browser_control'])
      await page.locator(`[name="permission_${category}"]`).selectOption('auto');
    await page.getByRole('button',{name:'Enregistrer les permissions',exact:true}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    await page.getByRole('button',{name:'Reprendre / compléter la recette',exact:true}).click();
    await page.locator('[name="recipe"]').fill(JSON.stringify(fixture.recipe));
    await page.locator('form[data-form="duplica-work"] button[type="submit"]').click();
    await page.locator('#modal').waitFor({state:'hidden'});
    await page.waitForFunction(()=>state.duplica.runs[0]?.status==='completed',null,{timeout:30000});
    const verified=await page.evaluate(()=>api('state'));
    assert.equal(verified.workflows.length,1,'Completing the recipe must not launch agents again');
    assert.equal(verified.sessions.length,observed.sessions.length);
    assert.equal(verified.duplica.runs[0].effort,'max');
    assert.equal(verified.duplica.runs[0].validation,'VERIFIED');
    const verification=verified.duplica.verifications.at(-1);
    assert.equal(verification.passed,true);
    assert.match(verification.checks.find(check=>check.stage==='tests').output,/harness-independent-tests/);
    assert.equal(verification.checks.find(check=>check.stage==='gui').status,'pass');
    for(const artifact of [verification.artifact,...verification.checks.flatMap(check=>[check.artifact,check.screenshot]).filter(Boolean)])
      assert.equal(createHash('sha256').update(fs.readFileSync(artifact.path)).digest('hex'),artifact.sha256,artifact.path);
    for(const width of [1200,800,390]) {
      await application.evaluate(({BrowserWindow},width)=>{
        const main=BrowserWindow.getAllWindows().find(window=>window.webContents.getURL().startsWith('http://127.0.0.1:4362/') && new URL(window.webContents.getURL()).pathname==='/');
        main.setMinimumSize(280,400);main.setContentSize(width,900);
      },width);
      await page.waitForFunction(width=>innerWidth===width,width);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Débordement à '+width);
      await page.evaluate(()=>document.querySelector('.duplica-run').scrollIntoView({block:'start'}));
      await page.screenshot({path:path.join(fixture.directory,'runner-'+width+'.png')});
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(fixture.directory,'acceptance.json'),JSON.stringify({passed:true,provider:'fixture',
      model:run.model,effort:run.effort,miniTasks:8,maxParallel:4,barrierPassed:finalFixture.metrics.barrierPassed,
      review:true,independentEvidence:'real-subprocess-and-electron-hover',run:verified.duplica.runs[0],flow,verification,errors},null,2));
    console.log(JSON.stringify({passed:true,provider:'fixture',miniTasks:8,peak:4,status:verified.duplica.runs[0].status,
      hover:true,directory:fixture.directory},null,2));
  } catch(error) {
    if(page && fixture) {
      await page.screenshot({path:path.join(fixture.directory,'failure.png')}).catch(()=>{});
      fs.writeFileSync(path.join(fixture.directory,'failure.json'),JSON.stringify(await page.evaluate(()=>api('state')),null,2));
      fs.writeFileSync(path.join(fixture.directory,'errors.json'),JSON.stringify({errors,text:await page.locator('body').innerText()},null,2));
    }
    throw error;
  } finally {
    if(page && fixture) await page.evaluate(()=>api('fixture/shutdown',{})).catch(()=>{});
    await application.close();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
