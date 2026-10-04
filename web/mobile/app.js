/* Atelier mobile: every operation is performed by the connected PC's local service. */
"use strict";
(() => {
  const $ = selector => document.querySelector(selector);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const token = $('meta[name="atelier-mobile-token"]').content;
  const pcName = $('meta[name="atelier-mobile-pc"]').content;
  const emptyState = () => ({projects:[],sessions:[],tasks:[],providers:[],memories:[],events:[],approvals:[],workflows:[],discussions:{channels:[],messages:[]}});
  let state = emptyState(), projectId = '', view = 'projects', detail = '', subsection = '', files = null, fileError = '', filePath = '', fileLoading = false;
  let online = false, loading = false, pending = false, timer, fileGeneration = 0, lastReceived = null, hasReceived = false, workerIndex = 0;
  const drafts = new Map();
  const labels = {ready:'Prêt',running:'En cours',waiting:'Permission attendue',waiting_plan:'Plan à valider',stopped:'Arrêté',closed:'Clôturé',failed:'Échec',initializing:'Démarrage',queued:'En attente',interrupted:'Interrompu',cancelled:'Annulé',todo:'À faire',review:'En revue',done:'Terminé',idle:'Au repos',completed:'Tour terminé'};
  const project = () => state.projects.find(p => p.id === projectId);
  const scoped = key => (state[key] || []).filter(item => item.projectId === projectId);
  const sessions = () => scoped('sessions').filter(s => !s.removedAt);
  const selectedSession = () => sessions().find(s => s.id === detail);
  const provider = runtime => state.providers.find(p => p.id === runtime) || {models:[]};
  const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value.toLocaleString('fr-FR') : '—';
  const date = value => { const d = new Date(value); return Number.isNaN(d.getTime()) ? 'Date inconnue' : d.toLocaleString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}); };
  const badge = status => `<span class="tag ${escape(status)}">${escape(labels[status] || status || 'Inconnu')}</span>`;
  const button = (action, text, attrs='', cls='') => `<button type="button" data-action="${action}" ${attrs} class="${cls}">${text}</button>`;
  const heading = (title,action='') => `<div class="view-heading"><div><span class="eyebrow">${escape(project()?.name || 'Votre espace')}</span><h1>${title}</h1></div>${action}</div>`;
  const empty = (title,text) => `<section class="empty"><div class="symbol" aria-hidden="true">◌</div><h2>${title}</h2><p>${text}</p></section>`;
  const input = (label,name,value='',extra='') => `<label>${label}<input name="${escape(name)}" value="${escape(value)}" ${extra}></label>`;
  const area = (label,name,value='',extra='') => `<label>${label}<textarea name="${escape(name)}" rows="4" ${extra}>${escape(value)}</textarea></label>`;
  const select = (label,name,options,value='') => `<label>${label}<select name="${escape(name)}">${options.map(([id,text]) => `<option value="${escape(id)}" ${id===value?'selected':''}>${escape(text)}</option>`).join('')}</select></label>`;
  const footer = title => `<p class="form-error" role="alert"></p><div class="buttons">${button('dismiss','Annuler')}<button class="primary" type="submit">${title}</button></div>`;

  function notice(text,error=false) {
    $('#notice').textContent = text;
    $('#notice').className = 'visible'+(error?' error':'');
    clearTimeout(timer); timer=setTimeout(() => $('#notice').className='',6000);
  }
  async function api(path,data) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(),data ? 60000 : 15000);
    try {
      const response = await fetch('/api/'+path,{method:data?'POST':'GET',headers:{Authorization:'Bearer '+token,...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined,signal:controller.signal,cache:'no-store'});
      const result = await response.json();
      if (!response.ok || result?.error) throw new Error(result?.error || 'Le service a refusé la demande.');
      return result;
    } catch (error) {
      if (data && ['AbortError','TypeError','SyntaxError'].includes(error.name)) throw new Error('Réponse non reçue. L’action a peut-être abouti : actualisez avant de la renvoyer.');
      if (error.name === 'AbortError') throw new Error('L’ordinateur ne répond pas.');
      throw error;
    } finally { clearTimeout(timeout); }
  }
  function connection() {
    $('#connection').textContent = online ? '● Connecté' : '○ Hors ligne';
    $('#connection').style.color = online ? 'var(--green)' : 'var(--amber)';
    $('#connection').title = lastReceived ? 'Dernière réception : '+date(lastReceived) : 'Aucun état reçu';
    $('#offline').hidden = online;
    $('#refresh').disabled = loading;
    document.querySelectorAll('[data-mutation]').forEach(el => el.disabled = pending || !online);
    const send = $('#content [data-form="prompt"] button[type="submit"]');
    if (send) send.disabled = pending || !online || selectedSession()?.status !== 'ready';
    const duplicaSend=$('#content [data-form="duplica"] button[type="submit"]');
    if(duplicaSend){
      const discussion=state.duplica?.discussion || {}, conversation=(discussion.conversations || []).find(c=>c.projectId===projectId);
      const busy=(discussion.deliveries || []).some(d=>d.projectId===projectId&&['queued','dispatching','sent'].includes(d.status));
      duplicaSend.disabled=pending || !online || busy || !conversation&&!(provider('codex').models || []).length;
    }
  }
  async function refresh(force=false) {
    if (loading) return;
    loading=true; connection();
    try {
      state = {...emptyState(),...await api('state')};
      hasReceived=true; online=true; lastReceived=new Date().toISOString();
      if (!state.projects.some(p => p.id===projectId)) { projectId=state.projects[0]?.id || ''; detail=''; files=null; filePath=''; ++fileGeneration; }
      const active = document.activeElement;
      if (force || !active?.matches('input,textarea,select') || !$('#content').contains(active)) render();
      projectSelect();
    } catch (error) {
      online=false;
      if (force) notice(error.message,true);
      if (!hasReceived) $('#content').innerHTML=empty('Connexion indisponible','Ouvrez la liste des PCs dans l’application, vérifiez l’adresse Tailscale et la clé de connexion.');
    } finally { loading=false; connection(); }
  }
  function projectSelect() {
    const selectEl=$('#project-select');
    const values=state.projects.map(p=>p.id+':'+p.name).join('|');
    if (selectEl.dataset.values!==values) {
      selectEl.innerHTML=state.projects.length ? state.projects.map(p=>`<option value="${escape(p.id)}">${escape(p.name)}</option>`).join('') : '<option value="">Aucun projet</option>';
      selectEl.dataset.values=values;
    }
    selectEl.value=projectId;
  }
  function navigate(next,id='') {
    saveDraft(); view=next; detail=id; subsection=''; render(); window.scrollTo(0,0);
    if (next==='files' && !files && !fileLoading) loadFiles('');
  }
  function changeProject(id) {
    if (!state.projects.some(p=>p.id===id)) return;
    saveDraft(); projectId=id; detail=''; filePath=''; files=null; fileError=''; fileLoading=false; ++fileGeneration;
    projectSelect(); render(); window.scrollTo(0,0);
    if (view==='files') loadFiles('');
  }
  function saveDraft() {
    const form=$('#content [data-form="prompt"], #content [data-form="duplica"]');
    if (form) drafts.set(form.dataset.id || 'duplica:'+form.dataset.project,form.elements.text.value);
  }
  function render() {
    saveDraft();
    const scroll=window.scrollY;
    const renderers={projects:projectsView,agents:agentsView,files:filesView,tasks:tasksView,more:moreView};
    $('#content').innerHTML=(renderers[view] || projectsView)();
    document.querySelectorAll('[data-nav]').forEach(el=>{el.classList.toggle('active',el.dataset.nav===view);el.setAttribute('aria-current',el.dataset.nav===view?'page':'false');});
    connection(); window.scrollTo(0,scroll);
  }
  function projectsView() {
    return heading('Projets',button('new-project','＋ Ajouter','','primary'))+
      '<p class="lead">Vos répertoires et vos agents, sur cet ordinateur.</p>'+
      state.projects.map(p=>`<button class="card card-button ${p.id===projectId?'selected':''}" data-action="project" data-id="${escape(p.id)}"><div class="card-top"><div><h2>${escape(p.name)}</h2><small>${escape(p.path)}</small></div>${p.id===projectId?'<span class="tag">Actif</span>':'<span class="tag">Ouvrir →</span>'}</div><small>${state.sessions.filter(s=>s.projectId===p.id&&!s.removedAt).length} sessions · ${state.tasks.filter(t=>t.projectId===p.id&&t.status!=='done').length} tâches ouvertes</small></button>`).join('')+
      (state.projects.length?'':empty('Aucun projet','Ajoutez le chemin d’un répertoire existant sur cet ordinateur.'))+
      '<div class="card"><h3>Plusieurs ordinateurs</h3><p class="muted">Le bouton <strong>PCs</strong> dans la barre de l’application permet de connecter et de choisir un autre ordinateur. Chaque PC garde ses projets, ses agents et ses abonnements.</p></div>';
  }
  function sessionCard(s) {
    return `<button class="card card-button" data-action="session" data-id="${escape(s.id)}"><div class="card-top"><div><h3>${escape(s.name)}</h3><small>${escape(s.runtime || 'codex')} · ${escape(s.model)} · ${escape(s.effort)}</small></div>${badge(s.status)}</div><small>${s.sandbox==='workspace-write'?'Écriture projet':'Lecture seule'} · ${number(s.usage?.total?.totalTokens)} tokens observés</small></button>`;
  }
  function agentsView() {
    if (detail) return sessionView();
    return heading('Agents',button('new-agent','＋ Créer','','primary'))+
      '<p class="lead">Sessions outillées exécutées sur votre PC. Les terminaux natifs restent accessibles dans Atelier sur le PC.</p>'+
      (sessions().map(sessionCard).join('') || empty('Votre premier agent','Choisissez un modèle du catalogue de votre PC, puis envoyez une mission.'))+
      (scoped('workflows').length?'<h2 class="section-label">Équipes</h2>'+scoped('workflows').map(workflowCard).join(''):'');
  }
  function workflowCard(w) {
    return `<section class="card"><div class="card-top"><h3>${escape(w.title)}</h3>${badge(w.status)}</div><small>${escape(w.mode)} · ${w.agents?.workers?.length || 0} spécialistes configurés</small><p class="muted">${escape(w.mission || '')}</p>${w.steps?.length?`<details><summary>Étapes et résultats publics</summary>${w.steps.map(step=>`<div class="message"><span class="author">${escape(step.role || step.name || 'Étape')}</span>${escape(step.output || step.text || JSON.stringify(step))}</div>`).join('')}</details>`:''}${w.status==='waiting_plan'?`<div class="approval card"><h3>Plan de l’équipe à relire</h3><p class="muted">La validation lance la suite et consomme le quota du fournisseur.</p><div class="buttons">${button('workflow-plan','Refuser',`data-id="${escape(w.id)}" data-accepted="false" data-mutation`)}${button('workflow-plan','Valider',`data-id="${escape(w.id)}" data-accepted="true" data-mutation`,'primary')}</div></div>`:''}${['running','waiting_plan','queued'].includes(w.status)?button('workflow-stop','Annuler l’équipe',`data-id="${escape(w.id)}" data-mutation`,'danger'):''}</section>`;
  }
  function usage(s) {
    const total=s.usage?.total || {}, account=provider(s.runtime || 'codex');
    return `<div class="metrics"><div class="metric"><strong>${number(total.totalTokens)}</strong><span>Tokens observés ${s.partialUsage?'· partiels':''}</span></div><div class="metric"><strong>${s.totalTurnDurationMs==null?'—':number(Math.round(s.totalTurnDurationMs/1000))+' s'}</strong><span>Durée reçue du fournisseur</span></div></div><details><summary>Consommation et abonnement</summary><dl class="session-context"><dt>Entrée</dt><dd>${number(total.inputTokens)}</dd><dt>Réponse</dt><dd>${number(total.outputTokens)}</dd><dt>Cache lu</dt><dd>${number(total.cachedInputTokens)}</dd><dt>Abonnement</dt><dd>${escape(account.plan || 'Non communiqué')}</dd><dt>Fenêtre de contexte</dt><dd>${number(s.usage?.modelContextWindow)}</dd></dl><p class="muted">Le cache est compris dans l’entrée. « — » signifie non communiqué. Les quotas concernent le compte partagé.</p></details>`;
  }
  function sessionView() {
    const s=selectedSession();
    if (!s) return button('back-agents','← Agents','','detail-back')+empty('Session indisponible','Cette session n’appartient plus au projet actif.');
    const approvals=state.approvals.filter(a=>a.sessionId===s.id);
    const stopped=['stopped','failed','closed','interrupted'].includes(s.status);
    return button('back-agents','← Agents','','detail-back')+`<div class="card-top"><h1>${escape(s.name)}</h1>${badge(s.status)}</div>`+
      `<p class="lead">${escape(s.model)} · ${escape(s.effort)} · ${s.sandbox==='workspace-write'?'Écriture projet':'Lecture seule'} · on-request</p>`+
      `<details><summary>Mission et périmètre</summary><p>${escape(s.mission || 'Aucune mission initiale')}</p><p class="muted">${escape(s.workingPath || project()?.path)}</p><p class="muted">Mémoire ${s.memory?'activée':'désactivée'} · ${s.planMode?'Diagnostic et plan avant implémentation':'Mode direct choisi sur le PC'}</p></details>`+
      usage(s)+(s.error?`<div class="card approval">${escape(s.error)}</div>`:'')+
      approvals.map(approvalCard).join('')+
      (s.messages?.map(message=>`<article class="message ${message.role==='user'?'user':''}"><span class="author">${message.role==='user'?'Vous':escape(message.role==='assistant'?s.name:message.role)}${message.ts?' · '+escape(date(message.ts)):''}</span>${escape(message.text || '')}</article>`).join('') || '<p class="muted">Aucun message. Votre prochain prompt partira vers cette session sur le PC.</p>')+
      (s.status==='waiting_plan'?`<section class="card approval"><h3>Plan à valider</h3><p class="muted">Relisez la réponse ci-dessus. La validation autorise l’implémentation dans le périmètre ${s.sandbox==='workspace-write'?'écriture projet':'lecture seule'} choisi et lance un nouveau tour.</p><div class="buttons">${button('plan','Refuser',`data-id="${escape(s.id)}" data-request="${escape(s.currentRequestId || '')}" data-accepted="false" data-mutation`)}${button('plan','Valider le plan',`data-id="${escape(s.id)}" data-request="${escape(s.currentRequestId || '')}" data-accepted="true" data-mutation`,'primary')}</div></section>`:'')+
      `<form class="composer" data-form="prompt" data-id="${escape(s.id)}"><label>Votre message<textarea name="text" placeholder="Votre mission, une question, une précision…" maxlength="100000" required>${escape(drafts.get(s.id) || '')}</textarea></label><div class="buttons"><button type="submit" class="primary" ${s.status!=='ready'?'disabled':''}>Envoyer</button>${['running','waiting','waiting_plan'].includes(s.status)?button('interrupt','Interrompre',`data-id="${escape(s.id)}" data-mutation`,'danger'):''}${stopped?button('resume','Reprendre',`data-id="${escape(s.id)}" data-mutation`):''}</div><p class="muted">${s.status==='ready'?'Le prompt utilise le quota de votre fournisseur.':stopped?'Reprenez la session avant l’envoi.':'L’agent doit être prêt avant un nouvel envoi.'}</p></form>`+
      `<details><summary>Journal public de cette session</summary>${state.events.filter(e=>e.sessionId===s.id).slice(0,20).map(event=>`<div class="event"><strong>${escape(event.type)}</strong><small>${escape(date(event.ts))}</small><pre>${escape(JSON.stringify(event.data,null,2))}</pre></div>`).join('') || '<p class="muted">Aucun événement reçu.</p>'}</details>`;
  }
  function approvalCard(a) {
    const session=state.sessions.find(s=>s.id===a.sessionId);
    const params=a.params || {};
    const inputRequest=a.method==='item/tool/requestUserInput';
    return `<section class="card approval"><h3>${inputRequest?'Réponse demandée':'Permission demandée'}</h3><small>${escape(session?.name || 'Session')} · ${escape(a.method)}</small><details open><summary>Demande exacte reçue du fournisseur</summary><pre>${escape(JSON.stringify(params,null,2))}</pre></details>${inputRequest?`<form data-form="answers" data-id="${escape(a.id)}">${(params.questions || []).map(q=>area(escape(q.question),q.id,'','required')).join('')}<p class="form-error" role="alert"></p><button class="primary" type="submit" data-mutation>Transmettre mes réponses</button></form>`:`<p class="muted">Cette décision concerne la demande affichée et ne remplace pas le périmètre de la session.</p><div class="buttons">${button('approval','Refuser',`data-id="${escape(a.id)}" data-decision="decline" data-mutation`)}${button('approval','Autoriser',`data-id="${escape(a.id)}" data-decision="accept" data-mutation`,'primary')}</div>`}</section>`;
  }
  async function loadFiles(path) {
    const normalized=String(path || '').replace(/\\/g,'/');
    if (normalized.startsWith('/') || normalized.split('/').includes('..')) { notice('Chemin hors du projet.',true); return; }
    const generation=++fileGeneration, targetProject=projectId;
    fileLoading=true; fileError=''; filePath=normalized; files=null;
    if (view==='files') render();
    try {
      const result=await api('files?'+new URLSearchParams({project:targetProject,path:normalized}));
      if (generation!==fileGeneration || targetProject!==projectId) return;
      files=result;
    } catch(error) { if (generation===fileGeneration) fileError=error.message; }
    finally { if (generation===fileGeneration) { fileLoading=false; if(view==='files')render(); } }
  }
  function filesView() {
    let path='';
    const breadcrumbs=button('file','Projet',`data-path=""`)+filePath.split('/').filter(Boolean).map(part=>{path+=(path?'/':'')+part;return button('file',escape(part),`data-path="${escape(path)}"`);}).join('');
    return heading('Fichiers')+'<p class="lead">Explorateur du projet · lecture seule. Les dossiers privés et les chemins hors projet sont bloqués par le PC.</p>'+`<div class="breadcrumbs">${breadcrumbs}</div>`+
      (fileLoading?'<p class="muted">Lecture du répertoire…</p>':fileError?`<section class="card approval"><p>${escape(fileError)}</p>${button('file-retry','Réessayer')}</section>`:files?.entries?(files.entries.map(entry=>`<button class="file-row" data-action="file" data-path="${escape(entry.path)}"><span class="file-icon" aria-hidden="true">${entry.directory?'▱':'≡'}</span><span>${escape(entry.name)}</span><small>${entry.directory?'→':number(entry.size)+' o'}</small></button>`).join('') || empty('Dossier vide','Aucun fichier visible dans ce répertoire.')):files?.content!==undefined?`<pre class="source" aria-label="Contenu du fichier">${escape(files.content)}</pre>`:empty('Choisissez un projet','Ses fichiers apparaîtront ici.'));
  }
  function tasksView() {
    return heading('Tâches',button('new-task','＋ Ajouter','','primary'))+'<p class="lead">La fin d’un tour ne valide pas une tâche. Relisez les résultats avant de choisir Terminé.</p>'+
      (scoped('tasks').map(t=>`<button class="card card-button" data-action="task" data-id="${escape(t.id)}"><div class="card-top"><h3>${escape(t.title)}</h3>${badge(t.status)}</div><p class="muted">${escape(t.description || '')}</p><small>${escape(t.priority || 'medium')} · ${escape(state.sessions.find(s=>s.id===t.assigneeId)?.name || 'Sans agent affecté')}${t.claimedBy?' · Réservée par un agent':''}</small></button>`).join('') || empty('Pas encore de tâche','Ajoutez une tâche, puis affectez un agent du projet.'));
  }
  function moreView() {
    if (subsection==='permissions') return button('back-more','← Plus','','detail-back')+heading('Permissions')+(state.approvals.filter(a=>state.sessions.some(s=>s.id===a.sessionId&&s.projectId===projectId)).map(approvalCard).join('') || empty('Aucune demande','Les permissions reçues des agents apparaîtront ici.'));
    if (subsection==='memory') return memoryView();
    if (subsection==='usage') return usageView();
    if (subsection==='channels') return channelsView();
    if (subsection==='duplica') return duplicaView();
    if (subsection==='journal') return button('back-more','← Plus','','detail-back')+heading('Journal')+(state.events.filter(e=>e.projectId===projectId || state.sessions.some(s=>s.projectId===projectId&&s.id===e.sessionId)).slice(0,80).map(e=>`<div class="event"><strong>${escape(e.type)}</strong><small>${escape(date(e.ts))}</small><details><summary>Preuve publique</summary><pre>${escape(JSON.stringify(e.data,null,2))}</pre></details></div>`).join('') || empty('Aucun événement','Le journal suivra les actions réalisées sur le PC.'));
    const permissionCount=state.approvals.filter(a=>state.sessions.some(s=>s.id===a.sessionId&&s.projectId===projectId)).length;
    return heading('Votre atelier')+[['duplica','Duplica','Votre discussion partagée avec le PC',null],['permissions','Permissions','Décisions et réponses attendues',permissionCount],['channels','Canaux','Discussions publiques des équipes',null],['memory','Mémoire','Noyau et réserve du projet',null],['usage','Consommation','Tokens et compteurs reçus',null],['journal','Journal','Événements publics du projet',null]].map(([id,title,desc,count])=>`<button class="list-link" data-action="more" data-subsection="${id}"><span><strong>${title}</strong><small>${desc}</small></span>${count?`<span class="permission-count">${count}</span>`:'<span aria-hidden="true">→</span>'}</button>`).join('')+
      '<div class="card"><h3>Ordinateurs et mises à jour</h3><p class="muted">Utilisez <strong>PCs</strong> dans la barre Android pour changer de machine. <strong>Mises à jour</strong> vérifie la version de l’APK proposée par le PC et vous laisse lancer son installation.</p></div><div class="version-note">Le PC conserve les sessions lorsque vous quittez l’application. Aucun prompt n’est relancé automatiquement après une coupure.</div>';
  }
  function memoryView() {
    const memories=state.memories.filter(m=>m.projectId===projectId || m.scope==='user');
    return button('back-more','← Plus','','detail-back')+heading('Mémoire',button('new-memory','＋ Ajouter','','primary'))+'<p class="lead">Mémoire durable distincte des journaux et des résultats. Le noyau projet + utilisateur est limité à 4 000 caractères.</p>'+input('Rechercher un souvenir','memory-search','','type="search" id="memory-search"')+`<div id="memories">${memories.map(m=>`<button class="card card-button" data-action="memory" data-id="${escape(m.id)}" data-search="${escape((m.title+' '+m.body+' '+(m.tags || []).join(' ')).toLocaleLowerCase('fr'))}"><h3>${escape(m.title)}</h3><small>${m.core?'Noyau':'Réserve'} · ${m.scope==='user'?'Utilisateur':'Projet'}</small><p class="muted">${escape(m.body)}</p><small>Source : ${escape(m.source || 'Non communiquée')}</small></button>`).join('') || empty('Aucun souvenir','Conservez une décision utile avec sa source.')}</div>`;
  }
  function usageView() {
    return button('back-more','← Plus','','detail-back')+heading('Consommation')+'<p class="lead">Mesures reçues des fournisseurs. Les quotas sont partagés avec les autres usages du compte.</p>'+sessions().map(s=>`<section class="card"><h3>${escape(s.name)}</h3><small>${escape(s.model)}</small>${usage(s)}</section>`).join('')+state.providers.filter(p=>['codex','omp'].includes(p.id)).map(p=>`<section class="card"><h3>${escape(p.name || p.id)}</h3><p class="muted">${p.connected?'Compte connecté':'Connexion non confirmée'} · ${escape(p.plan || 'Abonnement non communiqué')}</p>${p.limits?`<details><summary>Quotas natifs reçus du compte</summary><pre>${escape(JSON.stringify(p.limits,null,2))}</pre></details>`:'<p class="muted">Quota non communiqué.</p>'}${p.limitsError?`<p class="muted">${escape(p.limitsError)}</p>`:''}</section>`).join('');
  }
  function channelsView() {
    const channels=(state.discussions?.channels || []).filter(c=>c.projectId===projectId);
    return button('back-more','← Plus','','detail-back')+heading('Canaux')+'<p class="lead">Les participants sont configurés sur le PC. Seuls leurs échanges publics sont affichés.</p>'+channels.map(c=>`<section class="card"><div class="card-top"><h3>${escape(c.name || c.title)}</h3>${badge(c.status)}</div><p class="muted">${escape(c.topic || c.mission || '')}</p>${(state.discussions.messages || []).filter(m=>m.channelId===c.id).slice(-30).map(m=>`<article class="message"><span class="author">${escape(m.author || m.role)}</span>${escape(m.text)}</article>`).join('')}<form data-form="channel-message" data-id="${escape(c.id)}">${area('Message public','text','','required maxlength="16000"')}<button class="primary" type="submit" data-mutation>Envoyer au canal</button></form><div class="buttons">${button('channel-start','Lancer la discussion',`data-id="${escape(c.id)}" data-mutation`)}${button('channel-stop','Arrêter',`data-id="${escape(c.id)}" data-mutation`,'danger')}</div><p class="muted">Lancer la discussion consomme le quota des participants configurés.</p></section>`).join('')+(channels.length?'':empty('Aucun canal','Créez et configurez les participants depuis Atelier sur le PC.'));
  }
  function duplicaView() {
    const discussion=state.duplica?.discussion || {}, conversation=(discussion.conversations || []).find(c=>c.projectId===projectId), session=sessions().find(s=>s.id===conversation?.sessionId);
    const deliveries=(discussion.deliveries || []).filter(d=>d.projectId===projectId), busy=deliveries.some(d=>['queued','dispatching','sent'].includes(d.status));
    const models=provider('codex').models || [], defaultModel=models.find(m=>m.isDefault) || models[0];
    return button('back-more','← Plus','','detail-back')+heading('Duplica')+'<p class="lead">La même discussion persistante que sur votre PC. Cette discussion reste en lecture seule ; la supervision se configure dans Atelier sur le PC.</p>'+
      (session?usage(session):'')+(session?.messages || []).map(m=>`<article class="message ${m.role==='user'?'user':''}"><span class="author">${m.role==='user'?'Vous':'Duplica'}</span>${escape(m.text)}</article>`).join('')+
      deliveries.filter(d=>['failed','interrupted'].includes(d.status)).slice(-1).map(d=>`<div class="card approval">${escape(d.error || 'Envoi interrompu. Reprise explicite nécessaire ; message non rejoué.')}</div>`).join('')+
      `<form class="composer" data-form="duplica" data-project="${escape(projectId)}">${session?`<p class="muted">${escape(session.model)} · ${escape(session.effort)}</p>`:select('Modèle Codex du PC','model',models.map(m=>[m.model,m.displayName || m.model]),defaultModel?.model)+'<p class="muted">La nouvelle discussion utilise l’effort par défaut communiqué par le modèle choisi.</p>'}${area('Votre message à Duplica','text',drafts.get('duplica:'+projectId) || '','required maxlength="16000"')}<button type="submit" class="primary" data-mutation ${busy || !session&&!models.length?'disabled':''}>${busy?'Duplica répond…':'Envoyer à Duplica'}</button><p class="muted">Utilise le quota du compte Codex connecté sur le PC. Aucun message n’est rejoué après une interruption.</p></form>`;
  }
  function modal(title,body) {
    $('#dialog-title').textContent=title; $('#dialog-body').innerHTML=body;
    if (!$('#dialog').open) $('#dialog').showModal();
  }
  function modelFields(prefix='',runtime='codex',legend='') {
    const models=provider(runtime).models || [], model=models.find(m=>m.isDefault) || models[0];
    return `<fieldset class="model-config" data-prefix="${prefix}">${legend?`<legend>${legend}</legend>`:''}${select('Moteur',prefix+'runtime',[['codex','Codex · compte du PC'],['omp','Oh My Pi · connexions du PC']],runtime)}<div class="model-fields">${modelSelect(prefix,models,model)}</div></fieldset>`;
  }
  function modelSelect(prefix,models,model) {
    return select('Modèle',prefix+'model',models.length?models.map(m=>[m.model,m.displayName || m.model]):[['','Catalogue non découvert']],model?.model)+select('Effort',prefix+'effort',(model?.supportedReasoningEfforts || []).map(e=>[e.reasoningEffort,e.reasoningEffort]),model?.defaultReasoningEffort);
  }
  function updateModels(config,changeModel=false) {
    const prefix=config.dataset.prefix, form=config.closest('form'), runtime=form.elements[prefix+'runtime'].value, models=provider(runtime).models || [];
    const model=changeModel?models.find(m=>m.model===form.elements[prefix+'model'].value):(models.find(m=>m.isDefault) || models[0]);
    if (changeModel) {
      const effort=form.elements[prefix+'effort'];
      effort.innerHTML=(model?.supportedReasoningEfforts || []).map(e=>`<option value="${escape(e.reasoningEffort)}">${escape(e.reasoningEffort)}</option>`).join('');
      effort.value=model?.defaultReasoningEffort || effort.options[0]?.value || '';
    } else config.querySelector('.model-fields').innerHTML=modelSelect(prefix,models,model);
  }
  function workerForm(index) {
    return `<section class="worker" data-worker="${index}"><header><strong>Spécialiste</strong>${button('remove-worker','Retirer')}</header>${input('Nom','worker'+index+'_name','','required')}${input('Rôle','worker'+index+'_role','developer','required')}${modelFields('worker'+index+'_')}${select('Permissions','worker'+index+'_sandbox',[['read-only','Lecture seule'],['workspace-write','Écriture projet']],'read-only')}${area('Consignes','worker'+index+'_instructions')}</section>`;
  }
  function agentForm() {
    workerIndex=1;
    modal('Créer un agent',`<form data-form="agent" data-project="${escape(projectId)}">${select('Organisation','mode',[['classic','Un agent'],['orchestration','Équipe coordonnée']],'classic')}${input('Nom','name','','required maxlength="100" placeholder="Ex. Revue du projet"')}${modelFields()}${button('catalog','Actualiser les catalogues','','quiet')}<p class="form-note">Le catalogue vient du PC. Aucune liste de modèles n’est prédéfinie.</p><section id="team-fields" hidden>${modelFields('planner_','codex','Planification · lecture seule')}<div id="workers">${workerForm(0)}</div>${button('add-worker','＋ Ajouter un spécialiste')}<label class="check"><input type="checkbox" name="reviewer_enabled" checked>Ajouter une revue</label><section data-optional="reviewer">${modelFields('reviewer_','codex','Vérification · lecture seule')}</section><label class="check"><input type="checkbox" name="synthesizer_enabled" checked>Ajouter une synthèse</label><section data-optional="synthesizer">${modelFields('synthesizer_','codex','Synthèse · lecture seule')}</section>${input('Tâches maximum','maxTasks','3','type="number" min="1" max="20"')}${input('Délai par étape (secondes)','stepTimeout','600','type="number" min="60" max="1800"')}</section>${area('Mission initiale','mission','','maxlength="20000"')}${select('Permissions','sandbox',[['read-only','Lecture seule'],['workspace-write','Écriture dans le projet']],'read-only')}${select('Tâche associée','taskId',[['','Aucune'],...scoped('tasks').filter(t=>t.status==='todo').map(t=>[t.id,t.title])])}<label class="check"><input type="checkbox" name="memory" checked>Activer le noyau mémoire</label><label class="check"><input type="checkbox" name="startWork">Prendre les tâches À faire</label><p class="form-note">Diagnostic et plan en lecture seule, puis validation explicite avant implémentation. Permissions <strong>on-request</strong>. Une équipe lance la planification dès sa création ; un agent attend votre premier message, sauf si la file À faire est activée.</p><p class="form-note">Dossier du PC : ${escape(project()?.path)}. Les prompts et les tours des agents utilisent vos abonnements ou les connexions configurées sur ce PC.</p>${footer('Créer sur le PC')}</form>`);
    $('#team-fields').querySelectorAll('[required]').forEach(field=>field.disabled=true);
  }
  function taskForm(id='') {
    const task=scoped('tasks').find(t=>t.id===id) || {};
    modal(id?'Modifier la tâche':'Ajouter une tâche',`<form data-form="task" data-id="${escape(id)}" data-project="${escape(projectId)}">${input('Titre','title',task.title,'required maxlength="200"')}${area('Résultat attendu','description',task.description)}${select('État','status',Object.entries(labels).filter(([id])=>['todo','running','review','done'].includes(id)),task.status || 'todo')}${select('Priorité','priority',[['low','Basse'],['medium','Normale'],['high','Haute']],task.priority || 'medium')}${select('Agent affecté','assigneeId',[['','Sans affectation'],...sessions().filter(s=>!s.parentId&&s.executionMode!=='chat').map(s=>[s.id,s.name])],task.assigneeId)}<p class="form-note">L’affectation ne lance pas l’agent. Activez la file À faire à sa création ou sur le PC. « Terminé » reste votre validation explicite.</p>${footer('Enregistrer')}</form>`);
  }
  function memoryForm(id='') {
    const memory=state.memories.find(m=>m.id===id&&(m.projectId===projectId||m.scope==='user')) || {};
    modal(id?'Modifier un souvenir':'Ajouter un souvenir',`<form data-form="memory" data-id="${escape(id)}" data-project="${escape(projectId)}">${input('Titre','title',memory.title,'required')}${area('Souvenir','body',memory.body,'required')}${input('Source / preuve','source',memory.source,'required')}${select('Portée','scope',[['project','Ce projet'],['user','Utilisateur · tous les projets']],memory.scope || 'project')}${input('Tags séparés par une virgule','tags',(memory.tags || []).join(', '))}<label class="check"><input type="checkbox" name="core" ${memory.core?'checked':''}>Inclure dans le noyau</label>${footer('Conserver')}</form>`);
  }
  async function mutate(path,data,onSuccess) {
    if (pending) return;
    if (!online) throw new Error('Reconnectez le PC avant cette action.');
    pending=true;connection();
    try {
      const result=await api(path,data);
      if (onSuccess) onSuccess(result);
      await refresh(true);
      return result;
    } finally {pending=false;connection();}
  }
  function configData(form,prefix='') {
    const runtime=form.elements[prefix+'runtime'].value,model=form.elements[prefix+'model'].value,effort=form.elements[prefix+'effort'].value;
    const found=(provider(runtime).models || []).find(m=>m.model===model);
    if (!found || !(found.supportedReasoningEfforts || []).some(e=>e.reasoningEffort===effort)) throw new Error('Actualisez le catalogue puis choisissez un modèle et un effort disponibles.');
    return {runtime,model,effort};
  }
  const actions={
    dismiss:()=>$('#dialog').close(),
    project:el=>changeProject(el.dataset.id),
    'new-project':()=>modal('Ajouter un projet',`<form data-form="project">${input('Nom','name','','required')}${input('Chemin existant sur le PC','path','','required placeholder="/chemin/du/projet"')}<p class="form-note">Le répertoire doit déjà exister sur le PC sélectionné. Il définit le périmètre de l’explorateur et des agents.</p>${footer('Ajouter')}</form>`),
    session:el=>navigate('agents',el.dataset.id),
    'back-agents':()=>navigate('agents'),
    'new-agent':()=>{if(!projectId)throw new Error('Ajoutez un projet avant de créer un agent.');agentForm();},
    catalog:async()=>{await mutate('providers/refresh',{},()=>notice('Catalogues reçus du PC.'));$('#dialog').querySelectorAll('.model-config').forEach(c=>updateModels(c));},
    'add-worker':()=>{if($('#workers').children.length>=8)throw new Error('Une équipe accepte au maximum 8 spécialistes.');$('#workers').insertAdjacentHTML('beforeend',workerForm(workerIndex++));},
    'remove-worker':el=>{if($('#workers').children.length<=1)throw new Error('Conservez au moins un spécialiste.');el.closest('.worker').remove();},
    file:el=>loadFiles(el.dataset.path),
    'file-retry':()=>loadFiles(filePath),
    'new-task':()=>{if(!projectId)throw new Error('Ajoutez un projet avant une tâche.');taskForm();},
    task:el=>taskForm(el.dataset.id),
    'new-memory':()=>memoryForm(),memory:el=>memoryForm(el.dataset.id),
    more:el=>{subsection=el.dataset.subsection;render();window.scrollTo(0,0);},
    'back-more':()=>{subsection='';render();window.scrollTo(0,0);},
    approval:el=>mutate('approvals',{id:el.dataset.id,decision:el.dataset.decision}),
    plan:el=>mutate('sessions/plan',{id:el.dataset.id,accepted:el.dataset.accepted==='true',...(el.dataset.request?{requestId:el.dataset.request}:{})}),
    interrupt:el=>mutate('sessions/interrupt',{id:el.dataset.id},()=>notice('Demande d’interruption transmise au PC.')),
    resume:el=>mutate('sessions/resume',{id:el.dataset.id},()=>notice('Reprise demandée au PC.')),
    'workflow-plan':el=>mutate('workflows/plan',{id:el.dataset.id,accepted:el.dataset.accepted==='true'}),
    'workflow-stop':el=>mutate('cancel',{id:el.dataset.id,kind:'workflow'}),
    'channel-start':el=>mutate('channels/start',{id:el.dataset.id}),
    'channel-stop':el=>mutate('channels/stop',{id:el.dataset.id})
  };
  document.addEventListener('click',async event=>{
    const nav=event.target.closest('[data-nav]');if(nav){navigate(nav.dataset.nav);return;}
    const el=event.target.closest('[data-action]');if(!el || el.disabled)return;
    try {await actions[el.dataset.action]?.(el);}catch(error){notice(error.message,true);}
  });
  document.addEventListener('change',event=>{
    const el=event.target;
    if(el.id==='project-select'){changeProject(el.value);return;}
    const config=el.closest('.model-config');
    if(config && el.name===config.dataset.prefix+'runtime')updateModels(config);
    else if(config && el.name===config.dataset.prefix+'model')updateModels(config,true);
    if(el.name==='mode'){
      const team=el.value==='orchestration';$('#team-fields').hidden=!team;
      const mission=el.form.elements.mission;mission.required=team;
      $('#team-fields').querySelectorAll('[required]').forEach(field=>field.disabled=!team);
    }
    if(['reviewer_enabled','synthesizer_enabled'].includes(el.name))$(`[data-optional="${el.name.split('_')[0]}"]`).hidden=!el.checked;
  });
  document.addEventListener('input',event=>{
    if(event.target.name==='text' && event.target.closest('[data-form="prompt"], [data-form="duplica"]'))saveDraft();
    if(event.target.id==='memory-search'){
      const term=event.target.value.toLocaleLowerCase('fr');
      $('#memories').querySelectorAll('[data-search]').forEach(card=>card.hidden=!card.dataset.search.includes(term));
    }
  });
  document.addEventListener('submit',async event=>{
    const form=event.target;if(!form.dataset.form)return;event.preventDefault();
    const values=Object.fromEntries(new FormData(form)), kind=form.dataset.form, id=form.dataset.id, formProject=form.dataset.project || projectId;
    const submit=form.querySelector('button[type="submit"]');
    if(pending)return;
    submit.disabled=true;
    try {
      if(kind==='prompt'){
        const text=String(values.text || '').trim();if(!text)throw new Error('Écrivez un message.');
        await mutate('sessions/prompt',{id,text},()=>{drafts.delete(id);form.elements.text.value='';notice('Message envoyé au PC.');});
      } else if(kind==='agent'){
        const base={...configData(form),name:values.name,projectId:formProject,mission:values.mission,sandbox:values.sandbox,memory:!!values.memory,planMode:true,executionMode:'code',startWork:!!values.startWork,sendInitialMission:false,worktreeMode:'repository',...(values.taskId?{taskId:values.taskId}:{})};
        const team=values.mode==='orchestration';
        if(team){
          base.mode='orchestration';base.maxTasks=Number(values.maxTasks);base.stepTimeout=Number(values.stepTimeout);
          base.agents={planner:configData(form,'planner_'),reviewer:values.reviewer_enabled?configData(form,'reviewer_'):null,synthesizer:values.synthesizer_enabled?configData(form,'synthesizer_'):null,workers:[...$('#workers').children].map(worker=>{
            const prefix='worker'+worker.dataset.worker+'_',sandbox=values[prefix+'sandbox'];
            if(sandbox==='workspace-write'&&base.sandbox!=='workspace-write')throw new Error('Un spécialiste ne peut pas écrire si l’équipe est en lecture seule.');
            return {...configData(form,prefix),name:values[prefix+'name'],role:values[prefix+'role'],instructions:values[prefix+'instructions'],sandbox};
          })};
        }
        await mutate(team?'workflows':'sessions',base,result=>{$('#dialog').close();view='agents';detail=team?'':result.id;notice(team?'Équipe créée. La planification démarre sur le PC.':'Agent créé sur le PC.');});
      } else if(kind==='answers'){
        const request=state.approvals.find(a=>a.id===id);if(!request)throw new Error('Cette demande a expiré. Actualisez.');
        const answers=Object.fromEntries((request.params.questions || []).map(question=>[question.id,String(values[question.id] || '').trim()]));
        await mutate('approvals',{id,answers});
      } else if(kind==='channel-message')await mutate('channels/messages',{id,text:values.text},()=>form.elements.text.value='');
      else if(kind==='duplica')await mutate('duplica/discussion',{projectId:formProject,text:values.text,...(values.model?{model:values.model}:{})},()=>{drafts.delete('duplica:'+formProject);form.elements.text.value='';notice('Message transmis à Duplica sur le PC.');});
      else if(['task','memory','project'].includes(kind)){
        const value={...values,...(id?{id}:{}),projectId:formProject};
        if(kind==='memory'){value.core=!!values.core;value.tags=String(values.tags || '').split(',').map(tag=>tag.trim()).filter(Boolean);}
        await mutate('save',{kind,value},result=>{$('#dialog').close();if(kind==='project')projectId=result.id;notice('Enregistré sur le PC.');});
      }
    } catch(error){
      const target=form.querySelector('.form-error');if(target)target.textContent=error.message;
      notice(error.message,true);
    } finally {if(submit.isConnected)submit.disabled=false;connection();}
  });
  $('#refresh').addEventListener('click',()=>refresh(true));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  $('#dialog').addEventListener('click',event=>{if(event.target===$('#dialog'))$('#dialog').close();});
  $('#pc-name').textContent=pcName.startsWith('__ATELIER_')?'PC Atelier':pcName;
  // Profiles, pairing keys and update installation are managed by the native Android shell.
  // Mutations are never retried. Only read-only state polling resumes in the foreground.
  refresh(); setInterval(()=>{if(!document.hidden&&!pending)refresh();},4000);
})();
