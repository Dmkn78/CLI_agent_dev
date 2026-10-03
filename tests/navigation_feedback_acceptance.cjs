const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

async function main() {
  const evidence=path.resolve('.atelier/navigation-feedback-evidence');
  fs.mkdirSync(evidence,{recursive:true});
  const env={...process.env,ATELIER_URL:process.env.ATELIER_NAV_TEST_URL || 'http://127.0.0.1:4349/',
    ATELIER_DESKTOP_TEST:'1',ATELIER_TEST_DATA:path.join(evidence,'profile-'+Date.now())};
  delete env.ELECTRON_RUN_AS_NODE;
  const application=await electron.launch({executablePath:require('electron'),args:[path.resolve('desktop/main.cjs')],env});
  const errors=[];
  try {
    const page=await application.firstWindow();
    page.setDefaultTimeout(10000);
    page.on('pageerror',error => errors.push(error.message));
    await page.getByRole('heading',{name:'ChatGPT',exact:true}).waitFor();
    await page.evaluate(() => route('overview'));
    await application.evaluate(({BrowserWindow}) => {const window=BrowserWindow.getAllWindows()[0];window.setMinimumSize(280,400);window.webContents.setBackgroundThrottling(false);});
    for (const width of [1500,900,390,300]) {
      await application.evaluate(({BrowserWindow},width) => BrowserWindow.getAllWindows()[0].setSize(width,900),width);
      await page.waitForFunction(width => innerWidth === width,width);
      await page.mouse.move(width-10,400);
      await page.keyboard.press('Escape');
      await page.locator('.navigation-rail [data-nav-preview="tools"]').hover();
      await page.getByRole('tooltip').waitFor({state:'visible'});
      assert.equal(await page.getByRole('tooltip').innerText(),'Outils du projet');
      const labels=await page.locator('#main-nav .nav-item>span').evaluateAll(spans => spans.map(span => ({
        text:span.textContent,display:getComputedStyle(span).display,width:span.getBoundingClientRect().width
      })));
      assert.ok(labels.length > 5);
      assert.ok(labels.every(label => label.text && label.display !== 'none' && label.width > 20),JSON.stringify(labels));
      await page.screenshot({path:path.join(evidence,'tools-'+width+'.png')});
      await page.locator('.navigation-rail [data-nav-preview="spaces"]').hover();
      assert.equal(await page.getByRole('tooltip').innerText(),'Espaces de travail');
      await page.locator('#project-list button').first().waitFor({state:'visible'});
      await page.locator('.navigation-rail [data-nav-preview="home"]').hover();
      assert.equal(await page.getByRole('tooltip').innerText(),'Accueil');
      assert.ok(await page.locator('#project-list').isVisible());
      await page.mouse.move(width-5,400);
      await page.waitForFunction(() => !navigationPreview);
      assert.equal(await page.getByRole('tooltip').isVisible(),false);
      await application.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].webContents.focus());
      await page.locator('.navigation-rail [data-nav-preview="home"]').focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      assert.equal(await page.getByRole('tooltip').innerText(),'Outils du projet');
      await page.keyboard.press('Escape');
      assert.equal(await page.getByRole('tooltip').isVisible(),false);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1),false,'Overflow '+width);
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(evidence,'result.json'),JSON.stringify({passed:true,fixture:true,widths:[1500,900,390,300],labels:true,hover:true,keyboard:true,errors},null,2));
    console.log('Navigation feedback passed: visible names, home/folder/tools hover and keyboard, 4 widths.');
  } finally {await application.close();}
}
main().catch(error => {console.error(error);process.exitCode=1;});
