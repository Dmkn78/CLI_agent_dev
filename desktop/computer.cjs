"use strict";
const {BrowserWindow}=require('electron');
const {randomUUID}=require('node:crypto');
const staleObservation=message => Object.assign(new Error(message),{code:'stale_observation'});
const sameControl=(current,expected) => current && expected &&
  ['label','role','action','view','approvalId','questionId','decision'].every(key => current[key] === expected[key]);

// Fixed observation program. No caller supplied JS, selectors, or evaluation.
const observeDocument=String.raw`(() => {
  const modal=document.querySelector('dialog[open]');
  const elements=Array.from(document.querySelectorAll('button,input,textarea,select,a,[role="button"]'));
  const controls=elements.map((element,index) => {
    const rect=element.getBoundingClientRect(), style=getComputedStyle(element);
    if (modal && !modal.contains(element) || !rect.width || !rect.height || style.visibility === 'hidden' || style.display === 'none' || element.type === 'password') return null;
    const approval=element.closest('[data-approval-id]');
    return {index,label:(element.getAttribute('aria-label') || (element.labels?.[0]?.textContent) || element.innerText || element.placeholder || '').trim().slice(0,500),
      role:element.tagName.toLowerCase(),enabled:!element.disabled,visible:rect.bottom>0 && rect.right>0 && rect.top<innerHeight && rect.left<innerWidth,action:element.dataset.action || '',view:element.dataset.view || '',
      approvalId:approval?.dataset.approvalId || null,questionId:element.dataset.questionId || null,
      decision:element.dataset.approvalDecision || null,
      rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height}};
  }).filter(Boolean).slice(0,300);
  const focused=document.activeElement;
  return {text:document.body.innerText.slice(0,30000),controls,modalOpen:!!modal,
    focusedIndex:elements.indexOf(focused),passwordFocused:focused?.type === 'password'};
})()`;

function isLocalURL(address) {
  return address.protocol === 'http:' && ['127.0.0.1','localhost','[::1]'].includes(address.hostname) && !address.username && !address.password;
}

function registerComputerController({getWindow,request,fixture}) {
  let testWindow=null, stopped=false, polling=false;
  const observations=new Map();
  const windowFor=target => target === 'platform' ? getWindow() : target === 'local-browser' ? testWindow : null;
  async function inspect(target) {
    const window=windowFor(target);
    if (!window || window.isDestroyed()) throw new Error('La fenêtre cible n’est pas ouverte.');
    const contents=window.webContents;
    const document=await contents.executeJavaScript(observeDocument);
    const capture=await contents.capturePage();
    let png=capture.resize({width:Math.min(1000,capture.getSize().width)}).toPNG();
    if (png.length > 700000) png=capture.resize({width:600}).toPNG();
    if (png.length > 700000) throw new Error('La capture dépasse la limite locale.');
    const observationId=randomUUID();
    for (const [id,observation] of observations) if (Date.now()-observation.createdAt > 20000) observations.delete(id);
    const snapshot={...document,observationId,target,url:contents.getURL(),title:contents.getTitle(),createdAt:Date.now()};
    observations.set(observationId,snapshot);
    return {...snapshot,png:png.toString('base64')};
  }
  async function perform(job) {
    const observation=observations.get(job.payload.observation);
    observations.delete(job.payload.observation);
    if (!observation || observation.target !== job.target || Date.now()-observation.createdAt > 20000) throw new Error('Observation périmée ou cible modifiée.');
    const window=windowFor(job.target), contents=window?.webContents, action=job.payload.action;
    if (!contents || contents.isDestroyed() || contents.getURL() !== observation.url) throw new Error('Fenêtre fermée ou navigation modifiée.');
    const permission=await request('/api/duplica/computer/check',{id:job.id,generation:job.generation});
    if (!permission.allowed) throw new Error('Le contrôle a été repris.');
    if (action.kind === 'open_url') {
      const address=new URL(action.url);
      if (!isLocalURL(address)) throw new Error('Seules les applications HTTP locales sont autorisées ici.');
      if (!testWindow || testWindow.isDestroyed()) {
        testWindow=new BrowserWindow({show:!fixture,width:1100,height:820,title:'Duplica · recette locale',
          webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,partition:'duplica-local-test'}});
        testWindow.webContents.setWindowOpenHandler(() => ({action:'deny'}));
        testWindow.webContents.on('will-navigate',(event,url) => { if (!isLocalURL(new URL(url))) event.preventDefault(); });
        testWindow.webContents.on('will-redirect',(event,url) => { if (!isLocalURL(new URL(url))) event.preventDefault(); });
        testWindow.webContents.session.webRequest.onBeforeRequest((details,callback) => {
          const address=new URL(details.url);
          callback({cancel:!isLocalURL(address) && !['data:','blob:','about:'].includes(address.protocol)});
        });
        testWindow.webContents.session.setPermissionRequestHandler((_contents,_permission,callback) => callback(false));
      }
      await testWindow.loadURL(address.href);
      return inspect('local-browser');
    }
    const current=await contents.executeJavaScript(observeDocument);
    if (action.kind === 'scroll_to') {
      const expected=observation.controls.find(control => control.index === action.index);
      const control=current.controls.find(control => control.index === action.index);
      if (!sameControl(control,expected)) throw staleObservation('Le contrôle à faire défiler a changé ; aucune action émise.');
      // Only a control returned by the fixed observation program can be revealed.
      await contents.executeJavaScript(`Array.from(document.querySelectorAll('button,input,textarea,select,a,[role="button"]'))[${control.index}].scrollIntoView({block:'center'})`);
    } else if (['click','double_click'].includes(action.kind)) {
      const expected=observation.controls.find(control => control.index === action.index);
      const control=current.controls.find(control => control.index === action.index);
      if (!sameControl(control,expected) || !control.enabled || !control.visible ||
          ['x','y','width','height'].some(key => Math.abs(control.rect[key]-expected.rect[key]) > 2)) throw staleObservation('Le contrôle a changé depuis l’observation ; aucun clic émis.');
      const x=Math.round(control.rect.x+control.rect.width/2), y=Math.round(control.rect.y+control.rect.height/2);
      const count=action.kind === 'double_click' ? 2 : 1;
      for (let index=1; index<=count; index++) {
        contents.sendInputEvent({type:'mouseMove',x,y});
        contents.sendInputEvent({type:'mouseDown',x,y,button:'left',clickCount:index});
        contents.sendInputEvent({type:'mouseUp',x,y,button:'left',clickCount:index});
      }
    } else if (action.kind === 'type_text') {
      const control=current.controls.find(control => control.index === current.focusedIndex);
      const expected=observation.controls.find(control => control.index === observation.focusedIndex);
      if (current.passwordFocused || current.focusedIndex !== observation.focusedIndex || !sameControl(control,expected) || !['input','textarea'].includes(control.role) ||
          typeof action.text !== 'string' || action.text.length > 8000) throw new Error('Saisie refusée : champ observé non focalisé ou sensible.');
      await contents.insertText(action.text);
    } else if (action.kind === 'press_key') {
      const supported={Enter:['Enter',[]],Tab:['Tab',[]],Escape:['Escape',[]],Backspace:['Backspace',[]],ArrowDown:['Down',[]],ArrowUp:['Up',[]],'Ctrl+A':['A',['control']]};
      const key=supported[action.key];
      if (!key || current.passwordFocused || current.focusedIndex !== observation.focusedIndex) throw new Error('Raccourci inconnu ou focus modifié.');
      contents.sendInputEvent({type:'keyDown',keyCode:key[0],modifiers:key[1]});
      contents.sendInputEvent({type:'keyUp',keyCode:key[0],modifiers:key[1]});
    } else if (action.kind === 'scroll') {
      if (!Number.isFinite(action.deltaY) || Math.abs(action.deltaY) > 1500) throw new Error('Défilement invalide.');
      const [width,height]=window.getContentSize();
      contents.sendInputEvent({type:'mouseWheel',x:Math.round(width/2),y:Math.round(height/2),deltaY:action.deltaY,deltaX:0});
    } else throw new Error('Action PC inconnue.');
    await new Promise(resolve => setTimeout(resolve,100));
    return inspect(job.target);
  }
  const timer=setInterval(async () => {
    if (stopped || polling || !getWindow() || getWindow().isDestroyed()) return;
    polling=true;
    let job;
    try {
      ({job}=await request('/api/duplica/computer/poll',{}));
      if (!job) return;
      const result=job.operation === 'observe' ? await inspect(job.target) : await perform(job);
      await request('/api/duplica/computer/complete',{id:job.id,result});
    } catch (error) {
      if (job) await request('/api/duplica/computer/complete',{id:job.id,error:String(error.message),errorCode:error.code === 'stale_observation' ? error.code : null}).catch(() => {});
    } finally { polling=false; }
  },500);
  return () => { stopped=true; clearInterval(timer); observations.clear(); if (testWindow && !testWindow.isDestroyed()) testWindow.close(); };
}
module.exports={registerComputerController};
