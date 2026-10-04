"use strict";
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

async function main() {
  const browser=await chromium.launch({headless:true,channel:process.env.ATELIER_BROWSER_CHANNEL || 'chrome'});
  const page=await browser.newPage({viewport:{width:1600,height:1000}});
  const errors=[];
  page.on('pageerror',error => errors.push(error.message));
  page.on('requestfailed',request => console.error('Network:',new URL(request.url()).pathname,request.failure()?.errorText));
  const directory=path.resolve('.atelier/duplica-browser-evidence');
  fs.mkdirSync(directory,{recursive:true});
  try {
    await page.goto('http://127.0.0.1:4320/#duplica');
    await page.getByRole('heading',{name:'Duplica',exact:true}).waitFor();
    await page.getByRole('button',{name:/^Suivi/}).click();
    await page.getByRole('button',{name:'Permissions',exact:true}).click();
    assert.equal(await page.locator('[name="permission_read_secrets"]').inputValue(),'deny');
    assert.equal(await page.locator('[name="permission_approve_plan"] option[value="auto"]').count(),0);
    await page.getByRole('button',{name:'Annuler',exact:true}).click();
    await page.locator('#duplica-user').fill('Objectif de recette de l’interface');
    await page.getByRole('button',{name:'Enregistrer le contexte',exact:true}).click();
    await page.waitForFunction(() => state.duplica.contexts.some(context => context.user === 'Objectif de recette de l’interface'));
    await page.reload();
    await page.getByRole('button',{name:/^Suivi/}).click();
    await page.locator('#duplica-user').waitFor();
    assert.equal(await page.locator('#duplica-user').inputValue(),'Objectif de recette de l’interface');
    await page.getByRole('button',{name:'Mémoriser une réponse',exact:true}).click();
    await page.locator('[name="questions"]').fill('Quel framework ?');
    await page.locator('[name="answer"]').fill('Pas de Firebase');
    await page.getByRole('button',{name:'Mémoriser',exact:true}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    await page.getByText('Quel framework ?', {exact:true}).first().waitFor();
    for (const width of [1600,900,390,300]) {
      await page.setViewportSize({width,height:1000});
      for (const view of ['overview','duplica','tasks','memory','usage','audit','settings']) {
        await page.evaluate(view => route(view),view);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1),'Débordement '+view+' à '+width);
      }
      await page.evaluate(() => route('duplica'));
      await page.screenshot({path:path.join(directory,'duplica-'+width+'.png'),fullPage:true});
    }
    await page.setViewportSize({width:1600,height:1000});
    await page.evaluate(() => route('tasks'));
    await page.getByRole('button',{name:'Nouvelle tâche',exact:true}).click();
    assert.equal(await page.locator('[name="duplicaEnabled"]').inputValue(),'inherit');
    await page.locator('[name="title"]').fill('Tâche confiée par la recette');
    await page.locator('[name="duplicaEnabled"]').selectOption('true');
    await page.getByRole('button',{name:'Enregistrer',exact:false}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    const snapshot=await page.evaluate(() => api('state'));
    const task=snapshot.tasks.find(task => task.title === 'Tâche confiée par la recette');
    assert.ok(snapshot.duplica.scopes.some(scope => scope.kind === 'task' && scope.targetId === task.id && scope.enabled));
    await page.evaluate(() => route('duplica'));
    await page.getByLabel('Options Duplica',{exact:true}).click();
    await page.getByRole('button',{name:'Pause',exact:true}).click();
    await page.waitForFunction(() => state.duplica.settings.status === 'paused');
    assert.equal((await page.evaluate(() => api('state'))).duplica.settings.status,'paused');
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(directory,'result.json'),JSON.stringify({status:'passed',widths:[1600,900,390,300],errors},null,2));
    console.log('Duplica browser acceptance passed: persistence, decisions, task scope, pause, 4 widths, no JS errors.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode=1; });
