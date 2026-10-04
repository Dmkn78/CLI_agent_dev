const {_electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
async function main() {
  const browser=await _electron.launch({executablePath:require('electron'),args:[path.resolve('tests/channels_feedback_window.cjs')]});
  const page=await browser.firstWindow(),errors=[],historyRequests=[];
  await page.setViewportSize({width:1500,height:1000});page.setDefaultTimeout(15000);
  page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(request.url().includes('/api/channels/history')) historyRequests.push(request.url());});
  const evidence=path.resolve('.atelier/channel-history-evidence');fs.mkdirSync(evidence,{recursive:true});
  const position=()=>page.evaluate(()=>channelHistoryPosition(state.discussions.channels.find(channel=>channel.id===selectedChannelId)));
  const top=()=>page.locator('.channel-transcript').evaluate(element=>element.scrollTop=0);
  const options=()=>page.getByRole('button',{name:'Options du canal',exact:true}).click();
  const stabilizeCapture=()=>page.addStyleTag({content:'html { scrollbar-gutter: stable; }'});
  const save=async()=>{await page.getByRole('button',{name:'Enregistrer les options',exact:true}).click();await page.locator('#modal').waitFor({state:'hidden'});};
  try {
    await page.goto((process.env.ATELIER_TEST_URL || 'http://127.0.0.1:4342')+'/#channels');
    await stabilizeCapture();
    await page.getByRole('heading',{name:'Canaux',exact:true}).waitFor();
    assert.equal((await position()).messages.length,120);assert.equal((await position()).total,650);
    assert.equal(await page.locator('.channel-recovered-reply').innerText(),'Réponse récupérée d’une session finalisée');
    await options();assert.equal(await page.getByLabel('Tours maximum par lancement').inputValue(),'24');
    assert.equal(await page.getByLabel('Tours maximum par lancement').getAttribute('max'),null);
    await page.getByLabel('Tours maximum par lancement').fill('120');await save();
    await page.waitForFunction(()=>state.discussions.channels[0].autoRoundLimit===120);
    assert.ok((await page.locator('.channel-header').innerText()).includes('120 tours maximum par lancement'));
    await options();await page.getByLabel('Plafond de la discussion').selectOption('unlimited');
    assert.equal(await page.getByLabel('Tours maximum par lancement').isDisabled(),true);await save();
    await page.waitForFunction(()=>state.discussions.channels[0].autoRoundLimit===null);
    assert.ok((await page.locator('.channel-header').innerText()).includes('sans plafond de tours'));
    await page.reload();await stabilizeCapture();await page.locator('.channel-header').waitFor();await options();
    assert.equal(await page.getByLabel('Plafond de la discussion').inputValue(),'unlimited');
    await page.getByLabel('Fin de la discussion').selectOption('fixed');
    assert.equal(await page.getByLabel('Tours de discussion maximum').getAttribute('max'),null);
    await page.getByLabel('Tours de discussion maximum').fill('99');await save();
    await page.waitForFunction(()=>state.discussions.channels[0].maxRounds===99);
    await options();await page.getByLabel('Tours de discussion maximum').fill('1');await save();

    let release;const gate=new Promise(resolve=>release=resolve),pattern=/\/api\/channels\/history\?/;
    const held=async route=>{await gate;await route.continue();};await page.route(pattern,held);
    await top();await page.getByRole('button',{name:'Messages précédents',exact:true}).click();
    await page.waitForFunction(()=>channelHistoryEntry(selectedChannelId).loading);
    assert.equal(await page.getByRole('button',{name:'Derniers échanges',exact:true}).isDisabled(),true);
    await page.evaluate(()=>showChannelLatest(selectedChannelId));
    const resumedResponse=page.waitForResponse(response=>response.url().includes('/api/channels/history'));
    release();await resumedResponse;await page.unroute(pattern,held);
    await page.waitForFunction(()=>channelHistoryEntry(selectedChannelId).mode==='latest' && channelHistoryPosition(state.discussions.channels[0]).messages.length===120);

    await top();const anchor=await page.evaluate(()=>channelScrollAnchor(selectedChannelId));
    await page.getByRole('button',{name:'Messages précédents',exact:true}).click();
    await page.waitForFunction(()=>document.querySelectorAll('.channel-message').length===170);
    const shifted=await page.locator('[data-message-id="'+anchor.messageId+'"]').evaluate(element=>element.getBoundingClientRect().top-element.closest('.channel-transcript').getBoundingClientRect().top);
    assert.ok(Math.abs(shifted-anchor.offset)<2,'Prepend moved the reading anchor');
    await page.evaluate(()=>refresh(true));assert.equal((await position()).messages.length,170);
    await page.locator('.channel-transcript').evaluate(element=>element.scrollTop+=450);
    const reading=await page.evaluate(()=>channelScrollAnchor(selectedChannelId));
    await page.waitForFunction(id=>JSON.parse(localStorage.getItem(channelHistoryStorageKey(selectedChannelId)) || '{}').anchor?.messageId===id,reading.messageId);
    const requestCount=historyRequests.length;await page.reload();await stabilizeCapture();
    await page.waitForFunction(()=>document.querySelectorAll('.channel-message').length===170);
    await page.waitForFunction(()=>!channelHistoryEntry(selectedChannelId).pendingAnchor && !channelHistoryEntry(selectedChannelId).loading);
    assert.ok(historyRequests.length-requestCount<=4,'Reload fetched an unbounded archive');
    const reloadRequests=historyRequests.length-requestCount;
    const restored=await page.locator('[data-message-id="'+reading.messageId+'"]').evaluate(element=>element.getBoundingClientRect().top-element.closest('.channel-transcript').getBoundingClientRect().top);
    assert.ok(Math.abs(restored-reading.offset)<2,'Reload moved the reading anchor');
    while((await position()).first>1) {
      const previous=(await position()).first;await top();await page.getByRole('button',{name:'Messages précédents',exact:true}).click();
      await page.waitForFunction(first=>channelHistoryPosition(state.discussions.channels[0]).first<first,previous);
      assert.ok((await position()).messages.length<=300);
    }
    assert.equal(await page.locator('.channel-message h3').first().innerText(),'Message public fictif 0001');
    assert.equal((await position()).last,300);
    await top();await page.screenshot({path:path.join(evidence,'archive-oldest.png'),fullPage:true,animations:'disabled'});
    await top();await page.getByRole('button',{name:'Messages plus récents',exact:true}).click();
    await page.waitForFunction(()=>channelHistoryPosition(state.discussions.channels[0]).last===350);
    assert.equal((await position()).first,51);assert.equal((await position()).messages.length,300);
    await page.evaluate(()=>refresh(true));assert.equal((await position()).first,51);
    await top();await page.getByRole('button',{name:'Derniers échanges',exact:true}).click();
    await page.waitForFunction(()=>channelHistoryPosition(state.discussions.channels[0]).last===650);
    await page.getByRole('button',{name:'Reprendre la discussion',exact:true}).click();
    await page.waitForFunction(()=>state.discussions.channels[0].status==='ready_for_review');
    const final=await page.evaluate(()=>state.discussions.channels[0]);
    assert.equal(final.history.messageCount,652);assert.equal((await position()).last,652);
    const oldest=await page.evaluate(()=>api('channels/history?id='+selectedChannelId+'&before=2&limit=1'));
    assert.equal(oldest.messages[0].sequence,1);assert.ok(oldest.messages[0].text.includes('0001'));
    await page.waitForFunction(()=>document.querySelectorAll('#toasts .toast').length===0);
    const layoutEvidence={};
    for(const width of [1500,900,390,300]) {
      await page.setViewportSize({width,height:1000});await top();
      const layout=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,panels:Object.fromEntries(['#main','.channel-room','.channel-thread','.channel-transcript','.channel-participants','.channel-workflow-note','.channel-public-note','.channel-history-controls','.channel-compose'].map(selector=>{const element=document.querySelector(selector),rect=element.getBoundingClientRect();return [selector,{client:element.clientWidth,scroll:element.scrollWidth,left:rect.left,right:rect.right}];}))}));
      for(const [selector,panel] of Object.entries(layout.panels)) assert.ok(panel.scroll<=panel.client+1 && panel.left>=0 && panel.right<=layout.viewport+1,'Clipped '+selector+' at '+width+': '+JSON.stringify(panel));
      layoutEvidence[width]=layout;
      await page.screenshot({path:path.join(evidence,'history-'+width+'.png'),fullPage:true,animations:'disabled'});
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(evidence,'result.json'),JSON.stringify({status:'passed',fixtureOnly:true,realInference:false,initialArchive:650,finalArchive:652,windowMaximum:300,charactersMaximum:480000,paging:['before','after','latest'],reloadRequests,asyncLatest:'obsolete page ignored; controls disabled',limits:{oldDefault:24,auto:120,fixed:99,unlimited:null},scroll:{prepend:'preserved',reload:'preserved'},resume:'same channel',widths:[1500,900,390,300],captureScrollbarGutter:'stable in fixture to avoid Electron fullPage relayout',layoutEvidence,pageErrors:errors},null,2));
    console.log('Channel history browser acceptance passed: 650-message archive, bounded 300-message window, older/newer/latest, preserved scroll and bounded reload, unrestricted limits, same-channel fake resume.');
  } catch(error) {await page.screenshot({path:path.join(evidence,'failure.png'),fullPage:true});throw error;}
  finally {await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
