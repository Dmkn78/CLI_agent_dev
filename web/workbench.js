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

function isArchitectureSession(session) {
  return session.purpose === 'architecture' || (session.name?.startsWith('Conception · ') && /graph/.test(session.mission || '') && /nodes/.test(session.mission || '') && /edges/.test(session.mission || '') && /Ne modifie aucun fichier/.test(session.mission || ''));
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
    if (session.status === 'waiting_plan') {
      const architecture=isArchitectureSession(session);
      pane.querySelector('footer').insertAdjacentHTML('beforebegin',`<div class="plan-validation"><strong>${architecture ? 'Architecture proposée · dessin à valider' : 'Diagnostic terminé · plan en attente'}</strong><div>${btn('approve-plan',architecture ? 'Valider & importer le dessin' : 'Valider & implémenter',architecture ? 'network' : 'play','primary',`data-id="${esc(session.id)}" data-plan-request="${esc(session.currentRequestId || '')}"`)}${btn('decline-plan','Refuser','close','secondary',`data-id="${esc(session.id)}"`)}</div></div>`);
    }
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
  const interval=codex.limitsRefreshIntervalSeconds;
  const automatic=Number.isFinite(interval) && interval > 0 ? `<small class="quota-refresh">Actualisation automatique toutes les ${esc(interval/60)} minutes tant qu’Atelier est ouvert.${codex.connected ? '' : ' Connexion Codex requise.'}</small>` : '';
  const measured=codex.limitsUpdatedAt ? `<small>Dernière mesure : <time datetime="${esc(codex.limitsUpdatedAt)}">${esc(new Date(codex.limitsUpdatedAt).toLocaleString('fr-FR'))}</time>.</small>` : '<small>Aucune mesure reçue.</small>';
  const error=codex.limitsError ? `<div class="inline-error" role="status"><strong>Actualisation des quotas impossible${Object.keys(buckets).length ? ' · dernière mesure conservée' : ''}</strong><p>${esc(codex.limitsError)}</p></div>` : '';
  return `<section class="account-quotas work-band"><div class="panel-heading"><h2>Abonnement Codex · compte ChatGPT</h2>${btn('refresh-limits','Actualiser','plug','quiet')}</div>${automatic}${measured}${error}${Object.entries(buckets).map(([id,bucket]) => `<div class="quota-bucket"><strong>${esc(bucket.limitName || id)}</strong><div class="quota-windows">${['primary','secondary'].filter(key => bucket[key]).map(key => {
    const window=bucket[key], used=typeof window.usedPercent === 'number' ? Math.max(0,Math.min(100,window.usedPercent)) : null;
    return `<div><span>${window.windowDurationMins ? window.windowDurationMins/60+' h' : key}</span><strong>${used == null ? 'Non disponible' : used+' % consommés · '+(100-used)+' % restants'}</strong><progress max="100" value="${used ?? 0}" ${used == null ? 'class="unknown"' : ''}></progress><small>Réinitialisation : ${window.resetsAt ? new Date(window.resetsAt*1000).toLocaleString('fr-FR') : 'Non communiquée'}</small></div>`;
  }).join('')}</div></div>`).join('') || `<p class="muted">${esc(codex.connected ? 'Quotas non communiqués par le CLI.' : 'Compte non connecté.')}</p>`}<small>Quotas partagés par le compte, tous projets et clients confondus. Pas des tokens de cette session.</small></section>`;
}

function requestTariff(request, workspaceId) {
  const manual=(state.tariffs || []).find(item => item.model === request.model && item.provider === request.provider && item.projectId === workspaceId);
  if (manual) return manual;
  const vendor={codex:'openai','openai-codex':'openai',openai:'openai',claude:'anthropic',anthropic:'anthropic'}[request.provider];
  if (!vendor) return null;
  const model=String(request.model || '').replace(/^(?:openai|anthropic)\//,'');
  return (state.officialPricing?.entries || []).find(item => item.provider === vendor && (item.model === model || (vendor === 'anthropic' && model.replace(/-20\d{6}$/,'') === item.model))) || null;
}

function estimateCost(usage, tariff) {
  if (!tariff || !usage || ['inputTokens','outputTokens','cachedInputTokens'].some(key => !Number.isSafeInteger(usage[key]) || usage[key] < 0)) return null;
  if (usage.cachedInputTokens > usage.inputTokens) return null;
  const long=tariff.contextThreshold && usage.inputTokens > tariff.contextThreshold;
  const prices=long ? {input:tariff.longInput,cache:tariff.longCache,output:tariff.longOutput,cacheWrite:tariff.longCacheWrite} : tariff;
  if (!Number.isFinite(prices.input) || !Number.isFinite(prices.output)) return null;
  if (usage.cachedInputTokens && !Number.isFinite(prices.cache)) return null;
  if (tariff.provider === 'anthropic' && usage.cacheWriteTokens == null && usage.cacheWriteInputTokens == null) return null;
  const writes=usage.cacheWriteTokens ?? usage.cacheWriteInputTokens ?? 0;
  if (!Number.isSafeInteger(writes) || writes < 0 || (writes && !Number.isFinite(prices.cacheWrite))) return null;
  if (tariff.provider === 'anthropic' && writes && usage.cacheWriteDuration !== '5m') return null;
  // Native usage includes cache reads/writes in input. Unknown cache duration cannot be priced.
  if (usage.cachedInputTokens+writes > usage.inputTokens || usage.cacheWriteHourTokens > 0) return null;
  return ((usage.inputTokens-usage.cachedInputTokens-writes)*prices.input + usage.cachedInputTokens*(prices.cache || 0) + writes*(prices.cacheWrite || 0) + usage.outputTokens*prices.output) / 1e6;
}

let lastOfficialPricingCheck=0;
async function refreshOfficialPricing(force=false) {
  if (!force && Date.now()-lastOfficialPricingCheck < 3600000) return;
  lastOfficialPricingCheck=Date.now();
  try {
    state.officialPricing=await api('tariffs/refresh',{force});
    if (force) toast(state.officialPricing.refreshing ? 'Actualisation des sources officielles en cours.' : 'Tarifs officiels récemment vérifiés.');
    for (let attempt=0; state.officialPricing.refreshing && attempt < 25; attempt++) {
      await new Promise(resolve=>setTimeout(resolve,1200));
      state.officialPricing=await api('tariffs/refresh',{});
    }
    const openCost=document.querySelector('#modal[open] [data-pricing-session]');
    if (openCost && ![...openCost.querySelectorAll('input')].some(input=>input.value)) sessionCostModal(openCost.dataset.pricingSession);
    if (typeof view !== 'undefined' && view === 'usage') render();
  } catch(error) { if (force) toast(error.message,true); }
}

function officialPricingNotice() {
  const pricing=state.officialPricing;
  return `<div class="official-pricing-notice"><strong>Tarifs API officiels · USD / million de tokens</strong><p>Vérification automatique à l’ouverture, cache de 24 h. Équivalent API standard, distinct de votre abonnement et de toute facture. Contexte long et écritures de cache appliqués seulement lorsque mesurés.</p><div>${[['OpenAI','https://developers.openai.com/api/docs/pricing'],['Anthropic','https://platform.claude.com/docs/en/about-claude/pricing']].map(([label,url]) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`).join(' · ')}</div>${(pricing?.sources || []).map(source => `<small>${esc(source.id)} : ${source.checkedAt ? 'vérifié le '+esc(new Date(source.checkedAt).toLocaleString('fr-FR')) : 'non vérifié'}${source.error ? ' · actualisation échouée, dernier tarif conservé' : ''}</small>`).join('')}${pricing?.refreshing ? '<small>Récupération des pages officielles en cours…</small>' : ''}${btn('refresh-tariffs','Actualiser les tarifs','refresh','quiet')}</div>`;
}

function sessionCostModal(id) {
  const session = state.sessions.find(item => item.id === id);
  if (!session) return;
  refreshOfficialPricing();
  const requests = objects('requests').filter(item => item.sessionId === id);
  const estimates=[];
  const lines = requests.map(request => {
    const tariff=requestTariff(request,session.projectId), cost=estimateCost(request.usage,tariff);
    estimates.push(cost);
    return `<tr><td>${esc(request.model)}<small>${tariff ? (tariff.source?.startsWith('https://') ? 'Source officielle · tarif standard' : esc(tariff.source)) : 'Aucun tarif exact publié ou enregistré'}</small></td><td>${compact(request.usage?.inputTokens)}</td><td>${compact(request.usage?.outputTokens)}</td><td>${cost == null ? 'Non disponible' : '$'+cost.toFixed(4)}</td></tr>`;
  });
  const total=estimates.length && estimates.every(value => value !== null) ? '$'+estimates.reduce((sum,value) => sum+value,0).toFixed(4) : 'Non disponible';
  const tariff=requestTariff(session,session.projectId);
  modal('Consommation & tarifs',session.name,`<div class="modal-body" data-pricing-session="${esc(id)}">${sessionUsageSummary(session,provider(session.runtime || 'codex'))}${officialPricingNotice()}<p><strong>Équivalent API estimé : ${total}</strong></p>${tariff ? `<p>${esc(session.model)} · Entrée ${tariff.input} · Cache lu ${tariff.cache ?? '—'} · Réponse ${tariff.output} USD / million${tariff.contextThreshold ? '<br>Contexte long au-delà de '+compact(tariff.contextThreshold)+' tokens d’entrée : '+tariff.longInput+' / '+tariff.longCache+' / '+tariff.longOutput : ''}</p>` : '<p class="muted">Tarif du modèle exact non disponible. Aucun autre modèle n’est substitué.</p>'}<div class="metrics-table"><table><thead><tr><th>Modèle & source</th><th>Entrée</th><th>Réponse</th><th>Équivalent USD</th></tr></thead><tbody>${lines.join('')}</tbody></table></div><details><summary>Ajouter un tarif personnalisé</summary><form data-form="tariff" data-session="${esc(id)}" data-provider="${esc(session.provider || 'codex')}" data-model="${esc(session.model)}"><h3>${esc(session.model)}</h3><div class="form-grid">${field('Entrée / million','input','','number','min="0" step="any" required')}${field('Cache lu / million','cache','','number','min="0" step="any" required')}${field('Réponse / million','output','','number','min="0" step="any" required')}</div>${field('Source du tarif / date','source','','text','required')}<button class="button primary" type="submit">Enregistrer les tarifs</button></form></details></div>`);
}

function installWorkbenchActions() {
  actions['refresh-tariffs']=() => refreshOfficialPricing(true);
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
  for (const [action,accepted] of [['approve-plan',true],['decline-plan',false]]) actions[action] = async el => {
    const result=await api('sessions/plan',{id:el.dataset.id,accepted,requestId:el.dataset.planRequest || undefined});
    if (result.design) { designId=result.design.id; designDraft=structuredClone(result.design); route('design'); toast('Architecture validée et importée.'); }
    await refresh(true);
  };
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
  const architecture=event.target.closest('form')?.elements.purpose?.value === 'architecture';
  actions.project({dataset:{id:event.target.value}});
  if (architecture) await actions['design-agent']();
  else await newAgent();
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
