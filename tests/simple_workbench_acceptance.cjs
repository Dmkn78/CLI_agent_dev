const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process');

async function main() {
  const fixture=process.env.ATELIER_RECIPE_URL ? null : spawn(process.env.ATELIER_TEST_PYTHON || 'python',['tests/simple_workbench_fixture.py','--port','4339'],{env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'},stdio:['ignore','pipe','inherit'],windowsHide:true});
  if (fixture) await new Promise((resolve,reject) => {fixture.stdout.on('data',output => {if (String(output).includes('fixture ready')) resolve();});fixture.on('error',reject);fixture.on('exit',code => {if (code) reject(new Error('Fixture exited: '+code));});});
  const browser=await chromium.launch({headless:true,channel:process.env.ATELIER_BROWSER_CHANNEL || 'chrome'});
  const page=await browser.newPage({viewport:{width:1500,height:980}}),errors=[];
  const evidence=path.resolve('.atelier/simple-workbench-evidence');fs.mkdirSync(evidence,{recursive:true});
  page.on('pageerror',error => errors.push(error.message));page.setDefaultTimeout(12000);
  // Browser recipe uses a transport mock; real PTYs have a separate Electron recipe.
  await page.addInitScript(() => {
    const callbacks={},writes=[],resizes=[],closes=[];
    window.fixtureDesktop={writes,resizes,closes,settings:[]};
    window.atelierDesktop={
      onTerminalData:callback => callbacks.data=callback,onTerminalExit:callback => callbacks.exit=callback,
      onLaunchMode:() => {},onBrowserState:() => {},showBrowser:() => {},browserBounds:() => {},navigateBrowser:() => {},onZoomShortcut:() => {},setZoom:async () => {},
      createBrowser:async id => ({id}),closeBrowser:async () => {},pickDirectory:async () => ({}),dragFile:async () => {},
      createTerminal:async (id,settings) => {window.fixtureDesktop.settings.push(settings);setTimeout(() => callbacks.data?.({id,data:'\x1b[32mRECETTE FICTIVE\x1b[0m\r\nTerminal de test, sans modèle réel.\r\n'}),100);return {id,pid:1234,cwd:'Projet de recette'};},
      writeTerminal:(id,text) => writes.push({id,text}),resizeTerminal:(id,cols,rows) => resizes.push({id,cols,rows}),
      closeTerminal:async id => closes.push(id)
    };
  });
  try {
    await page.goto((process.env.ATELIER_RECIPE_URL || 'http://127.0.0.1:4339/')+'#terminal');
    await page.getByRole('heading',{name:'Code',exact:true}).waitFor();
    await page.waitForFunction(() => provider().models.length > 0);
    assert.equal(await page.locator('#mode-nav button').count(),3);
    assert.equal(await page.locator('#mode-nav').innerText(),'Chat\nAgent\nCode');
    assert.equal(await page.locator('.terminal-launchers,.terminal-controls').count(),0);
    assert.equal(await page.evaluate(() => nativeTerminalLayout),'floating');
    assert.equal(await page.evaluate(() => sidebarCollapsed),true);
    await page.getByRole('button',{name:'Espaces de travail',exact:true}).hover();
    await page.locator('body.sidebar-preview').waitFor();
    assert.equal(await page.locator('.workspace-tree').count(),2);
    await page.mouse.move(800,70);await page.waitForTimeout(300);
    assert.equal(await page.locator('body.sidebar-preview').count(),0);
    const openMenu=async () => page.locator('.workspace-toolbar [data-action=new-panel]').click();
    await openMenu();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#work-popover').isVisible(),false,'Escape closes the panel menu');
    assert.equal(await page.locator('.workspace-toolbar [data-action=new-panel]').evaluate(element => element === document.activeElement),true,'Escape returns focus to the active menu anchor');
    await openMenu();
    await page.getByRole('menuitem',{name:'Terminal',exact:true}).click();
    assert.equal(await page.locator('#modal [name=sandbox]').inputValue(),'read-only');
    assert.equal(await page.locator('#modal [name=cli]').inputValue(),'codex');
    await page.getByRole('button',{name:'Ouvrir ici',exact:true}).click();
    await page.locator('.native-terminal-pane').waitFor();
    assert.equal(await page.evaluate(() => fixtureDesktop.settings[0].sandbox),'read-only');
    const ids=await page.evaluate(async () => {
      const first=activeNativeTerminal;
      await createNativeTerminal({runtime:'omp',model:'fixture-code',sandbox:'read-only',name:'Revue du projet'});
      return [first,activeNativeTerminal];
    });
    await openMenu();await page.getByRole('menuitem',{name:'Dashboard',exact:true}).click();
    await page.locator('.workspace-tool-pane [data-dashboard-content]').waitFor();
    assert.equal(await page.locator('.floating-board>[data-floating-panel]').count(),3);
    await page.screenshot({path:path.join(evidence,'code-compact-panels.png')});
    await page.getByRole('button',{name:'Fermer le panneau Dashboard',exact:true}).click();
    const first=page.locator(`[data-terminal-pane="${ids[0]}"]`);
    const before=await first.boundingBox();
    const title=await first.locator('header').boundingBox();
    await page.mouse.move(title.x+90,title.y+12);await page.mouse.down();
    await page.mouse.move(title.x+130,title.y+92,{steps:5});await page.mouse.up();
    const moved=await first.boundingBox();assert.ok(moved.x > before.x+20 && moved.y > before.y+50);
    const resize=await first.locator('.floating-resize').boundingBox();
    await page.mouse.move(resize.x+7,resize.y+7);await page.mouse.down();
    await page.mouse.move(resize.x-140,resize.y-180,{steps:6});await page.mouse.up();
    const smaller=await first.boundingBox();assert.ok(smaller.width < moved.width-80 && smaller.height < moved.height-120);
    await first.locator(`[data-action=zoom-native-terminal]`).click();
    assert.equal(await page.locator('.native-terminal-pane:visible').count(),1);
    await first.locator(`[data-action=zoom-native-terminal]`).click();
    assert.equal(await page.locator('.native-terminal-pane:visible').count(),2);
    const geometry=await page.evaluate(() => JSON.stringify(nativeWorkspaceLayout().windows));
    await page.getByLabel('Espace de travail',{exact:true}).selectOption('workspace-b');
    assert.equal(await page.locator('.native-terminal-pane').count(),0);
    await page.getByLabel('Espace de travail',{exact:true}).selectOption('atelier');
    assert.equal(await page.evaluate(() => JSON.stringify(nativeWorkspaceLayout().windows)),geometry,'Window positions belong to their workspace');
    await first.locator('[data-action=hide-native-terminal]').click();
    assert.equal(await page.locator('.native-terminal-pane').count(),1);
    assert.equal(await page.evaluate(() => fixtureDesktop.closes.length),0,'Closing a panel retains the process');
    await page.locator(`.minimized-panels [data-id="${ids[0]}"]`).click();
    assert.equal(await page.locator('.native-terminal-pane').count(),2);
    await openMenu();await page.getByRole('menuitem',{name:'Fichiers',exact:true}).click();
    await page.locator('.workspace-files [data-path=ressources]').click();
    await page.locator('.workspace-files [data-path]').filter({hasText:'notes.md'}).click();
    await page.getByText('Texte synthétique de ce projet.',{exact:false}).waitFor();
    await page.getByRole('button',{name:'Fermer le panneau Fichiers',exact:true}).click();
    await openMenu();await page.getByRole('menuitem',{name:'Architecture',exact:true}).click();
    await page.locator('#design-canvas .lf-canvas-overlay').waitFor();
    await page.getByRole('button',{name:'Bloc',exact:true}).click();
    assert.equal(await page.evaluate(() => designEditor.getGraphRawData().nodes.length),1);
    await page.getByRole('button',{name:'Fermer le panneau Architecture',exact:true}).click();
    await page.getByRole('button',{name:'Agent',exact:true}).click();
    await page.getByRole('heading',{name:'Duplica',exact:true}).waitFor();
    await page.getByLabel('Message à Duplica').fill('Texte fictif pour la recette.');
    await page.getByRole('button',{name:'Envoyer à Duplica',exact:true}).click();
    await page.waitForFunction(() => state.duplica.discussion.deliveries.at(-1)?.status === 'completed');
    await page.getByLabel('Consommation de Duplica',{exact:true}).click();
    assert.ok((await page.locator('.usage-chip[open]').innerText()).includes('Entrée'));
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.usage-chip[open]').count(),0,'Escape closes token details');
    assert.equal(await page.getByLabel('Consommation de Duplica',{exact:true}).evaluate(element => element === document.activeElement),true,'Escape returns focus to the token summary');
    await page.getByLabel('Options Duplica',{exact:true}).click();
    await page.locator('.action-menu[open] [data-action=duplica-permissions]').focus();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.action-menu[open]').count(),0,'Escape closes the action menu');
    assert.equal(await page.getByLabel('Options Duplica',{exact:true}).evaluate(element => element === document.activeElement),true,'Escape returns focus from menu contents to the summary');
    await page.getByLabel('Message à Duplica').focus();
    await page.keyboard.press('Escape');
    assert.equal(await page.getByLabel('Message à Duplica').evaluate(element => element === document.activeElement),true,'Repeated Escape does not steal focus from the composer');
    await page.getByRole('button',{name:'Canaux',exact:true}).click();
    await page.getByRole('heading',{name:'Canaux',exact:true}).waitFor();
    assert.ok((await page.getByLabel('Consommation du canal').innerText()).includes('200'));
    await page.getByLabel('Consommation du canal').click();
    assert.ok((await page.locator('.usage-chip[open]').innerText()).includes('Entrée'));
    await page.screenshot({path:path.join(evidence,'channel-cumulative-tokens.png')});
    await page.getByRole('button',{name:'Chat',exact:true}).click();
    await page.getByRole('heading',{name:'ChatGPT',exact:true}).waitFor();
    await page.getByLabel('Consommation de ChatGPT').click();
    assert.ok((await page.locator('.usage-chip[open]').innerText()).includes('ne communique pas ses tokens'));
    await page.getByLabel('Consommation de ChatGPT').click();
    for (const width of [1500,900,390,300]) {
      await page.setViewportSize({width,height:980});
      for (const route of ['terminal','duplica','channels','webchat']) {
        await page.evaluate(routeName => route(routeName),route);await page.waitForTimeout(120);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1),false,'No global overflow for '+route+' at '+width);
        await page.screenshot({path:path.join(evidence,route+'-'+width+'.png'),fullPage:true});
      }
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(evidence,'browser-result.json'),JSON.stringify({passed:true,fixture:true,desktopTransport:'mock',modes:3,moveResizeZoom:true,workspaceIsolation:true,panelClosurePreservesProcess:true,filesAndCanvas:true,cumulativeTokens:true,escapeMenusAndDetails:true,focusRestoration:true,widths:[1500,900,390,300],errors},null,2));
    console.log('Simple workbench browser recipe passed.');
  } catch (error) {
    await page.screenshot({path:path.join(evidence,'browser-failure.png'),fullPage:true});
    console.error('Page errors:',errors);throw error;
  } finally {await browser.close();fixture?.kill();}
}
main().catch(error => {console.error(error);process.exitCode=1;});
