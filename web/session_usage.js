function sessionUsageSummary(session, account) {
  const total = session && session.usage && session.usage.total;
  const validCount = value => typeof value === 'number' && Number.isInteger(value) && value >= 0;
  const tokenText = value => validCount(value) ? `${compact(value)} tokens` : '—';
  const safe = value => esc(value);
  const tokenLine = (label, value) =>
    `<span>${safe(label)} : ${safe(tokenText(value))}</span>`;

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

  return `<div class="session-usage"><strong>${tokenText(total?.totalTokens)}</strong>${tokenLine('Entrée', total?.inputTokens)}${tokenLine('Réponse', total?.outputTokens)}${tokenLine('Cache', total?.cachedInputTokens)}<span>Abonnement : ${safe(plan || 'non communiqué')}</span>${quotaLine}</div>`;
}
