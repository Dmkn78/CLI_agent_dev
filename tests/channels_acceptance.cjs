const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');

async function main(){
  const browser=await chromium.launch({headless:true,channel:process.env.ATELIER_BROWSER_CHANNEL||'chrome'});
  const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const evidence=path.resolve('.atelier/channel-evidence');fs.mkdirSync(evidence,{recursive:true});
  try{
    await page.goto('http://127.0.0.1:4324/#channels');
    await page.getByRole('heading',{name:'Canaux',exact:true}).waitFor();
    await page.getByRole('button',{name:'Créer mon premier canal',exact:true}).click();
    await page.getByLabel('Nom du canal').fill('Architecture partagée');
    await page.getByLabel('Sujet et résultat attendu').fill('Préparer un plan pour un canal où les agents discutent avant action.');
    await page.getByLabel('Tours de discussion maximum').fill('2');
    await page.getByRole('button',{name:'Créer le canal',exact:true}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    await page.getByRole('button',{name:'Inviter',exact:true}).click();
    await page.getByLabel('Nom du participant').fill('Duplica planificateur');
    await page.getByLabel('Rôle dans le canal').selectOption('duplica');
    await page.getByLabel('Modèle du participant').selectOption('fixture-review');
    await page.getByRole('button',{name:'Ajouter le participant',exact:true}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    await page.getByRole('button',{name:'Inviter',exact:true}).click();
    await page.getByLabel('Configuration du participant').selectOption('clone');
    await page.getByLabel('Nom du participant').fill('Second regard');
    await page.getByRole('button',{name:'Ajouter le participant',exact:true}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    await page.locator('.channel-participant').nth(1).waitFor();
    assert.equal(await page.locator('.channel-participant').count(),2);
    await page.getByRole('button',{name:'Connexions',exact:true}).click();
    await page.getByRole('button',{name:'Ajouter une API',exact:true}).click();
    await page.getByLabel('Nom de la connexion').fill('LLM local fictif');
    await page.getByLabel('URL de base').fill('http://127.0.0.1:4325/v1');
    await page.getByRole('button',{name:'Enregistrer la connexion',exact:true}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    await page.getByRole('button',{name:'Lire le catalogue',exact:true}).click();
    await page.waitForFunction(()=>state.apiConnections.some(connection=>connection.name==='LLM local fictif'&&connection.catalogSource==='discovered'));
    await page.getByRole('button',{name:'Ajouter une API',exact:true}).click();
    await page.getByLabel('Nom de la connexion').fill('Consultant SystemOne fictif');
    await page.getByLabel('Protocole').selectOption('systemone');
    await page.getByLabel('URL de base').fill('http://127.0.0.1:4325/v1');
    await page.getByLabel('Identifiants des modèles (un par ligne)').fill('fixture-decision');
    await page.getByRole('button',{name:'Enregistrer la connexion',exact:true}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    await page.waitForFunction(()=>state.apiConnections.some(connection=>connection.name==='Consultant SystemOne fictif'));
    await page.getByRole('button',{name:'Canaux d’agents',exact:true}).click();
    const connections=await page.evaluate(()=>state.apiConnections);
    for(const [connectionName,participantName] of [['LLM local fictif','Agent API locale'],['Consultant SystemOne fictif','Consultant décision']]){
      const connection=connections.find(entry=>entry.name===connectionName);
      await page.getByRole('button',{name:'Inviter',exact:true}).click();
      await page.getByLabel('Nom du participant').fill(participantName);
      await page.getByLabel('Fournisseur du participant').selectOption('api:'+connection.id);
      if(connection.protocol==='systemone') assert.equal(await page.getByLabel('Rôle dans le canal').inputValue(),'consultant');
      await page.getByRole('button',{name:'Ajouter le participant',exact:true}).click();
      await page.locator('#modal').waitFor({state:'hidden'});
    }
    await page.getByLabel('Votre message au canal').fill('Comparez deux solutions et proposez les vérifications nécessaires.');
    await page.getByRole('button',{name:'Envoyer et lancer',exact:true}).click();
    await page.waitForFunction(()=>state.discussions?.channels[0]?.status==='ready_for_review');
    const snapshot=await page.evaluate(()=>api('state'));
    assert.equal(snapshot.discussions.messages.length,10); // user + two rounds of four peers + one plan
    assert.equal(snapshot.discussions.rounds.length,3);
    assert.equal(snapshot.discussions.channels[0].status,'ready_for_review');
    assert.ok(snapshot.discussions.messages.some(message=>message.text.includes('Avis structuré')));
    assert.ok(!JSON.stringify(snapshot.discussions).includes('private fixture thought'));
    assert.ok(!JSON.stringify(snapshot.discussions).includes('PRIVATE_BROWSER_ORIGINAL'));
    assert.equal(snapshot.sessions.find(session=>session.name==='Agent existant fictif').sandbox,'workspace-write');
    assert.equal(await page.locator('.channel-message').count(),10);
    await page.screenshot({path:path.join(evidence,'channels-desktop.png'),fullPage:true});
    await page.getByRole('button',{name:'Discuter du plan avec Duplica',exact:true}).click();
    assert.ok((await page.getByLabel('Message à Duplica').inputValue()).includes('Sujet :'));
    assert.equal((await page.evaluate(()=>api('state'))).duplica.discussion.deliveries.length,0);
    await page.getByRole('button',{name:'Canaux d’agents',exact:true}).click();
    await page.getByRole('button',{name:'Préparer une tâche en revue',exact:true}).click();
    await page.locator('[data-form="task"]').waitFor();
    const tasks=(await page.evaluate(()=>api('state'))).tasks;
    assert.equal(tasks.length,1);assert.equal(tasks[0].status,'review');
    await page.getByRole('button',{name:'Annuler',exact:true}).click();
    await page.getByRole('button',{name:'Canaux d’agents',exact:true}).click();
    await page.getByRole('button',{name:'Voir la tâche en revue',exact:true}).click();
    assert.equal((await page.evaluate(()=>api('state'))).tasks.length,1);
    await page.getByRole('button',{name:'Annuler',exact:true}).click();
    await page.getByRole('button',{name:'Canaux d’agents',exact:true}).click();
    for(const width of [1100,800,390]){
      await page.setViewportSize({width,height:900});
      await page.screenshot({path:path.join(evidence,'channels-'+width+'.png'),fullPage:true});
      const fits=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
      assert.ok(fits,'Horizontal overflow at '+width);
    }
    await page.reload();
    await page.waitForFunction(()=>state.discussions?.channels[0]?.status==='ready_for_review');
    assert.equal(await page.locator('.channel-message').count(),10);
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(evidence,'browser-result.json'),JSON.stringify({status:'passed',messages:10,participants:4,rounds:3,widths:[1500,1100,800,390],pageErrors:errors},null,2));
    console.log('Channels browser acceptance passed: native/API/SystemOne peers, private context isolation, plan, review task, persistence, 4 widths.');
  }catch(error){await page.screenshot({path:path.join(evidence,'failure.png'),fullPage:true});throw error;}
  finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
