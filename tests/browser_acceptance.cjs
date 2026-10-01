const {chromium} = require('playwright');
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');

async function main() {
  const directory = path.resolve('.atelier/browser-evidence');
  fs.mkdirSync(directory,{recursive:true});
  const browser = await chromium.launch({headless:true, ...(process.env.ATELIER_BROWSER_CHANNEL ? {channel:process.env.ATELIER_BROWSER_CHANNEL} : {})});
  const page = await browser.newPage({viewport:{width:1600,height:1000}});
  const errors = [];
  page.on('pageerror',error => errors.push(error.message));
  try {
    await page.goto('http://127.0.0.1:4320');
    await page.locator('.graph-node').first().waitFor();
    await page.screenshot({path:path.join(directory,'desktop-fixture.png'),fullPage:true});
    await page.locator('.graph-node.green').first().click();
    await page.locator('.graph-inspector').getByRole('button',{name:'Ouvrir la session'}).waitFor();
    await page.locator('#graph-workflow').selectOption('sessions');
    assert.ok(await page.getByRole('button',{name:/Session de recette fictive/}).count());
    await page.locator('#graph-workflow').selectOption({label:'Équipe de recette fictive'});
    await page.locator('[data-action="navigate"][data-view="usage"]').click();
    for (const group of ['provider','consumer','task','model','request']) {
      await page.locator(`[data-action="usage-group"][data-group="${group}"]`).click();
      assert.ok(await page.locator('.metrics-table tbody tr').count());
    }
    await page.screenshot({path:path.join(directory,'consumption-fixture.png'),fullPage:true});
    await page.locator('[data-action="navigate"][data-view="agents"]').click();
    await page.locator('[data-action="new-agent"]').first().click();
    await page.locator('[name="mode"][value="orchestration"]').check();
    await page.locator('[name="name"]').fill('Équipe créée par recette');
    await page.locator('[name="mission"]').fill('Mission de fournisseur fictif');
    await page.locator('[name="planner_model"]').selectOption('fixture-review');
    await page.locator('[name="reviewer_model"]').selectOption('fixture-review');
    await page.locator('[name="worker0_model"]').selectOption('fixture-code');
    await page.locator('[name="worker1_enabled"]').check();
    await page.locator('[name="worker1_runtime"]').selectOption('omp');
    assert.equal(await page.locator('[name="worker1_model"]').inputValue(),'fixture/remote');
    assert.equal(await page.locator('[name="worker1_effort"] option').count(),2);
    await page.screenshot({path:path.join(directory,'configuration-fixture.png'),fullPage:true});
    await page.locator('[name="worker1_enabled"]').uncheck();
    await page.getByRole('button',{name:'Créer & ouvrir'}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    await page.locator('.graph-node').first().waitFor();
    const saved = await page.evaluate(async () => {
      const state = await fetch('/api/state',{headers:{'X-Atelier-Token':document.querySelector('meta[name="atelier-token"]').content}}).then(r => r.json());
      return state.workflows.find(w => w.title === 'Équipe créée par recette');
    });
    assert.equal(saved.agents.planner.model,'fixture-review');
    assert.equal(saved.agents.workers[0].model,'fixture-code');
    await page.locator('[data-action="navigate"][data-view="settings"]').click();
    assert.ok(await page.getByText('Anthropic fixture').count());
    await page.locator('[data-action="terminal-omp"]').click();
    await page.getByRole('button',{name:'Préparer le terminal'}).click();
    await page.locator('#terminal-command').waitFor();
    assert.match(await page.locator('#terminal-command').textContent(),/always-ask/);
    assert.doesNotMatch(await page.locator('#terminal-command').textContent(),/auto-approve/);
    await page.locator('[data-action="dismiss"]').click();
    for (const width of [1600,900,390,300]) {
      await page.setViewportSize({width,height:900});
      for (const view of ['overview','agents','usage','settings','tasks','memory','audit','files','sprints','benchmarks']) {
        await page.evaluate(view => route(view),view);
        await page.waitForTimeout(100);
        const overflow = await page.evaluate(() => ({page:document.documentElement.scrollWidth,width:innerWidth}));
        assert.ok(overflow.page <= overflow.width + 1,`${view} overflows at ${width}: ${JSON.stringify(overflow)}`);
      }
      await page.evaluate(() => route('overview'));
      if (width <= 680) {
        const clipped = await page.locator('.graph-canvas').evaluate(canvas => {
          const bounds = canvas.getBoundingClientRect();
          return [...canvas.querySelectorAll('.graph-node')].some(node => {
            const rect = node.getBoundingClientRect();
            return rect.left < bounds.left - 1 || rect.right > bounds.right + 1;
          });
        });
        assert.equal(clipped,false,`Graph nodes clipped at ${width}`);
      }
      await page.screenshot({path:path.join(directory,`viewport-${width}-fixture.png`),fullPage:true});
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(directory,'result.json'),JSON.stringify({status:'passed',fixture:true,viewports:[1600,900,390,300],errors},null,2));
    console.log('Browser acceptance passed: graph, independent models, usage groups, connections, terminal preview, 10 views / 4 widths. No real inference or terminal launch.');
  } finally { await browser.close(); }
}
main().catch(error => {console.error(error); process.exitCode = 1;});
