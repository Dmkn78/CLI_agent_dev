"use strict";
let duplicaPanel='discussion';

function duplicaConversation() {
  const conversation=duplicaData().discussion?.conversations.find(chat => chat.projectId === projectId);
  return state.sessions.find(session => session.id === conversation?.sessionId && !session.removedAt);
}

function duplicaView() {
  const data=duplicaData(), session=duplicaConversation();
  const active=data.settings.status === 'active', scoped=duplicaScopeValue('project',projectId) === true || data.settings.globalEnabled;
  const toolbar=`${agentModeNavigation()}<header class="duplica-workspace-header"><div><h1>Duplica</h1><span class="muted">Votre projet, avec vous.</span></div>${sessionUsageChip(session,provider(),{label:'Consommation de Duplica'})}${newPanelButton()}
    ${btn('duplica-work','Travailler pour moi','spark','primary')}
    <details class="action-menu"><summary aria-label="Options Duplica" title="Options">⋯</summary><div>${btn('duplica-permissions','Permissions','shield','quiet')}${btn('duplica-telegram','Telegram','external','quiet')}${btn('duplica-control','Pause','pause','quiet','data-control="pause"')}${btn('duplica-control','Reprendre la main','shield','quiet','data-control="take_control"')}${btn('duplica-control','Stop','close','quiet','data-control="stop"')}</div></details></header>
    <div class="duplica-mode-tabs"><button data-action="duplica-panel" data-panel="discussion" class="${duplicaPanel === 'discussion' ? 'selected' : ''}">Discussion</button><button data-action="duplica-panel" data-panel="suivi" class="${duplicaPanel === 'suivi' ? 'selected' : ''}">Suivi ${data.counts.supervised ? `<small>${data.counts.supervised}</small>` : ''}</button><button data-action="duplica-panel" data-panel="telegram" class="${duplicaPanel === 'telegram' ? 'selected' : ''}">Telegram</button><span class="duplica-project-status"><i class="duplica-light ${active && scoped ? 'active' : 'off'}"></i>${active && scoped ? 'Projet supervisé' : 'Supervision désactivée'}</span></div>`;
  if (duplicaPanel === 'telegram') return `<div class="duplica-shell">${toolbar}${telegramView()}</div>`;
  if (duplicaPanel === 'suivi') return `<div class="duplica-shell">${toolbar}<div class="duplica-manager">${duplicaManagerView()}</div></div>`;
  const delivery=data.discussion?.deliveries.filter(delivery => delivery.projectId === projectId).at(-1);
  const busy=delivery && ['queued','dispatching','sent'].includes(delivery.status);
  const messages=session?.messages || [];
  const pending=delivery && ['queued','dispatching'].includes(delivery.status) ? `<article class="duplica-chat-message user"><div class="message-markdown">${messageMarkdown(delivery.text)}</div></article>` : '';
  const approvals=state.approvals.filter(approval => approval.sessionId === session?.id || data.agents.some(agent => agent.id === approval.sessionId && agent.supervised));
  const models=provider().models || [], selectedModel=session?.model || models.find(model => model.isDefault)?.model;
  return `<div class="duplica-shell">${toolbar}<section class="duplica-discussion"><div class="duplica-chat-history" data-scroll="duplica-${esc(projectId)}">
    ${messages.length ? messages.map(message => `<article class="duplica-chat-message ${esc(message.role)}"><small>${message.role === 'user' ? message.source === 'telegram' ? 'Vous · Telegram' : 'Vous' : 'Duplica'}</small><div class="message-markdown">${messageMarkdown(message.text)}</div>${message.attachments?.length ? `<div class="chat-attachments">${attachmentMarkup(message.attachments)}</div>` : ''}</article>`).join('') : `<div class="duplica-chat-welcome"><span>${icon('spark')}</span><h2>Que souhaitez-vous faire avancer ?</h2><p>Parlez du projet ${esc(project().name)}. Ajoutez vos fichiers, images ou dossiers ; tapez / pour choisir une commande.</p></div>`}
    ${pending}${busy ? '<p class="duplica-chat-progress">Duplica réfléchit…</p>' : ''}${delivery && ['failed','interrupted'].includes(delivery.status) ? `<p class="inline-error">${esc(delivery.error || 'Discussion interrompue. Vous pouvez écrire à nouveau.')}</p>` : ''}${session && ['failed','stopped','closed'].includes(session.status) ? btn('resume','Reprendre la discussion','arrow','quiet',`data-id="${esc(session.id)}"`) : ''}${approvals.map(approvalCard).join('')}</div>
    <form data-form="duplica-chat" class="duplica-chat-composer">${attachmentComposer()}
      <textarea id="duplica-message" name="text" aria-label="Message à Duplica" placeholder="Écrivez en Markdown ; Entrée pour une nouvelle ligne…" rows="3" maxlength="16000">${esc(duplicaDraftText.get(projectId) || '')}</textarea>
      <div class="duplica-compose-tools">
        ${btn('duplica-attach','','attachment','icon-btn','type="button" title="Joindre des fichiers et images" aria-label="Joindre des fichiers et images"')}
        ${btn('duplica-attach-folder','','folder','icon-btn','type="button" title="Joindre un dossier" aria-label="Joindre un dossier"')}
        ${btn('duplica-commands','/','','icon-btn','type="button" title="Commandes et skills" aria-label="Commandes et skills"')}
        ${btn('duplica-structure','','code','icon-btn','type="button" title="Structurer la consigne · Markdown et XML" aria-label="Structurer la consigne"')}
        <label class="duplica-model-choice">${session ? esc(session.model) : `<select name="model" aria-label="Modèle de Duplica">${models.map(model => `<option value="${esc(model.model)}" ${model.model === selectedModel ? 'selected' : ''}>${esc(model.displayName)}</option>`).join('')}</select>`}</label>
        <span>${duplicaUploading.has(projectId) ? 'Ajout des fichiers…' : data.telegram.running && data.telegram.projectId === projectId ? 'Telegram connecté' : 'Lecture seule'}</span>
        ${busy && session ? btn('interrupt','Interrompre','','quiet',`data-id="${esc(session.id)}"`) : ''}
        <button type="submit" class="button primary send-btn" aria-label="Envoyer à Duplica" ${busy || duplicaUploading.has(projectId) || duplicaSending.has(projectId) ? 'disabled' : ''}>${icon('arrow')}</button>
      </div></form>
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

async function handleDuplicaChatSubmit(form, fields) {
  if (form.dataset.form === 'duplica-chat') {
    const submittedProject=projectId;
    if (duplicaUploading.has(projectId)) throw new Error('Attends la fin de l’ajout des fichiers.');
    if (duplicaSending.has(projectId)) throw new Error('Ce message est déjà en cours d’envoi.');
    const attachments=draftAttachments().map(attachment=>attachment.id);
    const text=fields.text.trim() || (attachments.length ? 'Consulte ces pièces jointes.' : '');
    if (!text) throw new Error('Écris un message ou ajoute une pièce jointe.');
    rememberDuplicaDraft(fields.text,submittedProject);
    duplicaSending.add(submittedProject);render();
    try {
      await api('duplica/discussion',{projectId:submittedProject,text,attachments,...(fields.model ? {model:fields.model} : {})});
      const remaining=(duplicaDraftAttachments.get(submittedProject) || []).filter(attachment=>!attachments.includes(attachment.id));
      duplicaDraftAttachments.set(submittedProject,remaining);
      if ((duplicaDraftText.get(submittedProject) || '') === fields.text) {
        duplicaDraftText.delete(submittedProject);
        if (projectId === submittedProject && $('#duplica-message')) $('#duplica-message').value='';
      }
    } finally {duplicaSending.delete(submittedProject);render();}
  } else if (form.dataset.form === 'duplica-command') {
    await api('commands',{...fields,projectId});
    await loadDuplicaCommands();
    $('#modal').close();
  } else if (form.dataset.form === 'duplica-work') {
    await api('duplica/work',{...fields,projectId});
    $('#modal').close();
    duplicaPanel='suivi';
  }
  await refresh(true);
}

Object.assign(duplicaActions,{
  'duplica-attach':()=>$('#duplica-files').click(),
  'duplica-attach-folder':()=>$('#duplica-folder').click(),
  'duplica-remove-attachment':element=>{duplicaDraftAttachments.set(projectId,draftAttachments().filter(attachment=>attachment.id !== element.dataset.id));render();},
  'duplica-commands':duplicaCommandsModal,
  'duplica-structure':structureDuplicaInstruction,
  'duplica-new-command':()=>duplicaCommandEditor(),
  'duplica-edit-command':element=>duplicaCommandEditor(element.dataset.id),
  'duplica-delete-command':async element=>{await api('commands/remove',{projectId,id:element.dataset.id});await duplicaCommandsModal();},
  'duplica-use-command':element=>{const draft=$('#duplica-message');draft.value='/'+element.dataset.name+' ';rememberDuplicaDraft(draft.value);draft.focus();renderSlashMenu();},
  'duplica-panel':element => {duplicaPanel=element.dataset.panel;render();},
  'duplica-work':duplicaWorkModal,
  'duplica-memory':duplicaMemoryModal,
});

document.addEventListener('change',event => {
  if (event.target.id === 'duplica-project-choice') actions.project({dataset:{id:event.target.value}});
});
