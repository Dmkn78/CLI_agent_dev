let sidebarCollapsed=localStorage.getItem('atelier-sidebar-hidden') === 'yes';
let browserResourcesCollapsed=localStorage.getItem('atelier-resources-hidden') === 'yes';
let chatFocused=false, popoverTimer=null, popoverPinned=false;

function applyShellLayout() {
  document.body.classList.toggle('sidebar-collapsed',sidebarCollapsed);
  document.body.classList.toggle('resources-collapsed',browserResourcesCollapsed);
  document.body.classList.toggle('chat-focused',chatFocused && view === 'webchat');
  $('.sidebar').inert=sidebarCollapsed || (chatFocused && view === 'webchat');
  for (const button of document.querySelectorAll('[data-action="toggle-sidebar"]')) {
    button.title=sidebarCollapsed ? 'Afficher la navigation' : 'Masquer la navigation';
    button.setAttribute('aria-label',button.title);
    button.setAttribute('aria-expanded',String(!sidebarCollapsed));
  }
  requestAnimationFrame(syncBrowserPanel);
  if (view === 'terminal') requestAnimationFrame(fitNativeTerminals);
}

function closePopover() {
  clearTimeout(popoverTimer); popoverPinned=false;
  $('#work-popover').hidden=true; syncBrowserPanel();
}

function showPopover(anchor,content,pinned=false) {
  clearTimeout(popoverTimer);
  const panel=$('#work-popover'); panel.innerHTML=content; panel.hidden=false; popoverPinned=pinned;
  const rect=anchor.getBoundingClientRect();
  const width=Math.min(380,innerWidth-24);
  panel.style.width=width+'px'; panel.style.left=Math.max(12,Math.min(innerWidth-width-12,rect.right-width))+'px';
  panel.style.top=Math.max(12,Math.min(innerHeight-panel.offsetHeight-12,rect.bottom+8))+'px';
  syncBrowserPanel();
}

function notificationPopoverContent() {
  const items=[...(state.notifications || [])].reverse().slice(0,8);
  return `<div class="popover-heading"><strong>Notifications</strong>${btn('close-popover','','close','icon-btn','aria-label="Fermer les notifications"')}</div><div class="popover-items">${items.map(item => `<button class="notification-item ${item.read ? '' : 'unread'}" data-action="open-notification" data-id="${esc(item.id)}">${icon(item.title.includes('Accord') ? 'shield' : 'agents')}<span><strong>${esc(item.title.replace('Tour interrupted','Tour interrompu').replace('Tour completed','Tour terminé'))}</strong><small>${stamp(item.createdAt)}</small></span>${icon('arrow')}</button>`).join('') || '<p class="popover-empty">Aucune notification.</p>'}</div>`;
}

function costPopoverContent(id) {
  const session=state.sessions.find(item => item.id === id);
  const requests=state.requests.filter(item => item.sessionId === id);
  if (!session) return '<p class="popover-empty">Session indisponible.</p>';
  const costs=requests.map(request => estimateCost(request.usage,(state.tariffs || []).find(t => t.projectId === session.projectId && t.model === request.model && t.provider === request.provider)));
  const total=costs.length && costs.every(cost => cost !== null) ? '$'+costs.reduce((sum,cost) => sum+cost,0).toFixed(4) : 'Non disponible';
  return `<div class="popover-heading"><strong>${esc(session.name)}</strong>${btn('close-popover','','close','icon-btn','aria-label="Fermer l’estimation"')}</div><div class="popover-cost"><small>Équivalent API · pas une facture</small><strong>${total}</strong><dl><dt>Entrée</dt><dd>${compact(sumObserved(requests,'inputTokens'))}</dd><dt>Réponse</dt><dd>${compact(sumObserved(requests,'outputTokens'))}</dd><dt>Cache lu</dt><dd>${compact(sumObserved(requests,'cachedInputTokens'))}</dd></dl>${btn('session-cost','Tarifs & détail','settings','quiet',`data-id="${esc(id)}"`)}</div>`;
}

function installShellActions() {
  actions['toggle-sidebar']=() => { sidebarCollapsed=!sidebarCollapsed; localStorage.setItem('atelier-sidebar-hidden',sidebarCollapsed ? 'yes' : 'no'); applyShellLayout(); };
  actions['toggle-resources']=() => { browserResourcesCollapsed=!browserResourcesCollapsed; localStorage.setItem('atelier-resources-hidden',browserResourcesCollapsed ? 'yes' : 'no'); applyShellLayout(); };
  actions['chat-focus']=() => { chatFocused=!chatFocused; applyShellLayout(); };
  actions['close-popover']=closePopover;
  actions.notifications=() => showPopover($('#notifications-button'),notificationPopoverContent(),true);
  const openNotification=actions['open-notification'];
  actions['open-notification']=async el => { closePopover(); await openNotification(el); };
  actions['launch-desktop']=async el => { await api('desktop/open',{mode:el.dataset.mode || 'chat'}); toast('Atelier desktop ouvert.'); };
  actions['pick-project-folder']=async () => {
    const result=window.atelierDesktop ? await window.atelierDesktop.pickDirectory() : await api('projects/pick',{});
    if (result.path && $('#modal [data-form="project"]')) {
      const form=$('#modal [data-form="project"]'); form.elements.path.value=result.path;
      if (!form.elements.name.value) form.elements.name.value=result.path.replaceAll('\\','/').split('/').filter(Boolean).at(-1);
    }
  };
  window.atelierDesktop?.onLaunchMode(async mode => {
    for (let attempt=0; !state.projects?.length && attempt < 100; attempt++) await new Promise(resolve => setTimeout(resolve,100));
    if (!state.projects?.length) { toast('Serveur indisponible.',true); return; }
    if (mode === 'project') $('#add-project').click();
    else if (mode === 'code') { route('terminal'); newNativeTerminalModal(); }
    else { route('webchat'); if (!webChatTabs.some(tab => tab.projectId === projectId)) await actions['browser-new'](); }
  });
  const key=/Mac/.test(navigator.platform) ? '⌘ K' : 'Ctrl K';
  $('#global-search kbd').textContent=key;
  $('#sidebar-toggle').innerHTML=icon('grid');
  applyShellLayout();
}
document.addEventListener('pointerover',event => {
  const anchor=event.target.closest('#notifications-button,[data-action="session-cost"]');
  if (!anchor || anchor.closest('#work-popover') || anchor.contains(event.relatedTarget)) return;
  showPopover(anchor,anchor.id === 'notifications-button' ? notificationPopoverContent() : costPopoverContent(anchor.dataset.id));
});
document.addEventListener('pointerout',event => {
  if (popoverPinned) return;
  if (event.target.closest('#notifications-button,[data-action="session-cost"],#work-popover') && !event.relatedTarget?.closest('#notifications-button,[data-action="session-cost"],#work-popover')) popoverTimer=setTimeout(closePopover,180);
});
document.addEventListener('pointerdown',event => { if (!event.target.closest('#work-popover,#notifications-button,[data-action="session-cost"]')) closePopover(); });
document.addEventListener('keydown',event => { if (event.key === 'Escape') { closePopover(); if (chatFocused) { chatFocused=false; applyShellLayout(); } } });
