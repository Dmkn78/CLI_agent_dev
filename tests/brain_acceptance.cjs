const {chromium,_electron} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const evidence = path.resolve('.atelier/brain-browser-evidence');
  const fixture = JSON.parse(fs.readFileSync(path.join(evidence,'fixture.json'),'utf8'));
  assert.equal(fixture.fixture,true);
  let browser, page, application;
  if (process.env.ATELIER_BRAIN_ELECTRON === '1') {
    const env = {...process.env,ATELIER_BRAIN_TEST_URL:fixture.url,
      ATELIER_BRAIN_TEST_PROFILE:path.join(evidence,'profile-'+Date.now())};
    delete env.ELECTRON_RUN_AS_NODE;
    application = await _electron.launch({executablePath:require('electron'),args:[path.resolve('tests/brain_window.cjs')],env});
    page = await application.firstWindow();
    browser = {close:() => application.close()};
  } else {
    browser = await chromium.launch({headless:true,...(process.env.ATELIER_BROWSER_CHANNEL ? {channel:process.env.ATELIER_BROWSER_CHANNEL} : {})});
    page = await browser.newPage({viewport:{width:1500,height:1000}});
  }
  const errors = [], failures = [], configurationRequests = [];
  page.on('request', request => {if (request.url().endsWith('/api/brain/configure')) configurationRequests.push(request.postDataJSON());});
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => failures.push(request.url()));
  page.setDefaultTimeout(15000);
  try {
    await page.goto(fixture.url+'#brain');
    await page.getByRole('heading',{name:'My Brain',exact:true}).waitFor();
    await page.screenshot({path:path.join(evidence,'01-empty.png'),fullPage:true});
    await page.getByRole('button',{name:'Configurer',exact:true}).click();
    const modal = page.getByRole('dialog');
    await modal.getByLabel('URL de base du LLM',{exact:true}).fill(fixture.apiUrl+'/v1');
    await modal.getByRole('button',{name:'Lire le catalogue',exact:true}).click();
    await modal.getByLabel('Modèle local',{exact:true}).selectOption('fixture-brain-local');
    await modal.locator('.brain-folder-field').filter({has:page.getByLabel('Chemin du coffre Obsidian my_brain',{exact:true})}).getByRole('button',{name:'Choisir',exact:true}).click();
    await page.waitForFunction(vault => document.querySelector('[name="vaultPath"]').value === vault,fixture.vaultPath);
    await modal.getByLabel('Dossier d’arrivée des audio et .txt',{exact:true}).fill(fixture.inputPath);
    await modal.getByLabel('URL complète de transcription audio',{exact:true}).fill(fixture.apiUrl+'/v1/audio/transcriptions');
    await modal.getByLabel('Identifiant ASR attendu par votre serveur',{exact:true}).fill('fixture-asr-local');
    await modal.getByText('Ajouter des repères personnalisés (facultatif)',{exact:true}).click();
    await modal.getByLabel('Glossaire de noms et termes',{exact:true}).fill('Obsidian, my_brain');
    assert.equal(await modal.getByLabel('Modèle local',{exact:true}).inputValue(),'fixture-brain-local');
    await modal.getByRole('button',{name:'Enregistrer le workflow',exact:true}).click();
    await modal.waitFor({state:'hidden'});
    const original = 'Mon obsidienne garde ma mémoire. RLCD est ambigu. <script>window.brainInjected=true</script>';
    await page.getByLabel('Ou coller une transcription',{exact:true}).fill(original);
    await page.getByRole('button',{name:'Traiter la dictée',exact:true}).click();
    await page.locator('.brain-preview-header .brain-status.review').waitFor();
    await page.waitForFunction(() => Boolean(brainDetail?.result));
    assert.ok((await page.locator('.brain-note-body').innerText()).includes('Mon obsidienne'));
    assert.ok(await page.getByText('Contexte retrouvé automatiquement · 1 note(s)',{exact:true}).isVisible());
    assert.equal(await page.evaluate(() => window.brainInjected),undefined);
    assert.equal(await page.getByRole('button',{name:'Créer dans Obsidian',exact:true}).isDisabled(),true);
    await page.getByRole('button',{name:'Texte brut',exact:true}).click();
    assert.equal(await page.locator('.brain-note-body').innerText(),original);
    await page.getByRole('button',{name:'Note + YAML',exact:true}).click();
    assert.ok((await page.locator('.brain-yaml').innerText()).includes("topics:\n  - 'mémoire'\n  - 'Obsidian'"));
    assert.ok((await page.locator('.brain-yaml').innerText()).includes('## Transcription originale'));
    await page.screenshot({path:path.join(evidence,'02-yaml.png'),fullPage:true});
    assert.deepEqual(fs.readdirSync(fixture.vaultPath),['projet.md']);
    await page.getByRole('button',{name:'Configurer',exact:true}).click();
    await modal.getByLabel('Permission sur le coffre',{exact:true}).selectOption('vault-write');
    await modal.getByLabel('Créer automatiquement la note après correction, dans le coffre choisi.',{exact:true}).check();
    await modal.getByRole('button',{name:'Enregistrer le workflow',exact:true}).click();
    await modal.waitFor({state:'hidden'});
    await page.getByRole('button',{name:'Créer dans Obsidian',exact:true}).click();
    await page.locator('.brain-preview-header .brain-status.exported').waitFor();
    await page.locator('#brain-file').setInputFiles({name:'voice.wav',mimeType:'audio/wav',buffer:Buffer.from('SYNTHETIC_AUDIO_FIXTURE')});
    await page.getByRole('button',{name:'Traiter la dictée',exact:true}).click();
    await page.waitForFunction(() => state.brain.jobs.filter(job => job.status === 'exported').length === 2);
    await page.waitForFunction(() => brainDetail?.sourceType === 'audio' && brainDetail.status === 'exported');
    await page.getByRole('button',{name:'Proposition IA',exact:true}).click();
    await page.screenshot({path:path.join(evidence,'03-voice-note.png'),fullPage:true});
    assert.equal(fs.readdirSync(path.join(fixture.vaultPath,'Inbox','Voix')).length,2);
    await page.getByRole('button',{name:'Activer la surveillance',exact:true}).click();
    fs.writeFileSync(path.join(fixture.inputPath,'automatique.txt'),'Une nouvelle mémoire depuis obsidienne, via le dossier surveillé.');
    await page.waitForFunction(() => state.brain.jobs.filter(job => job.status === 'exported').length === 3);
    await page.getByRole('button',{name:'Mettre en pause',exact:true}).click();
    await page.getByRole('button',{name:'Mon workflow',exact:true}).click();
    await page.getByText('Automatique après traitement',{exact:false}).waitFor();
    await page.getByText('Lire les instructions automatiques envoyées au LLM',{exact:true}).click();
    await page.screenshot({path:path.join(evidence,'04-workflow.png'),fullPage:true});
    await page.getByRole('button',{name:'Explorer mon cerveau',exact:true}).click();
    await page.getByLabel('Sujet à rechercher',{exact:true}).fill('mémoire');
    await page.getByRole('button',{name:'Rechercher',exact:true}).click();
    await page.locator('.brain-search-result').first().waitFor();
    assert.equal(await page.locator('.brain-search-result').count(),4);
    await page.getByRole('button',{name:'Demander au modèle',exact:true}).click();
    await page.locator('.brain-answer').waitFor();
    assert.ok((await page.locator('.brain-answer').innerText()).includes('Les notes parlent de mémoire.'));
    await page.screenshot({path:path.join(evidence,'05-retrieval.png'),fullPage:true});
    await page.locator('.brain-search-result').first().click();
    await page.locator('.brain-found-note').waitFor();
    await page.getByRole('button',{name:'Configurer',exact:true}).click();
    await modal.getByRole('button',{name:'Détecter mes outils',exact:true}).click();
    await page.waitForFunction(() => document.querySelector('[name="inputSource"]')?.value === 'fluidvoice');
    assert.equal(await modal.getByLabel('Transcrire les fichiers audio déposés',{exact:true}).inputValue(),'fluidvoice');
    assert.equal(await modal.getByLabel('Modèle local',{exact:true}).inputValue(),'fixture-brain-local');
    await modal.getByRole('button',{name:'Enregistrer le workflow',exact:true}).click();
    await modal.waitFor({state:'hidden'});
    await page.getByRole('button',{name:'Boîte vocale',exact:true}).click();
    await page.getByRole('button',{name:'Activer la surveillance',exact:true}).click();
    await page.getByText('Nouvelles dictées Fluid Voice suivies',{exact:true}).waitFor();
    fs.writeFileSync(fixture.fluidHistoryPath,JSON.stringify([{id:'fixture-fluid-voice-1',timestamp:Date.now()/1000,
      text:'Une mémoire de plus, dictée dans obsidienne depuis Fluid Voice.'}]));
    await page.waitForFunction(() => state.brain.jobs.filter(job => job.status === 'exported').length === 4);
    await page.getByRole('button',{name:'Mettre en pause',exact:true}).click();
    await page.locator('[data-action="brain-select"]').first().click();
    await page.waitForFunction(() => brainDetail?.sourceEntryId === 'fixture-fluid-voice-1');
    assert.equal(await page.evaluate(() => brainDetail.original),'Une mémoire de plus, dictée dans obsidienne depuis Fluid Voice.');
    assert.equal(await page.evaluate(() => brainDetail.sourceApplication),'Fluid Voice');
    await page.getByRole('button',{name:'Note + YAML',exact:true}).click();
    assert.ok((await page.locator('.brain-yaml').innerText()).includes('source_application: "Fluid Voice"'));
    await page.locator('#brain-file').setInputFiles({name:'fluid.wav',mimeType:'audio/wav',buffer:Buffer.from('FLUID_NATIVE_AUDIO_FIXTURE')});
    await page.getByRole('button',{name:'Traiter la dictée',exact:true}).click();
    await page.waitForFunction(() => state.brain.jobs.filter(job => job.status === 'exported').length === 5);
    for (const width of [1500,900,390,300]) {
      if (application) {
        await application.evaluate(({BrowserWindow},width) => BrowserWindow.getAllWindows()[0].setSize(width,1000),width);
        await page.waitForFunction(width => innerWidth === width,width);
      } else await page.setViewportSize({width,height:1000});
      for (const tab of ['Boîte vocale','Mon workflow','Explorer mon cerveau']) {
        await page.getByRole('button',{name:tab,exact:true}).click();
        await page.mouse.move(width-10,500);
        await page.keyboard.press('Escape');
        await page.locator('.workspace').evaluate(async element => Promise.all(element.getAnimations().map(animation => animation.finished)));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1),false,'Overflow '+width+' '+tab);
        assert.equal(await page.locator('.brain-page').evaluate(element => element.scrollWidth > element.clientWidth+1),false,'Content overflow '+width+' '+tab);
      }
      await page.getByRole('button',{name:'Boîte vocale',exact:true}).click();
      await page.screenshot({path:path.join(evidence,'responsive-'+width+'.png'),fullPage:true,animations:'disabled'});
    }
    await page.reload();
    await page.getByRole('heading',{name:'My Brain',exact:true}).waitFor();
    await page.waitForFunction(() => state.brain.jobs.filter(job => job.status === 'exported').length === 5);
    assert.deepEqual(errors,[]);
    assert.deepEqual(failures,[]);
    fs.writeFileSync(path.join(evidence,'result.json'),JSON.stringify({passed:true,fixture:true,
      text:true,audio:true,original:true,yaml:true,permissions:true,watcher:true,retrieval:true,persistence:true,
      browserFolderPicker:true,fluidDetection:true,fluidDictations:true,fluidNativeAudio:true,automaticContext:true,
      widths:[1500,900,390,300],errors,failures},null,2));
    console.log('My Brain browser recipe passed: local pipeline, original, YAML, permissions, watcher, retrieval and 4 widths.');
  } catch (error) {
    await page.screenshot({path:path.join(evidence,'failure.png'),fullPage:true});
    fs.writeFileSync(path.join(evidence,'failure.json'),JSON.stringify({errors,failures,configurationRequests,text:await page.locator('body').innerText()},null,2));
    throw error;
  } finally {await browser.close();}
}
main().catch(error => {console.error(error);process.exitCode=1;});
