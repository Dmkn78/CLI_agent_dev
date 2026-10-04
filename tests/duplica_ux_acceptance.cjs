const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');

async function main(){
  const browser=await chromium.launch({headless:true,channel:process.env.ATELIER_BROWSER_CHANNEL||'chrome'});
  const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const directory=path.resolve('.atelier/duplica-ux-evidence');fs.mkdirSync(directory,{recursive:true});
  try{
    await page.goto('http://127.0.0.1:4320/#duplica');
    await page.getByRole('heading',{name:'Duplica',exact:true}).waitFor();
    await page.waitForFunction(()=>state.projects.length&&provider().models.length);
    assert.equal(await page.locator('[data-form="duplica-chat"]').count(),1);
    await page.getByLabel('Message à Duplica').fill('Quels tests faut-il prévoir ?');
    await page.getByRole('button',{name:'Envoyer à Duplica',exact:true}).click();
    await page.waitForFunction(()=>state.duplica.discussion.deliveries.at(-1)?.status==='completed');
    assert.equal(await page.locator('.duplica-chat-message.assistant p').last().innerText(),'ok');
    assert.ok(await page.locator('.duplica-discussion>.session-usage').innerText());
    assert.equal((await page.evaluate(()=>api('state'))).duplica.settings.status,'off');
    await page.reload();
    await page.getByText('Quels tests faut-il prévoir ?', {exact:true}).last().waitFor();
    await page.getByRole('button',{name:'Connecter Telegram',exact:true}).click();
    assert.equal(await page.locator('[name="botToken"]').getAttribute('type'),'password');
    assert.ok((await page.locator('.telegram-connect').innerText()).includes('/newbot'));
    await page.getByRole('button',{name:'Fermer la fenêtre',exact:true}).click();
    await page.getByRole('button',{name:'Travailler pour moi',exact:true}).click();
    await page.locator('[name="goal"]').fill('Vérifier le projet fictif');
    await page.locator('[name="sessionId"]').selectOption({label:'Session de recette fictive'});
    await page.getByRole('button',{name:'Démarrer',exact:true}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    const scoped=await page.evaluate(()=>api('state'));
    assert.equal(scoped.duplica.settings.globalEnabled,false);
    assert.ok(scoped.duplica.scopes.some(scope=>scope.kind==='project'&&scope.targetId==='atelier'&&scope.enabled));
    // A stale nonce is refused before mutation, then renewed once for the actual save.
    const created=await page.evaluate(async()=>{
      document.querySelector('meta[name="atelier-token"]').content='stale-test-nonce';
      const [snapshot,task]=await Promise.all([api('state'),api('save',{kind:'task',value:{title:'Une seule création après reconnexion',projectId:'atelier'}})]);
      return {id:task.id,projects:snapshot.projects.length};
    });
    assert.equal(created.projects,1);
    assert.equal((await page.evaluate(()=>api('state'))).tasks.filter(task=>task.title==='Une seule création après reconnexion').length,1);
    assert.equal(await page.locator('.toast').filter({hasText:'Session locale requise'}).count(),0);
    await page.evaluate(()=>route('sprints'));
    await page.getByRole('button',{name:'Nouveau sprint',exact:true}).click();
    await page.locator('[name="title"]').fill('Sprint de vérification');
    await page.locator('[name="start"]').fill('2026-10-02');await page.locator('[name="end"]').fill('2026-10-09');
    await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    await page.locator('.sprint-card').filter({hasText:'Sprint de vérification'}).getByRole('button',{name:'Voir les tâches',exact:true}).click();
    assert.equal(await page.getByLabel('Filtrer par sprint').inputValue(),(await page.evaluate(()=>api('state'))).sprints.find(sprint=>sprint.title==='Sprint de vérification').id);
    await page.getByRole('button',{name:'Nouvelle tâche',exact:true}).click();
    const sprintId=await page.locator('[name="sprintId"]').inputValue();assert.ok(sprintId);
    await page.locator('[name="title"]').fill('Tâche du sprint');await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    await page.locator('.task-card').filter({hasText:'Tâche du sprint'}).waitFor();
    assert.equal(await page.locator('.task-card').count(),1);
    assert.equal((await page.evaluate(()=>api('state'))).tasks.find(task=>task.title==='Tâche du sprint').sprintId,sprintId);
    await page.evaluate(()=>taskModal(state.tasks.find(task=>task.title==='Une seule création après reconnexion').id));
    assert.equal(await page.locator('[name="sprintId"]').inputValue(),'');
    await page.getByRole('button',{name:'Annuler',exact:true}).click();
    await page.getByLabel('Filtrer par sprint').selectOption('');assert.ok(await page.locator('.task-card').count()>1);
    const other=await page.evaluate(async()=>{
      const added=await api('save',{kind:'project',value:{name:'Autre projet fictif',path:project().path}});
      await refresh(true);route('duplica');return added;
    });
    await page.getByRole('button',{name:'Discussion',exact:true}).click();
    await page.getByLabel('Projet de Duplica').selectOption(other.id);
    assert.equal(await page.locator('.duplica-chat-message').count(),0);
    await page.getByLabel('Message à Duplica').fill('Discussion du second projet');
    await page.getByRole('button',{name:'Envoyer à Duplica',exact:true}).click();
    await page.waitForFunction(id=>state.duplica.discussion.deliveries.some(delivery=>delivery.projectId===id&&delivery.status==='completed'),other.id);
    assert.equal((await page.evaluate(()=>api('state'))).duplica.discussion.conversations.length,2);
    await page.getByLabel('Projet de Duplica').selectOption('atelier');
    await page.getByText('Quels tests faut-il prévoir ?', {exact:true}).last().waitFor();
    for(const width of [1500,900,390,300]){
      await page.setViewportSize({width,height:1000});
      for(const view of ['duplica','sprints','tasks','agents','usage']){
        await page.evaluate(view=>route(view),view);
        if(view==='duplica'){await page.getByRole('button',{name:'Discussion',exact:true}).click();}
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),view+' overflow '+width);
      }
      await page.evaluate(()=>route('duplica'));await page.getByRole('button',{name:'Discussion',exact:true}).click();
      await page.screenshot({path:path.join(directory,'discussion-'+width+'.png'),fullPage:true});
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(directory,'result.json'),JSON.stringify({status:'passed',discussion:true,reconnect:true,sprints:true,widths:[1500,900,390,300],errors},null,2));
    console.log('Duplica UX passed: shared discussion, scoped Work for me, stale nonce, sprints, four widths.');
  }catch(error){await page.screenshot({path:path.join(directory,'failure.png'),fullPage:true});throw error;}
  finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
