const nativeTerminals=new Map();
let activeNativeTerminal=null;
const NATIVE_TERMINAL_LAYOUTS=['floating','free','grid','tabs'];
let nativeTerminalLayout='floating';
let nativeTerminalColumns=Math.max(1,Math.min(3,Number(localStorage.getItem('atelier-terminal-columns')) || 2));
let zoomedNativeTerminal=null, terminalPlacementSequence=0;
const nativeWorkspaceLayouts=new Map();

function nativeWorkspaceLayout(id=projectId) {
  if (!nativeWorkspaceLayouts.has(id)) {
    let preferences={};
    try {preferences=JSON.parse(localStorage.getItem('atelier-code-workspace:'+id) || '{}') || {};} catch (_) {}
    nativeWorkspaceLayouts.set(id,{root:null,active:null,zoom:null,
      mode:preferences.chromeVersion === 1 && NATIVE_TERMINAL_LAYOUTS.includes(preferences.mode) ? preferences.mode : nativeTerminalLayout,
      columns:Math.max(1,Math.min(3,Number(preferences.columns) || nativeTerminalColumns)),
      dashboardVisible:preferences.dashboardVisible === true,
      dashboardWidth:Math.max(280,Math.min(680,Number(preferences.dashboardWidth) || 420)),
      windows:{},windowIdentity:null,front:null});
  }
  return nativeWorkspaceLayouts.get(id);
}

function rememberTerminalWorkspace() {
  const layout=nativeWorkspaceLayout();
  Object.assign(layout,{mode:nativeTerminalLayout,columns:nativeTerminalColumns,active:activeNativeTerminal,zoom:zoomedNativeTerminal});
  localStorage.setItem('atelier-code-workspace:'+projectId,JSON.stringify({mode:layout.mode,columns:layout.columns,
    dashboardVisible:layout.dashboardVisible,dashboardWidth:layout.dashboardWidth,chromeVersion:1}));
}

function activateTerminalWorkspace(id) {
  const layout=nativeWorkspaceLayout(id);
  nativeTerminalLayout=layout.mode;nativeTerminalColumns=layout.columns;
  activeNativeTerminal=layout.active;zoomedNativeTerminal=layout.zoom;
}
const terminalPaneObserver=new ResizeObserver(entries => {
  for (const entry of entries) {
    const tab=nativeTerminals.get(entry.target.dataset.terminalHost);
    if (tab && entry.contentRect.width > 20 && entry.contentRect.height > 20) fitNativeTerminal(tab,entry.target);
  }
});

function currentNativeTerminals() {
  return [...nativeTerminals.values()].filter(tab => tab.projectId === projectId).sort((first,second) => first.order-second.order);
}

function nativeTerminalPane(tab) {
  const floating=nativeTerminalLayout === 'floating';
  const status=tab.exited ? 'Terminal arrêté' : tab.pid ? 'Terminal ouvert · activité de l’agent non déduite' : 'Démarrage du terminal';
  const symbol={codex:'Co',claude:'Cl',opencode:'OC',omp:'OM'}[tab.runtime] || '›_';
  return `<section class="native-terminal-pane ${tab.id === activeNativeTerminal ? 'selected' : ''}" data-terminal-pane="${tab.id}" data-floating-panel="${tab.id}" style="flex-grow:${tab.weight || 1}"><header ${floating ? `data-window-drag="${tab.id}" tabindex="0" aria-label="Déplacer ${esc(tab.title)}"` : `draggable="true" data-terminal-drag="${tab.id}"`}><i class="terminal-native-status ${tab.exited ? 'ended' : tab.pid ? 'open' : 'starting'}" role="img" aria-label="${status}" title="${status}"></i><span class="provider-mark" title="${esc(tab.cli)}">${symbol}</span><span class="terminal-pane-title"><strong title="${esc(tab.title)}">${esc(tab.title)}</strong></span><span data-native-usage="${tab.id}" class="terminal-header-usage"></span>${btn('native-terminal-options','⋯','','icon-btn terminal-more',`data-id="${tab.id}" aria-label="Options de ${esc(tab.title)}" title="Options du terminal" aria-haspopup="menu"`)}${newPanelButton(`data-anchor="${tab.id}"`)}${btn('zoom-native-terminal','','external','icon-btn',`data-id="${tab.id}" aria-label="Agrandir / restaurer ${esc(tab.title)}" title="Agrandir / restaurer"`)}${btn('hide-native-terminal','','close','icon-btn',`data-id="${tab.id}" aria-label="Fermer le panneau ${esc(tab.title)}" title="Fermer le panneau · terminal conservé"`)}</header><div class="terminal-pane-host" id="native-terminal-${tab.id}" data-terminal-host="${tab.id}"></div>${floating ? `<button class="floating-resize" data-window-resize="${tab.id}" aria-label="Redimensionner ${esc(tab.title)}" title="Redimensionner"></button>` : ''}</section>`;
}

function nativeSplitMarkup(node) {
  if (!node) return '';
  if (node.type === 'pane') return nativeTerminalPane(nativeTerminals.get(node.id));
  const orientation=node.axis === 'horizontal' ? 'vertical' : 'horizontal';
  return `<div class="terminal-layout-split ${node.axis}" data-split-node="${node.id}"><div class="terminal-layout-child" style="flex-grow:${node.ratio}">${nativeSplitMarkup(node.first)}</div><div class="terminal-layout-separator" data-layout-split="${node.id}" role="separator" aria-orientation="${orientation}" aria-valuenow="${Math.round(node.ratio*100)}" aria-valuemin="12" aria-valuemax="88" aria-label="Redimensionner les panneaux ${orientation === 'vertical' ? 'en largeur' : 'en hauteur'}" tabindex="0"></div><div class="terminal-layout-child" style="flex-grow:${1-node.ratio}">${nativeSplitMarkup(node.second)}</div></div>`;
}

function terminalView() {
  const allTabs=currentNativeTerminals(), tabs=allTabs.filter(tab => !tab.hidden);
  const workspace=nativeWorkspaceLayout();
  workspace.root=TerminalLayout.reconcile(workspace.root,tabs.map(tab => tab.id));
  if (!tabs.some(tab => tab.id === activeNativeTerminal)) activeNativeTerminal=tabs[0]?.id || null;
  if (!tabs.some(tab => tab.id === zoomedNativeTerminal)) zoomedNativeTerminal=null;
  const visible=zoomedNativeTerminal ? tabs.filter(tab => tab.id === zoomedNativeTerminal) : nativeTerminalLayout === 'tabs' ? tabs.filter(tab => tab.id === activeNativeTerminal) : tabs;
  const columns=zoomedNativeTerminal || nativeTerminalLayout === 'tabs' ? 1 : Math.min(nativeTerminalColumns,Math.max(1,tabs.length));
  const floating=nativeTerminalLayout === 'floating', tools=workspaceTools('code');
  const toolbar=`<div class="workspace-toolbar"><h1>Code</h1><span class="workspace-toolbar-spacer"></span>${terminalOptionsButton()}${newPanelButton()}</div>`;
  const board=tabs.length ? floating ? tabs.map(nativeTerminalPane).join('') : nativeTerminalLayout === 'free' && !zoomedNativeTerminal ? nativeSplitMarkup(workspace.root) : Array.from({length:columns},(_,column) => {
    const panels=visible.filter(tab => columns === 1 || tab.column % columns === column);
    return `<div class="terminal-column" data-terminal-column="${column}">${panels.map((tab,index) => `${index ? `<div class="terminal-splitter" role="separator" aria-orientation="horizontal" aria-label="Redimensionner les terminaux" tabindex="0" data-terminal-before="${panels[index-1].id}" data-terminal-after="${tab.id}"></div>` : ''}${nativeTerminalPane(tab)}`).join('')}</div>`;
  }).join('') : `<div class="terminal-empty">${icon('terminal')}<h2>Votre espace de code</h2><p class="muted">Ouvrez un terminal ou ajoutez un panneau avec +.</p>${btn('new-native-terminal','Ouvrir un terminal','plus','quiet')}${window.atelierDesktop ? '' : btn('launch-desktop','Ouvrir Atelier desktop','external','quiet','data-mode="code"')}</div>`;
  const hidden=allTabs.filter(tab => tab.hidden);
  return `${toolbar}${nativeTerminalLayout === 'tabs' && !zoomedNativeTerminal ? `<div class="browser-tabbar">${tabs.map(tab => `<div class="browser-tab ${tab.id === activeNativeTerminal ? 'selected' : ''}"><button data-action="select-native-terminal" data-id="${tab.id}">${esc(tab.title)}</button></div>`).join('')}</div>` : ''}<div class="terminal-surface ${workspace.dashboardVisible ? 'with-dashboard' : ''}" style="--dashboard-width:${workspace.dashboardWidth}px;--tool-dock-width:${tools.width}px"><div id="native-terminal" class="native-terminal-board ${floating ? 'floating-board' : nativeTerminalLayout === 'free' && !zoomedNativeTerminal ? 'free-layout' : ''}" style="--terminal-columns:${columns}">${floating && tools.tools.length && !tabs.length ? '' : board}${floating ? workspaceToolPane() : ''}</div>${!floating && tools.tools.length ? workspaceToolPane() : workspace.dashboardVisible ? '<div class="dashboard-dock-separator" role="separator" aria-orientation="vertical" tabindex="0" aria-label="Redimensionner le dashboard"></div>'+dashboardDock() : ''}</div>${hidden.length ? `<div class="minimized-panels" aria-label="Panneaux masqués">${hidden.map(tab => btn('restore-native-terminal',esc(tab.title),'terminal','quiet',`data-id="${tab.id}" title="Rouvrir le panneau"`)).join('')}</div>` : ''}`;
}

function mountNativeTerminal() {
  terminalPaneObserver.disconnect();
  if (!document.getElementById('native-terminal')) return;
  for (const tab of currentNativeTerminals()) {
    const host=document.getElementById('native-terminal-'+tab.id);
    if (!host) continue;
    if (tab.terminal.element) host.append(tab.terminal.element);
    else tab.terminal.open(host);
    terminalPaneObserver.observe(host);
  }
  fitNativeTerminals();
  requestAnimationFrame(() => { fitNativeTerminals(); nativeTerminals.get(activeNativeTerminal)?.terminal.focus(); });
  updateNativeUsage();
}

function fitNativeTerminals() {
  if (!document.getElementById('native-terminal')) return;
  for (const tab of currentNativeTerminals()) {
    const host=document.getElementById('native-terminal-'+tab.id);
    if (host?.clientWidth > 20 && host.clientHeight > 20) fitNativeTerminal(tab,host);
  }
}

function fitNativeTerminal(tab,host) {
  const size=FloatingPanels.fontSize({width:host.clientWidth-16,height:host.clientHeight-10},tab.preferredFontSize || 13);
  if (tab.terminal.options.fontSize !== size) tab.terminal.options.fontSize=size;
  host.dataset.fontSize=String(size);
  tab.fit.fit();
}

function newNativeTerminalModal(runtime='codex',placement={}) {
  modal('Ouvrir un terminal',project().path,`<form data-form="native-terminal" data-anchor="${esc(placement.anchorId || '')}" data-side="${esc(placement.side || '')}"><div class="modal-body">${select('Outil','cli',[['codex','Codex'],['claude','Claude Code'],['opencode','OpenCode'],['omp','OMP · Oh My Pi']],runtime)}<div id="native-model-fields">${['codex','omp'].includes(runtime) ? modelFields(runtime,'native_') : ''}</div>${select('Permissions','sandbox',[['read-only','Lecture seule / plan'],['workspace-write','Écriture projet · Codex']],'read-only')}<details class="terminal-launch-details"><summary>Nom et espace de travail</summary>${field('Nom du terminal','terminalName')}${select('Espace de travail','terminalProject',state.projects.map(workspace => [workspace.id,workspace.name]),projectId)}</details><p class="muted small">Saisissez votre mission dans le terminal. Claude Code et OpenCode démarrent en mode plan.</p></div>${formFooter(window.atelierDesktop ? 'Ouvrir ici' : 'Ouvrir le terminal système')}</form>`);
  $('#modal [name="sandbox"]').options[1].disabled=runtime !== 'codex';
}

async function createNativeTerminal(settings) {
  const targetProjectId=settings.projectId || projectId;
  const {placement={},...launchSettings}=settings;
  settings={...launchSettings,projectId:targetProjectId};
  if (!window.atelierDesktop) { const opened=await api('terminal/open',settings); $('#modal').close(); toast('Terminal système ouvert'+(opened.pid ? ' · PID '+opened.pid : '')+'.'); return; }
  if (!window.TerminalEngine) throw new Error('Assets terminal absents. Exécute npm run vendor.');
  const id=crypto.randomUUID();
  const terminal=new TerminalEngine.Terminal({cursorBlink:true,fontSize:13,fontFamily:'Consolas, monospace',scrollback:3000,theme:{background:'#191919',foreground:'#e6e2dc',cursor:'#d59b7a'}});
  const fit=new TerminalEngine.FitAddon(); terminal.loadAddon(fit);
  const cli={codex:'Codex',claude:'Claude Code',opencode:'OpenCode',omp:'OMP · Oh My Pi'}[settings.runtime];
  const columnCounts=Array(nativeTerminalColumns).fill(0);
  for (const existing of currentNativeTerminals()) columnCounts[existing.column % nativeTerminalColumns]++;
  const column=columnCounts.indexOf(Math.min(...columnCounts));
  const tab={id,projectId:targetProjectId,title:settings.name?.trim().slice(0,80) || cli,cli,runtime:settings.runtime,model:settings.model,terminal,fit,exited:false,column,order:terminalPlacementSequence++,weight:1};
  nativeTerminals.set(id,tab);
  const workspace=nativeWorkspaceLayout(targetProjectId);
  workspace.root=TerminalLayout.append(workspace.root,id,placement);
  if (placement.side) workspace.mode='free';
  if (targetProjectId !== projectId) actions.project({dataset:{id:targetProjectId}});
  if (placement.side) nativeTerminalLayout='free';
  activeNativeTerminal=id; zoomedNativeTerminal=null;
  rememberTerminalWorkspace();
  $('#modal').close(); route(view === 'agents' ? 'agents' : 'terminal');
  terminal.onData(data => { if (!tab.exited) window.atelierDesktop.writeTerminal(id,data); });
  terminal.onResize(({cols,rows}) => { if (!tab.exited) window.atelierDesktop.resizeTerminal(id,cols,rows); });
  try {
    Object.assign(tab,await window.atelierDesktop.createTerminal(id,settings));
    window.atelierDesktop.resizeTerminal(id,terminal.cols,terminal.rows);
    if (projectId === targetProjectId) mountNativeTerminal();
    updateNativeTerminalStatus(tab);
    renderWorkspaceList();updateAgentDashboard();
  } catch (error) { tab.exited=true; terminal.writeln('\r\nDémarrage impossible : '+error.message); updateNativeTerminalStatus(tab); throw error; }
}

function updateNativeTerminalStatus(tab) {
  const label=document.querySelector(`[data-terminal-pane="${tab.id}"] .terminal-native-status`);
  if (label) {
    const description=tab.exited ? 'Terminal arrêté' : 'Terminal ouvert · activité de l’agent non déduite';
    label.title=description;label.setAttribute('aria-label',description);label.classList.toggle('ended',tab.exited);label.classList.toggle('open',!tab.exited);label.classList.remove('starting');
  }
}
function updateNativeUsage() {
  for (const tab of currentNativeTerminals()) {
    const host=document.querySelector(`[data-native-usage="${tab.id}"]`);
    if (!host || typeof sessionUsageSummary !== 'function') continue;
    const session=(state.nativeSessions || []).find(session => session.id === tab.id) || {runtime:tab.runtime || 'codex'};
    const account=provider(session.runtime || 'codex');
    const wasOpen=Boolean(host.querySelector('details[open]'));
    host.innerHTML=sessionUsageChip(session,{...account,plan:account.plan || session.accountPlan,limits:account.limits || session.accountLimits},{label:'Consommation de '+tab.title});
    if (wasOpen) host.querySelector('details').open=true;
  }
}

function nativeTerminalOptionsMenu(element) {
  const tab=nativeTerminals.get(element.dataset.id);
  if (!tab) return;
  const model=tab.model ? `<small>${esc(tab.model)}</small>` : '';
  showPopover(element,`<div class="popover-heading"><strong>${esc(tab.cli)}</strong></div><div class="panel-menu" role="menu"><small class="terminal-menu-location">${esc(tab.cwd || project().path)}${tab.pid ? ' · PID '+tab.pid : ''}</small>${model}${btn('terminal-font','Texte plus grand','plus','quiet',`data-id="${tab.id}" data-delta="1" role="menuitem"`)}${btn('terminal-font','Texte plus petit','','quiet',`data-id="${tab.id}" data-delta="-1" role="menuitem"`)}${btn('split-native-terminal','Terminal à droite','split-horizontal','quiet',`data-id="${tab.id}" data-side="right" role="menuitem"`)}${btn('split-native-terminal','Terminal en dessous','split-vertical','quiet',`data-id="${tab.id}" data-side="bottom" role="menuitem"`)}${tab.runtime === 'codex' ? btn('native-usage-link','Associer une session Codex','usage','quiet',`data-id="${tab.id}" role="menuitem"`) : ''}<span class="menu-divider"></span>${btn('hide-native-terminal','Réduire le panneau','pause','quiet',`data-id="${tab.id}" role="menuitem"`)}${btn('close-native-terminal',tab.exited ? 'Retirer le terminal' : 'Arrêter le terminal','close','quiet',`data-id="${tab.id}" role="menuitem"`)}</div>`,true);
}

function installTerminalActions() {
  activateTerminalWorkspace(projectId);
  actions['native-usage-link']=async element => {
    const choices=await api('terminal/usage/choices?id='+encodeURIComponent(element.dataset.id));
    if (!choices.length) throw new Error('Aucune session Codex native observée dans ce projet. Envoyez un premier message dans le terminal.');
    modal('Associer la session native','Choisissez la session correspondant à ce terminal.',`<form data-form="native-usage-link" data-id="${esc(element.dataset.id)}"><div class="modal-body">${select('Session Codex','threadId',choices.map(choice => [choice.id,stamp(choice.timestamp)+' · '+choice.id.slice(0,8)]))}<p class="muted small">Cette association permet de suivre les compteurs et les sous-agents de ce terminal. Le compteur couvre toute la session CLI, y compris les tours avant une reprise. Aucune conversation n’est importée.</p></div>${formFooter('Associer')}</form>`);
  };
  actions['new-native-terminal']=() => newNativeTerminalModal();
  actions['launch-cli']=el => newNativeTerminalModal(el.dataset.runtime);
  actions['split-native-terminal']=element => {closePopover();newNativeTerminalModal(nativeTerminals.get(element.dataset.id)?.runtime || 'codex',{anchorId:element.dataset.id,side:element.dataset.side});};
  actions['toggle-agent-dashboard']=() => {
    closePopover();
    if (nativeTerminalLayout === 'floating') {
      const tools=workspaceTools('code');
      if (tools.tools.includes('dashboard')) return actions['close-tool-panel']({dataset:{tool:'dashboard'}});
      return actions['panel-open-tool']({dataset:{tool:'dashboard'}});
    }
    const workspace=nativeWorkspaceLayout();workspace.dashboardVisible=!workspace.dashboardVisible;rememberTerminalWorkspace();render();
  };
  actions['native-terminal-options']=nativeTerminalOptionsMenu;
  actions['terminal-font']=element => {const tab=nativeTerminals.get(element.dataset.id);if (tab) {tab.preferredFontSize=Math.max(10,Math.min(20,(tab.preferredFontSize || 13)+Number(element.dataset.delta)));fitNativeTerminals();}closePopover();};
  actions['hide-native-terminal']=element => {closePopover();const tab=nativeTerminals.get(element.dataset.id);if (tab) tab.hidden=true;if (zoomedNativeTerminal === element.dataset.id) zoomedNativeTerminal=null;render();};
  actions['restore-native-terminal']=element => {const tab=nativeTerminals.get(element.dataset.id);if (tab) tab.hidden=false;activeNativeTerminal=element.dataset.id;render();};
  actions['select-native-terminal']=el => { activeNativeTerminal=el.dataset.id; render(); };
  actions['terminal-layout']=el => {closePopover();if (!NATIVE_TERMINAL_LAYOUTS.includes(el.dataset.layout)) return;if (el.dataset.layout === 'free' && nativeTerminalLayout === 'grid') nativeWorkspaceLayout().root=TerminalLayout.arrange(currentNativeTerminals().filter(tab => !tab.hidden).map(tab => tab.id),nativeTerminalColumns);nativeTerminalLayout=el.dataset.layout;zoomedNativeTerminal=null;workspaceTools().zoom=false;rememberTerminalWorkspace();render();};
  actions['zoom-native-terminal']=el => { activeNativeTerminal=el.dataset.id; zoomedNativeTerminal=zoomedNativeTerminal === el.dataset.id ? null : el.dataset.id;workspaceTools().zoom=false;rememberTerminalWorkspace();render(); };
  actions['close-native-terminal']=async el => {closePopover();await window.atelierDesktop.closeTerminal(el.dataset.id);const tab=nativeTerminals.get(el.dataset.id);if (tab) nativeWorkspaceLayout(tab.projectId).root=TerminalLayout.remove(nativeWorkspaceLayout(tab.projectId).root,tab.id);tab?.terminal.dispose();nativeTerminals.delete(el.dataset.id);if (zoomedNativeTerminal === el.dataset.id) zoomedNativeTerminal=null;activeNativeTerminal=currentNativeTerminals().filter(tab => !tab.hidden).at(-1)?.id || null;rememberTerminalWorkspace();render();};
  window.atelierDesktop?.onTerminalData(({id,data}) => nativeTerminals.get(id)?.terminal.write(data));
  window.atelierDesktop?.onTerminalExit(({id,exitCode}) => { const tab=nativeTerminals.get(id); if (tab) { tab.exited=true;tab.exitCode=exitCode;tab.terminal.writeln('\r\n[Terminal terminé · code '+exitCode+']');updateNativeTerminalStatus(tab);renderWorkspaceList();updateAgentDashboard(); } });
  window.addEventListener('resize',fitNativeTerminals);
}
document.addEventListener('change',event => {
  if (event.target.id === 'terminal-columns') {nativeTerminalColumns=Number(event.target.value);rememberTerminalWorkspace();render();}
  if (event.target.name === 'codeWorkspace') actions.project({dataset:{id:event.target.value}});
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
  try {await createNativeTerminal({projectId:values.terminalProject,name:values.terminalName,runtime:values.cli,model:values.native_model,effort:values.native_effort,sandbox:values.sandbox,role:'developer',placement:{anchorId:form.dataset.anchor,side:form.dataset.side || undefined}});}
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

function resizeFreeSplit(separator,ratio) {
  const workspace=nativeWorkspaceLayout();
  workspace.root=TerminalLayout.resize(workspace.root,separator.dataset.layoutSplit,ratio);
  const percent=Math.max(.12,Math.min(.88,ratio));
  separator.previousElementSibling.style.flexGrow=percent;
  separator.nextElementSibling.style.flexGrow=1-percent;
  separator.setAttribute('aria-valuenow',String(Math.round(percent*100)));
}

function resizeDashboardDock(width) {
  const surface=document.querySelector('.terminal-surface');
  if (!surface) return;
  const workspace=nativeWorkspaceLayout();
  workspace.dashboardWidth=Math.max(280,Math.min(680,surface.clientWidth*.65,width));
  surface.style.setProperty('--dashboard-width',workspace.dashboardWidth+'px');
}

document.addEventListener('pointerdown',event => {
  const separator=event.target.closest('.terminal-layout-separator,.dashboard-dock-separator');
  if (!separator || event.button !== 0) return;
  event.preventDefault();
  const isDock=separator.classList.contains('dashboard-dock-separator');
  const horizontal=isDock || separator.parentElement.classList.contains('horizontal');
  const start=horizontal ? event.clientX : event.clientY;
  const first=separator.previousElementSibling;
  const total=first.getBoundingClientRect()[horizontal ? 'width' : 'height']+separator.nextElementSibling.getBoundingClientRect()[horizontal ? 'width' : 'height'];
  const initial=isDock ? nativeWorkspaceLayout().dashboardWidth : first.getBoundingClientRect()[horizontal ? 'width' : 'height'];
  separator.setPointerCapture(event.pointerId);
  const move=pointer => {
    const delta=(horizontal ? pointer.clientX : pointer.clientY)-start;
    if (isDock) resizeDashboardDock(initial-delta);
    else resizeFreeSplit(separator,(initial+delta)/total);
  };
  const end=() => {separator.removeEventListener('pointermove',move);separator.removeEventListener('pointerup',end);separator.removeEventListener('pointercancel',end);rememberTerminalWorkspace();};
  separator.addEventListener('pointermove',move);separator.addEventListener('pointerup',end);separator.addEventListener('pointercancel',end);
});

document.addEventListener('keydown',event => {
  const separator=event.target.closest('.terminal-layout-separator,.dashboard-dock-separator');
  if (!separator) return;
  const isDock=separator.classList.contains('dashboard-dock-separator');
  const horizontal=isDock || separator.parentElement.classList.contains('horizontal');
  const keys=horizontal ? ['ArrowLeft','ArrowRight'] : ['ArrowUp','ArrowDown'];
  if (!keys.includes(event.key)) return;
  event.preventDefault();
  const direction=event.key === keys[0] ? -1 : 1;
  if (isDock) resizeDashboardDock(nativeWorkspaceLayout().dashboardWidth-direction*20);
  else resizeFreeSplit(separator,Number(separator.getAttribute('aria-valuenow'))/100+direction*.04);
  rememberTerminalWorkspace();
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
  if (nativeTerminalLayout !== 'free' || !event.dataTransfer.types.includes('application/x-atelier-terminal')) return;
  const pane=event.target.closest('[data-terminal-pane]');
  if (!pane) return;
  event.preventDefault();
  document.querySelectorAll('[data-drop-side]').forEach(element => {if (element !== pane) delete element.dataset.dropSide;});
  const rect=pane.getBoundingClientRect(), x=(event.clientX-rect.x)/rect.width, y=(event.clientY-rect.y)/rect.height;
  const edges=[['left',x],['right',1-x],['top',y],['bottom',1-y]];
  pane.dataset.dropSide=edges.sort((first,second) => first[1]-second[1])[0][0];
});
document.addEventListener('drop',event => {
  const pane=event.target.closest('[data-terminal-pane]');
  const moved=nativeTerminals.get(event.dataTransfer.getData('application/x-atelier-terminal'));
  if (nativeTerminalLayout === 'free' && pane && moved?.projectId === projectId) {
    event.preventDefault();
    const workspace=nativeWorkspaceLayout();
    workspace.root=TerminalLayout.move(workspace.root,moved.id,pane.dataset.terminalPane,pane.dataset.dropSide || 'right');
    activeNativeTerminal=moved.id;zoomedNativeTerminal=null;render();return;
  }
  const column=event.target.closest('[data-terminal-column]');
  const tab=nativeTerminals.get(event.dataTransfer.getData('application/x-atelier-terminal'));
  if (!column || !tab || tab.projectId !== projectId) return;
  event.preventDefault(); tab.column=Number(column.dataset.terminalColumn); tab.order=terminalPlacementSequence++; tab.weight=1;
  render();
});
document.addEventListener('dragend',() => document.querySelectorAll('[data-drop-side]').forEach(pane => delete pane.dataset.dropSide));
document.addEventListener('dragleave',event => {const pane=event.target.closest('[data-drop-side]');if (pane && !pane.contains(event.relatedTarget)) delete pane.dataset.dropSide;});
