/* Isolated phone recipe. Optional ATELIER_MOBILE_TEST_URL uses mobile_fixture.py. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium,_electron} = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const TOKEN = 'mobile-fixture-key-never-a-real-account';
const QUESTION_ID = 'question" ><img src=x onerror=window.mobileXss=true>';

async function mockFixture() {
  const model = name => ({model:name,displayName:name,isDefault:name==='fixture-mobile-code',defaultReasoningEffort:'medium',supportedReasoningEfforts:[{reasoningEffort:'low'},{reasoningEffort:'medium'},{reasoningEffort:'high'}]});
  const state = {projects:[{id:'atelier',name:'Atelier',path:'/fixture/atelier'},{id:'second',name:'Second projet fictif',path:'/fixture/second'}],
    providers:[{id:'codex',name:'Codex fictif',connected:true,plan:'Fixture',models:[model('fixture-mobile-code'),model('fixture-mobile-review')]}],
    sessions:[{id:'fixture-agent',name:'Agent de recette fictive',projectId:'atelier',runtime:'codex',model:'fixture-mobile-code',effort:'medium',status:'waiting',sandbox:'read-only',planMode:true,messages:[],usage:null}],
    approvals:[{id:'fixture-approval',sessionId:'fixture-agent',method:'item/commandExecution/requestApproval',params:{command:'fixture-read-only'}},{id:'fixture-question',sessionId:'fixture-agent',method:'item/tool/requestUserInput',params:{questions:[{id:QUESTION_ID,question:'Question fictive à identifiant arbitraire'}]}}],tasks:[],memories:[],events:[],workflows:[],discussions:{channels:[],messages:[]},duplica:{discussion:{conversations:[],deliveries:[]}}};
  let counter=0;
  const server=http.createServer(async(req,res)=>{
    const url=new URL(req.url,'http://127.0.0.1');
    const send=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
    if(url.pathname==='/mobile/' || url.pathname==='/mobile'){
      if(req.headers.authorization!=='Bearer '+TOKEN)return send({error:'Clé requise'},401);
      res.writeHead(200,{'Content-Type':'text/html'});res.end(fs.readFileSync(path.join(ROOT,'web/mobile/index.html'),'utf8').replace('__ATELIER_MOBILE_TOKEN__',TOKEN).replace('__ATELIER_MOBILE_PC__','PC fixture'));return;
    }
    if(['/mobile/app.js','/mobile/style.css'].includes(url.pathname)){
      res.writeHead(200,{'Content-Type':url.pathname.endsWith('.js')?'application/javascript':'text/css'});res.end(fs.readFileSync(path.join(ROOT,'web',url.pathname)));return;
    }
    if(req.headers.authorization!=='Bearer '+TOKEN)return send({error:'Clé requise'},401);
    if(url.pathname==='/api/state')return send(state);
    if(url.pathname==='/api/files'){
      const file=url.searchParams.get('path') || '',project=url.searchParams.get('project');
      if(file.includes('..') || file.startsWith('.env'))return send({error:'Chemin hors du projet.'},400);
      if(project==='second')return send(file?{path:file,content:'Ce fichier appartient au deuxième projet fictif.'}:{path:'',entries:[{name:'autre.txt',path:'autre.txt',directory:false,size:50}]});
      if(file==='src')return send({path:file,entries:[{name:'hello.txt',path:'src/hello.txt',directory:false,size:30}]});
      if(file==='src/hello.txt')return send({path:file,content:'Bonjour depuis le répertoire du PC fictif.\n<script>window.mobileXss=true</script>'});
      if(file==='README.md')return send({path:file,content:'Projet de recette mobile fictive.'});
      return send({path:'',entries:[{name:'src',path:'src',directory:true,size:0},{name:'README.md',path:'README.md',directory:false,size:30}]});
    }
    let data='';for await(const chunk of req)data+=chunk;data=JSON.parse(data || '{}');
    if(url.pathname==='/api/approvals'){state.approvals=state.approvals.filter(a=>a.id!==data.id);state.sessions[0].status='ready';return send({ok:true});}
    if(url.pathname==='/api/sessions'){
      const session={...data,id:'new-agent-'+(++counter),status:'ready',messages:[],usage:null};state.sessions.push(session);return send(session);
    }
    if(url.pathname==='/api/sessions/prompt'){
      const s=state.sessions.find(s=>s.id===data.id);s.messages.push({role:'user',text:data.text},{role:'assistant',text:'ok'});s.status='waiting_plan';s.planningStage='awaiting_approval';s.usage={total:{inputTokens:12,outputTokens:3,cachedInputTokens:5,totalTokens:15}};return send({ok:true});
    }
    if(url.pathname==='/api/sessions/plan'){state.sessions.find(s=>s.id===data.id).status='ready';return send({ok:true});}
    if(url.pathname==='/api/duplica/discussion'){
      const session={id:'duplica-fixture',name:'Duplica · Atelier',role:'duplica',projectId:data.projectId,model:data.model,effort:'medium',runtime:'codex',executionMode:'chat',sandbox:'read-only',status:'ready',messages:[{role:'user',text:data.text},{role:'assistant',text:'ok'}]};
      state.sessions.push(session);state.duplica.discussion.conversations.push({projectId:data.projectId,sessionId:session.id});return send({sessionId:session.id});
    }
    if(url.pathname==='/api/save'){
      const key=data.kind==='memory'?'memories':data.kind+'s';const value={...data.value,id:data.value.id||'saved-'+(++counter)};
      const index=state[key].findIndex(item=>item.id===value.id);if(index<0)state[key].push(value);else state[key][index]=value;return send(value);
    }
    if(url.pathname==='/api/workflows'){const value={...data,id:'workflow-'+(++counter),title:data.name,status:'waiting_plan',steps:[{role:'Planification',output:'Plan fictif public.'}]};state.workflows.push(value);return send(value);}
    if(url.pathname==='/api/workflows/plan'){state.workflows.find(w=>w.id===data.id).status=data.accepted?'completed':'cancelled';return send({ok:true});}
    if(url.pathname==='/api/providers/refresh')return send(state.providers[0]);
    return send({error:'Route de fixture inconnue'},404);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {url:'http://127.0.0.1:'+server.address().port,token:TOKEN,sessionId:'fixture-agent',secondProjectId:'second',stop:()=>new Promise(resolve=>server.close(resolve))};
}
async function main() {
  const external=!!process.env.ATELIER_MOBILE_TEST_URL;
  let fixture;
  if(external){
    fixture={url:process.env.ATELIER_MOBILE_TEST_URL,token:process.env.ATELIER_MOBILE_TEST_TOKEN,sessionId:process.env.ATELIER_MOBILE_TEST_SESSION,secondProjectId:process.env.ATELIER_MOBILE_TEST_SECOND_PROJECT,stop:async()=>{}};
    if(!fixture.token)throw new Error('Fixture token required.');
  }else fixture=await mockFixture();
  assert.equal(new URL(fixture.url).hostname,'127.0.0.1','Only isolated loopback recipes are allowed.');
  const evidence=path.join(ROOT,'.atelier','mobile-browser-evidence',external?'integration':'ui');fs.mkdirSync(evidence,{recursive:true});
  let browser,recipePage;
  const errors=[],mutations=[],externalRequests=[];
  try{
    let context,page;
    const electronPath=path.join(ROOT,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron');
    if(process.env.ATELIER_BROWSER_CHANNEL==='electron' || (!fs.existsSync(chromium.executablePath())&&fs.existsSync(electronPath))){
      const bootstrap=path.join(evidence,'electron-fixture.cjs');
      fs.writeFileSync(bootstrap,"const {app,BrowserWindow}=require('electron');app.setPath('userData',process.env.ATELIER_MOBILE_ELECTRON_PROFILE);app.whenReady().then(()=>{const win=new BrowserWindow({width:390,height:844,show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});win.loadURL('about:blank');});app.on('window-all-closed',()=>app.quit());");
      const env={...process.env,ATELIER_MOBILE_ELECTRON_PROFILE:path.join(evidence,'electron-profile')};delete env.ELECTRON_RUN_AS_NODE;
      browser=await _electron.launch({executablePath:electronPath,args:[bootstrap],env});
      context=browser.context();page=await browser.firstWindow();await page.setViewportSize({width:390,height:844});
    }else{
      const options={headless:true};if(process.env.ATELIER_BROWSER_CHANNEL)options.channel=process.env.ATELIER_BROWSER_CHANNEL;
      browser=await chromium.launch(options);context=await browser.newContext({viewport:{width:390,height:844}});page=await context.newPage();
    }
    recipePage=page;
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>{
      if(!request.url().startsWith(fixture.url+'/'))externalRequests.push(request.url());
      if(request.url().includes('/api/')){
        assert.equal(request.headers().authorization,'Bearer '+fixture.token,'Mobile JS authenticates API calls.');
        if(request.method()==='POST')mutations.push({path:new URL(request.url()).pathname,data:request.postDataJSON()});
      }
    });
    await page.route(fixture.url+'/mobile/',route=>route.continue({headers:{...route.request().headers(),Authorization:'Bearer '+fixture.token}}));
    await page.goto(fixture.url+'/mobile/');
    await page.getByText('● Connecté',{exact:true}).waitFor();
    const noOverflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),false,'No horizontal page overflow.');
    const nav=async label=>{await page.getByRole('button',{name:label,exact:true}).last().click();await noOverflow();};
    await noOverflow();await page.screenshot({path:path.join(evidence,'projects-390.png'),fullPage:true});
    await nav('Agents');await page.getByRole('button',{name:/Agent de recette fictive/}).click();
    await page.getByRole('heading',{name:'Permission demandée'}).waitFor();
    assert.ok((await page.locator('#content').innerText()).includes('—'),'Unknown metrics remain unknown.');
    await page.getByRole('button',{name:'Refuser',exact:true}).click();
    await page.getByRole('heading',{name:'Permission demandée'}).waitFor({state:'hidden'});
    if(!external){
      await page.getByLabel('Question fictive à identifiant arbitraire').fill('Ma réponse publique');
      assert.equal(await page.locator('.approval img').count(),0,'Arbitrary provider question IDs cannot inject HTML.');
      await page.getByRole('button',{name:'Transmettre mes réponses',exact:true}).click();
      await page.getByRole('heading',{name:'Réponse demandée'}).waitFor({state:'hidden'});
      assert.equal(mutations.find(m=>m.data.answers)?.data.answers[QUESTION_ID],'Ma réponse publique','Original provider question ID is preserved.');
    }
    await page.getByRole('button',{name:'← Agents',exact:true}).click();
    await page.getByRole('button',{name:'＋ Créer',exact:true}).click();
    await page.locator('#dialog [name="name"]').fill('Agent depuis le téléphone');
    assert.equal(await page.locator('#dialog [name="sandbox"]').last().inputValue(),'read-only');
    await page.locator('#dialog [name="model"]').selectOption('fixture-mobile-review');
    await page.locator('#dialog [name="effort"]').selectOption('high');
    await page.locator('#dialog [name="mission"]').fill('Recette fictive du téléphone');
    await page.getByRole('button',{name:'Créer sur le PC',exact:true}).click();
    await page.getByRole('heading',{name:'Agent depuis le téléphone',exact:true}).waitFor();
    const created=mutations.find(m=>m.path==='/api/sessions');
    assert.equal(created.data.model,'fixture-mobile-review');assert.equal(created.data.effort,'high');assert.equal(created.data.planMode,true);assert.equal(created.data.sandbox,'read-only');assert.equal(created.data.sendInitialMission,false);assert.equal(created.data.startWork,false);
    const draft='Prompt fictif depuis le téléphone';
    await page.locator('[data-form="prompt"] [name="text"]').fill(draft);
    await nav('Tâches');await nav('Agents');await page.getByRole('button',{name:/Agent depuis le téléphone/}).click();
    assert.equal(await page.locator('[data-form="prompt"] [name="text"]').inputValue(),draft,'Draft survives navigation.');
    await page.getByRole('button',{name:'Envoyer',exact:true}).click();
    await page.getByText(draft,{exact:true}).waitFor();
    await page.getByRole('button',{name:'Valider le plan',exact:true}).waitFor();
    await page.screenshot({path:path.join(evidence,'agent-390.png'),fullPage:true});
    await page.getByRole('button',{name:'Valider le plan',exact:true}).click();
    await nav('Fichiers');
    await page.getByRole('button',{name:/src/}).click();await page.getByRole('button',{name:/hello.txt/}).click();
    await page.getByText(/Bonjour depuis le répertoire/).waitFor();
    assert.equal(await page.evaluate(()=>!!window.mobileXss),false,'File content is escaped.');
    await page.screenshot({path:path.join(evidence,'file-390.png'),fullPage:true});
    await noOverflow();
    await page.getByLabel('Projet actif').selectOption(fixture.secondProjectId || 'second');
    await page.getByRole('button',{name:/autre.txt/}).waitFor();
    assert.equal(await page.locator('.source').count(),0,'Project switch clears previous file preview.');
    assert.equal(await page.getByRole('button',{name:/hello.txt/}).count(),0,'Previous project files are gone.');
    await page.getByRole('button',{name:/autre.txt/}).click();await page.getByText(/deuxième projet fictif/).waitFor();
    await page.getByLabel('Projet actif').selectOption('atelier');
    await page.getByRole('button',{name:/README.md/}).waitFor();
    assert.equal(await page.getByRole('button',{name:/\.env/}).count(),0,'Private files are absent.');
    const confined=await context.request.get(fixture.url+'/api/files?project=atelier&path=..%2Foutside',{headers:{Authorization:'Bearer '+fixture.token}});
    assert.equal(confined.status(),400,'Backend rejects traversal.');
    await nav('Tâches');await page.getByRole('button',{name:'＋ Ajouter',exact:true}).click();
    await page.getByLabel('Titre',{exact:true}).fill('Tâche mobile vérifiable');await page.getByLabel('Résultat attendu').fill('Vérifier les preuves publiques');
    await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
    await page.getByRole('button',{name:/Tâche mobile vérifiable/}).click();
    await page.locator('#dialog [name="status"]').selectOption('review');await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
    await page.locator('#content .tag.review').waitFor();
    assert.ok((await page.getByRole('button',{name:/Tâche mobile vérifiable/}).innerText()).includes('En revue'));
    await nav('Plus');await page.getByRole('button',{name:/Mémoire Noyau/}).click();await page.getByRole('button',{name:'＋ Ajouter',exact:true}).click();
    await page.getByLabel('Titre',{exact:true}).fill('Décision mobile fictive');await page.getByLabel('Souvenir',{exact:true}).fill('Décision de recette avec sa source.');await page.getByLabel('Source / preuve').fill('Fournisseur fictif · recette navigateur');
    await page.getByRole('button',{name:'Conserver',exact:true}).click();await page.getByRole('button',{name:/Décision mobile fictive/}).waitFor();
    await page.getByLabel('Rechercher un souvenir').fill('mobile fictive');assert.equal(await page.locator('#memories .card-button:visible').count(),1);
    await nav('Plus');await page.getByRole('button',{name:/Duplica Votre discussion/}).click();
    await page.locator('[data-form="duplica"] [name="model"]').selectOption('fixture-mobile-review');
    await page.getByLabel('Votre message à Duplica').fill('Bonjour Duplica fictif');
    await page.getByRole('button',{name:'Envoyer à Duplica',exact:true}).click();
    await page.locator('#content .message').filter({hasText:'Bonjour Duplica fictif'}).waitFor();
    const duplicaState=await (await context.request.get(fixture.url+'/api/state',{headers:{Authorization:'Bearer '+fixture.token}})).json();
    const duplica=duplicaState.sessions.find(s=>s.role==='duplica');assert.equal(duplica.sandbox,'read-only');assert.equal(duplica.model,'fixture-mobile-review');assert.equal(duplica.effort,'medium');assert.equal(duplica.executionMode,'chat');
    await page.screenshot({path:path.join(evidence,'duplica-390.png'),fullPage:true});
    await nav('Agents');await page.getByRole('button',{name:'＋ Créer',exact:true}).click();
    await page.locator('#dialog [name="mode"]').selectOption('orchestration');
    await page.locator('#dialog [name="name"]').fill('Équipe depuis le téléphone');await page.locator('#dialog [name="mission"]').fill('Mission équipe fictive');
    await page.locator('#dialog [name="worker0_name"]').fill('Vérificateur mobile');
    await page.getByRole('button',{name:'＋ Ajouter un spécialiste',exact:true}).click();
    await page.locator('#dialog [name="worker1_name"]').fill('Spécialiste mobile');
    await page.locator('#dialog [name="worker1_model"]').selectOption('fixture-mobile-review');
    await page.locator('#dialog [name="worker1_effort"]').selectOption('low');
    await page.getByRole('button',{name:'Créer sur le PC',exact:true}).click();
    await page.getByRole('heading',{name:'Équipe depuis le téléphone',exact:true}).waitFor();
    const team=mutations.find(m=>m.path==='/api/workflows');assert.equal(team.data.agents.workers.length,2);assert.equal(team.data.agents.workers[1].model,'fixture-mobile-review');assert.equal(team.data.agents.workers[1].effort,'low');assert.equal(team.data.planMode,true);
    for(const width of [390,300]){
      await page.setViewportSize({width,height:844});
      for(const name of ['Projets','Agents','Fichiers','Tâches','Plus']){await nav(name);await noOverflow();await page.screenshot({path:path.join(evidence,`${name.toLowerCase()}-${width}.png`),fullPage:true});}
    }
    // Simulate a connection loss after the service has already handled a mutation.
    // The client must surface uncertainty and must never retry the prompt automatically.
    await nav('Agents');await page.getByRole('button',{name:/Agent depuis le téléphone/}).click();
    let uncertaintyCalls=0;
    await page.route('**/api/sessions/prompt',async route=>{uncertaintyCalls++;await route.fetch();await route.abort('failed');});
    await page.locator('[data-form="prompt"] [name="text"]').fill('Mutation à ne pas rejouer');
    // Fake backend can still be waiting for a plan after an implementation turn.
    if(await page.getByRole('button',{name:'Valider le plan',exact:true}).count())await page.getByRole('button',{name:'Refuser',exact:true}).click();
    await page.getByRole('button',{name:'Envoyer',exact:true}).click();
    await page.locator('#notice.error').waitFor();await page.waitForTimeout(4500);assert.equal(uncertaintyCalls,1,'Failed mutations are never retried.');
    await page.unroute('**/api/sessions/prompt');
    await page.route('**/api/state',route=>route.abort('failed'));
    await page.getByRole('button',{name:'Actualiser',exact:true}).click();await page.getByText('○ Hors ligne',{exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Envoyer',exact:true}).isDisabled(),true,'Offline disables prompt submission.');
    await page.screenshot({path:path.join(evidence,'offline-300.png'),fullPage:true});
    assert.deepEqual(errors,[],'No browser errors.');assert.deepEqual(externalRequests,[],'No third-party requests.');
    const report={fixture:external?'real Application + FakeCodex + mobile gateway':'isolated HTTP provider mock',widths:[390,300],checks:['authenticated API','dynamic model and effort','read-only + on-request + plan default','agent creation','draft persistence','prompt and plan validation','approval refusal',...(!external?['provider question ID HTML escaped and answer preserved']:[]),'project file read','project switch','private files hidden','traversal blocked','task create/edit','memory create/filter','shared Duplica read-only discussion','two specialist team','no horizontal overflow','no mutation retry','offline state','no browser errors'],mutations:mutations.map(m=>m.path),screenshots:evidence};
    fs.writeFileSync(path.join(evidence,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  }catch(error){
    if(recipePage){await recipePage.screenshot({path:path.join(evidence,'failure.png'),fullPage:true});console.error((await recipePage.locator('body').innerText()).slice(-6000));}
    throw error;
  }finally{if(browser)await browser.close();await fixture.stop();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
