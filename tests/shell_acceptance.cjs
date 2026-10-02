const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

async function main() {
  const origin=process.env.ATELIER_SHELL_TEST_URL || 'http://127.0.0.1:4349';
  const evidence=path.resolve('.atelier/shell-evidence');
  fs.mkdirSync(evidence,{recursive:true});
  const browser=await chromium.launch({headless:true,channel:process.env.ATELIER_BROWSER_CHANNEL || 'chrome'});
  const page=await browser.newPage({viewport:{width:1500,height:980}});
  const errors=[],failedAssets=[];
  page.setDefaultTimeout(15000);
  page.on('pageerror',error => errors.push(error.message));
  page.on('response',response => {
    if (response.status() >= 400 && /\.(js|css)$/.test(new URL(response.url()).pathname))
      failedAssets.push({url:response.url(),status:response.status()});
  });
  try {
    await page.goto(origin+'/#overview');
    await page.getByRole('heading',{name:'Atelier',exact:true}).waitFor();
    assert.deepEqual(failedAssets,[],'The entire shell must load through the real HTTP handler');
    assert.equal(await page.locator('#mode-nav button').count(),3);
    assert.equal(await page.locator('.topbar [data-action="app-zoom"]').count(),0);
    assert.equal(await page.getByRole('group',{name:'Zoom de l’application'}).count(),0);
    await page.screenshot({path:path.join(evidence,'overview.png'),fullPage:true});

    await page.keyboard.press('Control+-');
    await page.waitForFunction(() => appZoom === 90);
    await page.keyboard.press('Control+=');
    await page.waitForFunction(() => appZoom === 100);
    await page.keyboard.press('Control+Shift+=');
    await page.waitForFunction(() => appZoom === 110);
    await page.keyboard.press('Control+0');
    await page.waitForFunction(() => appZoom === 100);
    await page.keyboard.press('Control+NumpadSubtract');
    await page.waitForFunction(() => appZoom === 90);
    await page.reload();
    await page.getByRole('heading',{name:'Atelier',exact:true}).waitFor();
    assert.equal(await page.evaluate(() => appZoom),90,'Keyboard zoom persists without visible controls');
    await page.keyboard.press('Control+0');
    await page.waitForFunction(() => appZoom === 100);

    await page.getByRole('button',{name:'Rechercher dans le projet',exact:true}).click();
    const search=page.getByRole('textbox',{name:'Rechercher dans le projet',exact:true});
    await search.waitFor();
    await search.fill('Attendre');
    await page.locator('#quick-search-results .quick-result').waitFor();
    assert.equal(await page.locator('#quick-search-results .quick-result').count(),1);
    const appearance=await page.locator('.command-palette').evaluate(palette => ({
      width:palette.getBoundingClientRect().width,
      fieldHeight:palette.querySelector('.search-field').getBoundingClientRect().height,
      background:getComputedStyle(palette).backgroundColor,
      theme:getComputedStyle(document.documentElement).getPropertyValue('--panel-background').trim()
    }));
    assert.ok(appearance.width <= 482);
    assert.ok(appearance.fieldHeight <= 38);
    assert.equal(appearance.background,'rgb(25, 25, 25)');
    await page.screenshot({path:path.join(evidence,'search.png'),fullPage:true});
    await page.locator('#quick-search-results .quick-result').click();
    await page.locator('.session-pane').waitFor();
    assert.equal(await page.locator('#modal').evaluate(dialog => dialog.open),false);

    await page.keyboard.press('Control+k');
    await search.waitFor();
    await search.fill('aucune correspondance de recette');
    assert.equal(await page.locator('#quick-search-results').innerText(),'Aucun résultat.');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#modal').evaluate(dialog => dialog.open),false);

    await page.locator('#sidebar-toggle').click();
    assert.equal(await page.locator('#sidebar-toggle').getAttribute('aria-expanded'),'true');
    await page.locator('#sidebar-toggle').click();
    assert.equal(await page.locator('#sidebar-toggle').getAttribute('aria-expanded'),'false');
    await page.getByRole('button',{name:'Code',exact:true}).click();
    await page.locator('#native-terminal').waitFor();
    await page.getByRole('button',{name:'Ouvrir un terminal',exact:true}).click();
    await page.locator('#modal [name=sandbox]').waitFor();
    assert.equal(await page.locator('#modal [name=sandbox]').inputValue(),'read-only');
    await page.getByRole('button',{name:'Annuler',exact:true}).click();
    await page.getByRole('button',{name:'Agent',exact:true}).click();
    await page.getByRole('heading',{name:'Duplica',exact:true}).waitFor();
    await page.getByRole('button',{name:'Chat',exact:true}).click();
    await page.getByRole('heading',{name:'ChatGPT',exact:true}).waitFor();

    for (const width of [1500,900,390,300]) {
      await page.setViewportSize({width,height:980});
      await page.keyboard.press('Control+k');
      await search.waitFor();
      await search.fill('aucune correspondance de recette');
      const bounds=await page.locator('#modal').boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x+bounds.width <= width+1,'Search fits at '+width);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1),false,'No page overflow at '+width);
      await page.screenshot({path:path.join(evidence,'search-'+width+'.png'),fullPage:true});
      await page.keyboard.press('Escape');
      await page.getByRole('button',{name:'Code',exact:true}).click();
      await page.locator('#native-terminal').waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1),false,'Code fits at '+width);
      await page.screenshot({path:path.join(evidence,'code-'+width+'.png'),fullPage:true});
    }
    assert.deepEqual(errors,[]);
    assert.deepEqual(failedAssets,[]);
    fs.writeFileSync(path.join(evidence,'browser-result.json'),JSON.stringify({passed:true,fixture:true,keyboardZoom:true,persistedZoom:true,searchNavigation:true,modes:true,widths:[1500,900,390,300],errors,failedAssets},null,2));
    console.log('Shell browser recipe passed: startup, compact search, keyboard zoom, navigation and responsive modes.');
  } catch (error) {
    await page.screenshot({path:path.join(evidence,'browser-failure.png'),fullPage:true}).catch(() => {});
    fs.writeFileSync(path.join(evidence,'browser-failure.json'),JSON.stringify({error:error.message,errors,failedAssets},null,2));
    throw error;
  } finally {
    await browser.close();
  }
}

main().catch(error => {console.error(error);process.exitCode=1;});
