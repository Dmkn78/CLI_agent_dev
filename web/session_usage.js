const isObservedTokenCount = count => typeof count === 'number' && Number.isSafeInteger(count) && count >= 0;

function sessionUsageSummary(session, account) {
  const total = session && session.usage && session.usage.total;
  const validCount = isObservedTokenCount;
  const tokenText = value => validCount(value) ? `${compact(value)} tokens` : '—';
  const safe = value => esc(value);
  const tokenLine = (label, key) =>
    `<span title="${validCount(total?.[key]) ? total[key].toLocaleString('fr-FR')+' tokens' : 'Non communiqué'}">${safe(label)}${session?.usage?.partialFields?.includes(key) ? ' (partiel)' : ''} : ${safe(tokenText(total?.[key]))}</span>`;

  const plan = account && account.plan;
  const limits = account && account.limits;
  const rateLimits = limits && limits.rateLimits;
  const primary = rateLimits && rateLimits.primary;
  const byLimitId = limits && limits.rateLimitsByLimitId;
  const firstRateLimit = byLimitId && typeof byLimitId === 'object'
    ? Object.values(byLimitId)[0]
    : null;
  const quota = firstRateLimit?.primary || primary;
  const percent = quota && quota.usedPercent;
  const quotaLine = typeof percent === 'number' && Number.isFinite(percent) && percent >= 0 && percent <= 100
    ? `<small>${safe(compact(percent))}% compte partagé, ne mesure pas cette session</small>`
    : '';

  return `<div class="session-usage"><strong title="Total cumulé reçu du fournisseur">${tokenText(total?.totalTokens)}</strong>${tokenLine('Entrée', 'inputTokens')}${tokenLine('Réponse', 'outputTokens')}${tokenLine('Cache lu', 'cachedInputTokens')}<small class="session-cache-note">Le cache est inclus dans l’entrée, pas ajouté au total.</small><span>Abonnement : ${safe(plan || 'non communiqué')}</span>${quotaLine}</div>`;
}

function sessionMessageContent(message) {
  const text=String(message.text || '');
  if (message.role === 'user') return esc(text);
  let proposal;
  try { proposal=JSON.parse(text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'')); } catch {}
  if (!proposal || typeof proposal !== 'object' || typeof proposal.explanation !== 'string' || !Array.isArray(proposal.graph?.nodes) || !Array.isArray(proposal.graph?.edges)) {
    return typeof messageMarkdown === 'function' ? `<div class="message-markdown">${messageMarkdown(text)}</div>` : esc(text);
  }
  const nodes=proposal.graph.nodes.filter(node => node && typeof node === 'object' && typeof node.id === 'string').slice(0,80), edges=proposal.graph.edges.filter(edge => edge && typeof edge === 'object' && typeof edge.sourceNodeId === 'string' && typeof edge.targetNodeId === 'string').slice(0,200);
  const nodeName=node => typeof node?.text === 'string' ? node.text : String(node?.text?.value || node?.id || 'Bloc');
  const names=new Map(nodes.map(node => [node.id,nodeName(node)]));
  return `<section class="architecture-response"><small>Proposition d’architecture · à relire</small><h3>${esc(proposal.title || 'Architecture proposée')}</h3><div class="message-markdown">${typeof messageMarkdown === 'function' ? messageMarkdown(proposal.explanation) : esc(proposal.explanation)}</div><div class="architecture-response-nodes">${nodes.map(node => `<span>${esc(nodeName(node))}</span>`).join('') || '<p>Aucun bloc proposé.</p>'}</div>${edges.length ? `<details><summary>${edges.length} relations entre les blocs</summary><ul>${edges.map(edge => `<li><strong>${esc(names.get(edge.sourceNodeId) || edge.sourceNodeId)}</strong> → <strong>${esc(names.get(edge.targetNodeId) || edge.targetNodeId)}</strong>${edge.text ? ' · '+esc(typeof edge.text === 'string' ? edge.text : edge.text.value || '') : ''}</li>`).join('')}</ul></details>` : ''}<details class="architecture-response-source"><summary>Consulter le JSON source</summary><pre>${esc(JSON.stringify(proposal,null,2))}</pre></details></section>`;
}

function conversationUsage(messages) {
  const replies = messages.filter(message => message.role !== 'user');
  const totals = {}, partialFields=[];
  for (const key of ['inputTokens','outputTokens','cachedInputTokens','totalTokens']) {
    const counts = replies.map(message => message.usage?.[key]);
    const observed = counts.filter(isObservedTokenCount);
    // No replies is unmeasured; a partial sum is labelled as such.
    if (observed.length) {
      const total = observed.reduce((sum, count) => sum+count, 0);
      if (isObservedTokenCount(total)) totals[key] = total;
      if (observed.length < replies.length) partialFields.push(key);
    }
  }
  return {usage:{total:totals,partialFields}, partialUsage:partialFields.includes('totalTokens')};
}

function sessionUsageChip(session, account={}, options={}) {
  const total = session?.usage?.total, last = session?.usage?.last;
  const count = isObservedTokenCount(total?.totalTokens) ? compact(total.totalTokens)+' tokens' : 'Tokens —';
  const windowSize = session?.usage?.modelContextWindow;
  const context = isObservedTokenCount(last?.totalTokens) && isObservedTokenCount(windowSize) && windowSize > 0
    ? `<div class="usage-context"><span>Dernier appel / fenêtre de contexte</span><strong>${esc(compact(last.totalTokens))} / ${esc(compact(windowSize))}</strong><progress max="${windowSize}" value="${Math.min(last.totalTokens,windowSize)}" aria-label="Contexte du dernier appel"></progress></div>`
    : '<small class="usage-context-unknown">Fenêtre de contexte non communiquée</small>';
  const label = options.label || 'Consommation de la discussion';
  return `<details class="usage-chip" ${options.id ? `data-usage-id="${esc(options.id)}"` : ''}><summary aria-label="${esc(label)}" title="${esc(label)} · total cumulé">${esc(count)}${session?.partialUsage ? ' <span title="Certains appels ne communiquent pas leur consommation">partiel</span>' : ''}</summary><div class="usage-details"><strong>Total cumulé de la discussion</strong>${sessionUsageSummary(session,account)}${session?.partialUsage ? '<small>Total partiel : certains appels ne communiquent pas leurs tokens.</small>' : ''}${context}${session?.usageSource ? `<small>Compteur natif · ${esc(session.usageSource)}</small>` : ''}${options.notice ? '<small>'+esc(options.notice)+'</small>' : ''}${options.cost || sessionEquivalentCost(session)}</div></details>`;
}

function sessionEquivalentCost(session) {
  if (!session?.id || typeof state === 'undefined' || typeof estimateCost !== 'function') return '<small>Coût non communiqué</small>';
  const requests=(state.requests || []).filter(request => request.sessionId === session.id);
  const costs=requests.map(request => estimateCost(request.usage,typeof requestTariff === 'function' ? requestTariff(request,session.projectId) : (state.tariffs || []).find(tariff => tariff.projectId === session.projectId && tariff.model === request.model && tariff.provider === request.provider)));
  if (!costs.length || costs.some(cost => cost === null || !Number.isFinite(cost))) return '<small>Coût non communiqué</small>';
  const total=costs.reduce((sum,cost) => sum+cost,0);
  return `<small>Équivalent API : ${total.toFixed(4)} USD<br>Selon les tarifs enregistrés · distinct de l’abonnement</small>`;
}
