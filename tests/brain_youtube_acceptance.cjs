const {_electron} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const evidence = path.resolve('.atelier/brain-youtube-evidence');
  const fixture = JSON.parse(fs.readFileSync(path.join(evidence,'fixture.json'),'utf8'));
  assert.equal(fixture.fixture,true);
  const env = {...process.env,ATELIER_BRAIN_TEST_URL:fixture.url,
    ATELIER_BRAIN_TEST_PROFILE:path.join(evidence,'profile-'+Date.now())};
  delete env.ELECTRON_RUN_AS_NODE;
  const application = await _electron.launch({executablePath:require('electron'),
    args:[path.resolve('tests/brain_window.cjs')],env});
  const page = await application.firstWindow();
  const errors = [], failures = [], audioResponses = [];
  page.on('pageerror',error => errors.push(error.message));
  page.on('requestfailed',request => failures.push(request.url()));
  page.on('response',response => {if (response.url().includes('/api/brain/audio?')) audioResponses.push(response.status());});
  page.setDefaultTimeout(15000);
  try {
    await page.getByRole('heading',{name:'My Brain',exact:true}).waitFor();
    await page.screenshot({path:path.join(evidence,'01-ready.png'),fullPage:true});
    const draft = 'Mon texte collé doit rester disponible pendant l’import YouTube.';
    await page.getByLabel('Ou coller une transcription',{exact:true}).fill(draft);
    await page.locator('#brain-file').setInputFiles({name:'premier.txt',mimeType:'text/plain',buffer:Buffer.from('Premier texte synthétique.')});
    await page.locator('#brain-file').setInputFiles({name:'second.txt',mimeType:'text/plain',buffer:Buffer.from('Deuxième texte synthétique.')});
    assert.equal(await page.locator('.brain-staged-file').count(),2);
    await page.evaluate(() => refresh(true));
    assert.equal(await page.locator('.brain-staged-file').count(),2);
    assert.equal(await page.getByLabel('Ou coller une transcription',{exact:true}).inputValue(),draft);
    await page.getByRole('button',{name:'Retirer premier.txt',exact:true}).click();
    assert.equal(await page.locator('.brain-staged-file').count(),1);
    assert.ok((await page.locator('.brain-staged-file').innerText()).includes('second.txt'));
    await page.getByRole('button',{name:'Retirer les fichiers',exact:true}).click();
    assert.equal(await page.locator('.brain-staged-file').count(),0);
    assert.equal(await page.getByLabel('Ou coller une transcription',{exact:true}).inputValue(),draft);

    const urlInput = page.getByLabel('Lien de la vidéo YouTube',{exact:true});
    const submit = page.getByRole('button',{name:'Importer et transcrire',exact:true});
    await urlInput.fill('https://example.com/watch?v=BaW_jenozKc');
    await submit.click();
    await page.locator('.brain-youtube [role="alert"]').waitFor();
    assert.ok((await page.locator('.brain-youtube [role="alert"]').innerText()).includes('Seuls les liens'));
    assert.equal(await urlInput.inputValue(),'https://example.com/watch?v=BaW_jenozKc');
    assert.equal(await page.getByLabel('Ou coller une transcription',{exact:true}).inputValue(),draft);
    await page.screenshot({path:path.join(evidence,'02-invalid-link.png'),fullPage:true});

    await urlInput.fill('https://youtu.be/BaW_jenozKc?si=fixture');
    await submit.click();
    await page.locator('.brain-preview-header .brain-status.downloading').waitFor();
    await page.screenshot({path:path.join(evidence,'03-downloading.png'),fullPage:true});
    await page.locator('.brain-preview-header .brain-status.review').waitFor();
    await page.waitForFunction(() => Boolean(brainDetail?.result));
    assert.equal(await urlInput.inputValue(),'');
    assert.equal(await page.getByLabel('Ou coller une transcription',{exact:true}).inputValue(),draft);
    assert.equal(await page.locator('.brain-note-body').innerText(),fixture.transcript);
    const job = await page.evaluate(() => state.brain.jobs.find(job => job.sourceType === 'youtube'));
    assert.equal(job.sourceUrl,'https://www.youtube.com/watch?v=BaW_jenozKc');
    assert.equal(job.audioAvailable,true);
    assert.equal(job.audioSuffix,'.mp3');
    assert.equal(await page.getByRole('button',{name:'Créer dans Obsidian',exact:true}).isDisabled(),true);
    assert.deepEqual(fs.readdirSync(fixture.vaultPath),[]);
    await page.getByRole('button',{name:'Texte brut',exact:true}).click();
    assert.equal(await page.locator('.brain-note-body').innerText(),fixture.transcript);
    await page.getByRole('button',{name:'Note + YAML',exact:true}).click();
    assert.ok((await page.locator('.brain-yaml').innerText()).includes('schema_version: 3'));
    assert.ok((await page.locator('.brain-yaml').innerText()).includes(job.sourceUrl));
    await page.waitForFunction(() => $('#toasts').children.length === 0);
    await page.screenshot({path:path.join(evidence,'04-review-yaml.png'),fullPage:true});

    const audio = await page.evaluate(async id => {
      const response = await fetch('/api/brain/audio?id='+encodeURIComponent(id),{
        headers:{'X-Atelier-Token':$('meta[name="atelier-token"]').content}});
      const bytes = new Uint8Array(await response.arrayBuffer());
      return {status:response.status,type:response.headers.get('content-type'),hex:[...bytes].map(byte=>byte.toString(16).padStart(2,'0')).join('')};
    },job.id);
    assert.equal(audio.status,200); assert.equal(audio.type,'audio/mpeg'); assert.equal(audio.hex,fixture.mp3Hex);
    await page.evaluate(() => {$('meta[name="atelier-token"]').content = 'expired-fixture-token';});
    const downloadPath = path.join(evidence,'downloaded-fixture.mp3');
    await application.evaluate(({session},downloadPath) => {
      globalThis.brainYoutubeDownload = null;
      session.defaultSession.once('will-download',(_event,item) => {
        item.setSavePath(downloadPath);
        const filename = item.getFilename();
        item.once('done',(_event,state) => {globalThis.brainYoutubeDownload = {filename,state};});
      });
    },downloadPath);
    await page.getByRole('button',{name:'Télécharger MP3',exact:true}).click();
    const download = await application.evaluate(() => new Promise((resolve,reject) => {
      const poll = setInterval(() => {if (globalThis.brainYoutubeDownload) {clearInterval(poll);clearTimeout(timer);resolve(globalThis.brainYoutubeDownload);}},25);
      const timer = setTimeout(() => {clearInterval(poll);reject(new Error('Electron download did not complete.'));},10000);
    }));
    assert.equal(download.state,'completed');
    assert.equal(fs.readFileSync(downloadPath).toString('hex'),fixture.mp3Hex);
    assert.equal(download.filename,'voice_'+job.id+'.mp3');
    assert.deepEqual(audioResponses,[200,403,200]);
    assert.equal(await page.evaluate(()=>$('meta[name="atelier-token"]').content),'brain-youtube-fixture');
    const proof = await page.evaluate(() => api('fixture/proof'));
    assert.equal(proof.downloads.length,1); assert.equal(proof.asrCalls,1); assert.equal(proof.llmCalls,1);

    for (const width of [1500,900,390,300]) {
      await application.evaluate(({BrowserWindow},width) => BrowserWindow.getAllWindows()[0].setSize(width,1000),width);
      await page.waitForFunction(width => innerWidth === width,width);
      for (const tab of ['Boîte vocale','Mon workflow','Explorer mon cerveau']) {
        await page.getByRole('button',{name:tab,exact:true}).click();
        await page.mouse.move(width-10,500);
        await page.keyboard.press('Escape');
        await page.locator('.workspace').evaluate(async element => Promise.all(element.getAnimations().map(animation => animation.finished)));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1),false,'Overflow '+width+' '+tab);
        assert.equal(await page.locator('.brain-page').evaluate(element => element.scrollWidth > element.clientWidth+1),false,'Content overflow '+width+' '+tab);
      }
      await page.getByRole('button',{name:'Boîte vocale',exact:true}).click();
      assert.equal(await page.getByLabel('Ou coller une transcription',{exact:true}).inputValue(),draft);
      await page.screenshot({path:path.join(evidence,'responsive-'+width+'.png'),fullPage:true,animations:'disabled'});
    }
    assert.deepEqual(errors,[]); assert.deepEqual(failures,[]);
    fs.writeFileSync(path.join(evidence,'result.json'),JSON.stringify({passed:true,fixture:true,
      youtube:true,mp3:true,asr:true,correction:true,provenance:true,readOnly:true,
      draftPreserved:true,fileAccumulation:true,fileRemoval:true,invalidLink:true,nonceRenewed:true,
      widths:[1500,900,390,300],audioResponses,proof,errors,failures},null,2));
    console.log('My Brain YouTube browser recipe passed: synthetic MP3, local ASR/LLM, drafts, files, nonce and 4 widths.');
  } catch (error) {
    await page.screenshot({path:path.join(evidence,'failure.png'),fullPage:true});
    fs.writeFileSync(path.join(evidence,'failure.json'),JSON.stringify({errors,failures,audioResponses,text:await page.locator('body').innerText()},null,2));
    throw error;
  } finally {await application.close();}
}
main().catch(error => {console.error(error);process.exitCode=1;});
