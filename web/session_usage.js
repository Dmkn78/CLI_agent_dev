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

  return `<div class="session-usage"><strong>${tokenText(total?.totalTokens)}</strong>${tokenLine('Entrée', 'inputTokens')}${tokenLine('Réponse', 'outputTokens')}${tokenLine('Cache', 'cachedInputTokens')}<span>Abonnement : ${safe(plan || 'non communiqué')}</span>${quotaLine}</div>`;
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
  const costs=requests.map(request => estimateCost(request.usage,(state.tariffs || []).find(tariff => tariff.projectId === session.projectId && tariff.model === request.model && tariff.provider === request.provider)));
  if (!costs.length || costs.some(cost => cost === null || !Number.isFinite(cost))) return '<small>Coût non communiqué</small>';
  const total=costs.reduce((sum,cost) => sum+cost,0);
  return `<small>Équivalent API : ${total.toFixed(4)} USD<br>Selon les tarifs enregistrés · distinct de l’abonnement</small>`;
}
