const nativeTerminals=new Map();
let activeNativeTerminal=null;
let nativeTerminalLayout=localStorage.getItem('atelier-terminal-layout') === 'tabs' ? 'tabs' : 'grid';
let nativeTerminalColumns=Math.max(1,Math.min(3,Number(localStorage.getItem('atelier-terminal-columns')) || 2));
let zoomedNativeTerminal=null, terminalPlacementSequence=0;
const terminalPaneObserver=new ResizeObserver(entries => {
  for (const entry of entries) {
    const tab=nativeTerminals.get(entry.target.dataset.terminalHost);
    if (tab && entry.contentRect.width > 20 && entry.contentRect.height > 20) tab.fit.fit();
  }
});

function currentNativeTerminals() {
  return [...nativeTerminals.values()].filter(tab => tab.projectId === projectId).sort((first,second) => first.order-second.order);
}

function nativeTerminalPane(tab) {
  return `<section class="native-terminal-pane ${tab.id === activeNativeTerminal ? 'selected' : ''}" data-terminal-pane="${tab.id}" style="flex-grow:${tab.weight || 1}"><header draggable="true" data-terminal-drag="${tab.id}"><span class="terminal-pane-title">${icon('terminal')}<span><strong>${esc(tab.title)}</strong><small>${esc(tab.cli)}${tab.model ? ' · '+esc(tab.model) : ''}</small></span></span><span class="terminal-native-status ${tab.exited ? 'ended' : ''}">${tab.exited ? 'Arrêté' : tab.pid ? 'Ouvert' : 'Démarrage'}</span>${btn('zoom-native-terminal','','external','icon-btn',`data-id="${tab.id}" aria-label="Agrandir / restaurer ${esc(tab.title)}" title="Agrandir / restaurer"`)}${btn('close-native-terminal','','close','icon-btn',`data-id="${tab.id}" aria-label="Terminer ${esc(tab.title)}" title="Terminer ce terminal"`)}</header><div class="terminal-pane-meta" data-terminal-meta="${tab.id}"></div><div class="terminal-pane-host" id="native-terminal-${tab.id}" data-terminal-host="${tab.id}"></div><footer class="native-session-footer"><div data-native-usage="${tab.id}"></div>${tab.runtime === 'codex' ? btn('native-usage-link','','usage','icon-btn',`data-id="${tab.id}" title="Associer une session Codex" aria-label="Associer une session Codex"`) : ''}</footer></section>`;
}

function terminalView() {
  const tabs=currentNativeTerminals();
  if (!tabs.some(tab => tab.id === activeNativeTerminal)) activeNativeTerminal=tabs[0]?.id || null;
  if (!tabs.some(tab => tab.id === zoomedNativeTerminal)) zoomedNativeTerminal=null;
  const visible=zoomedNativeTerminal ? tabs.filter(tab => tab.id === zoomedNativeTerminal) : nativeTerminalLayout === 'tabs' ? tabs.filter(tab => tab.id === activeNativeTerminal) : tabs;
  const columns=zoomedNativeTerminal || nativeTerminalLayout === 'tabs' ? 1 : Math.min(nativeTerminalColumns,Math.max(1,tabs.length));
  const launchers=`<div class="terminal-launchers">${[['codex','Codex'],['claude','Claude Code'],['opencode','OpenCode'],['omp','OMP']].map(([runtime,label]) => btn('launch-cli',label,'terminal','secondary',`data-runtime="${runtime}"`)).join('')}</div>`;
  const toolbar=`<div class="terminal-view-toolbar"><div class="segmented">${[['grid','Grille','grid'],['tabs','Onglets','terminal']].map(([layout,title,symbol]) => `<button class="${nativeTerminalLayout === layout ? 'selected' : ''}" data-action="terminal-layout" data-layout="${layout}">${icon(symbol)} ${title}</button>`).join('')}</div><label>Colonnes <select id="terminal-columns" aria-label="Nombre de colonnes" ${nativeTerminalLayout === 'tabs' ? 'disabled' : ''}>${[1,2,3].map(count => `<option ${count === nativeTerminalColumns ? 'selected' : ''}>${count}</option>`).join('')}</select></label><span>${tabs.length} terminal${tabs.length > 1 ? 's' : ''}</span></div>`;
  const board=tabs.length ? Array.from({length:columns},(_,column) => {
    const panels=visible.filter(tab => columns === 1 || tab.column % columns === column);
    return `<div class="terminal-column" data-terminal-column="${column}">${panels.map((tab,index) => `${index ? `<div class="terminal-splitter" role="separator" aria-orientation="horizontal" aria-label="Redimensionner les terminaux" tabindex="0" data-terminal-before="${panels[index-1].id}" data-terminal-after="${tab.id}"></div>` : ''}${nativeTerminalPane(tab)}`).join('')}</div>`;
  }).join('') : `<div class="terminal-empty">${icon('terminal')}<h2>Codex · Claude Code · OpenCode · OMP</h2><p class="muted">Choisis un CLI ci-dessus pour ouvrir son terminal.${window.atelierDesktop ? '' : ' Pour une grille intégrée, ouvre Atelier desktop.'}</p>${window.atelierDesktop ? '' : btn('launch-desktop','Ouvrir Atelier desktop','external','primary','data-mode="code"')}</div>`;
  return `${heading('TERMINAUX',view === 'agents' ? 'Agents' : 'Code','Terminaux interactifs',btn('agent-layout','Sessions outillées','agents','quiet','data-layout="grid"')+btn('new-native-terminal','Nouveau terminal','plus','primary'))}${launchers}${toolbar}${nativeTerminalLayout === 'tabs' && !zoomedNativeTerminal ? `<div class="browser-tabbar">${tabs.map(tab => `<div class="browser-tab ${tab.id === activeNativeTerminal ? 'selected' : ''}"><button data-action="select-native-terminal" data-id="${tab.id}">${esc(tab.title)}</button></div>`).join('')}</div>` : ''}<div id="native-terminal" class="native-terminal-board" style="--terminal-columns:${columns}">${board}</div>`;
}

function mountNativeTerminal() {
  terminalPaneObserver.disconnect();
  if (!document.getElementById('native-terminal')) return;
  for (const tab of currentNativeTerminals()) {
    const host=document.getElementById('native-terminal-'+tab.id);
    if (!host) continue;
    if (tab.terminal.element) host.append(tab.terminal.element);
    else tab.terminal.open(host);
    document.querySelector(`[data-terminal-meta="${tab.id}"]`).textContent=`${tab.cwd || project().path}${tab.pid ? ' · PID '+tab.pid : ''}`;
    terminalPaneObserver.observe(host);
  }
  requestAnimationFrame(() => { fitNativeTerminals(); nativeTerminals.get(activeNativeTerminal)?.terminal.focus(); });
  updateNativeUsage();
}

function fitNativeTerminals() {
  if (!document.getElementById('native-terminal')) return;
  for (const tab of currentNativeTerminals()) if (document.getElementById('native-terminal-'+tab.id)?.clientWidth > 20) tab.fit.fit();
}

function newNativeTerminalModal(runtime='codex') {
  modal('Ouvrir un terminal',project().path,`<form data-form="native-terminal"><div class="modal-body">${field('Nom du terminal','terminalName')}${select('CLI','cli',[['codex','Codex'],['claude','Claude Code'],['opencode','OpenCode'],['omp','OMP · Oh My Pi']],runtime)}<div id="native-model-fields">${['codex','omp'].includes(runtime) ? modelFields(runtime,'native_') : ''}</div>${select('Permissions','sandbox',[['read-only','Lecture seule / plan'],['workspace-write','Écriture projet · Codex']],'read-only')}<p class="muted small">Interface native du CLI. Le CLI démarre dans le dossier du projet, avec son écran et son clavier natifs. Claude Code et OpenCode démarrent en mode plan. Saisis ta mission directement dans le terminal.</p></div>${formFooter(window.atelierDesktop ? 'Ouvrir ici' : 'Ouvrir le terminal système')}</form>`);
  $('#modal [name="sandbox"]').options[1].disabled=runtime !== 'codex';
}

async function createNativeTerminal(settings) {
  if (!window.atelierDesktop) { const opened=await api('terminal/open',settings); $('#modal').close(); toast('Terminal système ouvert'+(opened.pid ? ' · PID '+opened.pid : '')+'.'); return; }
  if (!window.TerminalEngine) throw new Error('Assets terminal absents. Exécute npm run vendor.');
  const id=crypto.randomUUID();
  const terminal=new TerminalEngine.Terminal({cursorBlink:true,fontSize:14,fontFamily:'Consolas, monospace',scrollback:3000,theme:{background:'#242423',foreground:'#e6e2dc',cursor:'#d59b7a'}});
  const fit=new TerminalEngine.FitAddon(); terminal.loadAddon(fit);
  const cli={codex:'Codex',claude:'Claude Code',opencode:'OpenCode',omp:'OMP · Oh My Pi'}[settings.runtime];
  const columnCounts=Array(nativeTerminalColumns).fill(0);
  for (const existing of currentNativeTerminals()) columnCounts[existing.column % nativeTerminalColumns]++;
  const column=columnCounts.indexOf(Math.min(...columnCounts));
  const tab={id,projectId,title:settings.name?.trim().slice(0,80) || cli,cli,runtime:settings.runtime,model:settings.model,terminal,fit,exited:false,column,order:terminalPlacementSequence++,weight:1};
  nativeTerminals.set(id,tab); activeNativeTerminal=id; zoomedNativeTerminal=null;
  $('#modal').close(); route(view === 'agents' ? 'agents' : 'terminal');
  terminal.onData(data => { if (!tab.exited) window.atelierDesktop.writeTerminal(id,data); });
  terminal.onResize(({cols,rows}) => { if (!tab.exited) window.atelierDesktop.resizeTerminal(id,cols,rows); });
  try {
    Object.assign(tab,await window.atelierDesktop.createTerminal(id,settings));
    window.atelierDesktop.resizeTerminal(id,terminal.cols,terminal.rows);
    mountNativeTerminal();
    updateNativeTerminalStatus(tab);
  } catch (error) { tab.exited=true; terminal.writeln('\r\nDémarrage impossible : '+error.message); updateNativeTerminalStatus(tab); throw error; }
}

function updateNativeTerminalStatus(tab) {
  const label=document.querySelector(`[data-terminal-pane="${tab.id}"] .terminal-native-status`);
  if (label) { label.textContent=tab.exited ? 'Arrêté' : 'Ouvert'; label.classList.toggle('ended',tab.exited); }
}
function updateNativeUsage() {
  for (const tab of currentNativeTerminals()) {
    const host=document.querySelector(`[data-native-usage="${tab.id}"]`);
    if (!host || typeof sessionUsageSummary !== 'function') continue;
    const session=(state.nativeSessions || []).find(session => session.id === tab.id) || {runtime:tab.runtime || 'codex'};
    const account=provider(session.runtime || 'codex');
    host.innerHTML=sessionUsageSummary(session,{...account,plan:account.plan || session.accountPlan,limits:account.limits || session.accountLimits})+
      `<small class="native-usage-source">${session.usageSource ? 'Compteur natif · '+stamp(session.observedAt) : 'Compteur non communiqué'}${session.nativeThreadId ? ' · '+esc(session.nativeThreadId.slice(0,8)) : ''}</small>`;
  }
}

function installTerminalActions() {
  actions['native-usage-link']=async element => {
    const choices=await api('terminal/usage/choices?id='+encodeURIComponent(element.dataset.id));
    if (!choices.length) throw new Error('Aucune session Codex native observée dans ce projet. Envoyez un premier message dans le terminal.');
    modal('Associer le compteur natif','Choisissez la session correspondant à ce terminal.',`<form data-form="native-usage-link" data-id="${esc(element.dataset.id)}"><div class="modal-body">${select('Session Codex','threadId',choices.map(choice => [choice.id,stamp(choice.timestamp)+' · '+choice.id.slice(0,8)]))}<p class="muted small">Compteur de toute la session CLI, y compris les tours avant une reprise. Aucune conversation n’est importée.</p></div>${formFooter('Associer')}</form>`);
  };
  actions['new-native-terminal']=() => newNativeTerminalModal();
  actions['launch-cli']=el => newNativeTerminalModal(el.dataset.runtime);
  actions['select-native-terminal']=el => { activeNativeTerminal=el.dataset.id; render(); };
  actions['terminal-layout']=el => { nativeTerminalLayout=el.dataset.layout; zoomedNativeTerminal=null; localStorage.setItem('atelier-terminal-layout',nativeTerminalLayout); render(); };
  actions['zoom-native-terminal']=el => { activeNativeTerminal=el.dataset.id; zoomedNativeTerminal=zoomedNativeTerminal === el.dataset.id ? null : el.dataset.id; render(); };
  actions['close-native-terminal']=async el => { await window.atelierDesktop.closeTerminal(el.dataset.id); nativeTerminals.get(el.dataset.id)?.terminal.dispose(); nativeTerminals.delete(el.dataset.id); activeNativeTerminal=[...nativeTerminals.values()].filter(tab => tab.projectId === projectId).at(-1)?.id || null; render(); };
  window.atelierDesktop?.onTerminalData(({id,data}) => nativeTerminals.get(id)?.terminal.write(data));
  window.atelierDesktop?.onTerminalExit(({id,exitCode}) => { const tab=nativeTerminals.get(id); if (tab) { tab.exited=true; tab.terminal.writeln('\r\n[CLI terminé · code '+exitCode+']'); updateNativeTerminalStatus(tab); } });
  window.addEventListener('resize',fitNativeTerminals);
}
document.addEventListener('change',event => {
  if (event.target.id === 'terminal-columns') { nativeTerminalColumns=Number(event.target.value); localStorage.setItem('atelier-terminal-columns',String(nativeTerminalColumns)); render(); }
  const form=event.target.closest('[data-form="native-terminal"]');
  if (!form) return;
  if (event.target.name === 'cli') {
    $('#native-model-fields').innerHTML=['claude','opencode'].includes(event.target.value) ? '' : modelFields(event.target.value,'native_');
    if (event.target.value !== 'codex') form.elements.sandbox.value='read-only';
    form.elements.sandbox.options[1].disabled=event.target.value !== 'codex';
  }
  if (event.target.name === 'native_model') {
    const entry=(provider(form.elements.cli.value).models || []).find(model => model.model === event.target.value);
    form.elements.native_effort.innerHTML=(entry?.supportedReasoningEfforts || []).map(e => `<option value="${esc(e.reasoningEffort)}">${esc(e.reasoningEffort)}</option>`).join('');
  }
});
document.addEventListener('submit',async event => {
  const link=event.target.closest('[data-form="native-usage-link"]');
  if (link) {
    event.preventDefault();
    try {await api('terminal/usage/bind',{id:link.dataset.id,threadId:new FormData(link).get('threadId')});$('#modal').close();await refresh(true);}
    catch(error){toast(error.message,true);}
    return;
  }
  const form=event.target.closest('[data-form="native-terminal"]');
  if (!form) return;
  event.preventDefault();
  const values=Object.fromEntries(new FormData(form));
  try { await createNativeTerminal({projectId,name:values.terminalName,runtime:values.cli,model:values.native_model,effort:values.native_effort,sandbox:values.sandbox,role:'developer'}); }
  catch (error) { toast(error.message,true); }
});

document.addEventListener('pointerdown',event => {
  const pane=event.target.closest('[data-terminal-pane]');
  if (pane) {
    activeNativeTerminal=pane.dataset.terminalPane;
    document.querySelectorAll('[data-terminal-pane]').forEach(element => element.classList.toggle('selected',element === pane));
  }
  const splitter=event.target.closest('.terminal-splitter');
  if (!splitter || event.button !== 0) return;
  event.preventDefault();
  const before=splitter.previousElementSibling, after=splitter.nextElementSibling;
  for (const element of splitter.parentElement.querySelectorAll('[data-terminal-pane]')) { const height=element.clientHeight; element.style.flexGrow=height; nativeTerminals.get(element.dataset.terminalPane).weight=height; }
  const firstHeight=before.clientHeight, totalHeight=firstHeight+after.clientHeight, startY=event.clientY;
  splitter.setPointerCapture(event.pointerId);
  const move=pointer => {
    const height=Math.max(160,Math.min(totalHeight-160,firstHeight+pointer.clientY-startY));
    before.style.flexGrow=height; after.style.flexGrow=totalHeight-height;
    nativeTerminals.get(splitter.dataset.terminalBefore).weight=height;
    nativeTerminals.get(splitter.dataset.terminalAfter).weight=totalHeight-height;
  };
  const end=() => { splitter.removeEventListener('pointermove',move); splitter.removeEventListener('pointerup',end); splitter.removeEventListener('pointercancel',end); };
  splitter.addEventListener('pointermove',move); splitter.addEventListener('pointerup',end); splitter.addEventListener('pointercancel',end);
});

document.addEventListener('keydown',event => {
  const splitter=event.target.closest('.terminal-splitter');
  if (!splitter || !['ArrowUp','ArrowDown'].includes(event.key)) return;
  event.preventDefault();
  const before=splitter.previousElementSibling, after=splitter.nextElementSibling;
  for (const element of splitter.parentElement.querySelectorAll('[data-terminal-pane]')) { element.style.flexGrow=element.clientHeight; nativeTerminals.get(element.dataset.terminalPane).weight=element.clientHeight; }
  const delta=event.key === 'ArrowDown' ? 20 : -20;
  const height=Math.max(160,Math.min(before.clientHeight+after.clientHeight-160,before.clientHeight+delta));
  const remainder=before.clientHeight+after.clientHeight-height;
  before.style.flexGrow=height; after.style.flexGrow=remainder;
  nativeTerminals.get(splitter.dataset.terminalBefore).weight=height;
  nativeTerminals.get(splitter.dataset.terminalAfter).weight=remainder;
});

document.addEventListener('dragstart',event => {
  const header=event.target.closest('[data-terminal-drag]');
  if (!header) return;
  event.dataTransfer.setData('application/x-atelier-terminal',header.dataset.terminalDrag);
  event.dataTransfer.effectAllowed='move';
});
document.addEventListener('dragover',event => {
  if (event.target.closest('[data-terminal-column]') && event.dataTransfer.types.includes('application/x-atelier-terminal')) event.preventDefault();
});
document.addEventListener('drop',event => {
  const column=event.target.closest('[data-terminal-column]');
  const tab=nativeTerminals.get(event.dataTransfer.getData('application/x-atelier-terminal'));
  if (!column || !tab || tab.projectId !== projectId) return;
  event.preventDefault(); tab.column=Number(column.dataset.terminalColumn); tab.order=terminalPlacementSequence++; tab.weight=1;
  render();
});
