"use strict";
let selectedChannelId = null;
const channelActivityOpen = new Set();
const channelColorAssignments = new Map();
const channelHistoryCache = new Map();
let channelScrollSaveTimer=null;
const channelRoleLabels = {agent: 'Agent', consultant: 'Consultant', critic: 'Questionneur / contradicteur', orchestrator: 'Orchestrateur', duplica: 'Duplica'};
const channelStatusLabels = {draft: 'À composer', running: 'En discussion', stopped: 'Arrêté', interrupted: 'Reprise requise', failed: 'Erreur', ready_for_review: 'Plan à relire', needs_more_discussion:'Discussion à poursuivre', execution_started:'Travail lancé'};
const discussionData = () => state.discussions || {channels:[],participants:[],messages:[],rounds:[]};
const projectChannels = () => discussionData().channels.filter(channel => channel.projectId === project().id);

function channelColorSeed(identifier) {
  let hash=0;
  for(const character of String(identifier)) hash=(Math.imul(hash,31)+character.codePointAt(0)) >>> 0;
  return hash % 8;
}

function prepareChannelColors(channelId,participants) {
  const key='atelier-channel-colors:'+projectId+':'+channelId;
  if(!channelColorAssignments.has(channelId)) {
    let saved=[];
    try {const stored=JSON.parse(localStorage.getItem(key) || '[]');if(Array.isArray(stored)) saved=stored;} catch (_) {}
    const assignments=new Map(),used=new Set();
    for(const entry of saved.slice(0,8)) {
      if(Array.isArray(entry) && typeof entry[0] === 'string' && Number.isInteger(entry[1]) && entry[1] >= 0 && entry[1] < 8 && !used.has(entry[1])) {assignments.set(entry[0],entry[1]);used.add(entry[1]);}
    }
    channelColorAssignments.set(channelId,assignments);
  }
  const assignments=channelColorAssignments.get(channelId),active=new Set(participants.map(participant=>participant.id));
  let changed=false;
  for(const participant of [...participants].sort((left,right)=>left.id.localeCompare(right.id))) {
    if(assignments.has(participant.id)) continue;
    const occupied=new Set([...assignments].filter(([id])=>active.has(id)).map(([,color])=>color));
    let color=channelColorSeed(participant.id);
    for(let attempt=0;attempt < 8 && occupied.has(color);attempt++) color=(color+1) % 8;
    for(const [id,assigned] of assignments) if(assigned === color && !active.has(id)) assignments.delete(id);
    assignments.set(participant.id,color);changed=true;
  }
  if(changed) {try {localStorage.setItem(key,JSON.stringify([...assignments]));} catch (_) {}}
}

function channelParticipantColor(channelId,participantId) {
  return 'channel-color-'+(channelColorAssignments.get(channelId)?.get(participantId) ?? channelColorSeed(participantId));
}

function channelParticipantIcon(role) {
  return icon({duplica:'spark',consultant:'shield',critic:'search',orchestrator:'network'}[role] || 'agents');
}

function channelConfigurationEffort(configuration) {
  return configuration.runtime === 'api' ? 'paramètres serveur' : configuration.effort;
}

function channelContextProjectionNote(projection) {
  if(!projection?.truncated) return '';
  const excerpts=projection.excerptMessageIds?.length || 0,omittedUsers=projection.omittedUserMessageCount ?? projection.omittedUserMessageIds?.length ?? 0;
  return `<p class="channel-context-note" role="status">Contexte borné : ${esc(projection.includedMessages)}/${esc(projection.totalMessages)} messages transmis, ${esc(excerpts)} extrait${excerpts === 1 ? '' : 's'} partiel${excerpts === 1 ? '' : 's'}. Les demandes utilisateur et les dernières positions sont prioritaires. L’historique complet reste visible dans ce canal.${omittedUsers ? `<strong>${omittedUsers} demande${omittedUsers === 1 ? '' : 's'} utilisateur absente${omittedUsers === 1 ? '' : 's'} du contexte de ce tour.</strong>` : ''}</p>`;
}

function channelHistoryStorageKey(channelId) {
  const owner=discussionData().channels.find(channel=>channel.id===channelId)?.projectId || projectId;
  return 'atelier-channel-history:'+owner+':'+channelId;
}

const CHANNEL_WINDOW_MESSAGES=300;
const CHANNEL_WINDOW_CHARACTERS=480000;

function channelHistoryEntry(channelId) {
  if(!channelHistoryCache.has(channelId)) {
    let saved={};
    try {saved=JSON.parse(localStorage.getItem(channelHistoryStorageKey(channelId)) || '{}') || {};} catch (_) {}
    const anchor=saved.anchor && typeof saved.anchor.messageId === 'string' && Number.isFinite(saved.anchor.offset) ? saved.anchor : null;
    const savedWindow=Number.isSafeInteger(saved.firstSequence) && Number.isSafeInteger(saved.lastSequence) && saved.firstSequence>0 && saved.lastSequence>=saved.firstSequence ? {first:saved.firstSequence,last:saved.lastSequence} : null;
    const historical=saved.mode === 'history' && Boolean(savedWindow);
    channelHistoryCache.set(channelId,{messages:new Map(),rounds:new Map(),mode:historical ? 'history' : 'latest',loading:false,error:'',notice:'',savedWindow,pendingAnchor:anchor,savedAnchor:anchor,restoring:historical,restoreStarted:false,pageScroll:{windowTop:Number(saved.windowTop)||0,mainTop:Number(saved.mainTop)||0}});
  }
  return channelHistoryCache.get(channelId);
}

function channelTrimHistory(cached,direction='newer') {
  const messages=[...cached.messages.values()].sort((left,right)=>(left.sequence || 0)-(right.sequence || 0));
  let characters=messages.reduce((sum,message)=>sum+String(message.text || '').length,0);
  while(messages.length>1 && (messages.length>CHANNEL_WINDOW_MESSAGES || characters>CHANNEL_WINDOW_CHARACTERS)) {
    const removed=direction === 'older' ? messages.pop() : messages.shift();characters-=String(removed.text || '').length;cached.messages.delete(removed.id);
  }
  const roundIds=new Set(messages.map(message=>message.roundId).filter(Boolean));
  for(const identifier of cached.rounds.keys()) if(!roundIds.has(identifier)) cached.rounds.delete(identifier);
}

function channelVisibleMessages(channel) {
  const cached=channelHistoryEntry(channel.id),discussion=discussionData(),recent=discussion.messages.filter(message=>message.channelId === channel.id);
  if(cached.mode === 'latest') {
    const known=[...cached.messages.values()],last=Math.max(0,...known.map(message=>message.sequence || 0));
    if(recent[0]?.sequence>last+1 && known.length) cached.messages.clear();
    for(const message of recent) cached.messages.set(message.id,message);
    channelTrimHistory(cached);
  }
  for(const round of discussion.rounds.filter(round=>round.channelId === channel.id)) if([...cached.messages.values()].some(message=>message.roundId === round.id)) cached.rounds.set(round.id,round);
  return [...cached.messages.values()].sort((left,right)=>(left.sequence || 0)-(right.sequence || 0));
}

function channelHistoryPosition(channel) {
  const messages=channelVisibleMessages(channel),sequences=messages.map(message=>message.sequence).filter(Number.isSafeInteger);
  const first=sequences[0] || null,last=sequences.at(-1) || null,total=channel.history?.messageCount ?? messages.length;
  return {messages,first,last,total,hasMore:Boolean(first>1),hasNewer:Boolean(last && last<(channel.history?.lastSequence || total))};
}

function channelScrollAnchor(channelId) {
  const transcript=document.querySelector('.channel-transcript[data-channel-id="'+CSS.escape(channelId)+'"]');
  if(!transcript) return null;
  const boundary=transcript.getBoundingClientRect(),bottom=transcript.scrollHeight-transcript.clientHeight-transcript.scrollTop<30;
  const message=[...transcript.querySelectorAll('[data-message-id]')].find(element=>element.getBoundingClientRect().bottom>boundary.top+1);
  return message ? {messageId:message.dataset.messageId,sequence:Number(message.dataset.sequence)||null,offset:message.getBoundingClientRect().top-boundary.top,bottom} : null;
}

function rememberChannelHistory(channelId,anchor) {
  const channel=discussionData().channels.find(entry=>entry.id===channelId);
  if(!channel) return;
  const cached=channelHistoryEntry(channelId),position=channelHistoryPosition(channel);
  if(anchor) cached.savedAnchor=anchor;
  if(view === 'channels' && selectedChannelId === channelId && channel.projectId === projectId) cached.pageScroll={windowTop:window.scrollY,mainTop:$('#main').scrollTop};
  const first=cached.restoreFailed ? cached.savedWindow?.first : position.first,last=cached.restoreFailed ? cached.savedWindow?.last : position.last;
  try {localStorage.setItem(channelHistoryStorageKey(channelId),JSON.stringify({mode:cached.mode,firstSequence:first || cached.savedWindow?.first,lastSequence:last || cached.savedWindow?.last,anchor:cached.savedAnchor,...cached.pageScroll}));} catch (_) {}
}

function restoreChannelScroll(channelId) {
  const cached=channelHistoryEntry(channelId),anchor=cached.pendingAnchor;
  if(!anchor) return;
  const transcript=document.querySelector('.channel-transcript[data-channel-id="'+CSS.escape(channelId)+'"]');
  if(!transcript) return;
  const message=transcript.querySelector('[data-message-id="'+CSS.escape(anchor.messageId)+'"]');
  if(anchor.bottom && cached.mode === 'latest') transcript.scrollTop=transcript.scrollHeight;
  else if(message) transcript.scrollTop+=message.getBoundingClientRect().top-transcript.getBoundingClientRect().top-anchor.offset;
  else if(anchor.sequence) {
    const nearest=[...transcript.querySelectorAll('[data-message-id]')].find(element=>Number(element.dataset.sequence)>=anchor.sequence);
    if(nearest) transcript.scrollTop+=nearest.getBoundingClientRect().top-transcript.getBoundingClientRect().top;
  }
  cached.pendingAnchor=null;
  if(cached.restoring) {window.scrollTo(0,cached.pageScroll.windowTop);$('#main').scrollTop=cached.pageScroll.mainTop;}
}

function channelHistoryControls(channel) {
  const position=channelHistoryPosition(channel),cached=channelHistoryEntry(channel.id);
  if(!channel.history || !position.total) return '';
  const disabled=cached.loading || cached.restoring;
  return `<div class="channel-history-controls" aria-label="Historique du canal"><span>${position.first ? esc(position.first)+'–'+esc(position.last) : '0'} sur ${esc(position.total)} messages · historique conservé</span><div>${position.hasMore ? btn('channel-load-history','Messages précédents','clock','quiet',`data-id="${esc(channel.id)}" ${disabled ? 'disabled' : ''}`) : ''}${position.hasNewer ? btn('channel-load-newer','Messages plus récents','arrow','quiet',`data-id="${esc(channel.id)}" ${disabled ? 'disabled' : ''}`) : ''}${cached.mode === 'history' || position.hasNewer ? btn('channel-latest','Derniers échanges','arrow','quiet',`data-id="${esc(channel.id)}" ${disabled ? 'disabled' : ''}`) : ''}</div><small>Fenêtre de ${CHANNEL_WINDOW_MESSAGES} messages maximum. Les autres restent consultables ici, par lots de 50.</small>${cached.loading || cached.restoring ? '<small data-history-restoring role="status">'+(cached.restoring ? 'Restauration de votre lecture…' : 'Chargement…')+'</small>' : ''}${cached.notice ? `<small role="status">${esc(cached.notice)}</small>` : ''}${cached.error ? `<p class="inline-error" role="alert">${esc(cached.error)} Les messages déjà chargés restent consultables.${btn('channel-retry-history','Réessayer','clock','quiet',`data-id="${esc(channel.id)}"`)}</p>` : ''}</div>`;
}

function mountChannelHistory(channelId) {
  queueMicrotask(()=>{
    if(view !== 'channels' || selectedChannelId !== channelId) return;
    const cached=channelHistoryEntry(channelId);
    if(cached.restoring && !cached.restoreStarted && !cached.error) {restoreChannelHistoryWindow(channelId);return;}
    if(!cached.restoring) {if(!cached.loading) document.querySelector('[data-history-restoring]')?.remove();restoreChannelScroll(channelId);}
  });
}

function mergeChannelHistoryPage(channelId,page) {
  if(page.channelId !== channelId || !Array.isArray(page.messages)) throw new Error('Page d’historique invalide.');
  const cached=channelHistoryEntry(channelId);
  for(const message of page.messages) if(message.channelId === channelId) cached.messages.set(message.id,message);
  for(const round of page.rounds || []) if(round.channelId === channelId) cached.rounds.set(round.id,round);
}

async function restoreChannelHistoryWindow(channelId) {
  const cached=channelHistoryEntry(channelId),wanted=cached.savedWindow;
  if(!wanted || cached.loading) return;
  cached.loading=true;cached.restoreStarted=true;cached.restoreFailed=false;cached.error='';
  const generation=cached.requestGeneration=(cached.requestGeneration || 0)+1;
  let before=wanted.last+1,complete=false;
  try {
    for(let request=0;request<4;request++) {
      const page=await api('channels/history?id='+encodeURIComponent(channelId)+'&before='+before+'&limit=100');
      if(cached.requestGeneration !== generation) return;
      mergeChannelHistoryPage(channelId,page);
      for(const [id,message] of cached.messages) if(message.sequence<wanted.first || message.sequence>wanted.last) cached.messages.delete(id);
      channelTrimHistory(cached,'older');
      const first=page.messages[0]?.sequence;
      if(!first || first<=wanted.first) {complete=true;break;}
      before=first;
    }
    if(!complete) cached.notice='Une partie de votre fenêtre a été restaurée. Les messages précédents restent accessibles avec les boutons de navigation.';
  } catch(error) {if(cached.requestGeneration === generation) {cached.error=error.message;cached.restoreFailed=true;}}
  finally {
    if(cached.requestGeneration !== generation) return;
    cached.loading=false;cached.restoring=false;
    if(view === 'channels' && selectedChannelId === channelId) {
      render();
      queueMicrotask(()=>{window.scrollTo(0,cached.pageScroll.windowTop);$('#main').scrollTop=cached.pageScroll.mainTop;});
    }
  }
}

async function loadChannelHistory(channelId,direction='older') {
  const channel=discussionData().channels.find(entry=>entry.id===channelId),cached=channelHistoryEntry(channelId);
  if(!channel || cached.loading || cached.restoring) return;
  const position=channelHistoryPosition(channel),cursor=direction === 'newer' ? position.last : position.first;
  if(!cursor || !(direction === 'newer' ? position.hasNewer : position.hasMore)) return;
  cached.loading=true;cached.error='';cached.notice='';cached.failedDirection=direction;
  const generation=cached.requestGeneration=(cached.requestGeneration || 0)+1;
  cached.mode='history';cached.pendingAnchor=channelScrollAnchor(channelId);
  if(view === 'channels' && selectedChannelId === channelId) render();
  try {
    const page=await api('channels/history?id='+encodeURIComponent(channelId)+'&'+(direction === 'newer' ? 'after' : 'before')+'='+encodeURIComponent(cursor)+'&limit=50');
    if(cached.requestGeneration !== generation) return;
    if(!page.messages?.length) throw new Error('Aucun message supplémentaire reçu. Réessayez de charger l’historique.');
    const anchor=channelScrollAnchor(channelId);
    cached.mode='history';mergeChannelHistoryPage(channelId,page);channelTrimHistory(cached,direction);
    cached.restoreFailed=false;cached.restoreStarted=false;cached.savedWindow=null;
    cached.pendingAnchor=anchor;rememberChannelHistory(channelId,anchor);
  } catch(error) {if(cached.requestGeneration === generation) cached.error=error.message;}
  finally {if(cached.requestGeneration === generation) {cached.loading=false;if(view === 'channels' && selectedChannelId === channelId) render();}}
}

function showChannelLatest(channelId) {
  const cached=channelHistoryEntry(channelId);
  cached.requestGeneration=(cached.requestGeneration || 0)+1;cached.loading=false;
  cached.restoreFailed=false;cached.restoreStarted=false;cached.savedWindow=null;
  cached.mode='latest';cached.restoring=false;cached.error='';cached.notice='';cached.messages.clear();cached.rounds.clear();
  cached.pendingAnchor={messageId:'',offset:0,bottom:true};cached.savedAnchor=cached.pendingAnchor;render();queueMicrotask(()=>rememberChannelHistory(channelId,channelScrollAnchor(channelId)));
}

function channelRoundLimitLabel(channel) {
  if(channel.roundMode !== 'auto') return esc(channel.maxRounds)+' tours maximum + synthèse';
  return 'Les participants décident quand conclure · '+(channel.autoRoundLimit === null ? 'sans plafond de tours' : esc(channel.autoRoundLimit ?? 24)+' tours maximum par lancement');
}

function channelsView() {
  const channels = projectChannels();
  let remembered=null;
  try {remembered=localStorage.getItem('atelier-selected-channel:'+projectId);} catch (_) {}
  const channel = channels.find(entry => entry.id === selectedChannelId) || channels.find(entry=>entry.id===remembered) || channels[0];
  selectedChannelId = channel?.id || null;
  if(channel) {try {localStorage.setItem('atelier-selected-channel:'+projectId,channel.id);} catch (_) {}mountChannelHistory(channel.id);}
  return `${agentModeNavigation()}<div class="workspace-toolbar"><h1>Canaux</h1><span class="workspace-toolbar-spacer"></span>${channel ? sessionUsageChip(channel.usage ? {usage:channel.usage,partialUsage:channel.usage.partialFields?.includes('totalTokens')} : conversationUsage(discussionData().messages.filter(message => message.channelId === channel.id)),{},{label:'Consommation du canal',notice:'Tokens communiqués par les appels fournisseurs, y compris les appels interrompus lorsque mesurés.'}) : ''}${newPanelButton()}</div>
    <div class="channels-layout"><aside class="channel-list" aria-label="Canaux du projet">${channels.length ? channels.map(entry => `<button data-action="channel-select" data-id="${esc(entry.id)}" class="channel-list-item ${entry.id === channel?.id ? 'selected' : ''}"><span class="channel-hash">#</span><span><strong>${esc(entry.name)}</strong><small>${esc(channelStatusLabels[entry.status] || entry.status)}</small></span></button>`).join('') : '<p class="muted small">Vos canaux seront conservés dans ce projet.</p>'}</aside>
    ${channel ? channelContent(channel) : `<section class="channel-empty work-band">${icon('network')}<h2>Composer une discussion</h2><p>Invitez des agents, un consultant, un orchestrateur ou Duplica. Chaque participant prépare sa réponse, puis les réponses sont partagées au tour suivant.</p>${btn('channel-new','Créer mon premier canal','plus','primary')}<small>Historique public conservé · contexte privé séparé · arrêt à tout moment</small></section>`}</div>`;
}

function channelContent(channel) {
  const discussion = discussionData();
  const participants = discussion.participants.filter(participant => participant.channelId === channel.id);
  prepareChannelColors(channel.id,participants);
  const messages = channelVisibleMessages(channel);
  const rounds = [...channelHistoryEntry(channel.id).rounds.values()];
  const cachedHistory=channelHistoryEntry(channel.id);
  if(cachedHistory.mode === 'history' && !cachedHistory.restoring && !cachedHistory.pendingAnchor) cachedHistory.pendingAnchor=channelScrollAnchor(channel.id);
  const hasPreviousRounds=Boolean(channel.history?.roundCount || rounds.length || discussion.rounds.some(round=>round.channelId === channel.id));
  const workflow=state.workflows.find(workflow=>workflow.id === channel.executionWorkflowId);
  const executing=workflow && ['queued','running','waiting_plan'].includes(workflow.status);
  const running = channel.status === 'running' || executing;
  const blocked = running || channel.isStopping;
  const currentRound = discussion.rounds.filter(round=>round.channelId === channel.id).findLast(round => round.status === 'running');
  return `<section class="channel-room"><header class="channel-header"><div><span class="channel-name"># ${esc(channel.name)}</span><h2>${esc(channel.topic)}</h2><p class="muted small">${esc(channel.isStopping ? 'Arrêt en cours' : workflow ? 'Implémentation · '+(labels[workflow.status] || workflow.status) : channelStatusLabels[channel.status] || channel.status)} · ${channelRoundLimitLabel(channel)}${channel.execution ? ' · Implémentation automatique activée' : ''}${currentRound ? ` · ${currentRound.purpose === 'plan' ? 'Synthèse' : 'Tour ' + currentRound.number} en cours` : ''}</p></div><div class="row-actions">${btn('channel-options','','settings','icon-btn',`data-id="${esc(channel.id)}" aria-label="Options du canal" title="Options du canal" ${blocked ? 'disabled' : ''}`)}${btn(running ? 'channel-stop' : 'channel-start',channel.isStopping ? 'Arrêt en cours' : running ? 'Arrêter' : hasPreviousRounds ? 'Reprendre la discussion' : 'Lancer la discussion',running ? 'pause' : 'play',running ? 'secondary' : 'primary',`data-id="${esc(channel.id)}" ${channel.isStopping || (!participants.length && !running) ? 'disabled' : ''}`)}</div></header>
    ${workflow ? `<section class="channel-execution"><strong>Discussion → Implémentation → Vérification → Audit</strong><div>${workflow.steps.map(step=>`<span>${esc(step.role)} ${badge(step.status)}</span>`).join('')}</div>${workflow.error ? `<p class="inline-error">${esc(workflow.error)}</p>` : ''}${btn('channel-open-workflow','Voir le travail et les preuves','arrow','quiet',`data-id="${esc(workflow.id)}"`)}<small>La tâche reste En revue après le travail. Les permissions du projet et les demandes d’approbation s’appliquent.</small></section>` : ''}
    ${channel.cancellationError ? `<p class="inline-error" role="alert">Arrêt du fournisseur : ${esc(channel.cancellationError)}</p>` : ''}
    ${channel.error ? `<p class="inline-error" role="alert">${esc(channel.error)}</p>` : ''}
    <div class="channel-room-layout"><div class="channel-thread"><div class="channel-transcript" data-scroll="channel-${esc(channel.id)}" data-channel-id="${esc(channel.id)}" role="log" aria-label="Réponses publiques du canal">
      <div class="channel-public-note">${icon('shield')} Seules les réponses publiques circulent. Chaque tour démarre avec le même historique pour tous.</div>
      ${channelContextProjectionNote(channel.contextProjection)}
      ${channelHistoryControls(channel)}
      ${messages.length ? messages.map(message => channelMessage(message,participants,rounds)).join('') : channelHistoryEntry(channel.id).restoring ? '<div class="channel-first-message"><p>Restauration de l’historique…</p></div>' : '<div class="channel-first-message"><p>Posez le problème, puis invitez vos participants.</p><small>La discussion prépare un plan ; elle ne déclenche pas le travail.</small></div>'}
      ${!participants.length ? '<p class="channel-waiting" role="status">'+(messages.length ? 'Message enregistré. ' : '')+'Invitez des participants pour lancer la discussion.</p>' : ''}
      ${channel.status === 'running' ? '<p class="channel-waiting" role="status">Les participants préparent leurs contributions… Elles apparaîtront à la fin du tour.</p>' : ''}</div>
      <form data-form="channel-message" data-id="${esc(channel.id)}" class="channel-compose"><label for="channel-message-${esc(channel.id)}">Votre message au canal</label><textarea id="channel-message-${esc(channel.id)}" name="text" rows="3" maxlength="16000" required placeholder="Résultat souhaité, contraintes, questions…" ${blocked ? 'disabled' : ''}></textarea><div><span class="muted small">${channel.isStopping ? 'Attente de la fin de l’appel fournisseur en cours.' : running ? 'Arrêtez la discussion pour ajouter une précision.' : participants.length ? 'Envoyer démarre la discussion avec les participants choisis.' : 'Invitez ensuite vos participants pour leur transmettre ce message.'}</span><button type="submit" class="button secondary" ${blocked ? 'disabled' : ''}>${participants.length ? 'Envoyer et lancer' : 'Enregistrer le message'} ${icon('arrow')}</button></div></form>
      ${channel.plan ? `<section class="channel-plan work-band"><div class="panel-heading"><h3>${icon('check')} Plan proposé</h3><span class="micro-pill">${channel.status === 'ready_for_review' ? 'À RELIRE' : 'DISCUSSION PRÉCÉDENTE'}</span></div><div class="message-markdown channel-plan-content">${messageMarkdown(channel.plan)}</div>${channel.status === 'ready_for_review' ? `<div class="row-actions">${btn('channel-prepare-task',channel.preparedTaskId ? 'Voir la tâche en revue' : 'Préparer une tâche en revue','tasks','primary',`data-id="${esc(channel.id)}"`)}${btn('channel-duplica-plan','Discuter du plan avec Duplica','spark','secondary',`data-id="${esc(channel.id)}"`)}</div><p class="muted small">La tâche reste En revue. Vous choisissez ensuite sa mise au travail.</p>` : ''}</section>` : ''}</div>
      <aside class="channel-participants"><div class="panel-heading"><h3>Participants <small>${participants.length} / 8</small></h3>${btn('channel-invite','Inviter','plus','quiet',`data-id="${esc(channel.id)}" ${blocked || participants.length >= 8 ? 'disabled' : ''}`)}</div>
        ${participants.map(participant => `<article class="channel-participant ${channelParticipantColor(channel.id,participant.id)}" data-participant-id="${esc(participant.id)}"><div class="channel-participant-icon role-${esc(participant.role)}">${channelParticipantIcon(participant.role)}</div><div><strong>${esc(participant.name)}</strong><span>${esc(channelRoleLabels[participant.role])}</span><small>${esc(participant.configuration.model)} · ${esc(channelConfigurationEffort(participant.configuration))}</small><small>${esc(channelProviderName(participant.configuration))}${participant.sourceSessionId ? ' · configuration copiée' : ''}</small>${typeof channelParticipantInstructions === 'function' ? channelParticipantInstructions(participant) : ''}${channelParticipantActivity(participant, messages)}</div>${btn('channel-remove-participant','Retirer','close','quiet',`data-id="${esc(channel.id)}" data-participant-id="${esc(participant.id)}" ${blocked ? 'disabled' : ''}`)}</article>`).join('') || '<p class="muted small">Choisissez un modèle par participant. Vous pouvez copier la configuration d’un agent déjà au travail.</p>'}
        <div class="channel-workflow-note"><strong>Votre workflow</strong><p>Propositions indépendantes → avis des consultants → discussion → plan par l’orchestrateur ou Duplica → votre relecture.</p><small>Les consultants SystemOne évaluent des choix et des risques. Un agent LLM rédige la synthèse.</small></div></aside></div></section>`;
}

function channelProviderName(configuration) {
  return configuration.runtime === 'api' ? (state.apiConnections || []).find(connection => connection.id === configuration.connectionId)?.name || 'API retirée' : configuration.runtime === 'omp' ? 'Oh My Pi' : 'Codex';
}

function channelParticipantActivity(participant, messages) {
  const activity=participant.activity || {};
  const statuses={connecting:'Connexion au fournisseur…',responding:'Message transmis · réponse en cours',completed:'Contribution reçue',failed:'Échec du fournisseur',stopped:'Interrompu',interrupted:'Interrompu'};
  const status=statuses[activity.status] || 'Prêt au prochain lancement';
  const replies=messages.filter(message=>message.participantId === participant.id);
  return `<details class="channel-activity" data-channel-activity="${esc(participant.id)}" ${channelActivityOpen.has(participant.id) ? 'open' : ''}><summary>${esc(status)}</summary><p>${activity.roundNumber ? esc((activity.purpose === 'plan' ? 'Synthèse' : 'Tour '+activity.roundNumber)+' · ') : ''}${esc(status)}</p>${activity.sessionId ? `<small>Session native : ${esc(activity.sessionId)}</small>` : activity.requestId ? `<small>Appel API : ${esc(activity.requestId)}</small>` : ''}${activity.updatedAt ? `<small>Dernier état : ${esc(new Date(activity.updatedAt).toLocaleTimeString('fr-FR'))}</small>` : ''}${activity.error || activity.transportError ? `<p class="inline-error">${esc(activity.error || activity.transportError)}${activity.retrying ? ' · nouvelle tentative du fournisseur' : ''}</p>` : ''}<small>Activité observable et réponses publiques du participant. Le raisonnement privé n’est pas transmis.</small>${replies.length ? replies.map(message=>`<div class="channel-activity-reply message-markdown">${messageMarkdown(message.text)}</div>`).join('') : '<p>Aucune contribution publique reçue pour le moment.</p>'}</details>`;
}

function channelMessage(message,participants,rounds) {
  const participant = participants.find(entry => entry.id === message.participantId);
  const round = rounds.find(entry => entry.id === message.roundId);
  const usage = message.usage;
  const color=message.role === 'user' ? 'channel-color-user' : message.participantId ? channelParticipantColor(message.channelId,message.participantId) : 'channel-color-system';
  return `<article class="channel-message ${color} ${message.role === 'user' ? 'from-user' : ''}" data-message-id="${esc(message.id)}" data-sequence="${esc(message.sequence || 0)}" ${message.participantId ? `data-participant-id="${esc(message.participantId)}"` : ''}><header><strong>${esc(message.author)}</strong><span>${esc(channelRoleLabels[message.role] || (message.role === 'user' ? 'Vous' : 'Synthèse'))}${round ? ` · tour ${round.number}` : ''}${message.readyToPlan != null ? ' · '+(message.readyToPlan ? 'Prêt à conclure' : 'À poursuivre') : ''}</span><time>${new Date(message.createdAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</time></header><div class="message-markdown">${messageMarkdown(message.text)}</div>${message.recoveredFromSession ? `<small class="channel-recovered-reply" title="Session : ${esc(message.recoveredFromSession)}">Réponse récupérée d’une session finalisée</small>` : ''}${participant ? `<footer>${esc(participant.configuration.model)}${usage?.totalTokens != null ? ' · ' + compact(usage.totalTokens) + ' tokens reçus' : ''}</footer>` : ''}</article>`;
}

function channelModal(identifier) {
  const channel=discussionData().channels.find(channel=>channel.id === identifier), automatic=channel?.roundMode === 'auto',unlimited=channel?.autoRoundLimit === null;
  modal(channel ? 'Options du canal' : 'Nouveau canal','Choisissez comment discuter et ce qui doit suivre le plan.',`<form data-form="channel-create" ${channel ? `data-id="${esc(channel.id)}"` : ''}><div class="modal-body">${field('Nom du canal','name',channel?.name || '','text','required maxlength="100" placeholder="Conception, diagnostic, plan…"')}${area('Sujet et résultat attendu','topic',channel?.topic || '',3,'required maxlength="16000"')}${select('Fin de la discussion','roundMode',[['fixed','Nombre de tours choisi'],['auto','Autant de tours que nécessaire · accord des participants']],automatic ? 'auto' : 'fixed')}<div id="channel-fixed-rounds" ${automatic ? 'hidden' : ''}>${field('Tours de discussion maximum','maxRounds',channel?.maxRounds || 2,'number','required min="1" step="1"')}</div><div id="channel-auto-rounds" ${automatic ? '' : 'hidden'}>${select('Plafond de la discussion','autoLimitMode',[['bounded','Nombre de tours choisi'],['unlimited','Sans plafond de tours']],unlimited ? 'unlimited' : 'bounded')}<div id="channel-auto-limit" ${unlimited ? 'hidden' : ''}>${field('Tours maximum par lancement','autoRoundLimit',channel?.autoRoundLimit ?? 24,'number',`required min="1" step="1" ${unlimited ? 'disabled' : ''}`)}</div><p class="muted small">Les participants concluent lorsqu’ils sont tous prêts. Avec un plafond, la discussion attend votre reprise à la limite. Sans plafond, elle continue jusqu’à leur accord ou votre arrêt manuel. Chaque appel utilise le quota du fournisseur choisi.</p></div><label class="check-option"><input type="checkbox" name="executionEnabled" ${channel?.execution ? 'checked' : ''}><span>Après le plan, implémenter automatiquement dans ce projet, puis vérifier et auditer.</span></label><div id="channel-execution-settings" ${channel?.execution ? '' : 'hidden'}><p class="muted small">Ce choix autorise les écritures dans le projet au lancement de la discussion. Les demandes d’approbation restent actives. Trois sessions distinctes : implémentation, vérification, audit.</p>${channelExecutionFields('executor_', 'Implémentation',channel?.execution?.executor)}${channelExecutionFields('reviewer_', 'Vérification et audit',channel?.execution?.reviewer)}</div><p class="muted small">${channel ? 'Les options s’appliqueront au prochain lancement.' : 'Ajoutez ensuite vos participants.'} Le plan et les preuves restent consultables.</p></div>${formFooter(channel ? 'Enregistrer les options' : 'Créer le canal')}</form>`,true);
}

function channelExecutionFields(prefix, title, configuration) {
  const models=provider().models || [], selected=models.find(model=>model.model === configuration?.model) || models.find(model=>model.isDefault) || models[0];
  return `<fieldset class="channel-execution-config" data-model-config="${prefix}"><legend>${title} · Codex</legend><input type="hidden" name="${prefix}runtime" value="codex"><div class="form-grid">${select('Modèle · '+title,prefix+'model',models.map(model=>[model.model,model.displayName]),selected?.model)}${select('Effort · '+title,prefix+'effort',(selected?.supportedReasoningEfforts || []).map(effort=>[effort.reasoningEffort,effort.reasoningEffort]),configuration?.effort || selected?.defaultReasoningEffort)}</div></fieldset>`;
}

async function channelInviteModal(channelId) {
  const channel=discussionData().channels.find(entry=>entry.id === channelId);
  const commands=await api('commands?project='+encodeURIComponent(channel.projectId));
  const configurations = [['codex','Codex · compte ChatGPT'],['omp','Oh My Pi'],...(state.apiConnections || []).map(connection => ['api:'+connection.id,connection.name+' · '+apiProtocolLabels[connection.protocol]])];
  const candidates = objects('sessions').filter(session => session.consumer !== 'channel' && ['codex','omp','api'].includes(session.runtime || 'codex'));
  modal('Inviter un participant','Échanges publics et ressources choisies ; contexte de travail séparé.',`<form data-form="channel-participant" data-id="${esc(channelId)}"><div class="modal-body">
    ${select('Configuration du participant','origin',[['new','Choisir un modèle'],['clone','Copier celle d’un agent existant']],'new')}
    <div class="form-grid">${field('Nom du participant','name','Participant '+(discussionData().participants.filter(entry=>entry.channelId === channelId).length+1),'text','required maxlength="100"')}${select('Rôle dans le canal','role',Object.entries(channelRoleLabels),'agent')}</div>
    <div id="channel-new-configuration">${select('Fournisseur du participant','channelProvider',configurations,'codex')}<div class="form-grid" id="channel-model-fields"></div></div>
    <div id="channel-clone-configuration" hidden>${select('Agent à copier','sessionId',candidates.map(session=>[session.id,session.name+' · '+session.model]),candidates[0]?.id)}<p class="muted small">Seuls le fournisseur et les réglages du modèle sont copiés. L’agent au travail poursuit sa mission ; son contexte reste séparé.</p></div>
    <details class="advanced-settings"><summary>Skills et consignes du participant</summary><div id="channel-instruction-list" class="skills-list">${commands.map(command=>`<label class="check-option"><input type="checkbox" name="${command.kind === 'skill' ? 'skills' : 'instructionCommands'}" value="${esc(command.kind === 'skill' ? command.path : command.id)}"><span><strong>/${esc(command.name)}</strong><small>${esc(command.kind === 'skill' ? command.path : command.description || 'Consigne personnelle du projet')}</small></span></label>`).join('') || '<p class="muted small">Aucune ressource dans la bibliothèque de ce projet. Ajoutez un SKILL.md sous skills/ ou une commande personnelle depuis Duplica.</p>'}</div><p id="channel-instruction-note" class="muted small">Sélection explicite : 8 ressources au total, 16 000 caractères chacune, 32 000 au total. Le texte est chargé pour ce participant au lancement, aussi pour les API LLM. Les permissions restent en lecture seule et les fichiers référencés ne sont pas chargés.</p></details>
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
  updateChannelInstructionSelection(form);
  form.querySelector('button[type="submit"]').disabled = !models.length;
  if (!models.length) $('#channel-model-fields').insertAdjacentHTML('beforeend','<p class="inline-error" role="status">Aucun modèle découvert. Vérifiez les connexions puis rouvrez cette invitation.</p>');
  for (const option of form.elements.role.options) option.disabled = selectedProvider.protocol === 'systemone' && option.value !== 'consultant';
  if (selectedProvider.protocol === 'systemone') form.elements.role.value = 'consultant';
}

function updateChannelEfforts(form) {
  const model = (channelSelectedProvider(form).models || []).find(entry=>entry.model === form.elements.channelModel.value);
  form.elements.channelEffort.innerHTML = (model?.supportedReasoningEfforts || []).map(effort=>`<option value="${esc(effort.reasoningEffort)}" ${effort.reasoningEffort === model.defaultReasoningEffort ? 'selected' : ''}>${esc(effort.reasoningEffort)}</option>`).join('');
}

function updateChannelInstructionSelection(form) {
  const configuration=form.elements.origin.value === 'clone' ? objects('sessions').find(session=>session.id === form.elements.sessionId.value) : channelSelectedProvider(form);
  const unsupported=configuration?.protocol === 'systemone';
  for (const checkbox of form.querySelectorAll('[name="skills"],[name="instructionCommands"]')) {
    checkbox.disabled=unsupported;
    if(unsupported) checkbox.checked=false;
  }
  $('#channel-instruction-note').textContent=unsupported ? 'SystemOne évalue des données structurées et ne reçoit pas de skills ou consignes textuelles. Choisissez un participant LLM pour ces ressources.' : 'Sélection explicite : 8 ressources au total, 16 000 caractères chacune, 32 000 au total. Le texte est chargé pour ce participant au lancement, aussi pour les API LLM. Les permissions restent en lecture seule et les fichiers référencés ne sont pas chargés.';
}

function channelParticipantInstructions(participant) {
  const sources=participant.instructionSources || [];
  if(!sources.length) return '';
  return `<details class="channel-activity channel-instruction-sources"><summary>Skills et consignes · ${sources.length}</summary>${sources.map(source=>`<p><strong>/${esc(source.name)}</strong><small>${esc(source.path || 'Consigne personnelle du projet')} · ${esc(source.characters)} caractères</small><small>SHA-256 : ${esc(source.sha256)}</small></p>`).join('')}<small>Sélection explicite. Le texte est figé au lancement pour tous les tours ; les permissions restent inchangées. Le hash identifie le texte chargé, sans attester l’application de la méthode par le modèle.</small></details>`;
}

async function handleChannelSubmit(form,values) {
  if (form.dataset.form === 'channel-create') {
    const execution=form.elements.executionEnabled.checked ? {executor:configurationValues(form,'executor_'),reviewer:configurationValues(form,'reviewer_'),sandbox:'workspace-write'} : null;
    const settings={name:values.name,topic:values.topic,roundMode:values.roundMode,maxRounds:Number(values.maxRounds),autoRoundLimit:values.autoLimitMode === 'unlimited' ? null : Number(values.autoRoundLimit),execution};
    const channel = await api(form.dataset.id ? 'channels/options' : 'channels',form.dataset.id ? {...settings,id:form.dataset.id} : {...settings,projectId});
    selectedChannelId = channel.id;
    $('#modal').close();
  } else if (form.dataset.form === 'channel-participant') {
    const configuration = values.origin === 'clone' ? {sessionId:values.sessionId} : values.channelProvider.startsWith('api:') ?
      {configuration:{runtime:'api',connectionId:values.channelProvider.slice(4),model:values.channelModel,effort:'off'}} :
      {configuration:{runtime:values.channelProvider,model:values.channelModel,effort:values.channelEffort}};
    const selected=new FormData(form), skills=selected.getAll('skills'), instructionCommands=selected.getAll('instructionCommands');
    if(skills.length+instructionCommands.length > 8) throw new Error('Sélectionnez au maximum 8 skills et consignes au total.');
    await api('channels/participants',{id:form.dataset.id,name:values.name,role:values.role,skills,instructionCommands,...configuration});
    $('#modal').close();
    toast('Participant ajouté au canal.');
  } else {
    await api('channels/messages',{id:form.dataset.id,text:values.text});
    form.reset();
    const draft = document.getElementById('channel-message-'+form.dataset.id);
    if (draft) draft.value = '';
    toast('Message reçu et enregistré.');
    if (discussionData().participants.some(participant=>participant.channelId === form.dataset.id)) {
      try { await api('channels/start',{id:form.dataset.id}); toast('Discussion lancée : connexion aux participants…'); }
      catch(error) { await refresh(true); throw new Error('Message enregistré. La discussion n’a pas démarré : '+error.message); }
    }
  }
  await refresh(true);
}

function installChannelActions() {
  Object.assign(actions, {
    'channel-new': () => channelModal(),
    'channel-options':element=>channelModal(element.dataset.id),
    'channel-open-workflow':element=>{graphWorkflowId=element.dataset.id;selectedGraphNode=null;route('overview');},
    'channel-select': element => {if(selectedChannelId) rememberChannelHistory(selectedChannelId,channelScrollAnchor(selectedChannelId));selectedChannelId=element.dataset.id;const cached=channelHistoryEntry(selectedChannelId);cached.pendingAnchor=cached.savedAnchor;render();},
    'channel-load-history':element=>loadChannelHistory(element.dataset.id),
    'channel-load-newer':element=>loadChannelHistory(element.dataset.id,'newer'),
    'channel-latest':element=>showChannelLatest(element.dataset.id),
    'channel-retry-history':element=>{const cached=channelHistoryEntry(element.dataset.id);cached.error='';if(cached.savedWindow && cached.restoreFailed) {cached.restoring=true;cached.restoreStarted=false;return restoreChannelHistoryWindow(element.dataset.id);}return loadChannelHistory(element.dataset.id,cached.failedDirection || 'older');},
    'channel-invite': element => channelInviteModal(element.dataset.id),
    'channel-start': async element => { await api('channels/start',{id:element.dataset.id}); toast('Discussion lancée : connexion aux participants…'); await refresh(true); },
    'channel-stop': async element => { await api('channels/stop',{id:element.dataset.id}); toast('Arrêt demandé. Les réponses tardives ne seront pas publiées.'); await refresh(true); },
    'channel-remove-participant': async element => { await api('channels/remove-participant',{id:element.dataset.id,participantId:element.dataset.participantId}); await refresh(true); },
    'channel-prepare-task': async element => { const task=await api('channels/prepare-task',{id:element.dataset.id}); await refresh(true); route('tasks'); taskModal(task.id || task.taskId); },
    'channel-duplica-plan': async element => { const channel=discussionData().channels.find(entry=>entry.id === element.dataset.id); route('duplica'); const draft=$('[data-form="duplica-chat"] textarea[name="text"]'); if (draft) { draft.value='Aidons-moi à relire ce plan avant action. Signale les questions à trancher.\n\nSujet : '+channel.topic+'\n\n'+channel.plan; draft.focus(); } },
  });
  document.addEventListener('toggle', event => {
    const identifier=event.target.dataset?.channelActivity;
    if (identifier && event.target.isConnected) {
      if (event.target.open) channelActivityOpen.add(identifier); else channelActivityOpen.delete(identifier);
    }
  }, true);
  document.addEventListener('scroll',event=>{
    if(view !== 'channels' || !selectedChannelId) return;
    const cached=channelHistoryEntry(selectedChannelId);
    if(cached.restoring || cached.pendingAnchor) return;
    if(event.target.classList?.contains('channel-transcript') && event.target.scrollHeight-event.target.clientHeight-event.target.scrollTop>=30) cached.mode='history';
    if(event.target !== document && event.target !== $('#main') && !event.target.classList?.contains('channel-transcript')) return;
    clearTimeout(channelScrollSaveTimer);
    channelScrollSaveTimer=setTimeout(()=>{
      if(view === 'channels' && selectedChannelId) rememberChannelHistory(selectedChannelId,channelScrollAnchor(selectedChannelId));
    },150);
  },true);
  window.addEventListener('beforeunload',()=>{
    if(view === 'channels' && selectedChannelId && !channelHistoryEntry(selectedChannelId).restoring) rememberChannelHistory(selectedChannelId,channelScrollAnchor(selectedChannelId));
  });
  document.addEventListener('change', event => {
    const options=event.target.closest('[data-form="channel-create"]');
    if(options) {
      if(event.target.name === 'roundMode') {$('#channel-fixed-rounds').hidden=event.target.value === 'auto';$('#channel-auto-rounds').hidden=event.target.value !== 'auto';}
      else if(event.target.name === 'autoLimitMode') {const unlimited=event.target.value==='unlimited';$('#channel-auto-limit').hidden=unlimited;options.elements.autoRoundLimit.disabled=unlimited;}
      else if(event.target.name === 'executionEnabled') $('#channel-execution-settings').hidden=!event.target.checked;
      return;
    }
    const form=event.target.closest('[data-form="channel-participant"]');
    if (!form) return;
    if (event.target.name === 'origin') {
      $('#channel-new-configuration').hidden=event.target.value === 'clone';
      $('#channel-clone-configuration').hidden=event.target.value !== 'clone';
      if (event.target.value === 'clone') {
        for (const option of form.elements.role.options) option.disabled=false;
        form.querySelector('button[type="submit"]').disabled = !form.elements.sessionId.value;
      }
      else updateChannelModels(form);
      updateChannelInstructionSelection(form);
    } else if (event.target.name === 'channelProvider') updateChannelModels(form);
    else if (event.target.name === 'channelModel') updateChannelEfforts(form);
    else if (event.target.name === 'sessionId') updateChannelInstructionSelection(form);
    else if(['skills','instructionCommands'].includes(event.target.name) && form.querySelectorAll('[name="skills"]:checked,[name="instructionCommands"]:checked').length > 8) {
      event.target.checked=false;
      toast('8 skills et consignes au maximum par participant.');
    }
  });
}
