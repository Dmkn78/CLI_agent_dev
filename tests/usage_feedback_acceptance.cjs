const {_electron}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
  const browser=await _electron.launch({executablePath:require('electron'),args:[path.resolve('tests/channels_feedback_window.cjs')]});
  const page=await browser.firstWindow(),errors=[];await page.setViewportSize({width:1400,height:1000});
  page.on('pageerror',error=>errors.push(error.message));
  const directory=path.resolve('.atelier/browser-evidence/usage-feedback');fs.mkdirSync(directory,{recursive:true});
  try {
    await page.goto('http://127.0.0.1:4324');await page.waitForFunction(()=>state.sessions.length === 1).catch(error=>{throw new Error(error.message+' · '+errors.join(' | '));});
    await page.evaluate(()=>route('usage'));
    await page.locator('.consumption-plot').waitFor();assert.equal(await page.locator('.consumption-plot circle').count(),6);
    assert.match(await page.locator('.plot-legend').innerText(),/codex/);assert.match(await page.locator('.plot-legend').innerText(),/anthropic/);
    await page.screenshot({path:path.join(directory,'consumption-offline.png'),fullPage:true});
    await page.locator('[data-action="usage-group"][data-group="consumer"]').click();assert.match(await page.locator('.consumption-chart').last().innerText(),/Comparer les sessions/);
    await page.evaluate(()=>{view='agents';agentLayout='panes';selectedAgents=['usage-session'];render();});
    await page.locator('.architecture-response').waitFor();assert.equal(await page.locator('.session-pane > .session-usage').count(),1);
    assert.match(await page.locator('.session-pane > .session-usage').innerText(),/18/);
    assert.equal(await page.locator('.architecture-response-source').getAttribute('open'),null);
    await page.locator('.transcript').evaluate(element=>element.scrollTop=0);
    await page.screenshot({path:path.join(directory,'agent-detail-offline.png'),fullPage:true});
    await page.setViewportSize({width:1070,height:900});await page.screenshot({path:path.join(directory,'agent-detail-split-offline.png'),fullPage:true});
    for(const width of [1070,680]) {await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+1),'No page horizontal overflow at '+width);}
    assert.deepEqual(errors,[]);console.log('Offline usage browser recipe passed: two suppliers, session comparison, readable JSON, one visible counter group, 1070/680 widths, no JS errors.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
