const {_electron}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
async function main(){
  const browser=await _electron.launch({executablePath:require('electron'),args:[path.resolve('tests/channels_feedback_window.cjs')]});
  const page=await browser.firstWindow();
  await page.setViewportSize({width:1500,height:1000});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const evidence=path.resolve('.atelier/channel-feedback-evidence');fs.mkdirSync(evidence,{recursive:true});
  try {
    await page.goto('http://127.0.0.1:4324/#channels');
    await page.getByRole('button',{name:'Créer mon premier canal',exact:true}).click();
    await page.getByLabel('Nom du canal').fill('Recette huit participants');
    await page.getByLabel('Sujet et résultat attendu').fill('Discussion fictive, activité, consommation et arrêt.');
    await page.getByLabel('Tours de discussion maximum').fill('1');
    await page.getByRole('button',{name:'Créer le canal',exact:true}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    for(let index=0;index<8;index++) {
      await page.getByRole('button',{name:'Inviter',exact:true}).click();
      await page.getByLabel('Nom du participant').fill('Participant '+(index+1));
      await page.getByLabel('Modèle du participant').selectOption(index%2?'fixture-review':'fixture-code');
      await page.getByLabel('Effort du participant').selectOption(index%2?'high':'low');
      await page.getByRole('button',{name:'Ajouter le participant',exact:true}).click();
      await page.locator('#modal').waitFor({state:'hidden'});
      await page.waitForFunction(count=>state.discussions.participants.length===count,index+1);
    }
    assert.equal(await page.locator('.channel-participant').count(),8);
    assert.equal(await page.getByRole('button',{name:'Inviter',exact:true}).isDisabled(),true);
    await page.reload();
    await page.waitForFunction(()=>state.discussions.participants.length===8);
    const participants=await page.evaluate(()=>state.discussions.participants);
    participants.forEach((entry,index)=>{
      assert.equal(entry.configuration.model,index%2?'fixture-review':'fixture-code');
      assert.equal(entry.configuration.effort,index%2?'high':'low');
    });
    await page.getByLabel('Votre message au canal').fill('Comparez les options puis publiez un plan.');
    await page.getByRole('button',{name:'Envoyer et lancer',exact:true}).click();
    await page.waitForFunction(()=>state.discussions.channels[0].status==='running');
    assert.equal(await page.getByRole('button',{name:'Arrêter',exact:true}).isVisible(),true);
    await page.locator('.channel-activity summary').first().click();
    await page.waitForFunction(()=>state.discussions.channels[0].status==='ready_for_review');
    const completed=await page.evaluate(()=>state.discussions);
    assert.equal(completed.messages.length,10);
    assert.ok(completed.participants.every(entry=>entry.activity.status==='completed'));
    assert.ok(completed.participants.every(entry=>entry.activity.sessionId));
    assert.equal(completed.channels[0].usage.total.totalTokens,135);
    assert.ok(await page.locator('.channel-activity').first().getAttribute('open')!==null);
    assert.ok(!JSON.stringify(completed).includes('PRIVATE_REASONING'));
    await page.screenshot({path:path.join(evidence,'eight-participants.png'),fullPage:true});
    await page.getByRole('button',{name:'Reprendre la discussion',exact:true}).click();
    await page.waitForFunction(()=>state.discussions.channels[0].status==='running');
    await page.getByRole('button',{name:'Arrêter',exact:true}).click();
    await page.waitForFunction(()=>state.discussions.channels[0].status==='stopped'&&!state.discussions.channels[0].isStopping);
    assert.equal((await page.evaluate(()=>state.discussions.messages.length)),10);
    for(const width of [1100,800,390]) {
      await page.setViewportSize({width,height:900});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Overflow at '+width);
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(evidence,'result.json'),JSON.stringify({status:'passed',participants:8,messages:10,tokens:135,stop:'passed',pageErrors:errors},null,2));
    console.log('Channels feedback acceptance passed: 8 invites, saved models/efforts, send/start, activity, tokens, stop, 4 widths.');
  } catch(error) {await page.screenshot({path:path.join(evidence,'failure.png'),fullPage:true});throw error;}
  finally {await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
