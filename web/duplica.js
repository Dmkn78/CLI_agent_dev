"use strict";
let duplicaContextScope='project', duplicaObservation=null;
const duplicaStatusLabels={off:'Désactivé',active:'Actif',paused:'En pause',manual:'Vous avez la main'};
const duplicaMissionLabels={supervising:'Supervision',testing:'Recette en cours',correcting:'Correction demandée',completed:'Vérifiée',
  needs_evidence:'Preuves manquantes',waiting_user:'Décision nécessaire',interrupted:'Interrompue'};
const duplicaPermissionLabels={workspace_read:'Lire le projet',workspace_write:'Modifier le projet',run_tests:'Exécuter les tests',run_build:'Compiler',
  run_local_application:'Démarrer l’application locale',continue_agent:'Relancer la mission existante',answer_known_question:'Répondre aux questions connues',
  approve_plan:'Valider un plan dans les permissions de l’agent',approve_architecture:'Importer une proposition d’architecture',computer_control:'Observer et contrôler Atelier',keyboard_mouse:'Utiliser la souris et le clavier',browser_control:'Tester dans le navigateur local',
  install_project_dependencies:'Installer les dépendances du projet',git_status:'Lire Git status',git_diff:'Lire Git diff',git_commit:'Créer un commit',git_push:'Pousser sur Git',
  production_deploy:'Déployer en production',public_publish:'Publier',payment:'Payer',read_secrets:'Lire des secrets',send_private_data:'Transmettre des données privées',
  destructive_system_operation:'Opération système destructrice',unknown:'Action non reconnue'};
const duplicaEventLabels={start:'Supervision activée',pause:'Supervision suspendue',stop:'Duplica arrêté',take_control:'Contrôle repris',
  configured:'Politique enregistrée',scope_changed:'Périmètre ajusté',context_saved:'Contexte mémorisé',decision_saved:'Décision mémorisée',
  permission_resolved:'Permission traitée',question_answered:'Réponse donnée',user_required:'Décision utilisateur nécessaire',
  plan_resolved:'Proposition validée selon la délégation',mission_configured:'Mission confiée',verification_started:'Recette démarrée',verification_finished:'Résultat de recette',
  bug_observed:'Problème observé',agent_continued:'Agent relancé',task_completed:'Mission vérifiée',watchdog:'Agent à inspecter',
  run_created:'Équipe Duplica créée',run_dispatched:'Objectif confié à l’équipe',run_verified:'Recette indépendante de l’équipe',run_resumed:'Mission reprise explicitement',
  recovery:'Reprise après redémarrage',verification_superseded:'Critères de recette redéfinis',user_answer:'Décision reçue',computer_action:'Action sur le PC',error:'Erreur de supervision'};

function duplicaData() {
  return state.duplica || {settings:{status:'off',globalEnabled:false,permissions:{}},counts:{},agents:[],nativeAgents:[],missions:[],
    scopes:[],requests:[],timeline:[],contexts:[],decisions:[],observations:[],verifications:[],computer:{available:false},telegram:{},discussion:{conversations:[],deliveries:[]}};
}
function duplicaScopeValue(kind,id) {
  return duplicaData().scopes.find(scope => scope.kind === kind && scope.targetId === id)?.enabled ?? null;
}
function duplicaScopeButton(kind,id) {
  const explicit=duplicaScopeValue(kind,id);
  const enabled=kind === 'session' ? duplicaData().agents.find(agent => agent.id === id)?.supervised : explicit ?? duplicaData().settings.globalEnabled;
  return btn('duplica-scope',`Duplica ${enabled ? '●' : '○'}`,'spark','quiet',`data-kind="${esc(kind)}" data-id="${esc(id)}" data-enabled="${!enabled}" title="${enabled ? 'Retirer la supervision' : 'Superviser avec Duplica'}"`);
}
function renderDuplicaIndicator() {
  const data=duplicaData(), element=$('#duplica-global');
  if (!element) return;
  element.innerHTML=`${icon('spark')}<span>Duplica</span><i class="duplica-light ${esc(data.settings.status)}"></i>`;
  element.title=`Duplica · ${duplicaStatusLabels[data.settings.status]} · ${data.counts.supervised || 0} agents supervisés`;
  element.setAttribute('aria-label',element.title);
  $('#duplica-quick-pause').hidden=data.settings.status !== 'active';
}
function duplicaRequestCard(request) {
  const approval=state.approvals.find(approval => approval.id === request.detail?.approvalId);
  return `<article class="duplica-request"><h3>${esc(request.title)}</h3><p>${esc(request.detail?.reason || request.detail?.verdict?.reason || '')}</p>
    ${request.detail?.planSessionId ? `<div>${request.detail.mode !== 'deny' ? btn('duplica-resolve',request.detail.planCategory === 'approve_architecture' ? 'Valider & importer' : 'Valider le plan','check','primary',`data-id="${esc(request.id)}" data-accepted="true"`) : ''}${btn('duplica-resolve','Refuser','close','secondary',`data-id="${esc(request.id)}" data-accepted="false"`)}${btn('open-agent','Lire la proposition','external','secondary',`data-id="${esc(request.sessionId)}"`)}</div>` : approval ? '<p class="muted small">La demande détaillée est affichée dans les accords ci-dessous.</p>' : request.detail?.category ?
      `<div>${request.detail.mode === 'deny' ? btn('duplica-permissions','Modifier la politique','shield','secondary') : btn('duplica-resolve','Autoriser cette recette','check','primary',`data-id="${esc(request.id)}" data-accepted="true"`)}${btn('duplica-resolve','Refuser','','secondary',`data-id="${esc(request.id)}" data-accepted="false"`)}</div>` :
      btn('open-agent','Inspecter la session','external','secondary',`data-id="${esc(request.sessionId)}"`)}</article>`;
}
function duplicaMissionCard(mission) {
  const session=state.sessions.find(session => session.id === mission.sessionId), verification=duplicaData().verifications.find(result => result.id === mission.verificationId);
  return `<article class="panel duplica-mission"><div class="panel-heading"><h3>${esc(session?.name || mission.sessionId)}</h3><span class="badge ${mission.status === 'completed' ? 'completed' : 'waiting'}">${esc(duplicaMissionLabels[mission.status] || mission.status)}</span></div>
    <p>${esc(mission.goal)}</p><small class="muted">${esc(state.projects.find(project => project.id === mission.projectId)?.name)} · ${esc(session?.model || '')} · ${mission.continuations}/${mission.maxContinuations} relances</small>
    ${mission.reason ? `<p class="inline-error">${esc(mission.reason)}</p>` : ''}
    ${verification ? `<div class="duplica-checks">${verification.checks.map(check => `<span class="badge ${check.status === 'pass' ? 'completed' : check.status === 'fail' ? 'failed' : 'waiting'}">${esc(check.stage)} · ${{pass:'réussi',fail:'échec',not_run:'non exécuté',cancelled:'annulé'}[check.status] || esc(check.status)}</span>`).join('')}</div>` : ''}
    <div class="duplica-card-actions">${btn('duplica-verify','Tester le résultat','shield','secondary',`data-id="${esc(mission.id)}"`)}${mission.status === 'interrupted' || mission.status === 'waiting_user' ? btn('duplica-resume','Reprendre la mission','play','secondary',`data-session="${esc(mission.sessionId)}"`) : ''}${btn('duplica-mission','Configurer','settings','quiet',`data-session="${esc(mission.sessionId)}"`)}${btn('open-agent','Ouvrir la session','external','quiet',`data-id="${esc(mission.sessionId)}"`)}</div>
    ${verification ? `<details><summary>Consulter les preuves</summary><pre class="result-output">${esc(JSON.stringify(verification,null,2))}</pre></details>` : ''}</article>`;
}
function duplicaRunCard(run) {
  const workflow=(state.workflows || []).find(flow=>flow.id === run.workflowId);
  const labels={running:'Équipe en cours',correcting:'Correction en cours',waiting_plan:'Plan à valider',waiting_tasks:'Attend les TODO',waiting_permission:'Permission de recette',testing:'Recette indépendante',needs_evidence:'Preuves manquantes',completed:'Objectifs vérifiés',failed:'Échec',paused:'En pause',interrupted:'Interrompue',waiting_user:'Intervention nécessaire'};
  const steps=workflow?.steps || [], running=steps.filter(step=>step.status === 'running').length;
  const verification=duplicaData().verifications.find(result=>result.id === run.verificationId);
  return `<article class="panel duplica-run"><div class="panel-heading"><h3>Équipe Duplica · ${esc(state.projects.find(project=>project.id === run.projectId)?.name || '')}</h3><span class="badge">${esc(labels[run.status] || run.status)}</span></div>
    <p>${esc(run.activeGoal || run.goal || 'Prendre les TODO compatibles du projet')}</p><small class="muted">${esc(run.model)} · ${esc(run.effort)} · ${running}/${run.maxParallel} agents en cours · ${run.taskIds.length} objectifs pris · ${run.continuations}/${run.maxContinuations} corrections</small>
    ${run.reason ? `<p class="panel-description">${esc(run.reason)}</p>` : ''}
    ${workflow?.status === 'waiting_plan' ? `<details open><summary>Plan proposé · ${(workflow.plan || []).length} mini-tâches</summary><ol>${(workflow.plan || []).map(task=>`<li><strong>${esc(task.title)}</strong><p>${esc(task.prompt)}</p><small>${esc(task.files?.join(', ') || 'Fichiers non attribués')} · dépend de ${esc(task.dependsOn?.join(', ') || 'aucune tâche')}</small></li>`).join('')}</ol></details><div class="duplica-card-actions">${btn('approve-team-plan','Valider le plan','check','primary',`data-id="${esc(workflow.id)}"`)}${btn('decline-team-plan','Refuser','close','secondary',`data-id="${esc(workflow.id)}"`)}</div>` : ''}
    ${steps.length ? `<details open><summary>Tâches et agents observés</summary>${steps.map(step=>`<div class="duplica-agent"><div><strong>${esc(step.title || step.role)}</strong><small>${esc(step.status)} · ${esc(step.model)} · ${esc(step.effort)}</small></div>${btn('open-agent','Voir les preuves','external','quiet',`data-id="${esc(step.sessionId)}"`)}</div>`).join('')}</details>` : ''}
    ${verification ? `<details><summary>Recette et preuves indépendantes</summary><pre class="result-output">${esc(JSON.stringify(verification,null,2))}</pre></details>` : ''}
    ${['needs_evidence','paused','interrupted','failed','waiting_user'].includes(run.status) ? btn('duplica-run-resume','Reprendre / compléter la recette','play','secondary',`data-id="${esc(run.id)}"`) : ''}
    <small class="muted">${run.continuous ? 'Poursuite des TODO compatible activée.' : 'Un objectif.'} Fin technique et validation humaine restent distinctes.</small></article>`;
}
function duplicaManagerView() {
  const data=duplicaData(), settings=data.settings;
  const active=settings.status === 'active';
  const contexts=data.contexts.find(context => context.id === (duplicaContextScope === 'project' ? projectId : 'global')) || {};
  const supervised=data.agents.filter(agent => agent.supervised), pending=state.approvals.filter(approval => supervised.some(agent => agent.id === approval.sessionId));
  const metrics=[['Supervisés',data.counts.supervised || 0],['En cours',data.counts.running || 0],['En attente',data.counts.waiting || 0],
    ['Bloqués',data.counts.blocked || 0],['Recettes',data.counts.testing || 0],['Vérifiées',data.counts.completed || 0]];
  const decisions=data.decisions.filter(decision => decision.projectId == null || decision.projectId === projectId);
  return heading('VOTRE DOUBLE OPÉRATIONNEL','Duplica Agent','Votre contexte, vos décisions et des preuves consultables pour faire avancer les missions confiées.',
    btn('duplica-control',active ? 'Pause' : 'Travailler pour moi',active ? 'pause' : 'play',active ? 'secondary' : 'primary',`data-control="${active ? 'pause' : 'start'}"`)+
    btn('duplica-control','Reprendre la main','shield','secondary','data-control="take_control"')+btn('duplica-control','Stop','close','quiet','data-control="stop"'))+
    `<div class="duplica-status"><span class="duplica-light ${esc(settings.status)}"></span><strong>${esc(duplicaStatusLabels[settings.status])}</strong>
      ${btn('duplica-global-toggle',settings.globalEnabled ? 'Tous les projets : ON' : 'Tous les projets : OFF','network','quiet')}
      ${duplicaScopeButton('project',projectId)}${btn('duplica-permissions','Permissions','shield','quiet')}
      <span class="muted small">PC : ${data.computer.available ? 'Atelier desktop connecté' : 'ouvrir Atelier desktop'}</span></div>
    ${settings.recoveryRequired ? '<p class="inline-error">Redémarrage détecté. Les actions en cours n’ont pas été rejouées. Inspectez la timeline puis réactivez la supervision.</p>' : ''}
    ${active && !settings.globalEnabled && !data.scopes.some(scope => scope.enabled === true) ? '<p class="panel-description">Choisissez un projet, un agent ou une tâche à superviser, ou activez tous les projets.</p>' : ''}
    <div class="duplica-metrics">${metrics.map(([title,count]) => `<div><strong>${count}</strong><span>${title}</span></div>`).join('')}</div>
    <div class="duplica-layout"><div>${pending.length ? `<section class="pending-approvals">${pending.map(approvalCard).join('')}</section>` : ''}${(data.runs || []).filter(run=>run.projectId === projectId).map(duplicaRunCard).join('')}<section class="panel"><div class="panel-heading"><h3>Agents dans la plateforme</h3>${btn('duplica-mission','Confier une mission','plus','quiet')}</div>
      <div class="duplica-agents">${data.agents.map(agent => `<article class="duplica-agent"><div><strong>${esc(agent.name)}</strong><small>${esc(state.projects.find(project => project.id === agent.projectId)?.name || '')} · ${esc(agent.role)} · ${esc(agent.model)}</small><p>${esc((agent.mission || 'Aucune mission envoyée').slice(0,180))}${agent.mission?.length > 180 ? '…' : ''}</p>${agent.mission?.length > 180 ? btn('open-agent','Lire les consignes','external','quiet',`data-id="${esc(agent.id)}"`) : ''}</div><span class="badge">${esc(agent.observedStatus)}</span>${duplicaScopeButton('session',agent.id)}${btn('duplica-mission','Recette','shield','quiet',`data-session="${esc(agent.id)}"`)}</article>`).join('') || '<p class="panel-description">Aucun agent lancé. Confiez une mission depuis Agents ou Sessions outillées.</p>'}</div>
      ${data.nativeAgents.length ? `<details><summary>${data.nativeAgents.length} terminaux natifs ouverts</summary>${data.nativeAgents.map(agent => `<p>${esc(agent.title)} · PID ${esc(agent.pid)} · dernière sortie ${stamp(agent.lastActivityAt)}<br><small class="muted">Processus observé ; questions et fin de mission non attribuées depuis le PTY.</small></p>`).join('')}</details>` : ''}</section>
      ${data.missions.map(duplicaMissionCard).join('')}
      ${data.requests.length ? `<section class="panel"><div class="panel-heading"><h3>Décisions nécessaires</h3></div>${data.requests.map(duplicaRequestCard).join('')}</section>` : ''}

      <section class="panel"><div class="panel-heading"><h3>Mémoire de l’utilisateur</h3><div class="segmented"><button data-action="duplica-context-scope" data-scope="global" class="${duplicaContextScope === 'global' ? 'selected' : ''}">Globale</button><button data-action="duplica-context-scope" data-scope="project" class="${duplicaContextScope === 'project' ? 'selected' : ''}">Ce projet</button></div></div>
      <form data-form="duplica-context">${area('Objectifs, habitudes et façon de décider','user',contexts.user || '',3,'id="duplica-user"')}${area('Préférences et priorités','preferences',contexts.preferences || '',2,'id="duplica-preferences"')}${area('Contexte du projet et actions interdites','project',contexts.project || '',3,'id="duplica-project"')}${area('Tests indispensables et critères de réussite','testing',contexts.testing || '',2,'id="duplica-testing"')}<button class="button primary" type="submit">Enregistrer le contexte</button></form>
      <div class="duplica-card-actions">${btn('duplica-decision','Mémoriser une réponse','plus','secondary')}</div>
      ${decisions.map(decision => `<details><summary>${esc(decision.questions[0])}</summary><p>${esc(decision.answer)}</p><small>${decision.projectId ? 'Ce projet' : 'Tous les projets'} · ${esc(decision.source)} · ${stamp(decision.createdAt)}</small></details>`).join('')}</section>
      ${data.observations.length ? `<section class="panel"><div class="panel-heading"><h3>Observations de recette</h3></div>${data.observations.map(bug => `<details><summary>${esc(bug.id)} · ${{open:'Bloquant',resolved:'Résolu après recette',superseded:'Critères remplacés par l’utilisateur'}[bug.status] || esc(bug.status)}</summary><pre class="result-output">${esc(bug.report)}</pre></details>`).join('')}</section>` : ''}</div>
      <aside><section class="panel"><div class="panel-heading"><h3>Computer Use</h3>${btn('duplica-observe','Observer','search','quiet')}</div><p class="panel-description">Fenêtre Atelier et navigateur de recette local. Clics, clavier et captures. Les applications Windows externes nécessitent un autre adaptateur.</p><div id="duplica-screen"><p class="muted small">Une capture constitue une observation datée, pas une validation.</p></div></section>
      <section class="panel duplica-timeline"><div class="panel-heading"><h3>Timeline</h3></div>${data.timeline.map(event => `<details><summary><time>${stamp(event.ts)}</time><strong>${esc(duplicaEventLabels[event.type.slice(8)] || event.type)}</strong></summary><pre class="result-output">${esc(JSON.stringify(event.data,null,2))}</pre></details>`).join('') || '<p class="panel-description">Les actions apparaîtront ici après activation.</p>'}</section></aside></div>`;
}
function duplicaPermissionsModal() {
  const settings=duplicaData().settings;
  modal('Permissions Duplica','Chaque décision automatique conserve la règle qui l’autorise.',
    `<form data-form="duplica-permissions"><div class="modal-body">${select('Mode d’intervention','interactionMode',[['auto','Interface si le desktop est connecté, sinon backend'],['computer','Contrôle de l’interface obligatoire'],['backend','Sessions outillées uniquement']],settings.interactionMode)}
      <div class="duplica-permission-grid">${Object.entries(settings.permissions).map(([category,mode]) => select(duplicaPermissionLabels[category], 'permission_'+category,
        category === 'destructive_system_operation' ? [['deny','Interdit']] : ['git_push','production_deploy','public_publish','payment','read_secrets','send_private_data','unknown'].includes(category) ? [['ask','Me demander'],['deny','Interdit']] : [['auto','Délégué'],['ask','Me demander'],['deny','Interdit']], mode)).join('')}</div><p class="muted small">La supervision applique ces choix. Valider un plan conserve le profil lecture seule ou écriture projet de l’agent ; les commandes et permissions restent contrôlées.</p>
      ${field('Silence avant alerte (secondes)','watchdogSeconds',settings.watchdogSeconds,'number','min="30" max="3600"')}
      <label class="check-option"><input type="checkbox" name="telegramEnabled" ${settings.telegramEnabled ? 'checked' : ''} ${duplicaData().telegram.configured ? '' : 'disabled'}><span>Activer le relais Telegram associé</span></label><p class="muted small">Créez et associez votre bot depuis l’onglet Telegram de Duplica.</p></div>${formFooter('Enregistrer les permissions')}</form>`,true);
}
function duplicaDecisionModal() {
  modal('Mémoriser une réponse','Duplica réutilisera cette réponse pour les formulations exactes enregistrées.',
    `<form data-form="duplica-decision"><div class="modal-body">${select('Portée','scope',[['project','Ce projet'],['global','Tous les projets']],'project')}${area('Questions reconnues (une formulation par ligne)','questions','',3,'required')}${area('Réponse à donner','answer','',3,'required')}</div>${formFooter('Mémoriser')}</form>`);
}
function duplicaMissionModal(sessionId='') {
  const candidates=objects('sessions').filter(session => !session.parentId && session.executionMode !== 'chat' && session.status !== 'closed');
  const session=candidates.find(session => session.id === sessionId) || candidates[0];
  if (!session) throw new Error('Créez d’abord une session outillée de travail pour ce projet.');
  const mission=duplicaData().missions.find(mission => mission.sessionId === session.id), recipe=mission?.recipe || {};
  modal('Confier une mission à Duplica','Définissez ce qui doit être observable pour considérer le travail terminé.',
    `<form data-form="duplica-mission"><div class="modal-body">${select('Agent de travail','sessionId',candidates.map(session => [session.id,session.name]),session.id)}${area('Résultat final attendu','goal',mission?.goal || session.mission,3,'required')}
    ${area('Fichiers attendus — chemin | contenu attendu facultatif','requirements',(recipe.requirements || []).map(criterion => criterion.path+(criterion.contains ? ' | '+criterion.contains : '')).join('\n'),3,'placeholder="src/export.py | def export"')}
    ${area('Commande de tests — liste JSON d’arguments','tests',recipe.tests ? JSON.stringify(recipe.tests) : '',2,'placeholder=\'["python", "-m", "unittest", "discover", "-s", "tests", "-v"]\'')}
    ${area('Commande de build — liste JSON d’arguments','build',recipe.build ? JSON.stringify(recipe.build) : '',2,'placeholder=\'["npm", "run", "build"]\'')}
    <label class="check-option"><input type="checkbox" name="buildNotApplicable" ${recipe.buildNotApplicable ? 'checked' : ''}><span>Cette application ne nécessite pas de compilation</span></label>
    ${area('Démarrer l’application pour la recette — arguments JSON facultatifs','application',recipe.application ? JSON.stringify(recipe.application) : '',2)}
    ${area('Parcours interface — étapes JSON','gui',JSON.stringify(recipe.gui || [],null,2),5,'placeholder=\'[{"kind":"open_url","url":"http://127.0.0.1:8000"},{"kind":"click","label":"Exporter"},{"kind":"expect","text":"Export réussi"}]\'')}
    <p class="muted small">Étapes : open_url, click ou hover (label exact), type_text (text), press_key (key), scroll (deltaY), expect (text attendu). L’interface est testée avec de vrais survols, clics et saisies.</p>
    ${field('Relances maximum pour corriger les écarts','maxContinuations',mission?.maxContinuations ?? 3,'number','min="0" max="10"')}
    <label class="check-option"><input type="checkbox" name="autoVerify" checked><span>Tester après chaque fin technique et demander une correction si nécessaire</span></label>
    <label class="check-option"><input type="checkbox" name="startMission" ${session.messages.some(message => message.role === 'user') ? '' : 'checked'}><span>Transmettre cet objectif à l’agent maintenant</span></label>
    </div>${formFooter('Confier à Duplica','Les TODO restent En revue pour votre recette humaine.')}</form>`,true);
}
async function handleDuplicaSubmit(form,fd,fields) {
  if (form.dataset.form === 'duplica-context') await api('duplica/context',{...fields,projectId:duplicaContextScope === 'project' ? projectId : null});
  else if (form.dataset.form === 'duplica-decision') await api('duplica/decision',{questions:fields.questions.split(/\r?\n/).map(question => question.trim()).filter(Boolean),answer:fields.answer,projectId:fields.scope === 'project' ? projectId : null});
  else if (form.dataset.form === 'duplica-permissions') {
    const permissions=Object.fromEntries(Object.entries(fields).filter(([key]) => key.startsWith('permission_')).map(([key,mode]) => [key.slice(11),mode]));
    await api('duplica/configure',{permissions,interactionMode:fields.interactionMode,watchdogSeconds:Number(fields.watchdogSeconds),telegramEnabled:fd.has('telegramEnabled')});
  } else if (form.dataset.form === 'duplica-mission') {
    const parseCommand=text => text.trim() ? JSON.parse(text) : null;
    await api('duplica/mission',{sessionId:fields.sessionId,goal:fields.goal,maxContinuations:Number(fields.maxContinuations),autoVerify:fd.has('autoVerify'),startMission:fd.has('startMission'),recipe:{
      requirements:fields.requirements.split(/\r?\n/).filter(line => line.trim()).map(line => { const [path,...text]=line.split('|'); return {path:path.trim(),contains:text.join('|').trim()}; }),
      tests:parseCommand(fields.tests),build:parseCommand(fields.build),application:parseCommand(fields.application),buildNotApplicable:fd.has('buildNotApplicable'),gui:JSON.parse(fields.gui)}});
    if (duplicaData().settings.status !== 'active') await api('duplica/control',{action:'start'});
  }
  if ($('#modal').open) $('#modal').close();
  toast('Duplica : configuration enregistrée.');
  await refresh(true);
}
const duplicaActions={
  'duplica-open':() => route('duplica'),
  'duplica-control':async element => { await api('duplica/control',{action:element.dataset.control}); await refresh(true); },
  'duplica-global-toggle':async () => { const enabled=!duplicaData().settings.globalEnabled; await api('duplica/control',{action:'start',globalEnabled:enabled}); await refresh(true); },
  'duplica-scope':async element => {
    await api('duplica/scope',{kind:element.dataset.kind,id:element.dataset.id,enabled:element.dataset.enabled === 'true'});
    if (element.dataset.enabled === 'true' && duplicaData().settings.status !== 'active') await api('duplica/control',{action:'start'});
    await refresh(true);
  },
  'duplica-resume':async element => { await api('duplica/resume',{sessionId:element.dataset.session}); await refresh(true); },
  'duplica-permissions':duplicaPermissionsModal,
  'duplica-decision':duplicaDecisionModal,
  'duplica-context-scope':element => { duplicaContextScope=element.dataset.scope; render(); },
  'duplica-mission':element => duplicaMissionModal(element?.dataset.session),
  'duplica-verify':async element => { await api('duplica/verify',{id:element.dataset.id}); toast('Recette demandée. Le résultat apparaîtra dans la mission.'); await refresh(true); },
  'duplica-resolve':async element => { await api('duplica/resolve',{id:element.dataset.id,accepted:element.dataset.accepted === 'true'}); await refresh(true); },
  'duplica-observe':async () => {
    duplicaObservation=await api('duplica/computer/observe',{target:'platform'});
    const screenshot=duplicaObservation.screenshot;
    if (!screenshot) return;
    const response=await fetch('/api/duplica/screenshot?id='+encodeURIComponent(screenshot.id),{headers:{'X-Atelier-Token':$('meta[name="atelier-token"]').content}});
    if (!response.ok) throw new Error('Capture indisponible.');
    const url=URL.createObjectURL(await response.blob());
    modal('Observation du PC',`${duplicaObservation.title} · ${stamp(duplicaObservation.createdAt)}`,`<div class="modal-body"><img class="duplica-screenshot" src="${url}" alt="Capture observée par Duplica"><p class="muted small">${esc(duplicaObservation.target)} · ${esc(screenshot.sha256)}</p></div>`,true);
    $('#modal').addEventListener('close',() => URL.revokeObjectURL(url),{once:true});
  },
};
