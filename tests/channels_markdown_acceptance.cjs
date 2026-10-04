const {chromium,_electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');

async function main() {
  const browser=process.env.ATELIER_BROWSER_CHANNEL ? await chromium.launch({headless:true,channel:process.env.ATELIER_BROWSER_CHANNEL}) : await _electron.launch({executablePath:require('electron'),args:[path.resolve('tests/channels_feedback_window.cjs')]});
  const page=process.env.ATELIER_BROWSER_CHANNEL ? await browser.newPage() : await browser.firstWindow(),errors=[];
  await page.setViewportSize({width:1500,height:1000});
  page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(12000);
  const evidence=path.resolve('.atelier/channel-markdown-evidence');fs.mkdirSync(evidence,{recursive:true});
  try {
    await page.goto((process.env.ATELIER_TEST_URL || 'http://127.0.0.1:4336')+'/#channels');
    if(await page.getByRole('button',{name:'Créer mon premier canal',exact:true}).count()) await page.getByRole('button',{name:'Créer mon premier canal',exact:true}).click();
    else await page.evaluate(()=>channelModal());
    await page.getByLabel('Nom du canal').fill('Skills · recette fictive');
    await page.getByLabel('Sujet et résultat attendu').fill('Validation de la sélection explicite des sources, sans inférence.');
    await page.getByRole('button',{name:'Créer le canal',exact:true}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    await page.getByRole('button',{name:'Inviter',exact:true}).click();
    await page.getByLabel('Nom du participant').fill('Explorateur avec méthode');
    await page.getByText('Skills et consignes du participant',{exact:true}).click();
    const skill=page.locator('[name="skills"][value="skills/atelier-ui-explorer/SKILL.md"]');
    await skill.check();
    await page.screenshot({path:path.join(evidence,'skill-invitation.png'),fullPage:true});
    await page.getByRole('button',{name:'Ajouter le participant',exact:true}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    await page.locator('.channel-instruction-sources summary').click();
    const sources=await page.evaluate(()=>state.discussions.participants[0].instructionSources);
    assert.equal(sources.length,1);assert.equal(sources[0].path,'skills/atelier-ui-explorer/SKILL.md');assert.match(sources[0].sha256,/^[a-f0-9]{64}$/);assert.ok(sources[0].characters>0);
    assert.ok((await page.locator('.channel-instruction-sources').innerText()).includes(sources[0].sha256));
    await page.screenshot({path:path.join(evidence,'skill-source.png'),fullPage:true});
    await page.reload();await page.locator('.channel-instruction-sources summary').waitFor();
    assert.deepEqual(await page.evaluate(()=>state.discussions.participants[0].instructionSources),sources);
    assert.equal(await page.evaluate(()=>state.discussions.messages.length),0);

    // Public messages below are browser fixture data only: no provider is called.
    const rich='# Analyse lisible\n\n**Priorité** et *nuance*, [documentation](https://example.test/?a=1&b=2).\n\n3. Vérifier\n   - Un sous-point\n4. Relire\n\n> Une citation **publique**.\n\n| Choix | Avis |\n| --- | --- |\n| API | **Locale** |\n\n```html\n<img src=x onerror="window.markdownXss=true">\n'+('long-code-'.repeat(30))+'\n```\n\n<img src=x onerror="window.markdownXss=true">\n\n[Piège](javascript:alert)\n\n![Image externe](https://example.test/tracker.png)';
    const fixture=await page.evaluate(({rich,sources})=>{
      const participants=Array.from({length:8},(_,index)=>({id:'markdown-peer-'+index,channelId:'markdown-channel',name:index<6?'Spécialiste '+(index+1):index===6?'Consultant local':'Duplica',role:index===5?'critic':index===6?'consultant':index===7?'duplica':'agent',configuration:{runtime:'codex',model:'fixture-code',effort:'medium'},instructionSources:index===0?sources:[]}));
      return {channels:[{id:'markdown-channel',projectId:projectId,name:'Markdown et identités · données fictives',topic:'Tous les messages publics restent consultables.',status:'ready_for_review',maxRounds:1,contextProjection:{truncated:true,totalMessages:8,includedMessages:5,excerptMessageIds:['message-0'],omittedUserMessageIds:[]},plan:'# Plan proposé\n\n- **Relire** les sources\n- Vérifier `local`'}],participants,messages:participants.map((participant,index)=>({id:'message-'+index,channelId:'markdown-channel',participantId:participant.id,author:participant.name,role:participant.role,text:index===0?rich:'**Avis public** de '+participant.name+' : une contribution lisible.',createdAt:'2026-10-03T10:00:00Z'})),rounds:[]};
    },{rich,sources});
    await page.route('**/api/state',async route=>{const response=await route.fetch(),data=await response.json();data.discussions=fixture;await route.fulfill({response,json:data});});
    await page.evaluate(()=>refresh(true));
    await page.locator('.channel-message .message-markdown h3').waitFor();
    const first=page.locator('.channel-message').first();
    assert.equal(await first.locator('h3').innerText(),'Analyse lisible');
    assert.equal(await first.locator('ol').getAttribute('start'),'3');assert.equal(await first.locator('ol ul li').count(),1);
    assert.equal(await first.locator('blockquote strong').innerText(),'publique');assert.equal(await first.locator('table tbody td').nth(1).innerText(),'Locale');
    assert.equal(await first.locator('a').count(),1);assert.equal(await first.locator('a').getAttribute('rel'),'noopener noreferrer');
    assert.equal(await first.locator('img,script,iframe').count(),0);assert.equal(await page.evaluate(()=>window.markdownXss),undefined);
    assert.equal(await page.locator('.channel-plan-content h3').innerText(),'Plan proposé');assert.equal(await page.locator('.channel-plan-content li strong').innerText(),'Relire');
    assert.ok((await page.locator('.channel-context-note').innerText()).includes('5/8 messages transmis, 1 extrait partiel'));
    assert.equal(await page.locator('.channel-participant[data-participant-id="markdown-peer-5"]>div>span').innerText(),'Questionneur / contradicteur');
    await page.locator('.channel-activity[data-channel-activity="markdown-peer-0"] summary').click();
    assert.equal(await page.locator('.channel-activity-reply h3').first().innerText(),'Analyse lisible');
    const identities=()=>page.evaluate(()=>Object.fromEntries([...document.querySelectorAll('.channel-participant')].map(element=>[element.dataset.participantId,getComputedStyle(element.querySelector('strong')).color])));
    const colors=await identities();assert.equal(new Set(Object.values(colors)).size,8);
    for(const [id,color] of Object.entries(colors)) assert.equal(await page.locator('.channel-message[data-participant-id="'+id+'"] header strong').evaluate(element=>getComputedStyle(element).color),color);
    fixture.participants.reverse();await page.evaluate(()=>refresh(true));assert.deepEqual(await identities(),colors);
    await page.reload();await page.locator('.channel-message').nth(7).waitFor();assert.deepEqual(await identities(),colors);
    for(const width of [1500,1100,800,390,300]) {
      await page.setViewportSize({width,height:1000});
      await page.locator('.channel-transcript').evaluate(element=>{element.scrollTop=0;element.scrollLeft=0;});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+1),'Page overflow at '+width);
      const sizes=await page.evaluate(()=>Object.fromEntries(['#main','.channel-thread','.channel-transcript','.channel-compose','.channel-plan'].map(selector=>{const element=document.querySelector(selector);return [selector,{client:element.clientWidth,scroll:element.scrollWidth}];})));
      assert.ok(sizes['#main'].scroll <= sizes['#main'].client+1,'Main overflow at '+width+': '+JSON.stringify(sizes));
      assert.ok(sizes['.channel-transcript'].scroll <= sizes['.channel-transcript'].client+1,'Transcript overflow at '+width+': '+JSON.stringify(sizes));
      await page.screenshot({path:path.join(evidence,'markdown-'+width+'.png'),fullPage:true});
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(evidence,'result.json'),JSON.stringify({status:'passed',fixtureOnly:true,realInference:false,skills:{selection:'passed',metadata:'passed',reload:'passed',sources},markdown:['headings','bold','italic','safe-links','nested-ordered-lists','quotes','tables','literal-html','code','plan','activity'],identities:colors,widths:[1500,1100,800,390,300],pageErrors:errors},null,2));
    console.log('Channels Markdown browser acceptance passed: skill selection/source persistence, safe Markdown, 8 stable distinct identities, 5 widths. No provider inference.');
  } catch(error) {await page.screenshot({path:path.join(evidence,'failure.png'),fullPage:true});throw error;}
  finally {await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
