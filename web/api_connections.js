"use strict";
const apiProtocolLabels = {openai: 'Chat Completions · LLM', systemone: 'SystemOne · décisions'};
const apiServerPresets = {
  custom: {label: 'API personnalisée · locale ou HTTPS', name: '', baseUrl: ''},
  lmstudio: {label: 'LM Studio', name: 'LM Studio', baseUrl: 'http://127.0.0.1:1234/v1'},
  omlx: {label: 'oMLX', name: 'oMLX', baseUrl: 'http://127.0.0.1:8000/v1'},
  splash: {label: 'Splash · serveur compatible', name: 'Splash', baseUrl: 'http://127.0.0.1:8001/v1'},
};

function apiCatalogDetails(connection) {
  const models = connection.models || [], excluded = connection.excludedModels || [];
  const unknown = models.filter(model => !model.modelType || model.modelType === 'unknown').length;
  return `${models.length} · ${connection.catalogSource === 'discovered' ? 'modèles reçus' : 'identifiants déclarés'}
    <small>${connection.status === 'error' ? 'Lecture du catalogue en échec' : connection.catalogReadAt ? 'Serveur joignable · catalogue reçu' : 'Connexion à vérifier'}</small>
    <small>${connection.lastReplyAt ? `Réponse reçue avec ${esc(connection.lastReplyModel)}` : 'Génération à vérifier lors du premier échange'}</small>
    ${unknown ? `<small>Type non fourni pour ${unknown} modèle${unknown > 1 ? 's' : ''}.</small>` : ''}
    ${excluded.length ? `<small>${excluded.length} modèle${excluded.length > 1 ? 's' : ''} d’embedding ou de classement écarté${excluded.length > 1 ? 's' : ''} du canal.</small>` : ''}
    ${models.length || excluded.length ? `<details><summary>Voir les modèles</summary><ul>${[...models,...excluded].map(model => `<li>${esc(model.displayName || model.model)}${model.displayName && model.displayName !== model.model ? `<small>${esc(model.model)}</small>` : ''}<small>${({chat:'Conversation',embedding:'Embedding · hors canal',reranker:'Classement · hors canal',unknown:'Type non fourni'})[model.modelType] || 'Type non fourni'}${model.loaded === true ? ' · chargé' : model.loaded === false ? ' · non chargé' : ''}</small></li>`).join('')}</ul></details>` : connection.catalogReadAt ? '<small>Le serveur ne fournit aucun modèle utilisable dans le canal.</small>' : ''}`;
}

function apiConnectionsView() {
  const connections = state.apiConnections || [];
  return `<section class="api-connections work-band"><div class="panel-heading"><div><h3>${icon('plug')} API locales & distantes</h3><p class="muted small">Branchez LM Studio, oMLX, Splash ou un serveur compatible à vos canaux.</p></div>${btn('api-connection-new','Ajouter une API','plus','secondary')}</div>
    ${connections.length ? `<div class="metrics-table"><table><thead><tr><th>Connexion</th><th>Protocole</th><th>Modèles</th><th></th></tr></thead><tbody>${connections.map(connection => `<tr><td><strong>${esc(connection.name)}</strong><small>${esc(connection.baseUrl)}</small>${connection.error ? `<p class="inline-error">${esc(connection.error)}</p>` : ''}</td><td>${esc(apiProtocolLabels[connection.protocol])}</td><td>${apiCatalogDetails(connection)}</td><td><div class="row-actions">${connection.protocol === 'openai' ? btn('api-connection-discover','Lire le catalogue','plug','quiet',`data-id="${esc(connection.id)}" title="Tester la connexion et lire les modèles sans génération"`) : ''}${btn('api-connection-edit','Modifier','settings','quiet',`data-id="${esc(connection.id)}"`)}${btn('api-connection-remove','Retirer','close','quiet',`data-id="${esc(connection.id)}"`)}</div></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Ajoutez votre serveur local ou une API HTTPS compatible. Les modèles viennent du serveur ; aucun modèle n’est installé par Atelier.</p>'}
    <p class="small muted">Lire le catalogue teste la connexion sans génération. Le premier échange vérifie la réponse du modèle. Pour LM Studio, le catalogue natif distingue les LLM des embeddings lorsqu’il est disponible.</p>
    <p class="small muted">Pour <a href="https://huggingface.co/convaiinnovations/laya" target="_blank" rel="noopener noreferrer">LAYA</a> et <a href="https://huggingface.co/Cloudflare/clef" target="_blank" rel="noopener noreferrer">CLEF</a>, choisissez SystemOne : ils évaluent les propositions en tant que consultants. Un LLM rédige le plan.</p></section>`;
}

function apiConnectionModal(identifier = null) {
  const connection = (state.apiConnections || []).find(entry => entry.id === identifier);
  modal(connection ? 'Modifier la connexion API' : 'Ajouter une API', 'Votre serveur de modèles, local ou distant.',
    `<form data-form="api-connection" ${connection ? `data-id="${esc(connection.id)}"` : ''}><div class="modal-body">
      ${select('Serveur','serverKind',Object.entries(apiServerPresets).map(([key,preset]) => [key,preset.label]),connection?.serverKind || (connection ? 'custom' : 'lmstudio'))}
      <div class="form-grid">${field('Nom de la connexion','name',connection?.name || '', 'text','required maxlength="100"')}${select('Protocole','protocol',Object.entries(apiProtocolLabels),connection?.protocol || 'openai')}</div>
      ${field('URL de base','baseUrl',connection?.baseUrl || apiServerPresets.lmstudio.baseUrl,'url','required')}
      <p class="muted small">URL modifiable : adresse du serveur, base /v1 ou route /v1/chat/completions. Les adresses proposées correspondent aux ports par défaut.</p>
      ${area('Identifiants des modèles (un par ligne)','modelIds',(connection?.models || []).map(model => model.model).join('\n'),3)}
      <p class="muted small" id="api-protocol-hint">Chat Completions : laissez les identifiants vides, puis lisez le catalogue après l’enregistrement. Vous pouvez aussi déclarer les identifiants si le serveur ne fournit pas de catalogue. SystemOne : renseignez l’identifiant attendu par votre serveur LAYA ou CLEF.</p>
      <div class="form-grid">${field('Variable de clé dans le service (facultative)','credentialEnvironment',connection?.credentialEnvironment || '', 'text','placeholder="ATELIER_LOCAL_API_KEY" pattern="ATELIER_([A-Z0-9_]+_)?API_KEY"')}${field('Délai maximum par appel (secondes)','timeout',connection?.timeout || 60,'number','min="5" max="180" required')}</div>
      <p class="muted small">Pour une API sans clé, laissez la variable vide. Les clés sont lues uniquement depuis la variable ATELIER_ que vous indiquez dans le service.</p>
      <label class="check-option"><input type="checkbox" name="discoverAfterSave" ${connection ? '' : 'checked'}><span>Lire le catalogue à l’enregistrement, sans génération</span></label>
    </div>${formFooter('Enregistrer la connexion')}</form>`,true);
  const form = $('#modal [data-form="api-connection"]');
  let previousKind = form.elements.serverKind.value;
  form.elements.serverKind.addEventListener('change', () => {
    const preset = apiServerPresets[form.elements.serverKind.value];
    if (preset.baseUrl) {
      form.elements.baseUrl.value = preset.baseUrl;
      if (!form.elements.name.value || form.elements.name.value === apiServerPresets[previousKind].name) form.elements.name.value = preset.name;
      form.elements.protocol.value = 'openai';
    }
    previousKind = form.elements.serverKind.value;
    updateApiConnectionForm(form);
  });
  form.elements.protocol.addEventListener('change', () => updateApiConnectionForm(form));
  updateApiConnectionForm(form);
}

function updateApiConnectionForm(form) {
  const chat = form.elements.protocol.value === 'openai';
  form.elements.discoverAfterSave.disabled = !chat;
  form.elements.modelIds.required = !chat;
}

async function submitApiConnection(form, values) {
  const connection = await api('api-connections',{...values,timeout:Number(values.timeout),...(form.dataset.id ? {id:form.dataset.id} : {})});
  const discover = form.elements.discoverAfterSave.checked && values.protocol === 'openai';
  $('#modal').close();
  if (discover) {
    try {
      await api('api-connections/discover',{id:connection.id});
      toast('Connexion vérifiée, catalogue reçu. Ajoutez un participant depuis Canaux d’agents.');
    } catch (error) {
      toast('Connexion enregistrée. '+error.message);
    }
  } else toast('Connexion enregistrée. Ajoutez un participant depuis Canaux d’agents.');
  await refresh(true);
}

function installApiConnectionActions() {
Object.assign(actions, {
  'api-connection-new': () => apiConnectionModal(),
  'api-connection-edit': element => apiConnectionModal(element.dataset.id),
  'api-connection-discover': async element => { try { await api('api-connections/discover',{id:element.dataset.id}); toast('Catalogue reçu. Aucun appel de génération.'); } finally { await refresh(true); } },
  'api-connection-remove': async element => { await api('api-connections/remove',{id:element.dataset.id}); await refresh(true); },
});
}
