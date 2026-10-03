const {_electron} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
async function main() {
  const browser = await _electron.launch({executablePath:require('electron'), args:[path.resolve('tests/channels_feedback_window.cjs')]});
  const page = await browser.firstWindow();
  const errors=[]; page.on('pageerror', error => errors.push(error.message));
  const evidence=path.resolve('.atelier/memory-feedback-evidence'); fs.mkdirSync(evidence,{recursive:true});
  try {
    await page.goto('http://127.0.0.1:4332/#memory');
    await page.waitForFunction(() => state?.projects?.length > 0);
    const second = await page.evaluate(async () => { const item = await api('save',{kind:'project',value:{name:'Projet souvenirs de recette',path:project().path}}); await refresh(true); return item; });
    await page.getByRole('button',{name:'Nouveau souvenir',exact:true}).click();
    assert.ok((await page.getByLabel('Projet de référence').inputValue()).length);
    await page.getByLabel('Projet de référence').selectOption(second.id);
    assert.ok((await page.locator('[name=scope]').textContent()).includes(second.name));
    await page.getByLabel('Titre',{exact:true}).fill('Souvenir recette structurée');
    await page.getByLabel('Contenu durable · quoi retenir ?').fill('Décision validée dans la recette fictive.');
    await page.getByLabel('Sujet',{exact:true}).fill('Recherche de sources');
    await page.getByLabel('Pourquoi conserver ce souvenir ?').fill('Réutiliser le contexte sans tout recharger.');
    await page.getByLabel('Contexte réutilisable par un agent').fill('La source est locale et les secrets sont exclus.');
    await page.getByLabel('Date du fait ou de la décision · quand ?').fill('2026-10-03');
    await page.getByLabel('Source, fichier ou URL').fill('decision');
    await page.getByLabel('Source, fichier ou URL').fill('CORE.md');
    await page.locator('[data-memory-source-path="docs/memory/CORE.md"]').click();
    assert.equal(await page.getByLabel('Source, fichier ou URL').inputValue(),'docs/memory/CORE.md');
    await page.getByRole('button',{name:'Parcourir le projet',exact:true}).click();
    await page.locator('[data-memory-source-path="docs"][data-directory="true"]').click();
    await page.locator('[data-memory-source-path="docs/DESIGN.md"]').click();
    assert.equal(await page.getByLabel('Source, fichier ou URL').inputValue(),'docs/DESIGN.md');
    await page.screenshot({path:path.join(evidence,'source-browser-and-header.png'),fullPage:true});
    await page.getByRole('button',{name:'Valider le souvenir',exact:true}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    const memory = await page.evaluate(() => state.memories.find(m => m.title === 'Souvenir recette structurée'));
    assert.equal(memory.projectId, second.id); assert.equal(memory.project.name,second.name);
    assert.equal(memory.source,'docs/DESIGN.md'); assert.equal(memory.schemaVersion,'atelier.memory/v1');
    await page.evaluate(id => {projectId=id;render();}, second.id);
    await page.getByRole('button',{name:/Souvenir recette structurée/}).click();
    assert.equal(await page.getByRole('button',{name:'Exporter JSON',exact:true}).isVisible(),true);
    const exported = await page.evaluate(async id => await api('memory/export?id='+encodeURIComponent(id)), memory.id);
    const saved = JSON.parse(exported.content);
    assert.equal(saved.header.project.id,second.id); assert.equal(saved.content.context,memory.context);
    const markdown = await page.evaluate(async id => await api('memory/export?id='+encodeURIComponent(id)+'&format=markdown'), memory.id);
    assert.ok(markdown.content.includes('---\n')); assert.ok(markdown.content.includes('why: "Réutiliser'));
    await page.screenshot({path:path.join(evidence,'structured-memory.png'),fullPage:true});
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(evidence,'result.json'),JSON.stringify({status:'passed',sourceSearch:true,browse:true,projectSelection:true,jsonExport:true,yamlMarkdownExport:true,pageErrors:errors},null,2));
    console.log('Memory feedback acceptance passed: source search, folder browse, named project, structured save, JSON and YAML exports.');
  } catch(error) {await page.screenshot({path:path.join(evidence,'failure.png'),fullPage:true}); throw error;}
  finally {await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
