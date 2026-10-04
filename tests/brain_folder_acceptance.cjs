const {_electron} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const evidence = path.resolve('.atelier/brain-folder-evidence');
  const fixture = JSON.parse(fs.readFileSync(path.join(evidence,'fixture.json'),'utf8'));
  assert.equal(fixture.fixture,true);
  const env = {...process.env,TZ:'Europe/Paris',ATELIER_BRAIN_TEST_URL:fixture.url,
    ATELIER_BRAIN_TEST_PROFILE:path.join(evidence,'profile-'+Date.now())};
  delete env.ELECTRON_RUN_AS_NODE;
  const application = await _electron.launch({executablePath:require('electron'),
    args:[path.resolve('tests/brain_window.cjs')],env});
  const page = await application.firstWindow();
  page.setDefaultTimeout(20000);
  const errors = [], failures = [], imports = [], activeImports = new Set();
  let maxConcurrentImports = 0, initialCopy = true, blocked = false, initialImportCount = 0;
  page.on('pageerror',error => errors.push(error.message));
  page.on('requestfailed',request => failures.push(request.url()));
  page.on('request',request => {
    if (new URL(request.url()).pathname === '/api/brain/import') {
      imports.push(request.postDataJSON());activeImports.add(request);
      maxConcurrentImports = Math.max(maxConcurrentImports,activeImports.size);
    }
  });
  page.on('response',response => activeImports.delete(response.request()));
  await page.route('**/api/brain/import',async route => {
    if (initialCopy && ++initialImportCount === 6) {
      blocked = true;
      await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Interruption locale simulée.'})});
    } else await route.continue();
  });
  await page.route('**/api/brain/batch/error',async route => {
    if (blocked) await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Interruption locale simulée.'})});
    else await route.continue();
  });
  try {
    await page.getByRole('heading',{name:'My Brain',exact:true}).waitFor();
    assert.equal(await page.evaluate(() => brainSourceTimeZone()),fixture.sourceTimeZone);
    const draft = 'Ce texte doit rester disponible pendant le traitement du dossier.';
    await page.getByLabel('Ou coller une transcription',{exact:true}).fill(draft);
    await page.locator('#brain-directory').setInputFiles(fixture.sourcesPath);
    await page.waitForFunction(total => brainFiles.get(project().id)?.length === total,fixture.manifest.length);
    assert.equal(await page.locator('.brain-staged-file').count(),29);
    assert.ok((await page.locator('.brain-staged').innerText()).includes('Semaine A'));
    await page.screenshot({path:path.join(evidence,'01-directory-selected.png'),fullPage:true});

    const fileData = fixture.manifest.map(entry => ({...entry,
      bytes:[...fs.readFileSync(path.join(path.dirname(fixture.sourcesPath),entry.relativePath))]}));
    await page.evaluate(data => {
      let pages = 0;
      function directory(name,children) {
        return {name,isFile:false,isDirectory:true,createReader:() => {
          let cursor=0;
          return {readEntries:callback => {pages++;const chunk=children.slice(cursor,cursor+3);cursor+=3;queueMicrotask(()=>callback(chunk));}};
        }};
      }
      function tree(name,rows) {
        const grouped = new Map(), children = [];
        for (const row of rows) {
          const parts = row.parts;
          if (parts.length === 1) {
            const file = new File([new Uint8Array(row.bytes)],row.sourceName,{lastModified:row.lastModified});
            children.push({name:parts[0],isFile:true,isDirectory:false,file:callback=>queueMicrotask(()=>callback(file))});
          } else {
            if (!grouped.has(parts[0])) grouped.set(parts[0],[]);
            grouped.get(parts[0]).push({...row,parts:parts.slice(1)});
          }
        }
        for (const [child,rows] of grouped) children.push(tree(child,rows));
        return directory(name,children);
      }
      const root = tree('Dossier complet',data.map(row=>({...row,parts:row.relativePath.split('/').slice(1)})));
      const event = new Event('drop',{bubbles:true,cancelable:true});
      Object.defineProperty(event,'dataTransfer',{value:{items:[{webkitGetAsEntry:()=>root}],files:[],getData:()=>''}});
      document.querySelector('.brain-drop').dispatchEvent(event);
      window.folderFixtureReadPages = () => pages;
    },fileData);
    await page.waitForFunction(total => !brainReadingFolders.size && brainFiles.get(project().id)?.length === total,fixture.manifest.length);
    assert.ok(await page.evaluate(() => window.folderFixtureReadPages()) > 12,'Directory reader pagination drained.');
    await page.getByRole('button',{name:'Traiter tout le dossier',exact:true}).click();
    await page.locator('.brain-upload-current').filter({hasText:'Copie interrompue'}).waitFor();
    const initialBatch = await page.evaluate(() => state.brain.batches[0]);
    assert.equal(initialBatch.total,29);assert.equal(initialBatch.received,5);assert.ok(initialBatch.pending > 0);
    await page.screenshot({path:path.join(evidence,'02-interrupted-copy.png'),fullPage:true});
    initialCopy = false;blocked = false;
    await page.reload();
    await page.getByRole('heading',{name:'My Brain',exact:true}).waitFor();
    await page.locator('.brain-batch-resume').waitFor();
    assert.equal(await page.locator('.brain-batch').count(),1);
    assert.equal(await page.getByRole('button',{name:'Rechoisir le dossier',exact:true}).isEnabled(),true);
    await page.locator('#brain-directory').setInputFiles(fixture.sourcesPath);
    await page.getByRole('button',{name:'Traiter tout le dossier',exact:true}).click();
    await page.waitForFunction(() => !brainBusy && state.brain.batches[0]?.pending === 0 && state.brain.batches[0]?.active === 0);
    const batch = await page.evaluate(() => state.brain.batches[0]);
    assert.equal(batch.id,initialBatch.id);assert.equal(batch.total,29);
    assert.equal(batch.received,28);assert.equal(batch.completed,27);assert.equal(batch.failed,2);assert.equal(batch.state,'failed');
    const detail = await page.evaluate(id => api('brain/batch?id='+encodeURIComponent(id)),batch.id);
    assert.equal(detail.entries.length,29);
    assert.equal(detail.entries.filter(entry=>entry.status === 'review').length,27);
    assert.equal(detail.entries.filter(entry=>entry.status === 'failed').length,2);
    assert.ok(detail.entries.some(entry => entry.relativePath.endsWith('Jour 25.txt') && entry.status === 'review'),'Last file processed despite earlier errors.');
    const proof = await page.evaluate(() => api('fixture/proof'));
    assert.equal(proof.asrCalls,2);assert.equal(proof.llmCalls,27);
    assert.equal(maxConcurrentImports,1,'Sources copied sequentially.');
    assert.ok(imports.every(entry=>entry.sourceTimeZone === fixture.sourceTimeZone));
    assert.ok(imports.every(entry=>entry.sourceRelativePath.startsWith('Dossier complet/')));
    assert.ok(imports.every(entry=>entry.sourceModifiedAt === '2026-08-01T23:30:00.000Z'));
    assert.deepEqual(fs.readdirSync(fixture.vaultPath),[]);

    const jobs = await page.evaluate(() => state.brain.jobs);
    const sample = jobs.find(job=>job.sourceName === 'Jour 01.txt');
    const namedDate = jobs.find(job=>job.sourceName === '2026-07-14 - Bilan.txt');
    const partialDate = jobs.find(job=>job.sourceName === 'Jour 02.txt');
    assert.equal(sample.title,'Jour 01');assert.equal(sample.noteDate,'2026-08-02');
    assert.equal(namedDate.title,'2026-07-14 - Bilan');assert.equal(namedDate.noteDate,'2026-07-14');
    assert.equal(sample.subject,'Sujet détecté par le modèle fictif');
    await page.locator('.brain-job[data-id="'+partialDate.id+'"]').click();
    await page.waitForFunction(id => brainDetail?.id === id,partialDate.id);
    assert.ok((await page.locator('.brain-meta-uncertainties').innerText()).includes('Date partielle'));
    assert.equal(await page.locator('.brain-note-meta .brain-uncertainties').count(),0,'Date warnings stay separate from voice ambiguity.');
    await page.locator('.brain-job[data-id="'+sample.id+'"]').click();
    await page.waitForFunction(id => brainDetail?.id === id,sample.id);
    assert.ok((await page.locator('.brain-preview-header').innerText()).includes('Jour 01'));
    assert.ok((await page.locator('.brain-note-description').innerText()).includes('fichier de test'));
    assert.ok((await page.locator('.brain-source-meta').innerText()).includes('Modification du fichier'));
    await page.getByRole('button',{name:'Note + YAML',exact:true}).click();
    const markdown = await page.locator('.brain-yaml').innerText();
    assert.ok(markdown.includes('date: 2026-08-02'));
    assert.equal(sample.sourceMetadata.source_timezone,'Europe/Paris');
    assert.ok(markdown.includes(sample.sourceMetadata.source_relative_path));
    assert.ok(markdown.includes("content_types:\n  - 'daily-summary'"));
    await page.locator('.brain-batch-errors').filter({hasText:'Format non pris en charge.pdf'}).waitFor();
    assert.equal(await page.locator('.brain-batch-errors button').count(),1);
    assert.equal(await page.locator('.brain-batch-errors button').isEnabled(),true);
    await page.waitForFunction(() => $('#toasts').children.length === 0);
    await page.screenshot({path:path.join(evidence,'03-complete-yaml.png'),fullPage:true});
    await page.reload();
    await page.waitForFunction(id => state.brain?.batches?.[0]?.id === id && state.brain.batches[0].completed === 27,batch.id);
    assert.equal(await page.locator('.brain-batch').count(),1);
    assert.ok((await page.locator('.brain-batch').innerText()).includes('29 / 29 fichiers'));
    for (const width of [1500,900,390,300]) {
      await application.evaluate(({BrowserWindow},width) => BrowserWindow.getAllWindows()[0].setSize(width,1000),width);
      await page.waitForFunction(width=>innerWidth === width,width);
      await page.mouse.move(width-10,500);
      await page.locator('.workspace').evaluate(async element=>Promise.all(element.getAnimations().map(animation=>animation.finished)));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth+1),false,'Page overflow '+width);
      assert.equal(await page.locator('.brain-page').evaluate(element=>element.scrollWidth > element.clientWidth+1),false,'Brain overflow '+width);
      await page.screenshot({path:path.join(evidence,'responsive-'+width+'.png'),fullPage:true,animations:'disabled'});
    }
    assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
    fs.writeFileSync(path.join(evidence,'result.json'),JSON.stringify({passed:true,fixture:true,
      nestedDirectory:true,paginatedDrop:true,total:29,completed:27,failed:2,sequential:true,
      interruptedCopy:true,resumedSameBatch:true,durableAfterReload:true,lastFileProcessed:true,
      sourceNamePreserved:true,sourceDate:true,sourceTimeZone:true,filenameDate:true,
      metadata:true,dateWarnings:true,errorsRetryable:true,widths:[1500,900,390,300],proof,errors,failures},null,2));
    console.log('My Brain folder browser recipe passed: 29 nested files, sequential copy/resume, 2 isolated errors, dates, YAML and 4 widths.');
  } catch (error) {
    await page.screenshot({path:path.join(evidence,'failure.png'),fullPage:true});
    fs.writeFileSync(path.join(evidence,'failure.json'),JSON.stringify({errors,failures,imports:imports.map(entry=>({sourceName:entry.sourceName,sourceModifiedAt:entry.sourceModifiedAt})),text:await page.locator('body').innerText()},null,2));
    throw error;
  } finally {await application.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
