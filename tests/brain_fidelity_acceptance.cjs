const {_electron} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const evidence = path.resolve('.atelier/brain-fidelity-evidence');
  const fixture = JSON.parse(fs.readFileSync(path.join(evidence,'fixture.json'),'utf8'));
  assert.equal(fixture.fixture,true);
  const env = {...process.env,TZ:'Europe/Paris',ATELIER_BRAIN_TEST_URL:fixture.url,
    ATELIER_BRAIN_TEST_PROFILE:path.join(evidence,'profile-'+Date.now())};
  delete env.ELECTRON_RUN_AS_NODE;
  const application = await _electron.launch({executablePath:require('electron'),
    args:[path.resolve('tests/brain_window.cjs')],env});
  const page = await application.firstWindow();
  page.setDefaultTimeout(20000);
  const errors = [], failures = [], activeImports = new Set();
  let maxConcurrentImports = 0, legacyId = null;
  page.on('pageerror',error => errors.push(error.message));
  page.on('requestfailed',request => failures.push(request.url()));
  page.on('request',request => {
    if (new URL(request.url()).pathname === '/api/brain/import') {
      activeImports.add(request);maxConcurrentImports = Math.max(maxConcurrentImports,activeImports.size);
    }
  });
  page.on('response',response => activeImports.delete(response.request()));
  await page.route('**/api/brain/job?*',async route => {
    const response = await route.fetch(), body = await response.json();
    if (body.id === legacyId) delete body.transcriptionReview;
    await route.fulfill({response,json:body});
  });
  const draft = () => page.getByLabel('Ou coller une transcription',{exact:true});
  const select = async id => {
    await page.locator('.brain-job[data-id="'+id+'"]').click();
    await page.waitForFunction(id => brainDetail?.id === id,id);
  };
  const submitText = async text => {
    await draft().fill(text);
    await page.getByRole('button',{name:'Traiter la dictée',exact:true}).click();
    await page.waitForFunction(text => brainDetail?.original === text && brainDetail?.status === 'review',text);
    return page.evaluate(() => brainDetail);
  };
  try {
    await page.getByRole('heading',{name:'My Brain',exact:true}).waitFor();
    const original = '  Identique : Je garde mes répétitions, mes répétitions.\nUne pensée inachevée… Et 12 idées, sans conseil ajouté.\n';
    await draft().fill('Un brouillon temporaire');
    const unchanged = await submitText(original);
    assert.equal(unchanged.original,original);assert.equal(unchanged.result.text,original);
    assert.equal(unchanged.transcriptionReview.status,'unchanged');
    assert.equal(await page.getByRole('button',{name:'Texte brut',exact:true}).getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('.brain-note-body').textContent(),original);
    assert.ok((await page.locator('.brain-fidelity').innerText()).includes('à l’identique'));
    assert.equal(await page.locator('.brain-note-meta').getByText('FAUSSE DÉCLARATION').count(),0);
    await page.screenshot({path:path.join(evidence,'01-original-reference.png'),fullPage:true});

    await page.getByRole('button',{name:'Reprendre le texte',exact:true}).click();
    assert.equal(await draft().inputValue(),original);
    const privateDraft = 'Mon brouillon personnel déjà saisi ne doit pas être perdu.';
    await draft().fill(privateDraft);
    await page.getByRole('button',{name:'Reprendre le texte',exact:true}).click();
    await page.getByRole('heading',{name:'Votre brouillon contient déjà du texte',exact:true}).waitFor();
    assert.equal(await draft().inputValue(),privateDraft);
    await page.screenshot({path:path.join(evidence,'02-draft-preserved.png'),fullPage:true});
    await page.getByRole('button',{name:'Conserver mon brouillon',exact:true}).click();
    assert.equal(await draft().inputValue(),privateDraft);
    await page.getByRole('button',{name:'Reprendre le texte',exact:true}).click();
    await page.getByRole('button',{name:'Ajouter à la suite',exact:true}).click();
    assert.equal(await draft().inputValue(),privateDraft+'\n\n'+original);
    await draft().fill(privateDraft);
    await page.getByRole('button',{name:'Reprendre le texte',exact:true}).click();
    await page.getByRole('button',{name:'Remplacer mon brouillon',exact:true}).click();
    assert.equal(await draft().inputValue(),original);
    await draft().fill(privateDraft);

    const minimalText = 'Relecture légère : Je classe une idée dans obsidienne et je garde ensuite chaque détail, chaque répétition, chaque fragment et toutes les nuances de ma propre voix sans résumer cette pensée.';
    await page.locator('#brain-file').setInputFiles({name:'2026-07-14 - Pensée.txt',mimeType:'text/plain',buffer:Buffer.from(minimalText)});
    await page.getByRole('button',{name:'Traiter la dictée',exact:true}).click();
    await page.waitForFunction(text => brainDetail?.original === text && brainDetail?.status === 'review',minimalText);
    const minimal = await page.evaluate(() => brainDetail);
    assert.equal(minimal.transcriptionReview.status,'minimal');
    assert.equal(await draft().inputValue(),privateDraft);
    assert.equal(minimal.title,'2026-07-14 - Pensée');assert.equal(minimal.noteDate,'2026-07-14');
    await page.getByRole('button',{name:'Comparer avant / après',exact:true}).click();
    assert.equal(await page.locator('.brain-comparison-text').nth(0).textContent(),minimalText);
    assert.equal(await page.locator('.brain-comparison-text').nth(1).textContent(),minimal.result.text);
    assert.equal(await page.locator('mark.remove').textContent(),'obsidienne');
    assert.equal(await page.locator('mark.add').textContent(),'Obsidian');

    const riskyText = 'Réécriture risquée : Je ne partage pas 12 notes. Je garde les hésitations. Je ne donne aucun conseil, aucun conseil. Une idée et puis…';
    const risky = await submitText(riskyText);
    assert.equal(risky.transcriptionReview.status,'review-required');
    assert.ok(risky.transcriptionReview.warnings.some(value=>value.includes('numériques')));
    assert.ok(risky.transcriptionReview.warnings.some(value=>value.includes('négation')));
    assert.equal(await page.locator('.brain-note-body').textContent(),riskyText);
    await page.getByRole('button',{name:'Comparer avant / après',exact:true}).click();
    assert.equal(await page.locator('.brain-comparison-text').nth(0).textContent(),riskyText);
    assert.equal(await page.locator('.brain-comparison-text').nth(1).textContent(),risky.result.text);
    assert.ok((await page.locator('.brain-fidelity').innerText()).includes('négation'));
    await page.screenshot({path:path.join(evidence,'03-real-before-after.png'),fullPage:true});

    await page.getByRole('button',{name:'Note + YAML',exact:true}).click();
    const markdown = await page.locator('.brain-yaml').textContent();
    const header = markdown.split('\n---\n')[0].slice(4);
    const keys = header.split('\n').filter(line=>/^[a-z_]+:/.test(line)).map(line=>line.split(':')[0]);
    assert.deepEqual(keys,['schema_version','title','date','date_basis','source','file_number','subject','description','content_types','topics','entities','tags','related_notes','language']);
    assert.ok(header.includes("content_types:\n  - 'reflection'\n  - 'self-advice'"));
    assert.equal(/source_sha256|model:|job_id|provider:|total_tokens|corrections:|\{/.test(header),false);
    assert.ok(markdown.slice(markdown.indexOf('## Transcription originale'),markdown.indexOf('## Proposition IA')).includes('\n'+riskyText+'\n'));
    assert.ok(markdown.indexOf(riskyText) < markdown.indexOf('## Proposition IA'));
    assert.ok(markdown.includes(risky.result.text));
    await page.screenshot({path:path.join(evidence,'04-compact-yaml-source-first.png'),fullPage:true});
    const downloaded = path.join(evidence,'downloaded-source-first.md');
    await application.evaluate(({session},target) => {
      global.fidelityDownloadResult = null;
      session.defaultSession.once('will-download',(_,item) => {
        item.setSavePath(target);item.once('done',(_,state)=>{global.fidelityDownloadResult={state,mime:item.getMimeType()};});
      });
    },downloaded);
    await page.getByRole('button',{name:'Télécharger .md',exact:true}).click();
    await page.waitForFunction(()=>true);
    for (let index=0;index<20;index++) {
      if (await application.evaluate(()=>global.fidelityDownloadResult)) break;
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    assert.equal((await application.evaluate(()=>global.fidelityDownloadResult)).state,'completed');
    assert.equal(fs.readFileSync(downloaded,'utf8'),markdown);

    legacyId = minimal.id;
    await select(minimal.id);
    assert.equal(await page.evaluate(()=>brainDetail.transcriptionReview),undefined);
    await page.getByRole('button',{name:'Comparer avant / après',exact:true}).click();
    assert.equal(await page.locator('.brain-comparison-text').nth(0).textContent(),minimalText);
    assert.equal(await page.locator('.brain-comparison-text').nth(1).textContent(),minimal.result.text);
    assert.equal(await page.locator('mark.remove').textContent(),'obsidienne');
    assert.ok((await page.locator('.brain-fidelity').innerText()).includes('à examiner'));

    await page.locator('#brain-file').setInputFiles(fixture.audioPath);
    await page.getByRole('button',{name:'Traiter la dictée',exact:true}).click();
    await page.waitForFunction(()=>brainDetail?.sourceType === 'audio' && brainDetail?.status === 'review');
    assert.equal(await page.locator('.brain-note-body').textContent(),'Audio fictif : Je ne partage pas 12 notes. Je garde les détails.');
    assert.equal(await page.evaluate(()=>brainDetail.transcriptionReview.status),'review-required');

    await draft().fill(privateDraft);
    await page.locator('#brain-directory').setInputFiles(fixture.sourcesPath);
    await page.waitForFunction(total=>brainFiles.get(project().id)?.length === total,fixture.totalFiles);
    await page.getByRole('button',{name:'Traiter tout le dossier',exact:true}).click();
    await page.waitForFunction(()=>state.brain.batches?.[0]?.pending === 0 && state.brain.batches[0].active === 0);
    const batch = await page.evaluate(()=>state.brain.batches[0]);
    assert.equal(batch.total,24);assert.equal(batch.completed,23);assert.equal(batch.failed,1);
    assert.equal(maxConcurrentImports,1);assert.equal(await draft().inputValue(),privateDraft);
    const batchDetail = await page.evaluate(id=>api('brain/batch?id='+encodeURIComponent(id)),batch.id);
    assert.ok(batchDetail.entries.some(entry=>entry.sourceName === 'Note 22.txt' && entry.status === 'review'));
    assert.equal(batchDetail.entries.filter(entry=>entry.error).length,1);
    const last = await page.evaluate(()=>state.brain.jobs.find(job=>job.sourceName === 'Note 22.txt'));
    assert.equal(last.noteDate,'2026-08-02');
    assert.ok(last.sourceMetadata.source_relative_path.startsWith('Fidélité dossier/Notes/'));
    await page.screenshot({path:path.join(evidence,'05-folder-nonregression.png'),fullPage:true});
    await page.reload();
    await page.waitForFunction(id=>state.brain?.batches?.[0]?.id === id && state.brain.batches[0].completed === 23,batch.id);
    assert.ok((await page.locator('.brain-batch').innerText()).includes('24 / 24 fichiers'));
    await select(risky.id);
    await page.getByRole('button',{name:'Comparer avant / après',exact:true}).click();
    await page.waitForFunction(()=>$('#toasts').children.length === 0);
    const comparisonIntegrity = await page.evaluate(()=> {
      const pairs = [['','abc'],['abc',''],['a b c','a d c'],['\n a  b\n',' a\nb '],['💡 café','💡 cafe'],['mot '.repeat(3000),'idée '.repeat(3000)]];
      return pairs.every(([original,proposed])=>{
        const compared = brainCompareTexts(original,proposed);
        return compared.pieces.filter(piece=>piece.kind !== 'add').map(piece=>piece.text).join('') === original &&
          compared.pieces.filter(piece=>piece.kind !== 'remove').map(piece=>piece.text).join('') === proposed;
      });
    });
    assert.equal(comparisonIntegrity,true);
    for (const width of [1500,900,390,300]) {
      await application.evaluate(({BrowserWindow},width)=>BrowserWindow.getAllWindows()[0].setSize(width,1000),width);
      await page.waitForFunction(width=>innerWidth === width,width);
      await page.mouse.move(width-10,500);
      await page.locator('.workspace').evaluate(async element=>Promise.all(element.getAnimations().map(animation=>animation.finished)));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth+1),false,'Page overflow '+width);
      assert.equal(await page.locator('.brain-page').evaluate(element=>element.scrollWidth > element.clientWidth+1),false,'Brain overflow '+width);
      assert.equal(await page.locator('.brain-comparison').evaluate(element=>element.scrollWidth > element.clientWidth+1),false,'Compare overflow '+width);
      await page.screenshot({path:path.join(evidence,'responsive-'+width+'.png'),fullPage:true,animations:'disabled'});
    }
    const proof = await page.evaluate(()=>api('fixture/proof'));
    assert.equal(proof.asrCalls,1);assert.equal(proof.llmCalls,27);
    assert.deepEqual(fs.readdirSync(fixture.vaultPath),[]);
    assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
    fs.writeFileSync(path.join(evidence,'result.json'),JSON.stringify({passed:true,fixture:true,
      originalReference:true,manualTextEditable:true,unchanged:true,minimal:true,numbersAndNegationWarnings:true,
      realBeforeAfter:true,falseDeclarationsExcluded:true,legacyCompatible:true,fullComparisonIntegrity:true,
      draftPreserved:true,explicitAppendAndReplace:true,compactYamlKeys:keys,sourceFirstMarkdown:true,
      downloadExact:true,audioOriginalReference:true,folder:{total:24,completed:23,failed:1,sequential:true,durableAfterReload:true,lastFileProcessed:true},
      widths:[1500,900,390,300],proof,errors,failures},null,2));
    console.log('My Brain fidelity browser recipe passed: source-first text, real comparison, draft preservation, compact YAML and folder nonregression.');
  } catch (error) {
    await page.screenshot({path:path.join(evidence,'failure.png'),fullPage:true});
    fs.writeFileSync(path.join(evidence,'failure.json'),JSON.stringify({errors,failures,text:await page.locator('body').innerText()},null,2));
    throw error;
  } finally {await application.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
