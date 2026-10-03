"use strict";

const WORKSPACE_TOOLS = {dashboard:['Dashboard','grid'], files:['Fichiers','folder'], design:['Architecture','network'], browser:['ChatGPT','agents']};
const workspaceToolStates = new Map(), workspaceFileStates = new Map();
let lastWorkspaceMode = 'chat', workspacePanelGesture = null;
const floatingBoardObserver = new ResizeObserver(() => layoutFloatingWorkspace());

function workspaceMode() {
  if (view === 'terminal' || (view === 'agents' && agentLayout === 'terminals')) return 'code';
  if (['duplica','channels'].includes(view)) return 'agent';
  if (view === 'webchat') return 'chat';
  return null;
}

function workspaceTools(mode=workspaceMode() || lastWorkspaceMode) {
  const key=projectId+':'+mode;
  if (!workspaceToolStates.has(key)) {
    let saved={};
    try { saved=JSON.parse(localStorage.getItem('atelier-tools:'+key) || '{}') || {}; } catch (_) {}
    const tools=Array.isArray(saved.tools) ? [...new Set(saved.tools)].filter(tool => WORKSPACE_TOOLS[tool] && !(tool === 'browser' && mode === 'chat')) : [];
    workspaceToolStates.set(key,{key,tools,active:tools.includes(saved.active) ? saved.active : tools[0],
      width:Math.max(280,Math.min(640,Number(saved.width) || 400)),zoom:false});
  }
  return workspaceToolStates.get(key);
}

function rememberWorkspaceTools() {
  const tools=workspaceTools();
  localStorage.setItem('atelier-tools:'+tools.key,JSON.stringify({tools:tools.tools,active:tools.active,width:tools.width}));
}

function renderShellModes() {
  const mode=workspaceMode();
  if (mode) lastWorkspaceMode=mode;
  $('#mode-nav').innerHTML=[['chat','Chat'],['agent','Agent'],['code','Code']].map(([id,label]) =>
    `<button data-action="switch-mode" data-mode="${id}" class="${mode === id ? 'selected' : ''}" aria-pressed="${mode === id}">${label}</button>`).join('');
  $('#workspace-selector').innerHTML=state.projects.map(workspace => `<option value="${esc(workspace.id)}" ${workspace.id === projectId ? 'selected' : ''}>${esc(workspace.name)}</option>`).join('');
  $('.workspace').classList.toggle('in-workspace-mode',Boolean(mode));
}

function newPanelButton(extra='') {
  return btn('new-panel','','plus','icon-btn new-panel-button',`title="Nouveau panneau" aria-label="Nouveau panneau" aria-haspopup="menu" ${extra}`);
}

function agentModeNavigation() {
  return `<nav class="agent-mode-navigation" aria-label="Espace Agent">${[['duplica','Duplica','spark'],['channels','Canaux','network']].map(([route,label,symbol]) => btn('navigate',label,symbol,view === route ? 'quiet selected' : 'quiet',`data-view="${route}" aria-pressed="${view === route}"`)).join('')}</nav>`;
}

function terminalOptionsButton() {
  return btn('workspace-options','','settings','icon-btn','title="Disposition et options" aria-label="Disposition et options" aria-haspopup="menu"');
}

function showNewPanelMenu(anchor) {
  const terminalAnchor=anchor.dataset.anchor || '';
  const menus=[['dashboard','Dashboard','grid'],['files','Fichiers','folder'],['design','Architecture','network'],['browser',view === 'webchat' ? 'Nouveau chat ChatGPT' : 'ChatGPT','agents']];
  const content=`<div class="popover-heading"><strong>Nouveau panneau</strong>${btn('close-popover','','close','icon-btn','aria-label="Fermer le menu"')}</div><div class="panel-menu" role="menu">${workspaceMode() === 'agent' ? btn('panel-new-channel','Nouveau canal d’agents','network','quiet','role="menuitem"') : ''}${btn('panel-open-terminal','Terminal','terminal','quiet',`role="menuitem" data-anchor="${esc(terminalAnchor)}"`)}${menus.map(([tool,label,symbol]) => btn('panel-open-tool',label,symbol,'quiet',`role="menuitem" data-tool="${tool}"`)).join('')}<span class="menu-divider"></span><small>Terminaux d’agents</small>${[['codex','Codex','Co'],['claude','Claude Code','Cl'],['opencode','OpenCode','OC'],['omp','Oh My Pi','OM']].map(([runtime,label,symbol]) => `<button class="button quiet" role="menuitem" data-action="panel-open-terminal" data-runtime="${runtime}" data-anchor="${esc(terminalAnchor)}"><span class="provider-mark">${symbol}</span>${label}</button>`).join('')}</div>`;
  showPopover(anchor,content,true);
}

function showWorkspaceOptions(anchor) {
  const layouts=[['floating','Fenêtres libres'],['free','Mosaïque'],['grid','Grille'],['tabs','Onglets']];
  showPopover(anchor,`<div class="popover-heading"><strong>Disposition</strong></div><div class="panel-menu" role="menu">${layouts.map(([layout,label]) => btn('terminal-layout',label,nativeTerminalLayout === layout ? 'check' : 'grid','quiet',`role="menuitemradio" aria-checked="${nativeTerminalLayout === layout}" data-layout="${layout}"`)).join('')}${btn('arrange-panels','Réorganiser les fenêtres','grid','quiet','role="menuitem"')}<span class="menu-divider"></span>${btn('toggle-agent-dashboard','Dashboard','grid','quiet','role="menuitem"')}${btn('agent-layout','Historique des sessions','clock','quiet','data-layout="grid" role="menuitem"')}</div>`,true);
}

function workspaceToolContent() {
  const tool=workspaceTools().active;
  if (tool === 'dashboard') return `<section class="agent-dashboard"><div class="tool-scope">${dashboardScopeSelector()}</div><div data-dashboard-content>${dashboardContent()}</div></section>`;
  if (tool === 'files') return workspaceFilesContent();
  if (tool === 'design') return designView();
  if (tool === 'browser') return webChatView();
  return '';
}

function workspaceToolPane() {
  const tools=workspaceTools();
  if (!tools.tools.length) return '';
  const [title,symbol]=WORKSPACE_TOOLS[tools.active];
  const floating=workspaceMode() === 'code' && nativeTerminalLayout === 'floating';
  return `<aside class="workspace-tool-pane ${tools.zoom ? 'tool-maximized' : ''}" data-floating-panel="tools" aria-label="Panneau ${title}"><header class="workspace-panel-header" ${floating ? 'data-window-drag="tools" tabindex="0" aria-label="Déplacer le panneau outil"' : ''}><strong>${icon(symbol)} ${title}</strong>${newPanelButton()}${btn('zoom-tool-panel','','external','icon-btn',`title="${tools.zoom ? 'Restaurer' : 'Agrandir'} le panneau" aria-label="${tools.zoom ? 'Restaurer' : 'Agrandir'} le panneau outil"`)}${btn('close-tool-panel','','close','icon-btn',`data-tool="${tools.active}" aria-label="Fermer le panneau ${title}" title="Fermer le panneau ${title}"`)}</header>${tools.tools.length > 1 ? `<div class="tool-panel-tabs">${tools.tools.map(tool => `<button data-action="select-tool-panel" data-tool="${tool}" class="${tool === tools.active ? 'selected' : ''}">${icon(WORKSPACE_TOOLS[tool][1])}${WORKSPACE_TOOLS[tool][0]}</button>`).join('')}</div>` : ''}<div class="workspace-tool-content">${workspaceToolContent()}</div>${floating ? '<button class="floating-resize" data-window-resize="tools" aria-label="Redimensionner le panneau outil"></button>' : '<div class="tool-dock-resize" role="separator" tabindex="0" aria-label="Redimensionner le panneau outil" aria-orientation="vertical"></div>'}</aside>`;
}

function mountWorkspaceTools() {
  floatingBoardObserver.disconnect();
  const mode=workspaceMode();
  $('#main').classList.remove('with-workspace-tools');
  if (!mode) {requestAnimationFrame(syncBrowserPanel);return;}
  const tools=workspaceTools(mode);
  if (mode && mode !== 'code' && tools.tools.length) {
    const content=document.createElement('div');content.className='workspace-mode-content';
    while ($('#main').firstChild) content.append($('#main').firstChild);
    $('#main').append(content);
    $('#main').insertAdjacentHTML('beforeend',workspaceToolPane());
    $('#main').classList.add('with-workspace-tools');
    $('#main').style.setProperty('--tool-dock-width',tools.width+'px');
  }
  if (document.querySelector('.workspace-tool-pane #design-canvas')) mountDesign();
  if (tools.active === 'files' && document.querySelector('.workspace-tool-pane .workspace-files') && !workspaceFileStates.has(projectId)) loadWorkspaceFiles().catch(error => toast(error.message,true));
  const board=$('.floating-board');
  if (board) { floatingBoardObserver.observe(board);layoutFloatingWorkspace(); }
  requestAnimationFrame(syncBrowserPanel);
}

function workspaceFilesContent() {
  const files=workspaceFileStates.get(projectId);
  const path=files?.path || '';
  const entries=(files?.entries || []).map(file => `<button class="file-entry" data-action="panel-file" data-path="${esc(file.path)}" draggable="true">${icon(file.directory ? 'folder' : 'code')}<span>${esc(file.name)}</span></button>`).join('');
  return `<section class="workspace-files"><div class="resource-navigation">${btn('panel-file','','folder','icon-btn','data-path="" aria-label="Racine du projet" title="Racine du projet"')}${btn('panel-file','','chevron','icon-btn',`data-path="${esc(path.replaceAll('\\','/').split('/').slice(0,-1).join('/'))}" aria-label="Dossier parent" title="Dossier parent" ${path ? '' : 'disabled'}`)}<span>${esc(path || project().name)}</span></div><div class="workspace-file-list">${files?.error ? `<p class="muted small">${esc(files.error)}</p>` : entries || '<p class="muted small">'+(!files || files.loading ? 'Chargement…' : 'Ce dossier est vide.')+'</p>'}</div>${files?.content != null ? `<article class="workspace-file-preview"><strong>${esc(files.filePath)}</strong><small>Lecture seule</small><pre>${esc(files.content)}</pre></article>` : ''}</section>`;
}

async function loadWorkspaceFiles(path='') {
  const requestedProject=projectId, previous=workspaceFileStates.get(projectId) || {path:'',entries:[]};
  const generation=(previous.generation || 0)+1;
  workspaceFileStates.set(requestedProject,{...previous,generation,loading:true,error:null});
  let result;
  try {result=await api('files?project='+encodeURIComponent(requestedProject)+'&path='+encodeURIComponent(path));}
  catch (error) {
    if (workspaceFileStates.get(requestedProject)?.generation !== generation) return;
    workspaceFileStates.set(requestedProject,{...previous,generation,loading:false,error:error.message});
    if (projectId !== requestedProject) return;
    if (projectId === requestedProject && workspaceMode() && workspaceTools().active === 'files') {
      const host=document.querySelector('.workspace-tool-content');
      if (host) host.innerHTML=workspaceFilesContent();
    }
    throw error;
  }
  if (workspaceFileStates.get(requestedProject)?.generation !== generation) return;
  const files=result.entries ? {path,entries:result.entries,generation} : {...previous,filePath:result.path,content:result.content,generation,loading:false,error:null};
  workspaceFileStates.set(requestedProject,files);
  const host=document.querySelector('.workspace-tool-content');
  if (projectId === requestedProject && workspaceMode() && host && workspaceTools().active === 'files') host.innerHTML=workspaceFilesContent();
}

function floatingViewport() {
  const board=$('.floating-board');
  return {width:board?.clientWidth || 1000,height:board?.clientHeight || 650};
}

function floatingWindowIds() {
  return [...currentNativeTerminals().filter(tab => !tab.hidden).map(tab => tab.id),...(workspaceTools('code').tools.length ? ['tools'] : [])];
}

function layoutFloatingWorkspace() {
  const board=$('.floating-board');
  if (!board || innerWidth <= 760) return;
  const layout=nativeWorkspaceLayout(), ids=floatingWindowIds(), viewport=floatingViewport();
  const identity=ids.join('|');
  if (layout.windowIdentity !== identity) {
    layout.windows=FloatingPanels.arrange(ids,viewport);layout.windowIdentity=identity;
  }
  if (!ids.includes(layout.front)) layout.front=ids.includes(activeNativeTerminal) ? activeNativeTerminal : ids[0] || null;
  for (const pane of board.querySelectorAll('[data-floating-panel]')) {
    const id=pane.dataset.floatingPanel;
    const isZoomed=zoomedNativeTerminal === id || (id === 'tools' && workspaceTools('code').zoom);
    const otherZoomed=Boolean(zoomedNativeTerminal || workspaceTools('code').zoom);
    pane.hidden=otherZoomed && !isZoomed;
    const rect=isZoomed ? {x:0,y:0,width:1,height:1} : FloatingPanels.constrain(layout.windows[id],viewport);
    if (!isZoomed) layout.windows[id]=rect;
    pane.style.zIndex=id === layout.front || isZoomed ? '3' : '1';
    pane.classList.toggle('selected',id === layout.front);
    applyFloatingRect(pane,rect);
  }
}

function applyFloatingRect(pane,rect) {
  Object.assign(pane.style,{left:rect.x*100+'%',top:rect.y*100+'%',width:rect.width*100+'%',height:rect.height*100+'%'});
}

function focusFloatingPanel(id) {
  const layout=nativeWorkspaceLayout();
  layout.front=id;
  if (nativeTerminals.has(id)) {activeNativeTerminal=id;layout.active=id;}
  document.querySelectorAll('.floating-board>[data-floating-panel]').forEach(pane => {
    pane.style.zIndex=pane.dataset.floatingPanel === id ? '3' : '1';
    pane.classList.toggle('selected',pane.dataset.floatingPanel === id);
  });
  syncBrowserPanel();
}

function installWorkspacePanelActions() {
  actions['switch-mode']=element => {closePopover();route({chat:'webchat',agent:'duplica',code:'terminal'}[element.dataset.mode]);};
  actions['new-panel']=showNewPanelMenu;
  actions['panel-new-channel']=() => {closePopover();route('channels');actions['channel-new']();};
  actions['workspace-options']=showWorkspaceOptions;
  actions['panel-open-terminal']=element => {closePopover();newNativeTerminalModal(element.dataset.runtime || 'codex',{anchorId:element.dataset.anchor});};
  actions['panel-open-tool']=async element => {
    const tool=element.dataset.tool;closePopover();
    if (!WORKSPACE_TOOLS[tool]) return;
    if (!workspaceMode()) route('terminal');
    if (tool === 'browser' && view === 'webchat') return actions['browser-new']();
    const tools=workspaceTools();
    if (!tools.tools.includes(tool)) tools.tools.push(tool);
    tools.active=tool;tools.zoom=false;rememberWorkspaceTools();
    if (workspaceMode() === 'code') nativeWorkspaceLayout().dashboardVisible=false;
    render();
    if (tool === 'browser' && !webChatTabs.some(tab => tab.projectId === projectId)) await actions['browser-new']();
  };
  actions['select-tool-panel']=element => {captureDesign();workspaceTools().active=element.dataset.tool;rememberWorkspaceTools();render();};
  actions['close-tool-panel']=element => {
    captureDesign();const tools=workspaceTools();
    tools.tools=tools.tools.filter(tool => tool !== element.dataset.tool);tools.active=tools.tools[0];tools.zoom=false;
    rememberWorkspaceTools();render();
  };
  actions['zoom-tool-panel']=() => {const tools=workspaceTools();tools.zoom=!tools.zoom;zoomedNativeTerminal=null;render();};
  actions['arrange-panels']=() => {closePopover();nativeWorkspaceLayout().windowIdentity=null;zoomedNativeTerminal=null;workspaceTools().zoom=false;layoutFloatingWorkspace();fitNativeTerminals();};
  actions['panel-file']=element => loadWorkspaceFiles(element.dataset.path);
}

document.addEventListener('pointerdown',event => {
  const windowPane=event.target.closest('.floating-board>[data-floating-panel]');
  if (windowPane) focusFloatingPanel(windowPane.dataset.floatingPanel);
  const handle=event.target.closest('[data-window-drag],[data-window-resize],.tool-dock-resize');
  if (!handle || event.button !== 0 || (event.target.closest('button,summary,details') && !handle.matches('button'))) return;
  const isDock=handle.classList.contains('tool-dock-resize');
  if (!isDock && (innerWidth <= 760 || zoomedNativeTerminal || workspaceTools().zoom)) return;
  event.preventDefault();
  const id=handle.dataset.windowDrag || handle.dataset.windowResize;
  const viewport=floatingViewport(), rect={...nativeWorkspaceLayout().windows[id]}, initialWidth=workspaceTools().width;
  if (!isDock && handle.dataset.windowDrag && (rect.width > .95 || rect.height > .95)) {
    rect.width=Math.min(.9,rect.width);rect.height=Math.min(.85,rect.height);
    nativeWorkspaceLayout().windows[id]={...rect};applyFloatingRect(windowPane,rect);
  }
  const start={x:event.clientX,y:event.clientY};
  workspacePanelGesture=handle;handle.setPointerCapture(event.pointerId);syncBrowserPanel();
  const move=pointer => {
    const delta={x:pointer.clientX-start.x,y:pointer.clientY-start.y};
    if (isDock) {
      workspaceTools().width=Math.max(280,Math.min(640,innerWidth*.65,initialWidth-delta.x));
      $('#main').style.setProperty('--tool-dock-width',workspaceTools().width+'px');
      $('.terminal-surface')?.style.setProperty('--tool-dock-width',workspaceTools().width+'px');
    } else {
      const updated=handle.dataset.windowResize ? FloatingPanels.resize(rect,delta,viewport) : FloatingPanels.move(rect,delta,viewport);
      nativeWorkspaceLayout().windows[id]=updated;applyFloatingRect(windowPane,updated);
    }
  };
  const end=() => {
    handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',end);handle.removeEventListener('pointercancel',end);
    workspacePanelGesture=null;rememberWorkspaceTools();rememberTerminalWorkspace();syncBrowserPanel();
  };
  handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
});

document.addEventListener('keydown',event => {
  const handle=event.target.closest('[data-window-drag],[data-window-resize],.tool-dock-resize');
  const deltas={ArrowLeft:{x:-16,y:0},ArrowRight:{x:16,y:0},ArrowUp:{x:0,y:-16},ArrowDown:{x:0,y:16}};
  if (!handle || !deltas[event.key] || innerWidth <= 760) return;
  event.preventDefault();
  if (handle.classList.contains('tool-dock-resize')) {
    workspaceTools().width=Math.max(280,Math.min(640,workspaceTools().width-deltas[event.key].x));rememberWorkspaceTools();render();return;
  }
  if (zoomedNativeTerminal || workspaceTools().zoom) return;
  const id=handle.dataset.windowDrag || handle.dataset.windowResize,layout=nativeWorkspaceLayout();
  layout.windows[id]=handle.dataset.windowResize ? FloatingPanels.resize(layout.windows[id],deltas[event.key],floatingViewport()) : FloatingPanels.move(layout.windows[id],deltas[event.key],floatingViewport());
  layoutFloatingWorkspace();rememberTerminalWorkspace();
});

document.addEventListener('dragstart',event => {
  const file=event.target.closest('.workspace-files [draggable="true"]');
  if (!file) return;
  if (window.atelierDesktop) {event.preventDefault();window.atelierDesktop.dragFile({projectId,path:file.dataset.path}).catch(error => toast(error.message,true));}
  else event.dataTransfer.setData('text/plain',file.dataset.path);
});
