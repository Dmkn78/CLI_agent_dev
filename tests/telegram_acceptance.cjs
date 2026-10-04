const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const directory=path.resolve('.atelier/telegram-evidence');

async function verifyPairingUi(browser) {
  const context=await browser.newContext({viewport:{width:1500,height:980}});
  const page=await context.newPage(),errors=[],failedRequests=[],failedResponses=[],consoleErrors=[];
  page.on('pageerror',error => errors.push(error.message));
  page.on('requestfailed',request => failedRequests.push({url:request.url(),error:request.failure()?.errorText}));
  page.on('response',response => {if (!response.ok()) failedResponses.push({url:response.url(),status:response.status()});});
  page.on('console',message => {if (message.type() === 'error') consoleErrors.push(message.text());});
  page.setDefaultTimeout(10000);
  const response=await context.request.get('http://127.0.0.1:4336/api/state',{headers:{'X-Atelier-Token':'telegram-fixture-nonce'}});
  assert.ok(response.ok(),'Readonly fixture snapshot is available');
  const snapshot=await response.json();
  snapshot.duplica.telegram={configured:false,enabled:false,running:false,pairingPending:false};
  let pairingNumber=0,pairingResult={connected:false},releaseRenewal=null;
  const pairing=() => {
    const code='ui-fixture-code-'+(++pairingNumber);
    return {botUsername:'duplica_fixture_bot',pairingId:'ui-pairing-'+pairingNumber,pairingCode:code,
      projectId:'atelier',expiresAt:Date.now()+300000,deepLink:'https://t.me/duplica_fixture_bot?start='+code};
  };
  await page.route('**/api/**',async route => {
    const pathname=new URL(route.request().url()).pathname;
    let payload={};
    if (pathname === '/api/state') payload=snapshot;
    else if (pathname === '/api/commands') payload=[];
    else if (pathname === '/api/duplica/telegram/connect') {snapshot.duplica.telegram.pairingPending=true;payload=pairing();}
    else if (pathname === '/api/duplica/telegram/pair') payload=pairingResult;
    else if (pathname === '/api/duplica/telegram/renew') {
      payload=pairing();
      if (releaseRenewal) await releaseRenewal.promise;
    } else if (pathname === '/api/duplica/telegram/cancel') {snapshot.duplica.telegram.pairingPending=false;payload={cancelled:true};}
    else {await route.fulfill({status:500,json:{error:'Unexpected fictitious API route: '+pathname}});return;}
    await route.fulfill({json:payload});
  });
  try {
    await page.goto('http://127.0.0.1:4336/#duplica');
    await page.locator('[data-panel=telegram]').click();
    await page.getByLabel('Token fourni par BotFather',{exact:true}).fill('123456:abcdefghijklmnopqrstuv');
    await page.getByRole('button',{name:'Préparer la connexion',exact:false}).click();
    await page.locator('.telegram-qr svg').waitFor();
    const firstLink=await page.getByRole('link',{name:'Ouvrir dans Telegram'}).getAttribute('href');
    await page.getByRole('button',{name:'Renouveler',exact:true}).click();
    await page.waitForFunction(link => document.querySelector('.telegram-pairing a')?.href !== link,firstLink);
    for (const width of [900,390,300]) {
      await page.setViewportSize({width,height:980});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1),false,'No pairing overflow at '+width);
      assert.equal(await page.locator('.telegram-qr').evaluate(qr => qr.getBoundingClientRect().width <= qr.parentElement.getBoundingClientRect().width+1),true,'QR fits inside its card at '+width);
      await page.screenshot({path:path.join(directory,'telegram-pairing-'+width+'.png'),fullPage:true});
    }
    pairingResult={connected:false,expired:true};
    await page.getByText('Ce QR code a expiré',{exact:true}).waitFor();
    assert.equal(await page.locator('.telegram-qr').count(),0,'Expired code is removed');
    pairingResult={connected:false};
    await page.getByRole('button',{name:'Nouveau QR code',exact:true}).click();
    await page.locator('.telegram-qr svg').waitFor();
    await page.getByRole('button',{name:'Annuler',exact:true}).click();
    await page.locator('[name=botToken]').waitFor();
    assert.equal(await page.locator('.telegram-pairing').count(),0);
    await page.getByLabel('Token fourni par BotFather',{exact:true}).fill('123456:abcdefghijklmnopqrstuv');
    await page.getByRole('button',{name:'Préparer la connexion',exact:false}).click();
    await page.locator('.telegram-qr svg').waitFor();
    let finishRenewal;
    releaseRenewal={promise:new Promise(resolve => {finishRenewal=resolve;})};
    const renewalStarted=page.waitForRequest(request => request.url().endsWith('/api/duplica/telegram/renew'));
    await page.getByRole('button',{name:'Renouveler',exact:true}).click();
    await page.waitForFunction(() => document.querySelector('[data-action=telegram-renew]')?.disabled);
    await renewalStarted;
    await page.getByRole('button',{name:'Annuler',exact:true}).click();
    await page.locator('[name=botToken]').waitFor();
    const renewalResponse=page.waitForResponse(response => response.url().endsWith('/api/duplica/telegram/renew'));
    finishRenewal();
    await renewalResponse;
    await page.waitForTimeout(100);
    assert.equal(await page.locator('.telegram-pairing').count(),0,'A delayed renewal cannot restore a cancelled QR code');
    assert.equal(await page.locator('[name=botToken]').count(),1);
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(directory,'pairing-ui-result.json'),JSON.stringify({passed:true,interceptedApis:true,renewal:true,expiration:true,cancellation:true,delayedRenewal:true,widths:[900,390,300],errors},null,2));
    console.log('Pairing UI checks passed: renewal, expiration, cancellation, delayed response and small screens.');
  } catch (error) {
    const diagnostics={error:error.message,errors,failedRequests,failedResponses,consoleErrors,main:await page.locator('#main').innerText()};
    fs.writeFileSync(path.join(directory,'pairing-ui-failure.json'),JSON.stringify(diagnostics,null,2));
    console.error(JSON.stringify(diagnostics));
    await page.screenshot({path:path.join(directory,'pairing-ui-failure.png'),fullPage:true});throw error;
  } finally {await context.close();}
}

async function main() {
  fs.mkdirSync(directory,{recursive:true});
  const browser=await chromium.launch({headless:true,channel:process.env.ATELIER_BROWSER_CHANNEL || 'chrome'});
  const page=await browser.newPage({viewport:{width:1500,height:980}}),errors=[];
  page.on('pageerror',error => errors.push(error.message));
  page.setDefaultTimeout(15000);
  try {
    await verifyPairingUi(browser);
    if (process.argv.includes('--pairing-ui-only')) return;
    await page.goto('http://127.0.0.1:4336/#overview');
    await page.waitForFunction(() => state.sessions.length >= 4);
    await page.keyboard.press('Control+0');
    await page.keyboard.press('Control+-');
    await page.waitForFunction(() => appZoom === 90);
    await page.keyboard.press('Control+-');
    await page.waitForFunction(() => appZoom === 80);
    await page.reload();
    await page.waitForFunction(() => state.sessions.length >= 4);
    assert.equal(await page.evaluate(() => appZoom),80);
    await page.keyboard.press('Control+0');
    await page.waitForFunction(() => appZoom === 100);
    const initial=Number(await page.locator('.graph-canvas').getAttribute('data-zoom'));
    await page.getByRole('button',{name:'Dézoomer le graphe',exact:true}).click();
    assert.ok(Number(await page.locator('.graph-canvas').getAttribute('data-zoom')) < initial);
    await page.getByRole('button',{name:'Ajuster',exact:true}).click();
    const graphFits=await page.locator('.graph-scroll').evaluate(element => element.scrollWidth <= element.clientWidth+1 && element.scrollHeight <= element.clientHeight+1);
    assert.equal(graphFits,true,'Fit displays the complete graph');
    const tasks=await page.locator('.cockpit-bottom').boundingBox();
    assert.ok(tasks.y < 850,'Activity and tasks are visible below a bounded graph');
    await page.screenshot({path:path.join(directory,'overview.png'),fullPage:true});
    await page.evaluate(() => route('duplica'));
    await page.locator('[data-panel=telegram]').click();
    assert.ok((await page.locator('.telegram-steps').innerText()).includes('/newbot'));
    await page.screenshot({path:path.join(directory,'telegram-setup.png'),fullPage:true});
    await page.getByLabel('Token fourni par BotFather',{exact:true}).fill('123456:abcdefghijklmnopqrstuv');
    await page.getByRole('button',{name:'Préparer la connexion',exact:false}).click();
    await page.locator('.telegram-qr svg').waitFor();
    const link=await page.getByRole('link',{name:'Ouvrir dans Telegram'}).getAttribute('href');
    assert.ok(link.startsWith('https://t.me/duplica_fixture_bot?start='));
    assert.ok(!link.includes('abcdefghijklmnopqrstuv'));
    await page.locator('.telegram-qr').screenshot({path:path.join(directory,'pairing-qr.png')});
    fs.writeFileSync(path.join(directory,'pairing-link.txt'),link);
    await page.screenshot({path:path.join(directory,'telegram-pairing.png'),fullPage:true});
    const code=new URL(link).searchParams.get('start');
    await page.evaluate(text => api('fixture/telegram',{text,chatId:43}),'/start incorrect');
    await page.waitForTimeout(2000);
    assert.equal(await page.locator('.telegram-qr').count(),1);
    await page.evaluate(text => api('fixture/telegram',{text}),'/start '+code);
    await page.locator('.telegram-connected').waitFor();
    assert.equal(await page.locator('[name=telegramSandbox]').inputValue(),'read-only');
    await page.evaluate(() => api('fixture/telegram',{text:'Bonjour depuis Telegram'}));
    await page.waitForFunction(() => state.duplica.discussion.deliveries.some(delivery => delivery.source === 'telegram' && delivery.status === 'completed'));
    await page.waitForFunction(async () => (await api('fixture/telegram')).sent.some(message => message.text === 'ok'));
    await page.getByRole('button',{name:'Discussion dans Atelier',exact:true}).click();
    await page.getByText('Bonjour depuis Telegram',{exact:true}).waitFor();
    assert.ok((await page.locator('.duplica-chat-history').innerText()).includes('Vous · Telegram'));
    await page.getByLabel('Message à Duplica').fill('Continue cette discussion dans Atelier');
    await page.getByRole('button',{name:'Envoyer à Duplica',exact:true}).click();
    await page.waitForFunction(() => state.duplica.discussion.deliveries.at(-1)?.status === 'completed');
    assert.equal(await page.evaluate(() => state.duplica.discussion.conversations.length),1);
    await page.locator('[data-panel=telegram]').click();
    await page.locator('[name=telegramSandbox]').selectOption('workspace-write');
    await page.waitForTimeout(2000);
    assert.equal(await page.locator('[name=telegramSandbox]').inputValue(),'workspace-write','Refresh preserves unsaved choices');
    await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
    await page.waitForFunction(() => state.duplica.telegram.workSandbox === 'workspace-write');
    await page.evaluate(() => api('fixture/telegram',{text:'/work Préparer les fichiers de recette'}));
    await page.waitForFunction(() => state.duplica.missions.length > 0 &&
      state.sessions.some(session => session.id === state.duplica.settings.telegramSessionId));
    const mission=await page.evaluate(() => state.sessions.find(session => session.id === state.duplica.settings.telegramSessionId));
    assert.equal(mission.sandbox,'workspace-write');
    await page.locator('[name=telegramProject]').selectOption('fixture-other');
    assert.equal(await page.locator('[name=telegramSandbox]').inputValue(),'read-only');
    await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
    await page.waitForFunction(() => state.duplica.telegram.projectId === 'fixture-other');
    assert.equal(await page.evaluate(() => state.duplica.telegram.workSandbox),'read-only');
    await page.screenshot({path:path.join(directory,'telegram-connected.png'),fullPage:true});
    await page.getByRole('button',{name:'Mettre le relais en pause',exact:true}).click();
    await page.waitForFunction(() => !state.duplica.telegram.enabled);
    await page.getByRole('button',{name:'Activer le relais',exact:true}).click();
    await page.waitForFunction(() => state.duplica.telegram.running && state.duplica.telegram.enabled);
    for (const width of [1500,900,390,300]) {
      await page.setViewportSize({width,height:980});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1),false,'No connected view overflow at '+width);
      await page.screenshot({path:path.join(directory,'telegram-connected-'+width+'.png'),fullPage:true});
    }
    await page.setViewportSize({width:1500,height:980});
    await page.getByRole('button',{name:'Dissocier le bot',exact:true}).click();
    await page.locator('[name=botToken]').waitFor();
    for (const width of [900,390,300]) {
      await page.setViewportSize({width,height:980});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1),false,'No setup overflow at '+width);
      await page.screenshot({path:path.join(directory,'telegram-setup-'+width+'.png'),fullPage:true});
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(directory,'browser-result.json'),JSON.stringify({passed:true,fixture:true,externalCalls:false,appZoom:true,graphFit:true,pairing:true,sharedDiscussion:true,scopedWork:true,pauseResumeDisconnect:true,widths:[1500,900,390,300],errors},null,2));
    console.log('Telegram/display acceptance passed: zoom, graph fit, QR pairing, shared discussion, work permissions, pause/resume/disconnect, responsive layout.');
  } catch (error) {await page.screenshot({path:path.join(directory,'failure.png'),fullPage:true});throw error;}
  finally {await browser.close();}
}
main().catch(error => {console.error(error);process.exitCode=1;});
