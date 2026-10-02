"use strict";
const apiProtocolLabels = {openai: 'Chat Completions · LLM', systemone: 'SystemOne · décisions'};

function apiConnectionsView() {
  const connections = state.apiConnections || [];
  return `<section class="api-connections work-band"><div class="panel-heading"><div><h3>${icon('plug')} API locales & distantes</h3><p class="muted small">Branchez vos modèles au canal de discussion.</p></div>${btn('api-connection-new','Ajouter une API','plus','secondary')}</div>
    ${connections.length ? `<div class="metrics-table"><table><thead><tr><th>Connexion</th><th>Protocole</th><th>Modèles</th><th></th></tr></thead><tbody>${connections.map(connection => `<tr><td><strong>${esc(connection.name)}</strong><small>${esc(connection.baseUrl)}</small>${connection.error ? `<p class="inline-error">${esc(connection.error)}</p>` : ''}</td><td>${esc(apiProtocolLabels[connection.protocol])}</td><td>${connection.models.length} · ${connection.catalogSource === 'discovered' ? 'catalogue reçu' : 'déclarés'}<small>${connection.status === 'catalog_ready' ? 'Accès à vérifier lors du premier appel' : 'Connexion à vérifier'}</small></td><td><div class="row-actions">${connection.protocol === 'openai' ? btn('api-connection-discover','Lire le catalogue','plug','quiet',`data-id="${esc(connection.id)}"`) : ''}${btn('api-connection-edit','Modifier','settings','quiet',`data-id="${esc(connection.id)}"`)}${btn('api-connection-remove','Retirer','close','quiet',`data-id="${esc(connection.id)}"`)}</div></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Ajoutez une URL locale (LM Studio, Ollama en mode compatible, vLLM…) ou une API HTTPS compatible.</p>'}
    <p class="small muted">Pour <a href="https://huggingface.co/convaiinnovations/laya" target="_blank" rel="noopener noreferrer">LAYA</a> et <a href="https://huggingface.co/Cloudflare/clef" target="_blank" rel="noopener noreferrer">CLEF</a>, choisissez SystemOne : ils évaluent les propositions en tant que consultants. Un LLM rédige le plan.</p></section>`;
}

function apiConnectionModal(identifier = null) {
  const connection = (state.apiConnections || []).find(entry => entry.id === identifier);
  modal(connection ? 'Modifier la connexion API' : 'Ajouter une API', 'Votre serveur de modèles, local ou distant.',
    `<form data-form="api-connection" ${connection ? `data-id="${esc(connection.id)}"` : ''}><div class="modal-body">
      <div class="form-grid">${field('Nom de la connexion','name',connection?.name || '', 'text','required maxlength="100"')}${select('Protocole','protocol',Object.entries(apiProtocolLabels),connection?.protocol || 'openai')}</div>
      ${field('URL de base','baseUrl',connection?.baseUrl || 'http://127.0.0.1:1234/v1','url','required')}
      ${area('Identifiants des modèles (un par ligne)','modelIds',(connection?.models || []).map(model => model.model).join('\n'),3)}
      <p class="muted small" id="api-protocol-hint">Chat Completions : renseignez les modèles ou utilisez Lire le catalogue après l’enregistrement. SystemOne : renseignez l’identifiant attendu par votre serveur LAYA ou CLEF.</p>
      <div class="form-grid">${field('Variable de clé dans le service (facultative)','credentialEnvironment',connection?.credentialEnvironment || '', 'text','placeholder="ATELIER_LOCAL_API_KEY" pattern="ATELIER_([A-Z0-9_]+_)?API_KEY"')}${field('Délai maximum par appel (secondes)','timeout',connection?.timeout || 60,'number','min="5" max="180" required')}</div>
      <p class="muted small">Pour une API sans clé, laissez la variable vide. L’enregistrement ne lance aucune inférence. Les clés sont lues uniquement depuis la variable ATELIER_ que vous indiquez.</p>
    </div>${formFooter('Enregistrer la connexion')}</form>`,true);
}

async function submitApiConnection(form, values) {
  await api('api-connections',{...values,timeout:Number(values.timeout),...(form.dataset.id ? {id:form.dataset.id} : {})});
  $('#modal').close();
  await refresh(true);
  toast('Connexion enregistrée. Ajoutez un participant depuis Canaux d’agents.');
}

function installApiConnectionActions() {
Object.assign(actions, {
  'api-connection-new': () => apiConnectionModal(),
  'api-connection-edit': element => apiConnectionModal(element.dataset.id),
  'api-connection-discover': async element => { await api('api-connections/discover',{id:element.dataset.id}); await refresh(true); toast('Catalogue reçu. Aucun appel de génération.'); },
  'api-connection-remove': async element => { await api('api-connections/remove',{id:element.dataset.id}); await refresh(true); },
});
}
