function chatsView() {
  const chats = sessions().filter(session => session.executionMode === 'chat');
  const selected = chats.find(session => session.id === selectedChatId);
  if (selected) selectedChatId = selected.id;
  return `<div class="chat-workspace"><aside class="chat-list"><div class="panel-heading"><h2>Conversations CLI</h2>${btn('new-cli-chat','','plus','icon-btn','title="Nouvelle conversation CLI" aria-label="Nouvelle conversation CLI"')}</div>${chats.map(session => `<button class="chat-list-item ${session.id === selected?.id ? 'selected' : ''}" data-action="open-chat" data-id="${esc(session.id)}"><strong>${esc(session.name)}</strong><small>${esc(session.model)}</small>${badge(session.status)}</button>`).join('')}</aside>${selected ? `<div class="chat-conversation">${sessionPane(selected)}</div><aside class="chat-context">${chatContextPanel(selected)}</aside>` : `<div class="chat-empty">${empty('agents','Aucune conversation CLI ouverte','', 'new-cli-chat','Nouvelle conversation CLI')}</div>`}</div>`;
}

function chatContextPanel(session) {
  const usage = session.usage || {};
  const last = usage.last || {};
  const windowSize = usage.modelContextWindow;
  const lastTokens = last.totalTokens;
  const usedPercent = windowSize > 0 && typeof lastTokens === 'number' ? Math.min(100,lastTokens/windowSize*100) : null;
  const lastRequest = objects('requests').filter(request => request.sessionId === session.id).at(-1);
  const canEdit = !session.parentId && ['ready','stopped','failed'].includes(session.status) && !session.workEnabled;
  return `<div class="panel-heading"><h2>Contexte</h2>${canEdit ? btn('session-context','','settings','icon-btn',`data-id="${esc(session.id)}" title="Modifier le contexte" aria-label="Modifier le contexte"`) : ''}</div><dl class="context-identity"><dt>Moteur</dt><dd>${esc(session.runtime || 'codex')}</dd><dt>Modèle</dt><dd>${esc(session.model)}</dd><dt>Effort</dt><dd>${esc(session.effort)}</dd><dt>Fenêtre rapportée</dt><dd>${compact(windowSize)} tokens</dd></dl><div class="context-meter"><div><span>Dernier appel observé</span><strong>${compact(lastTokens)}${windowSize ? ' / '+compact(windowSize) : ''}</strong></div><progress max="100" value="${usedPercent || 0}" aria-label="Usage du dernier appel" ${usedPercent == null ? 'class="unknown"' : ''}></progress><small>${usedPercent == null ? 'Capacité ou usage non communiqué' : usedPercent.toFixed(1)+' % de la fenêtre rapportée'}</small></div><div class="context-metrics">${[['Entrée du dernier appel','inputTokens'],['Réponse du dernier appel','outputTokens'],['Cache lu','cachedInputTokens']].map(([label,key]) => `<div><span>${label}</span><strong>${compact(last[key])}</strong></div>`).join('')}<div><span>Total de la conversation</span><strong>${compact(usage.total?.totalTokens)}</strong></div></div><div class="context-draft" data-draft-session="${esc(session.id)}"><span>Brouillon + fichiers sélectionnés</span><strong>—</strong><small>Estimation locale : 4 caractères/token, hors contexte natif et outils.</small></div><section class="context-section"><h3>Mémoire</h3><p>${session.memory ? (session.runtime === 'omp' ? 'Noyau · sans réserve MCP' : 'Noyau · réserve MCP à la demande') : 'Désactivée'}</p></section><section class="context-section"><h3>Skills sélectionnés</h3>${session.skills?.length ? session.skills.map(path => `<div class="context-path">${esc(path)}</div>`).join('') : '<p class="muted">Aucun skill sélectionné.</p>'}</section><section class="context-section"><h3>Fichiers au prochain envoi</h3>${session.contextFiles?.length ? session.contextFiles.map(path => `<div class="context-path">${esc(path)}</div>`).join('') : '<p class="muted">Aucun fichier sélectionné.</p>'}</section><details class="context-section"><summary>Instructions transmises</summary><pre>${esc(session.sentInstructions || 'Non transmises')}</pre></details><section class="context-section"><h3>Historique Atelier</h3><p>${session.messages.length} messages · ${session.messages.reduce((sum,message) => sum+message.text.length,0).toLocaleString('fr-FR')} caractères</p><small>Le contexte natif, les outils et la compaction ne sont pas entièrement exposés. Ces caractères ne sont pas des tokens facturés.</small>${lastRequest ? `<small>Dernière requête : ${esc(lastRequest.status)} · ${esc(lastRequest.id)}</small>` : ''}</section>`;
}

async function sessionContextModal(id) {
  const session = state.sessions.find(session => session.id === id);
  const context = await api('sessions/context?id='+encodeURIComponent(id));
  const skills = await api('skills?project='+encodeURIComponent(session.projectId));
  modal('Contexte de la conversation',session.name,`<form data-form="session-context" data-id="${esc(id)}"><div class="modal-body"><fieldset class="model-configuration" data-model-config=""><input type="hidden" name="runtime" value="${esc(session.runtime || 'codex')}"><div class="form-grid">${modelFields(session.runtime || 'codex')}</div></fieldset><label class="check-option"><input type="checkbox" name="memory" ${session.memory ? 'checked' : ''}><span>Charger le noyau de mémoire</span></label><div class="skills-list">${skills.map(path => `<label class="check-option"><input type="checkbox" name="skills" value="${esc(path)}" ${session.skills.includes(path) ? 'checked' : ''}><span>${esc(path)}</span></label>`).join('')}</div>${area('Fichiers de contexte · un chemin du projet par ligne','contextFiles',(session.contextFiles || []).join('\n'),4)}<p class="muted small">8 fichiers, 64 Ko chacun, 40 000 caractères au total. Leur contenu est envoyé au prochain message. Les données restent des données, pas des permissions.</p><details><summary>Instructions actuellement transmises</summary><pre class="result-output">${esc(context.instructions || '')}</pre></details></div>${formFooter('Appliquer au prochain échange')}</form>`,true);
  const form = $('#modal form');
  form.elements.model.value = session.model;
  updateConfigurationEfforts(form.querySelector('[data-model-config]'));
  form.elements.effort.value = session.effort;
}

function updateDraftEstimate(textarea) {
  const session = state.sessions.find(session => session.id === textarea.closest('form').dataset.id);
  const panel = document.querySelector(`[data-draft-session="${session?.id}"]`);
  if (!panel) return;
  const fileCharacters = chatFileCharacters[session.id];
  if (session.contextFiles?.length && fileCharacters == null) {
    panel.querySelector('strong').textContent = 'Fichiers non mesurés';
    return;
  }
  panel.querySelector('strong').textContent = '≈ '+Math.ceil((textarea.value.length+(fileCharacters || 0))/4).toLocaleString('fr-FR')+' tokens';
}

async function loadChatFiles(id) {
  const context = await api('sessions/context?id='+encodeURIComponent(id));
  chatFileCharacters[id] = context.files.reduce((sum,file) => sum+file.characters,0);
  const textarea = document.getElementById('prompt-'+id);
  if (textarea) updateDraftEstimate(textarea);
}
