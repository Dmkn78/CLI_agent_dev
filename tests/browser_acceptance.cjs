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
    assert.equal(await page.locator('#usage-provider option[value="codex"]').count(),1);
    assert.ok(await page.getByText('Codex · OpenAI',{exact:true}).count());
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
    await page.locator('[data-action="add-worker"]').click();
    await page.locator('[name="worker1_runtime"]').selectOption('omp');
    assert.equal(await page.locator('[name="worker1_model"]').inputValue(),'fixture/remote');
    assert.equal(await page.locator('[name="worker1_effort"] option').count(),2);
    await page.screenshot({path:path.join(directory,'configuration-fixture.png'),fullPage:true});
    await page.locator('[data-worker-index="1"] [data-action="remove-worker"]').click();
    for (let index=0;index<3;index++) await page.locator('[data-action="add-worker"]').click();
    assert.equal(await page.locator('[data-worker-index]').count(),4);
    await page.locator('[name="worker2_name"]').fill('Designer choisi');
    await page.locator('[name="worker2_role"]').fill('designer');
    await page.locator('[name="reviewer_enabled"]').uncheck();
    await page.locator('[name="synthesizer_enabled"]').uncheck();
    await page.getByRole('button',{name:'Créer & ouvrir'}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    await page.locator('.graph-node').first().waitFor();
    const saved = await page.evaluate(async () => {
      const state = await fetch('/api/state',{headers:{'X-Atelier-Token':document.querySelector('meta[name="atelier-token"]').content}}).then(r => r.json());
      return state.workflows.find(w => w.title === 'Équipe créée par recette');
    });
    assert.equal(saved.agents.planner.model,'fixture-review');
    assert.equal(saved.agents.workers[0].model,'fixture-code');
    assert.equal(saved.agents.workers.length,4);
    assert.equal(saved.agents.workers[1].name,'Designer choisi');
    assert.equal(saved.agents.reviewer,null);
    await page.locator(`[data-action="approve-team-plan"][data-id="${saved.id}"]`).waitFor();
    await page.locator(`[data-action="approve-team-plan"][data-id="${saved.id}"]`).click();
    await page.waitForFunction(async id => {
      const state=await fetch('/api/state',{headers:{'X-Atelier-Token':document.querySelector('meta[name="atelier-token"]').content}}).then(response => response.json());
      return state.workflows.find(item => item.id === id)?.status === 'completed';
    },saved.id);
    await page.locator(`[data-action="configure-team"][data-id="${saved.id}"]`).click();
    assert.equal(await page.locator('[data-worker-index]').count(),4);
    await page.locator('[data-worker-index="0"] [data-action="remove-worker"]').click();
    assert.equal(await page.locator('[data-worker-index]').count(),3);
    await page.getByRole('button',{name:'Fermer la fenêtre'}).click();
    await page.locator('[data-action="new-cli-chat"]').first().click();
    await page.locator('[name="name"]').fill('Chat de recette fictive');
    assert.equal(await page.locator('[name="startWork"]').isChecked(),false);
    await page.getByRole('button',{name:'Créer & ouvrir'}).click();
    await page.locator('.chat-context').waitFor();
    await page.locator('[data-action="session-context"]').first().waitFor();
    await page.locator('[data-action="session-context"]').first().click();
    await page.locator('[name="contextFiles"]').fill('README.md');
    await page.locator('[name="skills"][value="skills/coding-rules/SKILL.md"]').check();
    await page.locator('[name="model"]').selectOption('fixture-review');
    await page.getByRole('button',{name:'Appliquer au prochain échange'}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    await page.locator('.chat-conversation .prompt-form textarea').waitFor();
    await page.locator('.chat-conversation .prompt-form textarea').fill('Message de recette, sans inférence réelle.');
    assert.match(await page.locator('.context-draft strong').textContent(),/≈/);
    await page.locator('.chat-conversation [aria-label="Envoyer"]').click();
    await page.locator('.message.assistant').first().waitFor();
    await page.waitForFunction(() => document.querySelector('.chat-conversation .prompt-form textarea')?.value === '');
    assert.match(await page.locator('.context-metrics').textContent(),/Entrée du dernier appel.*12/);
    assert.match(await page.locator('.context-metrics').textContent(),/Réponse du dernier appel.*3/);
    assert.ok(await page.locator('.chat-context').getByText('README.md',{exact:true}).count());
    await page.screenshot({path:path.join(directory,'chat-context-fixture.png'),fullPage:true});
    await page.locator('[data-action="navigate"][data-view="settings"]').click();
    assert.ok(await page.getByText('Anthropic fixture').count());
    await page.locator('[data-action="terminal-omp"]').click();
    await page.getByRole('button',{name:'Préparer le terminal'}).click();
    await page.locator('#terminal-command').waitFor();
    assert.match(await page.locator('#terminal-command').textContent(),/always-ask/);
    assert.doesNotMatch(await page.locator('#terminal-command').textContent(),/auto-approve/);
    await page.locator('[data-action="dismiss"]').click();
    await page.locator('[data-action="navigate"][data-view="overview"]').click();
    await page.locator('[data-action="terminal"]').click();
    assert.equal(await page.locator('[name="runtime"]').inputValue(),'codex');
    await page.getByRole('button',{name:'Préparer le terminal'}).click();
    assert.match(await page.locator('#terminal-command').textContent(),/on-request/);
    await page.locator('[data-action="dismiss"]').click();
    await page.locator('[data-action="navigate"][data-view="tasks"]').click();
    await page.locator('[data-action="new-task"]').first().click();
    await page.locator('[name="title"]').fill('TODO prise par agent fictif');
    await page.locator('[name="assigneeId"]').selectOption({label:'Session de recette fictive'});
    await page.locator('[name="activateAgent"]').check();
    await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    await page.waitForFunction(async () => {
      const state = await fetch('/api/state',{headers:{'X-Atelier-Token':document.querySelector('meta[name="atelier-token"]').content}}).then(response => response.json());
      return state.tasks.find(task => task.title === 'TODO prise par agent fictif')?.status === 'review';
    });
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
      await page.evaluate(() => {agentLayout='chat';route('agents');});
      assert.ok(await page.locator('.chat-context').count());
      const chatOverflow = await page.evaluate(() => document.documentElement.scrollWidth-innerWidth);
      assert.ok(chatOverflow <= 1,`Chat overflow at ${width}: ${chatOverflow}`);
      await page.screenshot({path:path.join(directory,`chat-${width}-fixture.png`),fullPage:true});
      await page.evaluate(() => {agentLayout='graph';route('agents');});
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(directory,'result.json'),JSON.stringify({status:'passed',fixture:true,viewports:[1600,900,390,300],errors},null,2));
    console.log('Browser acceptance passed: dynamic workers, role removal, reconfiguration, chat/context/skills/tokens, TODO assignment, Codex/OMP terminals, providers, graph; 10 views and chat / 4 widths. No real inference or terminal launch.');
  } finally { await browser.close(); }
}
main().catch(error => {console.error(error); process.exitCode = 1;});
