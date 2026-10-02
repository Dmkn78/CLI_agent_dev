"use strict";
let duplicaPanel='discussion', telegramPairing=null;

function duplicaConversation() {
  const conversation=duplicaData().discussion?.conversations.find(chat => chat.projectId === projectId);
  return state.sessions.find(session => session.id === conversation?.sessionId);
}

function duplicaView() {
  const data=duplicaData(), session=duplicaConversation();
  const active=data.settings.status === 'active', scoped=duplicaScopeValue('project',projectId) === true || data.settings.globalEnabled;
  const toolbar=`<header class="duplica-workspace-header"><div><h1>Duplica</h1><span class="muted">Votre projet, avec vous.</span></div><label class="duplica-project-choice">Projet<select id="duplica-project-choice" aria-label="Projet de Duplica">${state.projects.map(project => `<option value="${esc(project.id)}" ${project.id === projectId ? 'selected' : ''}>${esc(project.name)}</option>`).join('')}</select></label>
    ${btn('duplica-work','Travailler pour moi','spark','primary')}
    <details class="action-menu"><summary aria-label="Options Duplica" title="Options">⋯</summary><div>${btn('duplica-permissions','Permissions','shield','quiet')}${btn('duplica-telegram','Telegram','external','quiet')}${btn('duplica-control','Pause','pause','quiet','data-control="pause"')}${btn('duplica-control','Reprendre la main','shield','quiet','data-control="take_control"')}${btn('duplica-control','Stop','close','quiet','data-control="stop"')}</div></details></header>
    <div class="duplica-mode-tabs"><button data-action="duplica-panel" data-panel="discussion" class="${duplicaPanel === 'discussion' ? 'selected' : ''}">Discussion</button><button data-action="duplica-panel" data-panel="suivi" class="${duplicaPanel === 'suivi' ? 'selected' : ''}">Suivi ${data.counts.supervised ? `<small>${data.counts.supervised}</small>` : ''}</button><span class="duplica-project-status"><i class="duplica-light ${active && scoped ? 'active' : 'off'}"></i>${active && scoped ? 'Projet supervisé' : 'Supervision désactivée'}</span></div>`;
  if (duplicaPanel === 'suivi') return `<div class="duplica-shell">${toolbar}<div class="duplica-manager">${duplicaManagerView()}</div></div>`;
  const delivery=data.discussion?.deliveries.filter(delivery => delivery.projectId === projectId).at(-1);
  const busy=delivery && ['queued','dispatching','sent'].includes(delivery.status);
  const messages=session?.messages || [];
  const pending=delivery && ['queued','dispatching'].includes(delivery.status) ? `<article class="duplica-chat-message user"><p>${esc(delivery.text)}</p></article>` : '';
  const approvals=state.approvals.filter(approval => approval.sessionId === session?.id || data.agents.some(agent => agent.id === approval.sessionId && agent.supervised));
  const models=provider().models || [], selectedModel=session?.model || models.find(model => model.isDefault)?.model;
  return `<div class="duplica-shell">${toolbar}<section class="duplica-discussion"><div class="duplica-chat-history" data-scroll="duplica-${esc(projectId)}">
    ${messages.length ? messages.map(message => `<article class="duplica-chat-message ${esc(message.role)}"><small>${message.role === 'user' ? message.source === 'telegram' ? 'Vous · Telegram' : 'Vous' : 'Duplica'}</small><p>${esc(message.text)}</p></article>`).join('') : `<div class="duplica-chat-welcome"><span>${icon('spark')}</span><h2>Que souhaitez-vous faire avancer ?</h2><p>Parlez du projet ${esc(project().name)}. Duplica partage cette discussion avec Telegram et garde votre contexte.</p></div>`}
    ${pending}${busy ? '<p class="duplica-chat-progress">Duplica réfléchit…</p>' : ''}${delivery && ['failed','interrupted'].includes(delivery.status) ? `<p class="inline-error">${esc(delivery.error || 'Discussion interrompue. Vous pouvez écrire à nouveau.')}</p>` : ''}${session && ['failed','stopped','closed'].includes(session.status) ? btn('resume','Reprendre la discussion','arrow','quiet',`data-id="${esc(session.id)}"`) : ''}${approvals.map(approvalCard).join('')}</div>
    <form data-form="duplica-chat" class="duplica-chat-composer"><textarea id="duplica-message" name="text" aria-label="Message à Duplica" placeholder="Discutez avec Duplica…" rows="3" maxlength="16000" required></textarea><div><label class="duplica-model-choice">${session ? esc(session.model) : `<select name="model" aria-label="Modèle de Duplica">${models.map(model => `<option value="${esc(model.model)}" ${model.model === selectedModel ? 'selected' : ''}>${esc(model.displayName)}</option>`).join('')}</select>`}</label><span>${data.telegram.running ? 'Telegram connecté' : 'Discussion en lecture seule'}</span>${busy && session ? btn('interrupt','Interrompre','','quiet',`data-id="${esc(session.id)}"`) : ''}<button type="submit" class="button primary send-btn" aria-label="Envoyer à Duplica" ${busy ? 'disabled' : ''}>${icon('arrow')}</button></div></form>
    ${session ? sessionUsageSummary(session,provider()) : ''}
    <div class="duplica-discussion-links">${btn('duplica-memory','Mémoire du projet','folder','quiet')}${btn('duplica-telegram',data.telegram.running ? 'Ouvrir Telegram' : 'Connecter Telegram','external','quiet')}</div></section></div>`;
}

function duplicaWorkModal() {
  const conversation=duplicaConversation(), agents=objects('sessions').filter(session => session.executionMode !== 'chat' && !session.parentId && !['closed','failed'].includes(session.status));
  const goal=[...(conversation?.messages || [])].reverse().find(message => message.role === 'user')?.text || '';
  modal('Travailler pour moi',project().name,`<form data-form="duplica-work"><div class="modal-body">${area('Résultat attendu','goal',goal,3,'required placeholder="Le résultat concret que Duplica doit faire avancer"')}${select('Agent','sessionId',[['','Créer un agent de travail'],...agents.map(agent => [agent.id,agent.name])],'')}
    <details class="form-advanced"><summary>Modèle et permissions du nouvel agent</summary>${select('Modèle','model',(provider().models || []).map(model => [model.model,model.displayName]),conversation?.model || provider().models?.find(model => model.isDefault)?.model)}${select('Permissions','sandbox',[['read-only','Diagnostic et plan · lecture seule'],['workspace-write','Implémentation · écriture dans ce projet']],'read-only')}</details><p class="muted small">Duplica supervise ce projet. Le travail attendra des critères de test avant d’être déclaré vérifié. Vous pouvez reprendre la main à tout moment.</p></div>${formFooter('Démarrer')}</form>`);
}

function duplicaMemoryModal() {
  const context=duplicaData().contexts.find(context => context.id === projectId) || {};
  duplicaContextScope='project';
  modal('Mémoire de Duplica',project().name,`<form data-form="duplica-context"><div class="modal-body">${area('Préférences et priorités','preferences',context.preferences || '',3)}${area('Contexte et contraintes du projet','project',context.project || '',4)}${area('Critères de réussite','testing',context.testing || '',3)}</div>${formFooter('Enregistrer le contexte')}</form>`);
}

function duplicaTelegramModal() {
  const telegram=duplicaData().telegram;
  modal('Discuter avec Duplica sur Telegram',project().name,`<div class="modal-body telegram-connect"><p>Créez votre bot avec <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">@BotFather</a> et la commande <code>/newbot</code>.</p>${telegram.running ? `<p class="inline-success">Telegram est connecté${telegram.botUsername ? ' · @'+esc(telegram.botUsername) : ''}.</p><p>Envoyez <code>/project ${esc(projectId)}</code> au bot, puis discutez. Les messages et réponses apparaissent aussi dans Atelier.</p>` : `<form data-form="duplica-telegram"><label>Token fourni par BotFather<input type="password" name="botToken" autocomplete="off" required aria-label="Token du bot Telegram"></label><p class="muted small">Conservé chiffré pour le compte Windows du service.</p><button type="submit" class="button primary">Connecter mon bot</button></form><div id="telegram-pairing"></div>`}</div>`);
}

async function handleDuplicaChatSubmit(form, fields) {
  if (form.dataset.form === 'duplica-chat') {
    await api('duplica/discussion',{projectId,text:fields.text,...(fields.model ? {model:fields.model} : {})});
    form.reset();
  } else if (form.dataset.form === 'duplica-work') {
    await api('duplica/work',{...fields,projectId});
    $('#modal').close();
    duplicaPanel='suivi';
  } else if (form.dataset.form === 'duplica-telegram') {
    telegramPairing=await api('duplica/telegram/connect',{projectId,botToken:fields.botToken});
    form.reset();
    $('#telegram-pairing').innerHTML=`<p>Ouvrez <a href="https://t.me/${encodeURIComponent(telegramPairing.botUsername)}" target="_blank" rel="noopener noreferrer">@${esc(telegramPairing.botUsername)}</a> et envoyez <code>/start ${esc(telegramPairing.pairingCode)}</code>.</p>${btn('duplica-telegram-pair','Vérifier la connexion','check','primary')}<p class="muted small">Code valable cinq minutes. Seule votre conversation privée sera acceptée.</p>`;
    return;
  }
  await refresh(true);
}

Object.assign(duplicaActions,{
  'duplica-panel':element => {duplicaPanel=element.dataset.panel;render();},
  'duplica-work':duplicaWorkModal,
  'duplica-memory':duplicaMemoryModal,
  'duplica-telegram':duplicaTelegramModal,
  'duplica-telegram-pair':async () => {
    const result=await api('duplica/telegram/pair',{});
    if (!result.connected) {toast('Envoyez le code au bot, puis vérifiez à nouveau.');return;}
    $('#modal').close();await refresh(true);toast('Telegram connecté à votre discussion Duplica.');
  },
});

document.addEventListener('change',event => {
  if (event.target.id === 'duplica-project-choice') actions.project({dataset:{id:event.target.value}});
});
