const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {test}=require('node:test');

function resourceHarness(api=async () => ({})) {
  const handlers={}, draft={value:'',focus(){},setSelectionRange(){},maxLength:16000};
  const context=vm.createContext({
    console,setTimeout,projectId:'atelier',view:'overview',api,render(){},File,FileReader:class {
      async readAsDataURL(file) {
        this.result='data:'+file.type+';base64,'+Buffer.from(await file.arrayBuffer()).toString('base64');
        this.onload();
      }
    },
    document:{addEventListener(type,handler){handlers[type]=handler;}},
    $:selector => selector === '#duplica-message' ? draft : null,
    esc:text => String(text).replace(/[&<>"']/g,value => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[value])),
    toast(){},duplicaActions:{},structureDuplicaInstruction(){},async refresh(){},FormData,URL,fetch
  });
  vm.runInContext(fs.readFileSync('web/duplica_resources.js','utf8'),context);
  return {context,handlers,draft,run:source => vm.runInContext(source,context)};
}

function chatHarness(api) {
  const harness=resourceHarness(api);
  vm.runInContext(fs.readFileSync('web/duplica_chat.js','utf8'),harness.context);
  harness.context.form={dataset:{form:'duplica-chat'}};
  harness.context.fields={text:'# Objectif\n\nExaminer les pièces jointes.'};
  harness.draft.value=harness.context.fields.text;
  return harness;
}

function fileEntry(name) {
  return {name,isFile:true,isDirectory:false,file:resolve => resolve(new File(['Notes'],name,{type:'text/plain'}))};
}

function directoryEntry(name,entries) {
  return {name,isFile:false,isDirectory:true,createReader(){
    let pending=entries;
    return {readEntries(resolve){const current=pending;pending=[];resolve(current);}};
  }};
}

test('Dropped folders retain paths of files with identical names',async () => {
  const harness=resourceHarness();
  harness.context.transfer={items:[{webkitGetAsEntry:() => directoryEntry('projet',[
    directoryEntry('a',[fileEntry('notes.txt')]),directoryEntry('b',[fileEntry('notes.txt')])
  ])}]};
  const files=await harness.run('droppedFiles(transfer)');
  assert.deepEqual(Array.from(files,file => file.webkitRelativePath),['projet/a/notes.txt','projet/b/notes.txt']);
});

test('The twelve-file boundary allows remaining empty or excluded directories',async () => {
  const harness=resourceHarness();
  harness.context.transfer={items:[{webkitGetAsEntry:() => directoryEntry('projet',[
    ...Array.from({length:12},(_,index) => fileEntry(index+'.txt')),
    directoryEntry('vide',[]),directoryEntry('.git',[fileEntry('config')])
  ])}]};
  assert.equal((await harness.run('droppedFiles(transfer)')).length,12);
});

test('Thirteen shareable files are rejected',async () => {
  const harness=resourceHarness();
  harness.context.transfer={items:[{webkitGetAsEntry:() => directoryEntry('projet',
    Array.from({length:13},(_,index) => fileEntry(index+'.txt')))}]};
  await assert.rejects(harness.run('droppedFiles(transfer)'),/12 fichiers/);
});

test('Folder selection skips private files and generated directories before uploading',async () => {
  const uploaded=[];
  const harness=resourceHarness(async (_route,data) => {uploaded.push(data.name);return {id:data.name,size:5};});
  harness.context.selected=['dossier/notes.txt','dossier/AUTH.JSON','dossier/node_modules/module.txt','dossier/secret.KEY'].map(name => {
    const file=new File(['Notes'],name.split('/').at(-1),{type:'text/plain'});
    Object.defineProperty(file,'webkitRelativePath',{value:name});return file;
  });
  await harness.run('addDuplicaFiles(selected)');
  assert.deepEqual(uploaded,['dossier/notes.txt']);
});

test('Removing an attachment during an upload keeps it removed',async () => {
  let finish,started;
  const began=new Promise(resolve => {started=resolve;});
  const harness=resourceHarness(async () => {started();return new Promise(resolve => {finish=resolve;});});
  harness.run("duplicaDraftAttachments.set('atelier',[{id:'old',size:5}])");
  harness.context.selected=[new File(['Notes'],'new.txt',{type:'text/plain'})];
  const upload=harness.run('addDuplicaFiles(selected)');
  await began;
  harness.run("duplicaDraftAttachments.set('atelier',[])");
  finish({id:'new',size:5});await upload;
  assert.deepEqual(Array.from(harness.run('draftAttachments()'),attachment => attachment.id),['new']);
});

test('An upload remains attached to the original project after navigation',async () => {
  let finish,started;
  const began=new Promise(resolve => {started=resolve;});
  const harness=resourceHarness(async () => {started();return new Promise(resolve => {finish=resolve;});});
  harness.context.selected=[new File(['Notes'],'new.txt',{type:'text/plain'})];
  const upload=harness.run('addDuplicaFiles(selected)');
  await began;harness.run("projectId='other'");finish({id:'new',size:5});await upload;
  assert.equal(harness.run('draftAttachments().length'),0);
  assert.equal(harness.run("duplicaDraftAttachments.get('atelier').length"),1);
});

test('A pending send rejects duplicates and retains new text and attachments',async () => {
  let finish,started,calls=0;
  const began=new Promise(resolve => {started=resolve;});
  const harness=chatHarness(async () => {calls++;started();return new Promise(resolve => {finish=resolve;});});
  harness.run("duplicaDraftAttachments.set('atelier',[{id:'submitted',size:5}])");
  const send=harness.run('handleDuplicaChatSubmit(form,fields)');await began;
  await assert.rejects(harness.run('handleDuplicaChatSubmit(form,fields)'),/en cours d’envoi/);
  harness.run("rememberDuplicaDraft('Nouveau brouillon');duplicaDraftAttachments.get('atelier').push({id:'new',size:5})");
  harness.draft.value='Nouveau brouillon';finish({});await send;
  assert.equal(calls,1);
  assert.equal(harness.run("duplicaDraftText.get('atelier')"),'Nouveau brouillon');
  assert.equal(harness.draft.value,'Nouveau brouillon');
  assert.deepEqual(Array.from(harness.run('draftAttachments()'),attachment => attachment.id),['new']);
});

test('A failed send preserves the draft and attachments for an explicit retry',async () => {
  let calls=0;
  const harness=chatHarness(async () => {if (++calls === 1) throw new Error('Service indisponible');return {};});
  harness.run("duplicaDraftAttachments.set('atelier',[{id:'submitted',size:5}])");
  await assert.rejects(harness.run('handleDuplicaChatSubmit(form,fields)'),/Service indisponible/);
  assert.equal(harness.run("duplicaDraftText.get('atelier')"),harness.context.fields.text);
  assert.equal(harness.run('draftAttachments().length'),1);
  assert.equal(harness.run('duplicaSending.size'),0);
  await harness.run('handleDuplicaChatSubmit(form,fields)');
  assert.equal(calls,2);
  assert.equal(harness.run('draftAttachments().length'),0);
  assert.equal(harness.draft.value,'');
});

test('A send response affects its original project after a project switch',async () => {
  let finish,started;
  const began=new Promise(resolve => {started=resolve;}),submitted=[];
  const harness=chatHarness(async (_route,data) => {submitted.push(data);started();return new Promise(resolve => {finish=resolve;});});
  const send=harness.run('handleDuplicaChatSubmit(form,fields)');await began;
  harness.run("projectId='other';rememberDuplicaDraft('Autre brouillon')");
  harness.draft.value='Autre brouillon';finish({});await send;
  assert.equal(submitted[0].projectId,'atelier');
  assert.equal(harness.run("duplicaDraftText.has('atelier')"),false);
  assert.equal(harness.run("duplicaDraftText.get('other')"),'Autre brouillon');
  assert.equal(harness.draft.value,'Autre brouillon');
});
