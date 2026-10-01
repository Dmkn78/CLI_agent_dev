const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');

async function main() {
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  const page=await browser.newPage({viewport:{width:1500,height:1000}});
  const errors=[];
  page.on('pageerror',error => errors.push(error.message));
  try {
    await page.goto('http://127.0.0.1:4320');
    await page.locator('.graph-node').first().waitFor();
    await page.evaluate(() => route('design'));
    await page.locator('#design-canvas .lf-graph').waitFor();
    await page.getByRole('button',{name:'Bloc',exact:true}).click();
    await page.getByRole('button',{name:'Décision',exact:true}).click();
    assert.equal(await page.evaluate(() => designEditor.getGraphRawData().nodes.length),2);
    const node=await page.evaluate(() => designEditor.getGraphRawData().nodes[0]);
    const nodeElement=page.locator('.lf-node').first();
    // Use the library's DOM coordinates for a genuine pointer drag.
    const bounds=await nodeElement.boundingBox();
    await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
    await page.mouse.down();
    await page.mouse.move(bounds.x+bounds.width/2+100,bounds.y+bounds.height/2+70,{steps:10});
    await page.mouse.up();
    const moved=await page.evaluate(id => designEditor.getGraphRawData().nodes.find(node => node.id === id),node.id);
    assert.ok(moved.x !== node.x || moved.y !== node.y,'Node drag must change position');
    await page.locator('#design-title').fill('Pipeline de recette');
    await page.locator('#design-explanation').fill('Un dessin fictif, sans exécution.');
    await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
    await page.waitForFunction(() => Boolean(designId));
    await page.waitForFunction(() => document.getElementById('design-page').value === designId);
    const revision=await page.evaluate(() => designDraft.revision);
    assert.equal(revision,1);
    await page.screenshot({path:'.atelier/browser-evidence/design-fixture.png',fullPage:true});
    await page.getByRole('button',{name:'Agents du projet',exact:true}).click();
    await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
    await page.waitForFunction(() => designDraft.revision === 2);
    // Closing the CLI chat pane must not automatically reopen it.
    await page.evaluate(() => {agentLayout='panes'; selectedAgents=[sessions()[0].id]; route('agents');});
    await page.locator('[data-action="unpin-agent"]').first().click();
    assert.equal(await page.locator('.session-pane').count(),0);
    await page.evaluate(() => route('usage'));
    assert.ok(await page.getByText('Abonnement Codex · compte ChatGPT',{exact:true}).count());
    await page.locator('#notifications-button').click();
    await page.getByRole('heading',{name:'Notifications',exact:true}).waitFor();
    await page.getByRole('button',{name:'Fermer la fenêtre'}).click();
    await page.evaluate(() => route('webchat'));
    await page.getByRole('heading',{name:'ChatGPT',exact:true}).waitFor();
    await page.locator('.browser-file-list .file-entry').first().waitFor();
    await page.screenshot({path:'.atelier/browser-evidence/webchat-resources-fixture.png',fullPage:true});
    const latestResource=await page.evaluate(async () => {
      const original=api, pending=[];
      api=() => new Promise(resolve => pending.push(resolve));
      try {
        const older=loadBrowserResources('old.sql'), newer=loadBrowserResources('new.sql');
        pending[1]({path:'new.sql',content:'NEW'}); await newer;
        pending[0]({path:'old.sql',content:'OLD'}); await older;
        return browserResourceContent.content;
      } finally { api=original; }
    });
    assert.equal(latestResource,'NEW','An older response must not overwrite the latest resource');
    await page.locator('#browser-instructions').fill('Consigne du projet initial');
    const secondProject=await page.evaluate(async () => api('save',{kind:'project',value:{name:'Projet fictif isolé',path:state.root}}));
    await page.evaluate(id => actions.project({dataset:{id}}),secondProject.id);
    await page.waitForFunction(() => document.getElementById('browser-instructions')?.value === '');
    assert.equal(await page.locator('#browser-instructions').inputValue(),'','No instruction may leak across projects');
    await page.evaluate(() => actions.project({dataset:{id:'atelier'}}));
    await page.waitForFunction(() => document.getElementById('browser-instructions')?.value === 'Consigne du projet initial');
    for (const width of [1500,900,390,300]) {
      await page.setViewportSize({width,height:900});
      for (const view of ['design','webchat','usage']) {
        await page.evaluate(view => route(view),view);
        await page.waitForTimeout(100);
        const overflow=await page.evaluate(() => document.documentElement.scrollWidth-innerWidth);
        assert.ok(overflow <= 1,`${view} overflow at ${width}: ${overflow}`);
      }
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync('.atelier/browser-evidence/workbench-result.json',JSON.stringify({passed:true,fixture:true,errors},null,2));
    console.log('Workbench acceptance passed: real pointer node drag, save/revision, session projection, pane close, quota band, notifications, ChatGPT resource hub, 4 widths.');
  } finally { await browser.close(); }
}
main().catch(error => {console.error(error); process.exitCode=1;});
