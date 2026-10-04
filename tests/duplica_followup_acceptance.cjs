const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');

async function main() {
  const browser=await chromium.launch({headless:true,channel:process.env.ATELIER_BROWSER_CHANNEL || 'chrome'});
  const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];
  const evidence=path.resolve('.atelier/feedback-followup-evidence');fs.mkdirSync(evidence,{recursive:true});
  page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(15000);
  const base=process.env.ATELIER_TEST_URL || 'http://127.0.0.1:4345/';
  try {
    await page.goto(base+'#duplica');
    await page.getByLabel('Message à Duplica').waitFor();
    const draft='# Objectif\n\nRelire les fichiers et les preuves.\n\n## Critères\n\n- Conserver le Markdown.';
    await page.getByLabel('Message à Duplica').fill(draft);
    await page.evaluate(()=>{route('overview');route('duplica');});
    assert.equal(await page.getByLabel('Message à Duplica').inputValue(),draft,'A draft survives navigation to another tool');
    const other=await page.evaluate(async () => {
      const saved=await api('save',{kind:'project',value:{name:'Autre projet · recette',path:project().path}});
      await refresh(true);return saved;
    });
    await page.evaluate(id=>actions.project({dataset:{id}}),other.id);
    assert.equal(await page.getByLabel('Message à Duplica').inputValue(),'','Projects have independent drafts');
    await page.getByLabel('Message à Duplica').fill('Autre brouillon');
    await page.evaluate(()=>actions.project({dataset:{id:'atelier'}}));
    assert.equal(await page.getByLabel('Message à Duplica').inputValue(),draft);

    // Block the upload response so removal occurs while the request is still pending.
    await page.locator('#duplica-files').setInputFiles({name:'ancien.txt',mimeType:'text/plain',buffer:Buffer.from('Ancienne pièce jointe')});
    await page.waitForFunction(()=>draftAttachments().length === 1 && !duplicaUploading.size);
    let finishUpload,uploadStarted;
    const uploadGate=new Promise(resolve=>{finishUpload=resolve;}),startedUpload=new Promise(resolve=>{uploadStarted=resolve;});
    await page.route('**/api/attachments/upload',async request=>{uploadStarted();await uploadGate;await request.continue();});
    await page.locator('#duplica-files').setInputFiles({name:'nouveau.txt',mimeType:'text/plain',buffer:Buffer.from('Nouvelle pièce jointe')});
    await startedUpload;
    await page.getByRole('button',{name:'Retirer ancien.txt',exact:true}).click();
    finishUpload();
    await page.waitForFunction(()=>!duplicaUploading.size);
    assert.deepEqual(await page.evaluate(()=>draftAttachments().map(attachment=>attachment.name)),['nouveau.txt']);
    assert.equal(await page.getByLabel('Message à Duplica').inputValue(),draft);
    await page.unroute('**/api/attachments/upload');

    // The response can arrive after a state refresh replaces the submitted form.
    let finishSend,sendStarted;
    const sendGate=new Promise(resolve=>{finishSend=resolve;}),startedSend=new Promise(resolve=>{sendStarted=resolve;});
    await page.route('**/api/duplica/discussion',async request=>{sendStarted();await sendGate;await request.continue();});
    await page.getByRole('button',{name:'Envoyer à Duplica',exact:true}).click();
    await startedSend;
    await page.evaluate(()=>render());
    assert.equal(await page.getByRole('button',{name:'Envoyer à Duplica',exact:true}).isDisabled(),true,'Rendering keeps an in-flight send disabled');
    finishSend();
    await page.waitForFunction(()=>state.duplica.discussion.deliveries.at(-1)?.status === 'completed');
    assert.equal(await page.getByLabel('Message à Duplica').inputValue(),'','The submitted draft clears even after form replacement');
    await page.unroute('**/api/duplica/discussion');
    assert.equal(await page.locator('.duplica-chat-message.user .chat-attachment').count(),1);
    await page.screenshot({path:path.join(evidence,'duplica-followup.png'),fullPage:true});
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(evidence,'followup-result.json'),JSON.stringify({passed:true,fixture:true,draftNavigation:true,projectDrafts:true,attachmentRemovalDuringUpload:true,sendDuringRender:true,errors},null,2));
    console.log('Duplica followup passed: project drafts, file upload removal, one pending send, Markdown and attachments.');
  } catch(error) {
    fs.writeFileSync(path.join(evidence,'followup-failure.json'),JSON.stringify({error:error.message,stack:error.stack,errors},null,2));
    await page.screenshot({path:path.join(evidence,'followup-failure.png'),fullPage:true}).catch(()=>{});throw error;
  } finally {await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
