const {_electron} = require('playwright');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');

async function requests() {
  const response = await fetch('http://127.0.0.1:4339/fixture/requests');
  return (await response.json()).requests;
}

async function main() {
  const browser = await _electron.launch({executablePath:require('electron'),args:[path.resolve('tests/channels_feedback_window.cjs')]});
  const page = await browser.firstWindow(), errors = [];
  await page.setViewportSize({width:1500,height:1000});
  const evidence = path.resolve('.atelier/api-connection-evidence');
  fs.mkdirSync(evidence,{recursive:true});
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto('http://127.0.0.1:4338/#settings');
    await page.getByRole('button',{name:'Ajouter une API',exact:true}).click();
    for (const [preset,port] of [['omlx',8000],['splash',8001],['lmstudio',1234]]) {
      await page.getByLabel(/^Serveur/).selectOption(preset);
      assert.equal(await page.getByLabel('URL de base',{exact:true}).inputValue(),`http://127.0.0.1:${port}/v1`);
    }
    assert.deepEqual(await requests(),[]);
    await page.getByLabel('Nom de la connexion',{exact:true}).fill('LM Studio fictif');
    await page.getByLabel('URL de base',{exact:true}).fill('http://127.0.0.1:4339/v1/models');
    assert.ok(await page.getByLabel('Lire le catalogue à l’enregistrement, sans génération').isChecked());
    await page.getByRole('button',{name:'Enregistrer la connexion',exact:true}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    await page.waitForFunction(() => state.apiConnections.some(c => c.name === 'LM Studio fictif' && c.catalogReadAt));
    let snapshot = await page.evaluate(() => api('state'));
    const connection = snapshot.apiConnections.find(c => c.name === 'LM Studio fictif');
    assert.equal(connection.baseUrl,'http://127.0.0.1:4339/v1');
    assert.deepEqual(connection.models.map(m => m.model),['fixture-chat']);
    assert.equal(connection.excludedModels[0].model,'fixture-embedding');
    assert.equal(connection.models[0].modelType,'chat');
    assert.equal(connection.lastReplyAt,null);
    assert.deepEqual((await requests()).map(request => [request[0],request[1]]),[['/v1/models',null],['/api/v1/models',null]]);
    await page.locator('.api-connections details summary').click();
    await page.getByText('Embedding · hors canal · non chargé',{exact:true}).waitFor();
    await page.getByText('Génération à vérifier lors du premier échange',{exact:true}).waitFor();
    await page.screenshot({path:path.join(evidence,'api-catalog-desktop.png'),fullPage:true});

    await page.getByRole('button',{name:'Ajouter une API',exact:true}).click();
    await page.getByLabel(/^Serveur/).selectOption('custom');
    await page.getByLabel('Nom de la connexion',{exact:true}).fill('Connexion hors ligne fictive');
    await page.getByLabel('URL de base',{exact:true}).fill('http://127.0.0.1:4339');
    await page.getByLabel('Identifiants des modèles (un par ligne)',{exact:true}).fill('fixture-chat');
    await page.getByLabel('Lire le catalogue à l’enregistrement, sans génération').uncheck();
    await page.getByRole('button',{name:'Enregistrer la connexion',exact:true}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    await page.waitForFunction(() => state.apiConnections.some(c => c.name === 'Connexion hors ligne fictive'));
    assert.equal((await requests()).length,2);

    const channelId = await page.evaluate(async connectionId => {
      const channel = await api('channels',{name:'Test réponse API fictive',topic:'Préparer un plan public fictif',maxRounds:1});
      await api('channels/participants',{id:channel.id,name:'LLM fictif',role:'agent',
        configuration:{runtime:'api',connectionId,model:'fixture-chat'}});
      await api('channels/start',{id:channel.id});
      return channel.id;
    },connection.id);
    await page.waitForFunction(id => state.discussions.channels.some(c => c.id === id && c.status === 'ready_for_review'),channelId);
    await page.evaluate(() => refresh(true));
    await page.getByText('Réponse reçue avec fixture-chat',{exact:true}).waitFor();
    snapshot = await page.evaluate(() => api('state'));
    const replies = (await requests()).filter(request => request[1] !== null);
    assert.equal(replies.length,2);
    assert.ok(replies.every(request => request[0] === '/v1/chat/completions' && request[1].model === 'fixture-chat'));
    assert.ok(snapshot.apiConnections.find(c => c.id === connection.id).lastReplyAt);
    assert.ok(!JSON.stringify(snapshot.discussions).includes('private fixture thought'));
    for (const width of [1500,390]) {
      await page.setViewportSize({width,height:1000});
      await page.screenshot({path:path.join(evidence,`api-response-${width}.png`),fullPage:true});
      const dimensions = await page.evaluate(() => ({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(dimensions.scroll <= dimensions.client + 1,JSON.stringify(dimensions));
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(evidence,'browser-result.json'),JSON.stringify({ok:true,presets:['lmstudio','omlx','splash'],catalogRequests:2,excludedEmbedding:true,offlineSave:true,fakeReplies:2,errors},null,2));
    console.log('API connection browser acceptance passed');
  } finally { await browser.close(); }
}
main().catch(error => {console.error(error);process.exitCode=1;});
