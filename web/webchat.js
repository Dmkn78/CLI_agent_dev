let webChatTabs=[], activeWebChatId=null, browserResourcePath='', browserResources=null, browserResourceContent=null;
const externalChatWindows=new Map();
let browserResourceGeneration=0;

function webChatView() {
  const tabs=webChatTabs.filter(tab => tab.projectId === projectId);
  const active=tabs.find(tab => tab.id === activeWebChatId);
  return `${heading('NAVIGATEUR','ChatGPT','',btn('browser-new','Nouveau chat','plus','primary'))}<div class="browser-tabbar">${tabs.map(tab => `<div class="browser-tab ${tab.id === activeWebChatId ? 'selected' : ''}"><button data-action="browser-select" data-id="${esc(tab.id)}">${esc(tab.title)}</button><button class="icon-btn" data-action="browser-close" data-id="${esc(tab.id)}" title="Fermer ce chat" aria-label="Fermer ce chat">${icon('close')}</button></div>`).join('')}</div><div class="browser-workspace"><aside class="browser-resources"><div class="panel-heading"><h2>Ressources</h2>${btn('browser-up','','chevron','icon-btn','title="Dossier parent" aria-label="Dossier parent"')}</div><div class="resource-path">${esc(browserResourcePath || project().name)}</div><div class="browser-file-list">${(browserResources?.entries || []).map(file => `<button class="file-entry" data-action="browser-resource" data-path="${esc(file.path)}" draggable="${!file.directory}">${icon(file.directory ? 'folder' : 'code')}<span>${esc(file.name)}</span></button>`).join('')}</div>${browserResourceContent ? `<section class="resource-preview"><strong>${esc(browserResourceContent.path)}</strong><textarea id="browser-resource-text" rows="8" aria-label="Contenu de la ressource" readonly>${esc(browserResourceContent.content)}</textarea>${btn('browser-copy-resource','Copier','code','quiet')}</section>` : ''}<section class="browser-instructions"><h3>Consignes</h3><textarea id="browser-instructions" rows="5" aria-label="Consignes à copier pour ChatGPT" placeholder="Contexte SQL, méthode, contraintes…">${esc(localStorage.getItem('atelier-chat-instructions-'+projectId) || '')}</textarea>${btn('browser-copy-instructions','Copier','code','quiet')}</section><div class="browser-privacy">Dépôt d’un fichier dans ChatGPT : transmission volontaire à OpenAI. Tokens du site : non exposés à Atelier.</div></aside><section id="browser-panel" class="browser-panel">${active ? window.atelierDesktop ? '<div class="browser-loading">Chargement du navigateur…</div>' : `<div class="browser-external"><h2>ChatGPT · fenêtre séparée</h2>${btn('browser-focus','Afficher ChatGPT','external','primary',`data-id="${esc(active.id)}"`)}</div>` : `<div class="browser-external"><h2>Aucun chat ouvert</h2>${btn('browser-new','Ouvrir ChatGPT','plus','primary')}</div>`}</section></div>`;
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
  const visible=view === 'webchat' && Boolean(tab) && !$('#modal').open;
  if (desktop) {
    desktop.showBrowser(visible ? tab.id : null);
    if (visible) {
      const rect=$('#browser-panel').getBoundingClientRect();
      const y=Math.max(rect.y,$('.topbar').getBoundingClientRect().bottom);
      const bottom=Math.min(rect.bottom,$('.statusbar').getBoundingClientRect().top);
      desktop.browserBounds({x:rect.x,y,width:rect.width,height:Math.max(0,bottom-y)});
    }
  }
  if (view === 'webchat' && (!browserResources || browserResources.projectId !== projectId)) {
    browserResources={projectId,entries:[]};
    loadBrowserResources('').catch(error => toast(error.message,true));
  }
}

function installWebChatActions() {
  actions['browser-new']=async () => {
    const tab={id:crypto.randomUUID(),projectId,title:'ChatGPT',url:'https://chatgpt.com/'};
    if (window.atelierDesktop) await window.atelierDesktop.createBrowser(tab.id);
    else {
      const popup=window.open('about:blank','_blank');
      if (!popup) throw new Error('Le navigateur a bloqué la nouvelle fenêtre. Autorise les popups pour Atelier.');
      popup.opener=null;
      popup.location.href=tab.url;
      externalChatWindows.set(tab.id,popup);
    }
    webChatTabs.push(tab); activeWebChatId=tab.id; render();
  };
  actions['browser-select']=el => { activeWebChatId=el.dataset.id; render(); };
  actions['browser-close']=async el => {
    if (window.atelierDesktop) await window.atelierDesktop.closeBrowser(el.dataset.id);
    else { externalChatWindows.get(el.dataset.id)?.close(); externalChatWindows.delete(el.dataset.id); }
    webChatTabs=webChatTabs.filter(tab => tab.id !== el.dataset.id);
    if (activeWebChatId === el.dataset.id) activeWebChatId=webChatTabs.filter(tab => tab.projectId === projectId).at(-1)?.id || null;
    render();
  };
  actions['browser-focus']=el => externalChatWindows.get(el.dataset.id)?.focus();
  actions['browser-resource']=el => loadBrowserResources(el.dataset.path);
  actions['browser-up']=() => loadBrowserResources(browserResourcePath.replaceAll('\\','/').split('/').slice(0,-1).join('/'));
  actions['browser-copy-resource']=async () => { await navigator.clipboard.writeText($('#browser-resource-text').value); toast('Ressource copiée.'); };
  actions['browser-copy-instructions']=async () => { await navigator.clipboard.writeText($('#browser-instructions').value); toast('Consignes copiées.'); };
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
