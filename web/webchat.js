let webChatTabs=[], activeWebChatId=null, browserResourcePath='', browserResources=null, browserResourceContent=null;
let browserResourceGeneration=0;
let observedBrowserPanel=null;
const browserPanelObserver=new ResizeObserver(() => syncBrowserPanel());

function webChatView() {
  const tabs=webChatTabs.filter(tab => tab.projectId === projectId);
  const active=tabs.find(tab => tab.id === activeWebChatId) || tabs.at(-1);
  if (active) activeWebChatId=active.id;
  const tools=btn('toggle-resources','','folder','icon-btn','title="Afficher / masquer les ressources" aria-label="Afficher / masquer les ressources"')+btn('chat-focus','','external','icon-btn','title="Agrandir / restaurer le chat" aria-label="Agrandir / restaurer le chat"')+sessionUsageChip(null,{}, {label:'Consommation de ChatGPT',notice:'Le site ChatGPT ne communique pas ses tokens à Atelier.'})+newPanelButton();
  const navigation=['back','forward','reload','home'].map((action,index) => btn('browser-navigate','',['arrow','arrow','refresh','grid'][index],'icon-btn',`data-navigation="${action}" title="${['Précédent','Suivant','Actualiser la page','Accueil ChatGPT'][index]}" aria-label="${['Précédent','Suivant','Actualiser la page','Accueil ChatGPT'][index]}" ${!active || (action === 'back' && !active.back) || (action === 'forward' && !active.forward) ? 'disabled' : ''}`)).join('');
  const resources=(browserResources?.entries || []).map(file => `<button class="file-entry" data-action="browser-resource" data-path="${esc(file.path)}" draggable="true" title="${file.directory ? 'Ouvrir ou glisser les fichiers de ce dossier' : 'Ouvrir ou glisser ce fichier'}">${icon(file.directory ? 'folder' : 'code')}<span>${esc(file.name)}</span></button>`).join('');
  return `<div class="workspace-toolbar chat-workspace-toolbar"><h1>ChatGPT</h1><span class="workspace-toolbar-spacer"></span>${tools}</div><div class="browser-tabbar">${tabs.map(tab => `<div class="browser-tab ${tab.id === activeWebChatId ? 'selected' : ''}"><button data-action="browser-select" data-id="${esc(tab.id)}">${esc(tab.title)}</button><button class="icon-btn" data-action="browser-close" data-id="${esc(tab.id)}" title="Fermer ce chat" aria-label="Fermer ce chat">${icon('close')}</button></div>`).join('')}</div><div class="browser-navigation">${navigation}<input id="browser-address" aria-label="Adresse du chat" value="${esc(active?.url || 'https://chatgpt.com/')}" readonly><span id="browser-load-state">${active?.loading ? 'Chargement…' : ''}</span></div><div class="browser-workspace"><aside class="browser-resources"><div class="panel-heading"><h2>Ressources</h2>${btn('toggle-resources','','close','icon-btn','title="Masquer les ressources" aria-label="Masquer les ressources"')}</div><div class="resource-navigation">${btn('browser-root','','folder','icon-btn','title="Dossier du projet" aria-label="Dossier du projet"')}${btn('browser-up','','arrow','icon-btn',`title="Dossier parent" aria-label="Dossier parent" ${!browserResourcePath ? 'disabled' : ''}`)}<span class="resource-path">${esc(browserResourcePath || project().name)}</span></div><div class="browser-file-list">${resources}</div>${browserResourceContent ? `<section class="resource-preview"><strong>${esc(browserResourceContent.path)}</strong><textarea id="browser-resource-text" rows="8" aria-label="Contenu de la ressource" readonly>${esc(browserResourceContent.content)}</textarea>${btn('browser-copy-resource','Copier','code','quiet')}</section>` : ''}<section class="browser-instructions"><h3>Consignes</h3><textarea id="browser-instructions" rows="5" aria-label="Consignes à copier pour ChatGPT" placeholder="Contexte SQL, méthode, contraintes…">${esc(localStorage.getItem('atelier-chat-instructions-'+projectId) || '')}</textarea>${btn('browser-copy-instructions','Copier','code','quiet')}</section><div class="browser-privacy">Connexion web indépendante de Codex, conservée dans Atelier desktop. Dépôt volontaire des fichiers à OpenAI. Tokens du site non exposés.</div></aside><section id="browser-panel" class="browser-panel">${active ? `<div class="browser-loading"><p>${active.loading ? 'Chargement du navigateur…' : 'ChatGPT'}</p>${btn('focus-browser-panel','Afficher le navigateur','external','quiet')}</div>` : `<div class="browser-external"><h2>${window.atelierDesktop ? 'Ouvrir ChatGPT' : 'ChatGPT dans Atelier desktop'}</h2>${btn('browser-new',window.atelierDesktop ? 'Nouveau chat' : 'Ouvrir Atelier desktop','plus','primary')}</div>`}</section></div>`;
}

async function loadBrowserResources(path='') {
  const generation=++browserResourceGeneration;
  const requestedProject=projectId;
  const result=await api('files?project='+encodeURIComponent(requestedProject)+'&path='+encodeURIComponent(path));
  if (requestedProject !== projectId || generation !== browserResourceGeneration) return;
  if (result.entries) { browserResourcePath=path; browserResources={...result,projectId:requestedProject}; browserResourceContent=null; }
  else browserResourceContent=result;
  render();
}

function syncBrowserPanel() {
  const desktop=window.atelierDesktop;
  const tab=webChatTabs.find(tab => tab.id === activeWebChatId && tab.projectId === projectId);
  const visible=Boolean($('#browser-panel') && tab) && !$('#modal').open && $('#work-popover').hidden && !navigationPreview && !workspacePanelGesture && !document.querySelector('.usage-chip[open],.action-menu[open]') && !browserPanelOccluded();
  if (desktop) {
    desktop.showBrowser(visible ? tab.id : null);
    if (visible && $('#browser-panel')) {
      if (observedBrowserPanel !== $('#browser-panel')) {
        browserPanelObserver.disconnect(); observedBrowserPanel=$('#browser-panel'); browserPanelObserver.observe(observedBrowserPanel);
      }
      const rect=$('#browser-panel').getBoundingClientRect();
      const y=Math.max(rect.y,$('.topbar').getBoundingClientRect().bottom);
      const footer=$('.statusbar').getBoundingClientRect();
      const bottom=Math.min(rect.bottom,footer.height ? footer.top : innerHeight);
      desktop.browserBounds({x:rect.x,y,width:rect.width,height:Math.max(0,bottom-y)});
    }
  }
  if ($('#browser-panel') && (!browserResources || browserResources.projectId !== projectId)) {
    browserResources={projectId,entries:[]};
    loadBrowserResources('').catch(error => toast(error.message,true));
  }
}

function browserPanelOccluded() {
  const panel=$('#browser-panel'), pane=panel?.closest('.floating-board>[data-floating-panel]');
  if (!pane) return false;
  if (pane.hidden) return true;
  const front=nativeWorkspaceLayout().front;
  if (!front || front === pane.dataset.floatingPanel) return false;
  const covering=[...document.querySelectorAll('.floating-board>[data-floating-panel]')].find(window => window.dataset.floatingPanel === front && !window.hidden);
  if (!covering) return false;
  const browser=panel.getBoundingClientRect(), overlay=covering.getBoundingClientRect();
  return overlay.left < browser.right && overlay.right > browser.left && overlay.top < browser.bottom && overlay.bottom > browser.top;
}

function installWebChatActions() {
  actions['focus-browser-panel']=() => {focusFloatingPanel('tools');syncBrowserPanel();};
  actions['browser-new']=async () => {
    if (!window.atelierDesktop) { await api('desktop/open',{mode:'chat'}); toast('Atelier desktop ouvert.'); return; }
    const tab={id:crypto.randomUUID(),projectId,title:'ChatGPT',url:'https://chatgpt.com/'};
    webChatTabs.push(tab); activeWebChatId=tab.id;
    try { await window.atelierDesktop.createBrowser(tab.id); render(); }
    catch (error) { webChatTabs=webChatTabs.filter(item => item.id !== tab.id); activeWebChatId=null; render(); throw error; }
  };
  actions['browser-select']=el => { activeWebChatId=el.dataset.id; render(); };
  actions['browser-close']=async el => {
    await window.atelierDesktop.closeBrowser(el.dataset.id);
    webChatTabs=webChatTabs.filter(tab => tab.id !== el.dataset.id);
    if (activeWebChatId === el.dataset.id) activeWebChatId=webChatTabs.filter(tab => tab.projectId === projectId).at(-1)?.id || null;
    render();
  };
  actions['browser-navigate']=el => window.atelierDesktop.navigateBrowser(activeWebChatId,el.dataset.navigation);
  actions['browser-resource']=el => loadBrowserResources(el.dataset.path);
  actions['browser-root']=() => loadBrowserResources('');
  actions['browser-up']=() => loadBrowserResources(browserResourcePath.replaceAll('\\','/').split('/').slice(0,-1).join('/'));
  actions['browser-copy-resource']=async () => { await navigator.clipboard.writeText($('#browser-resource-text').value); toast('Ressource copiée.'); };
  actions['browser-copy-instructions']=async () => { await navigator.clipboard.writeText($('#browser-instructions').value); toast('Consignes copiées.'); };
  window.atelierDesktop?.onBrowserState(update => {
    const tab=webChatTabs.find(tab => tab.id === update.id);
    if (!tab) return;
    Object.assign(tab,update);
    if (tab.id !== activeWebChatId || !$('#browser-address')) return;
    $('#browser-address').value=tab.url;
    $('#browser-load-state').textContent=tab.error || (tab.loading ? 'Chargement…' : '');
    for (const action of ['back','forward']) document.querySelector(`[data-navigation="${action}"]`).disabled=!tab[action];
  });
  new MutationObserver(syncBrowserPanel).observe($('#modal'),{attributes:true,attributeFilter:['open']});
  window.addEventListener('resize',syncBrowserPanel);
  window.addEventListener('scroll',syncBrowserPanel,true);
}

document.addEventListener('input',event => {
  if (event.target.id === 'browser-instructions') localStorage.setItem('atelier-chat-instructions-'+projectId,event.target.value);
});
document.addEventListener('dragstart',event => {
  const resource=event.target.closest('.browser-resources [draggable="true"]');
  if (!resource) return;
  if (window.atelierDesktop) { event.preventDefault(); window.atelierDesktop.dragFile({projectId,path:resource.dataset.path}).catch(error => toast(error.message,true)); }
  else event.dataTransfer.setData('text/plain',resource.dataset.path);
});
