const {_electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process');

async function main() {
  const evidence=path.resolve('.atelier/browser-evidence/quota-refresh');
  fs.mkdirSync(evidence,{recursive:true});
  const fixture=spawn(process.env.ATELIER_TEST_PYTHON || 'python3',['-B','tests/quota_refresh_fixture.py','--port','4347'],{cwd:path.resolve('.'),stdio:['ignore','pipe','pipe']});
  let fixtureErrors='',browser;
  fixture.stderr.on('data',output=>fixtureErrors+=String(output));
  try {
    await new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(new Error('Quota fixture startup timed out: '+fixtureErrors)),20000);
      fixture.stdout.on('data',output=>{if (String(output).includes('fixture ready')) {clearTimeout(timeout);resolve();}});
      fixture.on('error',error=>{clearTimeout(timeout);reject(error);});
      fixture.on('exit',code=>{clearTimeout(timeout);reject(new Error('Quota fixture exited '+code+': '+fixtureErrors));});
    });
    browser=await _electron.launch({executablePath:process.env.ATELIER_ELECTRON_EXECUTABLE || require('electron'),args:[path.resolve('tests/channels_feedback_window.cjs')]});
    const page=await browser.firstWindow(),errors=[],quotaPosts=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>{if (request.url().endsWith('/api/providers/limits')) quotaPosts.push(request.method());});
    page.setDefaultTimeout(15000);
    await page.setViewportSize({width:1400,height:1000});
    await page.goto('http://127.0.0.1:4347/#usage');
    const quotas=page.locator('.account-quotas');
    await quotas.waitFor();
    assert.match(await quotas.innerText(),/Actualisation automatique toutes les 10 minutes/);
    assert.match(await quotas.innerText(),/25 % consommés · 75 % restants/);
    assert.ok(await quotas.locator('time').getAttribute('datetime'));
    await page.screenshot({path:path.join(evidence,'automatic-initial-desktop.png'),fullPage:true});

    await page.evaluate(()=>api('fixture/quotas',{phase:'success'}));
    await page.waitForFunction(()=>provider().limits?.rateLimitsByLimitId?.codex?.primary?.usedPercent === 42);
    assert.match(await quotas.innerText(),/42 % consommés · 58 % restants/);
    const measuredAt=await quotas.locator('time').getAttribute('datetime');
    const callsBeforeError=await page.evaluate(async ()=>(await api('fixture/quotas')).calls.length);
    await page.evaluate(()=>api('fixture/quotas',{phase:'error'}));
    await page.waitForFunction(()=>Boolean(provider().limitsError));
    assert.match(await quotas.innerText(),/Actualisation des quotas impossible · dernière mesure conservée/);
    assert.match(await quotas.innerText(),/Erreur réseau fictive <preuve>/);
    assert.equal(await quotas.locator('preuve').count(),0,'Provider errors must be escaped');
    assert.match(await quotas.innerText(),/42 % consommés · 58 % restants/);
    assert.equal(await quotas.locator('time').getAttribute('datetime'),measuredAt,'Failure retains last successful measure time');
    assert.ok((await page.evaluate(async ()=>(await api('fixture/quotas')).calls.length)) > callsBeforeError);
    await page.screenshot({path:path.join(evidence,'automatic-error-preserved-desktop.png'),fullPage:true});

    await page.evaluate(()=>route('settings'));
    await quotas.waitFor();
    assert.match(await quotas.innerText(),/Actualisation automatique toutes les 10 minutes/);
    assert.match(await quotas.innerText(),/dernière mesure conservée/);
    await page.evaluate(()=>route('overview'));
    await page.evaluate(()=>api('fixture/quotas',{phase:'recovery'}));
    await page.waitForFunction(()=>provider().limits?.rateLimitsByLimitId?.codex?.primary?.usedPercent === 61 && !provider().limitsError);
    await page.evaluate(()=>route('usage'));
    assert.match(await quotas.innerText(),/61 % consommés · 39 % restants/);
    assert.equal(await quotas.locator('.inline-error').count(),0);
    assert.notEqual(await quotas.locator('time').getAttribute('datetime'),measuredAt);
    assert.deepEqual(quotaPosts,[],'The browser state loop must not fetch provider quotas itself');

    await quotas.getByRole('button',{name:'Actualiser',exact:true}).click();
    await page.waitForFunction(()=>!loading);
    assert.deepEqual(quotaPosts,['POST'],'Manual refresh remains available');
    for (const width of [1400,900,390,300]) {
      await page.setViewportSize({width,height:1000});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+1),'No global overflow at '+width);
      await page.screenshot({path:path.join(evidence,`automatic-recovered-${width}.png`),fullPage:true});
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(evidence,'browser-result.json'),JSON.stringify({passed:true,fixture:true,actualSchedulerSeconds:2,displayedProductionSeconds:600,automaticSuccess:true,errorRetainsValuesAndTimestamp:true,escapedError:true,settingsAndUsage:true,refreshWhileElsewhere:true,noFrontendProviderPolling:true,manualRefresh:true,widths:[1400,900,390,300],errors},null,2));
    console.log('Quota automatic refresh browser recipe passed.');
  } finally {
    if (browser) await browser.close();
    fixture.kill();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
