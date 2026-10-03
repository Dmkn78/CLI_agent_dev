const {_electron}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');

async function main() {
  const evidence=path.resolve('.atelier/architecture-duplica-evidence');
  fs.mkdirSync(evidence,{recursive:true});
  const env={...process.env,ATELIER_URL:'http://127.0.0.1:4351/',ATELIER_DESKTOP_TEST:'1',
    ATELIER_TEST_DATA:path.join(evidence,'profile-'+Date.now())};
  delete env.ELECTRON_RUN_AS_NODE;
  const application=await _electron.launch({executablePath:require('electron'),args:[path.resolve('desktop/main.cjs')],env});
  const errors=[];
  let page;
  try {
    page=await application.firstWindow();page.setDefaultTimeout(15000);
    await application.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setMinimumSize(280,400));
    page.on('pageerror',error=>errors.push(error.message));
    await page.waitForFunction(()=>state?.sessions?.length && state.duplica.computer.available);
    const id=await page.evaluate(()=>state.sessions[0].id);
    await page.getByRole('button',{name:'Agent',exact:true}).click();
    await page.getByRole('button',{name:/^Suivi/}).click();
    await page.getByRole('button',{name:'Permissions',exact:true}).click();
    await page.locator('[name="interactionMode"]').selectOption('computer');
    for(const key of ['computer_control','keyboard_mouse','approve_architecture'])
      await page.locator(`[name="permission_${key}"]`).selectOption('auto');
    await page.getByRole('button',{name:'Enregistrer les permissions',exact:true}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    // Open the seeded pending proposal; subsequent actions use the visible controls.
    await page.evaluate(id=>actions['open-agent']({dataset:{id}}),id);
    await page.getByRole('button',{name:'Valider & importer le dessin',exact:true}).waitFor();
    await page.screenshot({path:path.join(evidence,'proposal-before-validation.png')});
    assert.equal(await page.locator('.architecture-response h3').innerText(),'Architecture de recette');
    await page.locator(`.session-pane [data-action="duplica-scope"][data-id="${id}"]`).click();
    await page.waitForFunction(()=>state.designs.length===1,{timeout:20000});
    await page.locator('#design-canvas .lf-graph').waitFor();
    const result=await page.evaluate(()=>({designs:state.designs,session:state.sessions[0],events:state.duplica.timeline}));
    assert.equal(result.designs[0].graph.nodes.length,2);
    assert.equal(result.session.status,'ready');
    assert.equal(result.session.sandbox,'read-only');
    assert.equal(result.session.messages.filter(m=>m.role==='user').length,1,'Import must not launch an implementation turn');
    await page.waitForFunction(()=>state.duplica.timeline.some(event=>event.type==='duplica.plan_resolved'));
    const event=await page.evaluate(()=>state.duplica.timeline.find(event=>event.type==='duplica.plan_resolved'));
    assert.equal(event.data.channel,'computer','Duplica uses a real observed click');
    assert.equal(await page.evaluate(()=>state.designs[0].validatedBy),'duplica');
    await page.screenshot({path:path.join(evidence,'drawing-imported-by-duplica.png')});
    await page.evaluate(id=>actions['open-agent']({dataset:{id}}),id);
    await page.getByRole('textbox',{name:'Message pour Conception · recette'}).fill('hello, présente-toi');
    await page.locator('.prompt-form').getByRole('button',{name:'Envoyer',exact:true}).click();
    await page.waitForFunction(()=>state.sessions[0].status==='running');
    await page.locator('.working-indicator').waitFor();
    await page.screenshot({path:path.join(evidence,'turn-running.png')});
    await page.waitForFunction(()=>state.sessions[0].status==='ready' && state.designs.length===2,{timeout:20000});
    assert.equal(await page.locator('.working-indicator').count(),0);
    const final=await page.evaluate(()=>({session:state.sessions[0],requests:state.requests,designs:state.designs}));
    assert.equal(final.requests.length,2);assert.ok(final.requests.every(r=>r.status==='completed'));
    assert.equal(final.session.messages.filter(m=>m.role==='user').length,2);
    for(const width of [1068,390]) {
      await application.evaluate(({BrowserWindow},width)=>BrowserWindow.getAllWindows()[0].setSize(width,800),width);
      await page.waitForFunction(width=>innerWidth===width,width);
      await page.screenshot({path:path.join(evidence,'architecture-'+width+'.png')});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(evidence,'result.json'),JSON.stringify({passed:true,fixture:true,guiValidation:true,
      implementationTurns:0,promptLifecycle:['running','waiting_plan','ready'],designs:final.designs.length,pageErrors:errors},null,2));
    console.log('Architecture/Duplica passed: real GUI import, no implementation, second mission activity and completion, responsive.');
  } catch(error) {if(page)await page.screenshot({path:path.join(evidence,'failure.png')});throw error;}
  finally {await application.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
