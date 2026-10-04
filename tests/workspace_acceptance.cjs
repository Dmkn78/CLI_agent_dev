const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');

async function main() {
  const browser=await chromium.launch({headless:true,channel:process.env.ATELIER_BROWSER_CHANNEL || 'chrome'});
  const page=await browser.newPage({viewport:{width:1500,height:980}}),errors=[];
  const evidence=path.resolve('.atelier/workspace-evidence');fs.mkdirSync(evidence,{recursive:true});
  page.on('pageerror',error => errors.push(error.message));
  try {
    await page.goto('http://127.0.0.1:4335/#dashboard');
    await page.getByRole('heading',{name:'Dashboard des agents',exact:true}).waitFor();
    await page.waitForFunction(() => state.sessions.length >= 5);
    assert.equal(await page.locator('.dashboard-agent').count(),4);
    assert.equal(await page.locator('.dashboard-agent[data-agent-kind=child]').count(),3);
    await page.getByLabel('Rechercher un agent').fill('panneaux');
    assert.equal(await page.locator('.dashboard-agent').count(),1);
    await page.getByLabel('Rechercher un agent').fill('');
    await page.locator('[data-action=dashboard-filter][data-filter=working]').click();
    assert.equal(await page.locator('.dashboard-agent').count(),1);
    await page.locator('[data-action=dashboard-filter][data-filter=all]').click();
    await page.locator('[name=dashboardKind]').selectOption('children');
    assert.equal(await page.locator('.dashboard-agent').count(),3);
    await page.locator('[name=dashboardKind]').selectOption('all');
    await page.locator('[name=dashboardScope]').selectOption('all');
    assert.equal(await page.locator('.dashboard-agent').count(),5);
    await page.locator('[data-action=dashboard-group][data-group=project]').click();
    assert.equal(await page.locator('.dashboard-group').count(),2);
    await page.screenshot({path:path.join(evidence,'dashboard-all-workspaces.png'),fullPage:true});
    const foreign=await page.evaluate(() => state.sessions.find(session => session.projectId === 'workspace-b').id);
    await page.locator(`.dashboard-agent[data-key="session:${foreign}"]`).click();
    assert.equal(await page.evaluate(() => projectId),'workspace-b');
    assert.equal(await page.locator('.session-pane').count(),1);
    await page.getByRole('button',{name:'Code',exact:true}).click();
    await page.locator('[name=codeWorkspace]').selectOption('atelier');
    await page.getByRole('button',{name:'Nouveau terminal',exact:true}).click();
    assert.equal(await page.locator('#modal [name=sandbox]').inputValue(),'read-only');
    await page.locator('#modal [name=terminalProject]').selectOption('workspace-b');
    await page.getByRole('button',{name:'Annuler',exact:true}).click();
    await page.getByRole('button',{name:'Dashboard',exact:true}).click();
    assert.equal(await page.locator('.dashboard-dock').count(),1);
    await page.locator('[name=codeWorkspace]').selectOption('workspace-b');
    assert.equal(await page.locator('.dashboard-dock').count(),0,'The dashboard preference belongs to a workspace');
    await page.locator('[name=codeWorkspace]').selectOption('atelier');
    assert.equal(await page.locator('.dashboard-dock').count(),1);
    await page.getByRole('button',{name:'Fermer le dashboard',exact:true}).click();
    const workspaces=await page.locator('.workspace-tree').count();
    assert.equal(workspaces,2);
    for (const width of [1500,900,390,300]) {
      await page.setViewportSize({width,height:980});
      await page.evaluate(() => route('dashboard'));
      await page.waitForTimeout(150);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1),false,'No global overflow at '+width);
      await page.screenshot({path:path.join(evidence,'dashboard-'+width+'.png'),fullPage:true});
    }
    assert.deepEqual(errors,[]);
    const result={passed:true,fixture:true,workspaces,children:3,scopeSearchAndFilters:true,foreignSessionNavigation:true,dashboardPreferencePerWorkspace:true,widths:[1500,900,390,300],errors};
    fs.writeFileSync(path.join(evidence,'browser-result.json'),JSON.stringify(result,null,2));
    console.log('Workspace browser recipe passed: children, scopes, grouping, search, filters, navigation, permissions, responsive layout.');
  } finally {await browser.close();}
}
main().catch(error => {console.error(error);process.exitCode=1;});
