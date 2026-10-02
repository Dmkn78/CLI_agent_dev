const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0coAAAAASUVORK5CYII=','base64');

async function main(){
  const browser=await chromium.launch({headless:true,channel:process.env.ATELIER_BROWSER_CHANNEL||'chrome'});
  const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];
  const evidence=path.resolve(process.env.ATELIER_TEST_EVIDENCE || '.atelier/feedback-evidence');fs.mkdirSync(evidence,{recursive:true});
  page.on('pageerror',error=>errors.push(error.message));
  page.setDefaultTimeout(15000);
  try {
    await page.goto((process.env.ATELIER_TEST_URL || 'http://127.0.0.1:4332/')+'#duplica');
    await page.getByRole('heading',{name:'Duplica',exact:true}).waitFor();
    await page.waitForFunction(()=>provider().models.length > 0);
    await page.getByRole('button',{name:'Notifications',exact:true}).click();
    await page.locator('#work-popover .notification-item[data-kind="success"]').waitFor();
    await page.locator('#work-popover').evaluate(async panel=>Promise.all(panel.getAnimations().map(animation=>animation.finished)));
    assert.equal(await page.locator('#work-popover').evaluate(panel=>getComputedStyle(panel).opacity),'1');
    const semanticColors=await page.locator('#work-popover .notification-item').evaluateAll(items=>Object.fromEntries(items.map(item=>[item.dataset.kind,getComputedStyle(item.querySelector('svg')).color])));
    assert.equal(new Set(Object.values(semanticColors)).size,4);
    await page.screenshot({path:path.join(evidence,'semantic-notifications.png'),fullPage:true});
    await page.getByRole('button',{name:'Fermer les notifications',exact:true}).click();
    await page.getByRole('button',{name:'Structurer la consigne',exact:true}).click();
    assert.ok((await page.getByLabel('Message à Duplica').inputValue()).includes('<demande>\n# Objectif'));
    await page.locator('#duplica-files').setInputFiles([
      {name:'notes.txt',mimeType:'text/plain',buffer:Buffer.from('Fichier joint de recette.')},
      {name:'image.png',mimeType:'image/png',buffer:PNG}
    ]);
    await page.waitForFunction(()=>draftAttachments().length === 2 && !duplicaUploading.size);
    assert.equal(await page.locator('.duplica-chat-composer .chat-attachment').count(),2);
    const instruction='# Objectif\n\nExamine mes pièces jointes.\n\n## Critères\n\n- Vérifier les fichiers.\n- <img src=x onerror="window.markdownExecuted=true">\n\n```xml\n<preuve>Document synthétique</preuve>\n```';
    await page.getByLabel('Message à Duplica').fill(instruction);
    await page.getByRole('button',{name:'Envoyer à Duplica',exact:true}).click();
    await page.waitForFunction(()=>state.duplica.discussion.deliveries.at(-1)?.status === 'completed');
    await page.locator('.duplica-chat-message.user .chat-attachment').nth(1).waitFor();
    assert.equal(await page.locator('.duplica-chat-message.user .chat-attachment').count(),2);
    assert.equal(await page.locator('.duplica-chat-message.user .message-markdown h3').innerText(),'Objectif');
    assert.equal(await page.locator('.duplica-chat-message.user .message-markdown li').count(),2);
    assert.equal(await page.locator('.duplica-chat-message.user .message-markdown code').innerText(),'<preuve>Document synthétique</preuve>');
    assert.equal(await page.evaluate(()=>window.markdownExecuted),undefined);
    await page.reload();
    await page.locator('.duplica-chat-message.user .chat-attachment img').waitFor();
    await page.waitForFunction(()=>document.querySelector('.duplica-chat-message.user .chat-attachment img')?.naturalWidth > 0);
    // A native-like folder drop carries its FileSystemEntry tree into the composer.
    await page.evaluate(()=>{
      const drop=new Event('drop',{bubbles:true,cancelable:true});
      const file=new File(['Dossier glissé'], 'drop.txt',{type:'text/plain'});
      const fileEntry={name:'drop.txt',isFile:true,isDirectory:false,file:callback=>callback(file)};
      const directory={name:'dossier',isFile:false,isDirectory:true,createReader:()=>{let read=false;return {readEntries:callback=>{callback(read?[]:[fileEntry]);read=true;}};}};
      Object.defineProperty(drop,'dataTransfer',{value:{types:['Files'],files:[],items:[{webkitGetAsEntry:()=>directory}],getData:()=>''}});
      document.querySelector('.duplica-chat-composer').dispatchEvent(drop);
    });
    await page.waitForFunction(()=>draftAttachments().length === 1);
    await page.getByRole('button',{name:'Retirer dossier/drop.txt',exact:true}).click();
    assert.equal(await page.locator('.duplica-chat-composer .chat-attachment').count(),0);
    await page.getByRole('button',{name:'Commandes et skills',exact:true}).click();
    await page.getByRole('button',{name:'Nouvelle commande',exact:true}).click();
    await page.getByLabel('Nom après /').fill('audit');
    await page.getByLabel('Description courte').fill('Relire les preuves');
    await page.getByLabel('Consigne',{exact:true}).fill('Inspecte {args} et propose les contrôles.');
    await page.getByRole('button',{name:'Enregistrer la commande',exact:false}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    await page.getByLabel('Message à Duplica').fill('/');
    await page.locator('#duplica-slash-menu').waitFor({state:'visible'});
    assert.ok((await page.locator('#duplica-slash-menu').innerText()).includes('/fixture-skill'));
    assert.ok((await page.locator('#duplica-slash-menu').innerText()).includes('/fixture-agent-skill'));
    await page.locator('[data-action="duplica-use-command"][data-name="audit"]').click();
    await page.getByLabel('Message à Duplica').fill('/audit les fichiers');
    await page.getByRole('button',{name:'Envoyer à Duplica',exact:true}).click();
    await page.waitForFunction(()=>state.duplica.discussion.deliveries.at(-1)?.text === '/audit les fichiers' && state.duplica.discussion.deliveries.at(-1)?.status === 'completed');
    await page.screenshot({path:path.join(evidence,'duplica-files-commands.png'),fullPage:true});
    await page.evaluate(()=>route('overview'));
    await page.locator('.graph-node').filter({hasText:'Agent à supprimer'}).click();
    await page.getByRole('button',{name:'Supprimer l’agent',exact:true}).click();
    await page.waitForFunction(()=>state.sessions.some(session=>session.name === 'Agent à supprimer' && session.removedAt));
    assert.equal(await page.locator('.graph-node').filter({hasText:'Agent à supprimer'}).count(),0);
    await page.getByRole('button',{name:'Agents supprimés (1)',exact:true}).click();
    await page.getByRole('button',{name:'Restaurer',exact:true}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    await page.locator('.graph-node').filter({hasText:'Agent à supprimer'}).waitFor();
    await page.evaluate(()=>route('channels'));
    await page.getByRole('button',{name:'Créer mon premier canal',exact:true}).click();
    await page.getByLabel('Nom du canal').fill('Discussion puis travail');
    await page.getByLabel('Sujet et résultat attendu').fill('Produire une correction, ses tests et un audit.');
    await page.getByLabel('Fin de la discussion').selectOption('auto');
    await page.getByLabel('Limite de sécurité par lancement').fill('4');
    await page.locator('[name="executionEnabled"]').check();
    await page.getByLabel('Modèle · Vérification et audit').selectOption('fixture-review');
    await page.getByRole('button',{name:'Créer le canal',exact:false}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    await page.getByRole('button',{name:'Inviter',exact:true}).click();
    await page.getByLabel('Nom du participant').fill('Orchestrateur fictif');
    await page.getByLabel('Rôle dans le canal').selectOption('orchestrator');
    await page.getByRole('button',{name:'Ajouter le participant',exact:false}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    await page.getByRole('button',{name:'Lancer la discussion',exact:true}).click();
    await page.waitForFunction(()=>state.discussions.channels[0]?.executionWorkflowId && state.workflows.find(workflow=>workflow.id === state.discussions.channels[0].executionWorkflowId)?.status === 'completed');
    const outcome=await page.evaluate(()=>({channel:state.discussions.channels[0],workflow:state.workflows[0],tasks:state.tasks}));
    assert.deepEqual(outcome.workflow.steps.map(step=>step.role),['Implémentation','Vérification','Audit']);
    assert.equal(outcome.tasks[0].status,'review');
    assert.equal(outcome.workflow.validation,'UNVERIFIED');
    await page.screenshot({path:path.join(evidence,'channel-auto-work.png'),fullPage:true});
    // Existing channels can be reconfigured without losing their participants/history.
    await page.getByRole('button',{name:'Options du canal',exact:true}).click();
    assert.equal(await page.getByLabel('Fin de la discussion').inputValue(),'auto');
    await page.locator('[name="executionEnabled"]').uncheck();
    await page.getByRole('button',{name:'Enregistrer les options',exact:false}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    for(const width of [1500,900,390,300]){
      await page.setViewportSize({width,height:1000});
      for(const route of ['duplica','channels','overview','audit','terminal']){
        await page.evaluate(route=>window.route(route),route);
        await page.waitForTimeout(120);
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth+1);
        assert.equal(overflow,false,route+' width '+width+' has page overflow');
      }
    }
    await page.setViewportSize({width:1500,height:1000});
    await page.evaluate(()=>route('audit'));
    await page.screenshot({path:path.join(evidence,'flat-audit.png'),fullPage:true});
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(evidence,'result.json'),JSON.stringify({passed:true,widths:[1500,900,390,300],checks:['semantic notification colors','safe Markdown and XML composer','text/image persistence','folder drop','custom command and skill','remove/restore','convergence and implementation/verification/audit','flat responsive UI'],errors},null,2));
    console.log('Feedback acceptance passed: attachments, folder drop, /commands, remove/restore, automatic pipeline, responsive layout.');
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
