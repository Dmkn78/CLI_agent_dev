function notificationBell() {
  const count = (state.notifications || []).filter(item => !item.read).length;
  return icon('bell') + (count ? `<small class="notification-count">${count}</small>` : '');
}

function notificationPresentation(item) {
  const title=item.title.replace('Tour interrupted','Tour interrompu').replace('Tour completed','Tour terminé').replace('Tour failed','Tour en erreur');
  // Earlier saved notifications have no kind; use their explicit event wording.
  const legacy=/Accord requis|Autorisation|à valider|nécessaire|manquantes/.test(title) ? 'action' : /Échec|échouée|en erreur|moteur interrompue/.test(title) ? 'error' : /mission vérifiée/.test(title) ? 'success' : 'info';
  const kind=['action','error','success','info'].includes(item.kind) ? item.kind : legacy;
  const descriptions={action:['shield','Action attendue'],error:['close','Erreur'],success:['check','Vérifié'],info:['bell','Information']};
  return {title,kind,icon:descriptions[kind][0],label:descriptions[kind][1]};
}

function notificationMarkup(item) {
  const presentation=notificationPresentation(item);
  return `<button class="notification-item ${item.read ? '' : 'unread'}" data-kind="${presentation.kind}" data-action="open-notification" data-id="${esc(item.id)}">${icon(presentation.icon)}<span><strong>${esc(presentation.title)}</strong><small><span>${presentation.label}</span><time>${stamp(item.createdAt)}</time></small></span>${item.read ? '' : '<i class="notification-unread" aria-label="Non lue"></i>'}${icon('chevron')}</button>`;
}

function notificationsModal() {
  const items = [...(state.notifications || [])].reverse();
  modal('Notifications','',`<div class="modal-body notification-list">${items.map(notificationMarkup).join('') || '<p class="muted">Aucune notification.</p>'}</div>`);
}

function durationLabel(milliseconds) {
  if (typeof milliseconds !== 'number') return '—';
  const seconds = Math.max(0,Math.round(milliseconds / 1000));
  return `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}

function sessionObservability(session) {
  const duration = session.turnId && session.turnStartedAt ? Date.now() - Date.parse(session.turnStartedAt) : session.lastTurnDurationMs;
  return `<div class="session-observability"><span title="Processus local vivant, pas une preuve de travail réussi">${session.processAlive ? 'Moteur connecté' : 'Moteur arrêté'}${session.processId ? ' · PID '+session.processId : ''}</span><span title="Durée du tour, incluant attente réseau et permissions">${icon('clock')} <b data-turn-clock="${esc(session.id)}">${durationLabel(duration)}</b></span>${btn('session-cost','','usage','icon-btn',`data-id="${esc(session.id)}" title="Estimation de coût" aria-label="Estimation de coût"`)}</div>${sessionUsageSummary(session,provider(session.runtime || 'codex'))}`;
}

function mountWorkbench() {
  for (const button of document.querySelectorAll('.session-pane [data-action="unpin-agent"]')) {
    const session = state.sessions.find(item => item.id === button.dataset.id);
    if (!session) continue;
    const pane = button.closest('.session-pane');
    pane.querySelector('.session-config').insertAdjacentHTML('afterend',sessionObservability(session));
    if (session.transportError) pane.querySelector('.transcript').insertAdjacentHTML('afterbegin',`<div class="inline-error"><strong>${session.retrying ? 'Reconnexion en cours' : 'Erreur du moteur'}</strong><p>${esc(session.transportError)}</p>${/UnknownIssuer|certificate/i.test(session.transportError) ? '<small>Certificat TLS non reconnu. La vérification reste activée. Relance Atelier avec scripts/start-atelier.ps1 dans ton contexte Windows.</small>' : ''}</div>`);
    if (session.status === 'waiting_plan') pane.querySelector('footer').insertAdjacentHTML('beforebegin',`<div class="plan-validation"><strong>Diagnostic terminé · plan en attente</strong><div>${btn('approve-plan','Valider & implémenter','play','primary',`data-id="${esc(session.id)}"`)}${btn('decline-plan','Refuser','close','secondary',`data-id="${esc(session.id)}"`)}</div></div>`);
  }
  for (const workflow of objects('workflows').filter(item => item.status === 'waiting_plan')) {
    $('#main').insertAdjacentHTML('beforeend',`<section class="team-plan work-band"><h2>${esc(workflow.title)} · plan à valider</h2>${workflow.plan.map(task => `<div><strong>${esc(task.title)}</strong><p>${esc(task.prompt)}</p></div>`).join('')}${btn('approve-team-plan','Valider & lancer l’équipe','play','primary',`data-id="${esc(workflow.id)}"`)}${btn('decline-team-plan','Refuser','close','secondary',`data-id="${esc(workflow.id)}"`)}</section>`);
  }
  if (view === 'design') mountDesign();
  if (view === 'overview') $('.page-heading .heading-actions').insertAdjacentHTML('beforeend',btn('edit-design','Éditer le dessin','network'));
  if (view === 'usage') $('.page-heading').insertAdjacentHTML('afterend',quotaWorkbenchView());
  if (view === 'settings' && provider().loginError) $('.page-heading').insertAdjacentHTML('afterend',`<div class="inline-error">Connexion : ${esc(provider().loginError)}</div>`);
  if (view === 'settings') {
    const codex=provider(), ompLogin=(provider('omp').loginProviders || []).find(login => login.id === 'openai-codex');
    $('.connection-engines').insertAdjacentHTML('beforebegin',`<section class="auth-scopes"><div><strong>Codex · abonnement ChatGPT</strong><span>${codex.connected ? 'Connecté dans Codex' : 'Non connecté dans Codex'}</span></div><div><strong>Oh My Pi · accès OpenAI</strong><span>${ompLogin ? ompLogin.authenticated ? 'Connecté dans OMP' : 'Connexion OMP séparée requise' : 'État OMP non communiqué'}</span></div><div><strong>ChatGPT · site web</strong><span>Connexion dans le navigateur Atelier · non vérifiée ici</span></div></section>`);
  }
  if (view === 'settings') $('#main').insertAdjacentHTML('beforeend',btn('process-inventory','Diagnostic des CLI externes','terminal','quiet','title="Inventaire technique ; pas une preuve de travail en cours"'));
  syncBrowserPanel();
}

function quotaWorkbenchView() {
  const codex=provider(), limits=codex.limits || {};
  const buckets=limits.rateLimitsByLimitId || (limits.rateLimits ? {[limits.rateLimits.limitId || 'codex']:limits.rateLimits} : {});
  return `<section class="account-quotas work-band"><div class="panel-heading"><h2>Abonnement Codex · compte ChatGPT</h2>${btn('refresh-limits','Actualiser','plug','quiet')}</div>${Object.entries(buckets).map(([id,bucket]) => `<div class="quota-bucket"><strong>${esc(bucket.limitName || id)}</strong><div class="quota-windows">${['primary','secondary'].filter(key => bucket[key]).map(key => {
    const window=bucket[key], used=typeof window.usedPercent === 'number' ? Math.max(0,Math.min(100,window.usedPercent)) : null;
    return `<div><span>${window.windowDurationMins ? window.windowDurationMins/60+' h' : key}</span><strong>${used == null ? 'Non disponible' : used+' % consommés · '+(100-used)+' % restants'}</strong><progress max="100" value="${used ?? 0}" ${used == null ? 'class="unknown"' : ''}></progress><small>Réinitialisation : ${window.resetsAt ? new Date(window.resetsAt*1000).toLocaleString('fr-FR') : 'Non communiquée'}</small></div>`;
  }).join('')}</div></div>`).join('') || `<p class="muted">${esc(codex.limitsError || (codex.connected ? 'Quotas non communiqués par le CLI.' : 'Compte non connecté.'))}</p>`}<small>Quotas partagés par le compte, tous projets et clients confondus. Pas des tokens de cette session.${codex.limitsUpdatedAt ? ' Actualisés à '+stamp(codex.limitsUpdatedAt)+'.' : ''}</small></section>`;
}

function estimateCost(usage, tariff) {
  if (!tariff || !usage || ['inputTokens','outputTokens','cachedInputTokens'].some(key => !Number.isFinite(usage[key]))) return null;
  if (usage.cachedInputTokens > usage.inputTokens) return null;
  if ((usage.cacheWriteTokens || usage.cacheWriteInputTokens || 0) > 0) return null;
  return ((usage.inputTokens-usage.cachedInputTokens)*tariff.input + usage.cachedInputTokens*tariff.cache + usage.outputTokens*tariff.output) / 1e6;
}

function sessionCostModal(id) {
  const session = state.sessions.find(item => item.id === id);
  const requests = objects('requests').filter(item => item.sessionId === id);
  const estimates=[];
  const lines = requests.map(request => {
    const tariff = (state.tariffs || []).find(item => item.model === request.model && item.provider === request.provider && item.projectId === session.projectId);
    const cost = estimateCost(request.usage,tariff);
    estimates.push(cost);
    return `<tr><td>${esc(request.model)}</td><td>${compact(request.usage?.inputTokens)}</td><td>${compact(request.usage?.outputTokens)}</td><td>${cost == null ? 'Non disponible' : '$'+cost.toFixed(4)}</td></tr>`;
  });
  const total=estimates.length && estimates.every(value => value !== null) ? '$'+estimates.reduce((sum,value) => sum+value,0).toFixed(4) : 'Non disponible';
  modal('Estimation de session',session.name,`<div class="modal-body"><p class="muted">Équivalent API calculé avec tes tarifs USD par million de tokens, pas une facture ChatGPT. Cache lu inclus dans l’entrée puis déduit une fois. Données manquantes : aucun coût inventé.</p><p><strong>Total estimé : ${total}</strong></p><div class="metrics-table"><table><thead><tr><th>Modèle</th><th>Entrée</th><th>Réponse</th><th>Estimation USD</th></tr></thead><tbody>${lines.join('')}</tbody></table></div><form data-form="tariff" data-session="${esc(id)}" data-provider="${esc(session.provider || 'codex')}" data-model="${esc(session.model)}"><h3>${esc(session.model)}</h3><div class="form-grid">${field('Entrée / million','input','','number','min="0" step="any" required')}${field('Cache lu / million','cache','','number','min="0" step="any" required')}${field('Réponse / million','output','','number','min="0" step="any" required')}</div>${field('Source du tarif / date','source','','text','required')}<button class="button primary" type="submit">Enregistrer les tarifs</button></form></div>`);
}

function installWorkbenchActions() {
  actions.notifications = notificationsModal;
  actions['open-notification'] = async el => {
    const notification = state.notifications.find(item => item.id === el.dataset.id);
    await api('notifications/read',{id:notification.id});
    $('#modal').close();
    if (notification.projectId && notification.projectId !== projectId) actions.project({dataset:{id:notification.projectId}});
    await refresh(true);
    if (notification.sessionId) actions['open-agent']({dataset:{id:notification.sessionId}});
    else if (notification.id.endsWith(':plan')) { graphWorkflowId = notification.id.slice(0,-5); agentLayout='graph'; route('agents'); }
    else route('settings');
  };
  for (const [action,accepted] of [['approve-plan',true],['decline-plan',false]]) actions[action] = async el => { await api('sessions/plan',{id:el.dataset.id,accepted}); await refresh(true); };
  for (const [action,accepted] of [['approve-team-plan',true],['decline-team-plan',false]]) actions[action] = async el => { await api('workflows/plan',{id:el.dataset.id,accepted}); await refresh(true); };
  actions['session-cost'] = el => sessionCostModal(el.dataset.id);
  actions['process-inventory'] = async () => {
    const inventory=await api('processes');
    modal('Processus CLI détectés','Activité non inférée',`<div class="modal-body"><p class="muted">${esc(inventory.note)}</p>${inventory.processes.map(item => `<div class="quota-row"><strong>${esc(item.name)} · PID ${item.pid}</strong><span>Projet et activité inconnus</span></div>`).join('') || '<p>Aucun exécutable reconnu.</p>'}</div>`);
  };
  actions['refresh-limits'] = async () => { await api('providers/limits',{}); await refresh(true); };
  actions['edit-design'] = () => route('design');
  for (const id of ['workspace-section','projects-section']) {
    const element = document.getElementById(id);
    element.open = localStorage.getItem('atelier-'+id) !== 'closed';
    element.addEventListener('toggle',() => localStorage.setItem('atelier-'+id,element.open ? 'open' : 'closed'));
  }
}

document.addEventListener('change',async event => {
  if (event.target.name !== 'agentProject') return;
  actions.project({dataset:{id:event.target.value}});
  await newAgent();
});
document.addEventListener('submit',async event => {
  const form = event.target.closest('[data-form="tariff"]');
  if (!form) return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  try {
    await api('tariffs',{...data,projectId,model:form.dataset.model,provider:form.dataset.provider});
    await refresh(true);
    sessionCostModal(form.dataset.session);
  } catch (error) { toast(error.message,true); }
});
setInterval(() => document.querySelectorAll('[data-turn-clock]').forEach(element => {
  const session = state.sessions.find(item => item.id === element.dataset.turnClock);
  if (session?.turnId && session.turnStartedAt) element.textContent=durationLabel(Date.now()-Date.parse(session.turnStartedAt));
}),1000);
