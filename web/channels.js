"use strict";
let selectedChannelId = null;
const channelRoleLabels = {agent: 'Agent', consultant: 'Consultant', orchestrator: 'Orchestrateur', duplica: 'Duplica'};
const channelStatusLabels = {draft: 'À composer', running: 'En discussion', stopped: 'Arrêté', interrupted: 'Reprise requise', failed: 'Erreur', ready_for_review: 'Plan à relire', needs_more_discussion:'Discussion à poursuivre', execution_started:'Travail lancé'};
const discussionData = () => state.discussions || {channels:[],participants:[],messages:[],rounds:[]};
const projectChannels = () => discussionData().channels.filter(channel => channel.projectId === project().id);

function channelsView() {
  const channels = projectChannels();
  const channel = channels.find(entry => entry.id === selectedChannelId) || channels[0];
  selectedChannelId = channel?.id || null;
  return `${agentModeNavigation()}<div class="workspace-toolbar"><h1>Canaux</h1><span class="workspace-toolbar-spacer"></span>${channel ? sessionUsageChip(conversationUsage(discussionData().messages.filter(message => message.channelId === channel.id)),{},{label:'Consommation du canal'}) : ''}${newPanelButton()}</div>
    <div class="channels-layout"><aside class="channel-list" aria-label="Canaux du projet">${channels.length ? channels.map(entry => `<button data-action="channel-select" data-id="${esc(entry.id)}" class="channel-list-item ${entry.id === channel?.id ? 'selected' : ''}"><span class="channel-hash">#</span><span><strong>${esc(entry.name)}</strong><small>${esc(channelStatusLabels[entry.status] || entry.status)}</small></span></button>`).join('') : '<p class="muted small">Vos canaux seront conservés dans ce projet.</p>'}</aside>
    ${channel ? channelContent(channel) : `<section class="channel-empty work-band">${icon('network')}<h2>Composer une discussion</h2><p>Invitez des agents, un consultant, un orchestrateur ou Duplica. Chaque participant prépare sa réponse, puis les réponses sont partagées au tour suivant.</p>${btn('channel-new','Créer mon premier canal','plus','primary')}<small>Historique public conservé · contexte privé séparé · arrêt à tout moment</small></section>`}</div>`;
}

function channelContent(channel) {
  const discussion = discussionData();
  const participants = discussion.participants.filter(participant => participant.channelId === channel.id);
  const messages = discussion.messages.filter(message => message.channelId === channel.id);
  const rounds = discussion.rounds.filter(round => round.channelId === channel.id);
  const workflow=state.workflows.find(workflow=>workflow.id === channel.executionWorkflowId);
  const executing=workflow && ['queued','running','waiting_plan'].includes(workflow.status);
  const running = channel.status === 'running' || executing;
  const blocked = running || channel.isStopping;
  const currentRound = rounds.findLast(round => round.status === 'running');
  return `<section class="channel-room"><header class="channel-header"><div><span class="channel-name"># ${esc(channel.name)}</span><h2>${esc(channel.topic)}</h2><p class="muted small">${esc(channel.isStopping ? 'Arrêt en cours' : workflow ? 'Implémentation · '+(labels[workflow.status] || workflow.status) : channelStatusLabels[channel.status] || channel.status)} · ${channel.roundMode === 'auto' ? 'Les participants décident quand conclure' : channel.maxRounds+' tours maximum + synthèse'}${channel.execution ? ' · Implémentation automatique activée' : ''}${currentRound ? ` · ${currentRound.purpose === 'plan' ? 'Synthèse' : 'Tour ' + currentRound.number} en cours` : ''}</p></div><div class="row-actions">${btn('channel-options','','settings','icon-btn',`data-id="${esc(channel.id)}" aria-label="Options du canal" title="Options du canal" ${blocked ? 'disabled' : ''}`)}${btn(running ? 'channel-stop' : 'channel-start',channel.isStopping ? 'Arrêt en cours' : running ? 'Arrêter' : rounds.length ? 'Reprendre la discussion' : 'Lancer la discussion',running ? 'pause' : 'play',running ? 'secondary' : 'primary',`data-id="${esc(channel.id)}" ${channel.isStopping || (!participants.length && !running) ? 'disabled' : ''}`)}</div></header>
    ${workflow ? `<section class="channel-execution"><strong>Discussion → Implémentation → Vérification → Audit</strong><div>${workflow.steps.map(step=>`<span>${esc(step.role)} ${badge(step.status)}</span>`).join('')}</div>${workflow.error ? `<p class="inline-error">${esc(workflow.error)}</p>` : ''}${btn('channel-open-workflow','Voir le travail et les preuves','arrow','quiet',`data-id="${esc(workflow.id)}"`)}<small>La tâche reste En revue après le travail. Les permissions du projet et les demandes d’approbation s’appliquent.</small></section>` : ''}
    ${channel.error ? `<p class="inline-error" role="alert">${esc(channel.error)}</p>` : ''}
    <div class="channel-room-layout"><div class="channel-thread"><div class="channel-transcript" data-scroll="channel-${esc(channel.id)}" role="log" aria-label="Réponses publiques du canal">
      <div class="channel-public-note">${icon('shield')} Seules les réponses publiques circulent. Chaque tour démarre avec le même historique pour tous.</div>
      ${messages.length ? messages.map(message => channelMessage(message,participants,rounds)).join('') : '<div class="channel-first-message"><p>Posez le problème, puis invitez vos participants.</p><small>La discussion prépare un plan ; elle ne déclenche pas le travail.</small></div>'}
      ${channel.status === 'running' ? '<p class="channel-waiting" role="status">Les participants préparent leurs contributions… Elles apparaîtront à la fin du tour.</p>' : ''}</div>
      <form data-form="channel-message" data-id="${esc(channel.id)}" class="channel-compose"><label for="channel-message-${esc(channel.id)}">Votre message au canal</label><textarea id="channel-message-${esc(channel.id)}" name="text" rows="3" maxlength="16000" required placeholder="Résultat souhaité, contraintes, questions…" ${blocked ? 'disabled' : ''}></textarea><div><span class="muted small">${channel.isStopping ? 'Attente de la fin de l’appel fournisseur en cours.' : running ? 'Arrêtez la discussion pour ajouter une précision.' : 'Ce message sera lu par les participants au prochain lancement.'}</span><button type="submit" class="button secondary" ${blocked ? 'disabled' : ''}>Envoyer au canal ${icon('arrow')}</button></div></form>
      ${channel.plan ? `<section class="channel-plan work-band"><div class="panel-heading"><h3>${icon('check')} Plan proposé</h3><span class="micro-pill">${channel.status === 'ready_for_review' ? 'À RELIRE' : 'DISCUSSION PRÉCÉDENTE'}</span></div><pre>${esc(channel.plan)}</pre>${channel.status === 'ready_for_review' ? `<div class="row-actions">${btn('channel-prepare-task',channel.preparedTaskId ? 'Voir la tâche en revue' : 'Préparer une tâche en revue','tasks','primary',`data-id="${esc(channel.id)}"`)}${btn('channel-duplica-plan','Discuter du plan avec Duplica','spark','secondary',`data-id="${esc(channel.id)}"`)}</div><p class="muted small">La tâche reste En revue. Vous choisissez ensuite sa mise au travail.</p>` : ''}</section>` : ''}</div>
      <aside class="channel-participants"><div class="panel-heading"><h3>Participants <small>${participants.length} / 8</small></h3>${btn('channel-invite','Inviter','plus','quiet',`data-id="${esc(channel.id)}" ${blocked || participants.length >= 8 ? 'disabled' : ''}`)}</div>
        ${participants.map(participant => `<article class="channel-participant"><div class="channel-participant-icon role-${esc(participant.role)}">${icon(participant.role === 'duplica' ? 'spark' : participant.role === 'consultant' ? 'shield' : 'agents')}</div><div><strong>${esc(participant.name)}</strong><span>${esc(channelRoleLabels[participant.role])}</span><small>${esc(participant.configuration.model)}</small><small>${esc(channelProviderName(participant.configuration))}${participant.sourceSessionId ? ' · configuration copiée' : ''}</small></div>${btn('channel-remove-participant','Retirer','close','quiet',`data-id="${esc(channel.id)}" data-participant-id="${esc(participant.id)}" ${blocked ? 'disabled' : ''}`)}</article>`).join('') || '<p class="muted small">Choisissez un modèle par participant. Vous pouvez copier la configuration d’un agent déjà au travail.</p>'}
        <div class="channel-workflow-note"><strong>Votre workflow</strong><p>Propositions indépendantes → avis des consultants → discussion → plan par l’orchestrateur ou Duplica → votre relecture.</p><small>Les consultants SystemOne évaluent des choix et des risques. Un agent LLM rédige la synthèse.</small></div></aside></div></section>`;
}

function channelProviderName(configuration) {
  return configuration.runtime === 'api' ? (state.apiConnections || []).find(connection => connection.id === configuration.connectionId)?.name || 'API retirée' : configuration.runtime === 'omp' ? 'Oh My Pi' : 'Codex';
}

function channelMessage(message,participants,rounds) {
  const participant = participants.find(entry => entry.id === message.participantId);
  const round = rounds.find(entry => entry.id === message.roundId);
  const usage = message.usage;
  return `<article class="channel-message ${message.role === 'user' ? 'from-user' : ''}"><header><strong>${esc(message.author)}</strong><span>${esc(channelRoleLabels[message.role] || (message.role === 'user' ? 'Vous' : 'Synthèse'))}${round ? ` · tour ${round.number}` : ''}${message.readyToPlan != null ? ' · '+(message.readyToPlan ? 'Prêt à conclure' : 'À poursuivre') : ''}</span><time>${new Date(message.createdAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</time></header><p>${esc(message.text)}</p>${participant ? `<footer>${esc(participant.configuration.model)}${usage?.totalTokens != null ? ' · ' + compact(usage.totalTokens) + ' tokens reçus' : ''}</footer>` : ''}</article>`;
}

function channelModal(identifier) {
  const channel=discussionData().channels.find(channel=>channel.id === identifier), automatic=channel?.roundMode === 'auto';
  modal(channel ? 'Options du canal' : 'Nouveau canal','Choisissez comment discuter et ce qui doit suivre le plan.',`<form data-form="channel-create" ${channel ? `data-id="${esc(channel.id)}"` : ''}><div class="modal-body">${field('Nom du canal','name',channel?.name || '','text','required maxlength="100" placeholder="Conception, diagnostic, plan…"')}${area('Sujet et résultat attendu','topic',channel?.topic || '',3,'required maxlength="16000"')}${select('Fin de la discussion','roundMode',[['fixed','Nombre de tours choisi'],['auto','Autant de tours que nécessaire · accord des participants']],automatic ? 'auto' : 'fixed')}<div id="channel-fixed-rounds" ${automatic ? 'hidden' : ''}>${field('Tours de discussion maximum','maxRounds',channel?.maxRounds || 2,'number','required min="1" max="6"')}</div><div id="channel-auto-rounds" ${automatic ? '' : 'hidden'}>${field('Limite de sécurité par lancement','autoRoundLimit',channel?.autoRoundLimit || 24,'number','required min="1" max="50"')}<p class="muted small">Les participants concluent lorsqu’ils sont tous prêts. À la limite, la discussion s’arrête et attend votre reprise.</p></div><label class="check-option"><input type="checkbox" name="executionEnabled" ${channel?.execution ? 'checked' : ''}><span>Après le plan, implémenter automatiquement dans ce projet, puis vérifier et auditer.</span></label><div id="channel-execution-settings" ${channel?.execution ? '' : 'hidden'}><p class="muted small">Ce choix autorise les écritures dans le projet au lancement de la discussion. Les demandes d’approbation restent actives. Trois sessions distinctes : implémentation, vérification, audit.</p>${channelExecutionFields('executor_', 'Implémentation',channel?.execution?.executor)}${channelExecutionFields('reviewer_', 'Vérification et audit',channel?.execution?.reviewer)}</div><p class="muted small">${channel ? 'Les options s’appliqueront au prochain lancement.' : 'Ajoutez ensuite vos participants.'} Le plan et les preuves restent consultables.</p></div>${formFooter(channel ? 'Enregistrer les options' : 'Créer le canal')}</form>`,true);
}

function channelExecutionFields(prefix, title, configuration) {
  const models=provider().models || [], selected=models.find(model=>model.model === configuration?.model) || models.find(model=>model.isDefault) || models[0];
  return `<fieldset class="channel-execution-config" data-model-config="${prefix}"><legend>${title} · Codex</legend><input type="hidden" name="${prefix}runtime" value="codex"><div class="form-grid">${select('Modèle · '+title,prefix+'model',models.map(model=>[model.model,model.displayName]),selected?.model)}${select('Effort · '+title,prefix+'effort',(selected?.supportedReasoningEfforts || []).map(effort=>[effort.reasoningEffort,effort.reasoningEffort]),configuration?.effort || selected?.defaultReasoningEffort)}</div></fieldset>`;
}

function channelInviteModal(channelId) {
  const configurations = [['codex','Codex · compte ChatGPT'],['omp','Oh My Pi'],...(state.apiConnections || []).map(connection => ['api:'+connection.id,connection.name+' · '+apiProtocolLabels[connection.protocol]])];
  const candidates = objects('sessions').filter(session => session.consumer !== 'channel' && ['codex','omp','api'].includes(session.runtime || 'codex'));
  modal('Inviter un participant','Une configuration propre, avec uniquement les échanges publics du canal.',`<form data-form="channel-participant" data-id="${esc(channelId)}"><div class="modal-body">
    ${select('Configuration du participant','origin',[['new','Choisir un modèle'],['clone','Copier celle d’un agent existant']],'new')}
    <div class="form-grid">${field('Nom du participant','name','Spécialiste','text','required maxlength="100"')}${select('Rôle dans le canal','role',Object.entries(channelRoleLabels),'agent')}</div>
    <div id="channel-new-configuration">${select('Fournisseur du participant','channelProvider',configurations,'codex')}<div class="form-grid" id="channel-model-fields"></div></div>
    <div id="channel-clone-configuration" hidden>${select('Agent à copier','sessionId',candidates.map(session=>[session.id,session.name+' · '+session.model]),candidates[0]?.id)}<p class="muted small">Seuls le fournisseur et les réglages du modèle sont copiés. L’agent au travail poursuit sa mission ; son contexte reste séparé.</p></div>
    <p class="muted small">Chaque participant est en mode discussion. Ajoutez un orchestrateur ou Duplica pour rédiger le plan.</p>
    </div>${formFooter('Ajouter le participant')}</form>`,true);
  updateChannelModels($('#modal form'));
}

function channelSelectedProvider(form) {
  const selected = form.elements.channelProvider.value;
  return selected.startsWith('api:') ? (state.apiConnections || []).find(connection=>connection.id === selected.slice(4)) || {} : provider(selected);
}

function updateChannelModels(form) {
  const selectedProvider = channelSelectedProvider(form);
  const models = selectedProvider.models || [];
  const first = models.find(model=>model.isDefault) || models[0];
  $('#channel-model-fields').innerHTML = select('Modèle du participant','channelModel',models.map(model=>[model.model,model.displayName]),first?.model) + select('Effort du participant','channelEffort',[],null);
  updateChannelEfforts(form);
  for (const option of form.elements.role.options) option.disabled = selectedProvider.protocol === 'systemone' && option.value !== 'consultant';
  if (selectedProvider.protocol === 'systemone') form.elements.role.value = 'consultant';
}

function updateChannelEfforts(form) {
  const model = (channelSelectedProvider(form).models || []).find(entry=>entry.model === form.elements.channelModel.value);
  form.elements.channelEffort.innerHTML = (model?.supportedReasoningEfforts || []).map(effort=>`<option value="${esc(effort.reasoningEffort)}" ${effort.reasoningEffort === model.defaultReasoningEffort ? 'selected' : ''}>${esc(effort.reasoningEffort)}</option>`).join('');
}

async function handleChannelSubmit(form,values) {
  if (form.dataset.form === 'channel-create') {
    const execution=form.elements.executionEnabled.checked ? {executor:configurationValues(form,'executor_'),reviewer:configurationValues(form,'reviewer_'),sandbox:'workspace-write'} : null;
    const settings={name:values.name,topic:values.topic,roundMode:values.roundMode,maxRounds:Number(values.maxRounds),autoRoundLimit:Number(values.autoRoundLimit),execution};
    const channel = await api(form.dataset.id ? 'channels/options' : 'channels',form.dataset.id ? {...settings,id:form.dataset.id} : {...settings,projectId});
    selectedChannelId = channel.id;
    $('#modal').close();
  } else if (form.dataset.form === 'channel-participant') {
    const configuration = values.origin === 'clone' ? {sessionId:values.sessionId} : values.channelProvider.startsWith('api:') ?
      {configuration:{runtime:'api',connectionId:values.channelProvider.slice(4),model:values.channelModel,effort:'off'}} :
      {configuration:{runtime:values.channelProvider,model:values.channelModel,effort:values.channelEffort}};
    await api('channels/participants',{id:form.dataset.id,name:values.name,role:values.role,...configuration});
    $('#modal').close();
  } else {
    await api('channels/messages',{id:form.dataset.id,text:values.text});
    form.reset();
    const draft = document.getElementById('channel-message-'+form.dataset.id);
    if (draft) draft.value = '';
  }
  await refresh(true);
}

function installChannelActions() {
  Object.assign(actions, {
    'channel-new': () => channelModal(),
    'channel-options':element=>channelModal(element.dataset.id),
    'channel-open-workflow':element=>{graphWorkflowId=element.dataset.id;selectedGraphNode=null;route('overview');},
    'channel-select': element => { selectedChannelId=element.dataset.id; render(); },
    'channel-invite': element => channelInviteModal(element.dataset.id),
    'channel-start': async element => { await api('channels/start',{id:element.dataset.id}); await refresh(true); },
    'channel-stop': async element => { await api('channels/stop',{id:element.dataset.id}); await refresh(true); },
    'channel-remove-participant': async element => { await api('channels/remove-participant',{id:element.dataset.id,participantId:element.dataset.participantId}); await refresh(true); },
    'channel-prepare-task': async element => { const task=await api('channels/prepare-task',{id:element.dataset.id}); await refresh(true); route('tasks'); taskModal(task.id || task.taskId); },
    'channel-duplica-plan': async element => { const channel=discussionData().channels.find(entry=>entry.id === element.dataset.id); route('duplica'); const draft=$('[data-form="duplica-chat"] textarea[name="text"]'); if (draft) { draft.value='Aidons-moi à relire ce plan avant action. Signale les questions à trancher.\n\nSujet : '+channel.topic+'\n\n'+channel.plan; draft.focus(); } },
  });
  document.addEventListener('change', event => {
    const options=event.target.closest('[data-form="channel-create"]');
    if(options) {
      if(event.target.name === 'roundMode') {$('#channel-fixed-rounds').hidden=event.target.value === 'auto';$('#channel-auto-rounds').hidden=event.target.value !== 'auto';}
      else if(event.target.name === 'executionEnabled') $('#channel-execution-settings').hidden=!event.target.checked;
      return;
    }
    const form=event.target.closest('[data-form="channel-participant"]');
    if (!form) return;
    if (event.target.name === 'origin') {
      $('#channel-new-configuration').hidden=event.target.value === 'clone';
      $('#channel-clone-configuration').hidden=event.target.value !== 'clone';
      if (event.target.value === 'clone') for (const option of form.elements.role.options) option.disabled=false;
      else updateChannelModels(form);
    } else if (event.target.name === 'channelProvider') updateChannelModels(form);
    else if (event.target.name === 'channelModel') updateChannelEfforts(form);
  });
}
