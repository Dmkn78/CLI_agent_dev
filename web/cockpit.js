function cockpitView() {
  const list = objects('sessions');
  const active = list.filter(s => ['running','waiting','initializing'].includes(s.status));
  const measured = list.filter(s => s.usage?.total?.totalTokens != null);
  const tokens = measured.reduce((sum, s) => sum + s.usage.total.totalTokens, 0);
  return `${heading('ESPACE DE TRAVAIL', 'Atelier', esc(project().name), `<div class="heading-actions">${btn('terminal','Terminal','terminal')}${btn('new-chat','Chat','agents')}${btn('new-agent','Nouvel agent','plus','primary')}</div>`)}
    <div class="cockpit-summary"><span>${icon('agents')}<strong>${list.length}</strong> sessions</span><span><i class="status-dot"></i><strong>${active.length}</strong> en activité</span><span>${icon('tasks')}<strong>${objects('tasks').filter(t => t.status !== 'done').length}</strong> tâches ouvertes</span><span>${icon('usage')}<strong>${measured.length ? compact(tokens) : '—'}</strong> tokens observés</span></div>
    ${workspaceGraph()}
    <div class="cockpit-bottom"><section class="work-band"><div class="panel-heading"><h3>${icon('audit')} Activité du projet</h3>${btn('navigate','Journal','arrow','quiet','data-view="audit"')}</div>${activityList(state.events.filter(e => e.projectId === projectId).slice(0,6))}</section><section class="work-band"><div class="panel-heading"><h3>${icon('tasks')} Tâches</h3>${btn('new-task','Ajouter','plus','quiet')}</div>${objects('tasks').slice(0,5).map(t => `<button class="cockpit-task" data-action="edit-task" data-id="${esc(t.id)}"><strong>${esc(t.title)}</strong>${badge(t.status)}</button>`).join('') || '<p class="muted panel-description">Aucune tâche enregistrée.</p>'}</section></div>`;
}

function graphNode(id, title, subtitle, status, x, y, kind = 'agents', tone = 'cyan') {
  return `<button class="graph-node ${tone} ${selectedGraphNode === id ? 'selected' : ''}" style="left:${x}%;top:${y}px" data-action="select-graph-node" data-id="${esc(id)}"><span class="graph-node-icon">${icon(kind)}</span><span class="graph-node-copy"><strong title="${esc(title)}">${esc(title)}</strong><small title="${esc(subtitle)}">${esc(subtitle)}</small>${status ? badge(status) : `<span class="graph-planned">${['project','artifacts'].includes(id) ? 'Ressource du projet' : 'Configuré · non lancé'}</span>`}</span></button>`;
}
function graphEdge(x1, y1, x2, y2, type = '') {
  const middle = (x1 + x2) / 2;
  return `<path class="graph-edge ${type}" d="M${x1},${y1} C${middle},${y1} ${middle},${y2} ${x2},${y2}" marker-end="url(#graph-arrow)"/>`;
}
function workspaceGraph() {
  const workflows = objects('workflows');
  const workflow = graphWorkflowId === 'sessions' ? null : workflows.find(w => w.id === graphWorkflowId) || workflows.at(-1);
  const independent = objects('sessions').filter(s => !s.parentId);
  const graphHeight = Math.max(560,(workflow?.agents?.workers?.length || 0)*165+65);
  let nodes = graphNode('project', project().name, project().path, '', 2.5, 235, 'folder', 'neutral');
  let edges = '';
  if (workflow) {
    nodes += graphNode(workflow.id, workflow.title, workflow.agents?.planner?.model || workflow.model, workflow.status, 27, 235, 'network', 'cyan');
    edges += graphEdge(205, 282, 270, 282);
    const workerConfigs = workflow.agents?.workers || [{model: workflow.model}];
    workerConfigs.forEach((config, index) => {
      const implementationSteps = workflow.steps.filter(s => s.role === 'Implémentation');
      const step = implementationSteps.filter((s,i) => (s.workerIndex ?? i) % workerConfigs.length === index).at(-1);
      const session = state.sessions.find(s => s.id === step?.sessionId);
      const y = 65 + index * 165;
      nodes += graphNode(session?.id || 'worker:' + index, config.name || 'Spécialiste ' + (index + 1), session?.model || config.model, session?.status, 53, y, 'code', index === 1 ? 'purple' : 'green');
      edges += graphEdge(450,282,530,y + 47, session?.status === 'running' ? 'active' : '');
      if (workflow.agents?.reviewer !== null) edges += graphEdge(710,y + 47,780,202,'handoff');
    });
    ['Vérification','Synthèse'].forEach((role, index) => {
      const step = workflow.steps.find(s => s.role === role);
      const session = state.sessions.find(s => s.id === step?.sessionId);
      const config = workflow.agents?.[index ? 'synthesizer' : 'reviewer'];
      if (config === null || (index && workflow.mode !== 'orchestration')) return;
      nodes += graphNode(session?.id || 'role:' + role, role, session?.model || config?.model || workflow.model, session?.status, 78, index ? 320 : 155, index ? 'audit' : 'shield', index ? 'pink' : 'amber');
    });
    if (workflow.agents?.reviewer !== null && workflow.agents?.synthesizer !== null && workflow.mode === 'orchestration') edges += graphEdge(870,250,870,320,'handoff');
  } else if (independent.length) {
    graphPage = Math.min(graphPage, Math.max(0,Math.ceil(independent.length/6)-1));
    independent.slice(graphPage*6,graphPage*6+6).forEach((session, index) => {
      const x = index < 3 ? 32 : 69;
      const y = 55 + (index % 3) * 165;
      nodes += graphNode(session.id, session.name, session.model, session.status, x, y, 'agents', ['green','purple','amber'][index % 3]);
      edges += graphEdge(205,282,x * 10,y + 47, session.status === 'running' ? 'active' : '');
    });
  } else {
    nodes += `<button class="graph-add" data-action="new-agent" style="left:43%;top:218px">${icon('plus')}<strong>Nouvel agent</strong></button>`;
    edges += graphEdge(205,282,430,265);
  }
  const artifacts = objects('sessions').filter(s => s.handoff || s.report);
  nodes += graphNode('artifacts', 'Sorties & preuves', artifacts.length + ' sessions avec artefacts', '', 2.5, 410, 'audit', 'neutral');
  const graphSelect = workflows.length ? `<label class="graph-filter">Vue<select id="graph-workflow"><option value="sessions" ${!workflow ? 'selected' : ''}>Sessions indépendantes</option>${workflows.map(w => `<option value="${esc(w.id)}" ${w.id === workflow?.id ? 'selected' : ''}>${esc(w.title)}</option>`).join('')}</select></label>` : '';
  const pages = !workflow && independent.length > 6 ? `<div class="graph-pagination">${btn('graph-page','Précédent','chevron','quiet','data-direction="-1"')}<span>${graphPage+1} / ${Math.ceil(independent.length/6)}</span>${btn('graph-page','Suivant','arrow','quiet','data-direction="1"')}</div>` : '';
  return `<section class="graph-workspace"><div class="graph-heading"><div><h2>${icon('network')} Architecture des agents</h2><span class="muted small">${esc(project().name)} · ${workflow ? 'Orchestration séquentielle' : independent.length + ' sessions indépendantes'}</span></div>${graphSelect}</div><div class="graph-layout"><div class="graph-scroll" data-scroll="agent-graph"><div class="graph-canvas" style="height:${graphHeight}px"><svg class="graph-links" viewBox="0 0 1000 ${graphHeight}" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="graph-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>${edges}</svg>${nodes}<div class="graph-legend"><span><i class="green"></i> Activité</span><span><i class="amber"></i> Revue</span><span><i class="purple"></i> Spécialiste</span></div></div>${pages}</div><aside class="graph-inspector">${graphDetails(workflow, artifacts)}</aside></div></section>`;
}
function graphDetails(workflow, artifacts) {
  if (workflow && (selectedGraphNode?.startsWith('worker:') || selectedGraphNode?.startsWith('role:'))) {
    const index = Number(selectedGraphNode.split(':')[1]);
    const worker = selectedGraphNode.startsWith('worker:');
    const title = worker ? 'Spécialiste ' + (index+1) : selectedGraphNode.slice(5);
    const configured = worker ? workflow.agents?.workers?.[index] : workflow.agents?.[title === 'Vérification' ? 'reviewer' : 'synthesizer'];
    return `<div class="panel-heading"><h3>${esc(title)}</h3></div><div class="inspector-body"><span class="graph-planned">Configuré · non lancé</span><dl><dt>Moteur</dt><dd>${esc(configured?.runtime || 'codex')}</dd><dt>Modèle</dt><dd>${esc(configured?.model || workflow.model)}</dd><dt>Raisonnement</dt><dd>${esc(configured?.effort || workflow.effort)}</dd><dt>Permissions</dt><dd>${configured?.sandbox === 'workspace-write' ? 'Écriture projet' : 'Lecture seule'}</dd></dl></div>`;
  }
  if (selectedGraphNode === 'project') workflow = null;
  const session = state.sessions.find(s => s.id === selectedGraphNode && s.projectId === projectId);
  if (session) {
    const events = state.events.filter(e => e.sessionId === session.id).slice(0,4);
    return `<div class="panel-heading"><h3>Détail de l'agent</h3>${icon('agents')}</div><div class="inspector-body"><h3>${esc(session.name)}</h3>${badge(session.status)}<dl><dt>Fournisseur</dt><dd>${esc(session.provider)}</dd><dt>Modèle</dt><dd>${esc(session.model)}</dd><dt>Raisonnement</dt><dd>${esc(session.effort)}</dd><dt>Permissions</dt><dd>${session.sandbox === 'workspace-write' ? 'Écriture projet · approbation' : 'Lecture seule'}</dd><dt>Tokens</dt><dd>${compact(session.usage?.total?.totalTokens)}</dd><dt>Tâche</dt><dd>${esc(state.tasks.find(t => t.id === session.taskId)?.title || 'Sans tâche')}</dd></dl><p>${esc(session.mission || '')}</p>${btn('open-agent','Ouvrir la session','terminal','secondary full',`data-id="${esc(session.id)}"`)}${session.report ? btn('report','Rapport','audit','quiet',`data-id="${esc(session.id)}"`) : ''}<h4>Derniers événements</h4>${activityList(events)}</div>`;
  }
  if (selectedGraphNode === 'artifacts') return `<div class="panel-heading"><h3>Sorties & preuves</h3></div><div class="inspector-body">${artifacts.map(s => `<button class="report-item" data-action="open-agent" data-id="${esc(s.id)}">${icon('audit')}<strong>${esc(s.name)}</strong></button>`).join('') || '<p class="muted">Aucun artefact conservé.</p>'}</div>`;
  return `<div class="panel-heading"><h3>${workflow ? 'Orchestrateur' : 'Projet'}</h3>${icon(workflow ? 'network' : 'folder')}</div><div class="inspector-body"><h3>${esc(workflow?.title || project().name)}</h3>${workflow ? badge(workflow.status) : ''}<dl><dt>Dossier</dt><dd>${esc(workflow?.workingPath || project().path)}</dd><dt>Sessions</dt><dd>${objects('sessions').length}</dd>${workflow ? `<dt>Modèle du plan</dt><dd>${esc(workflow.agents?.planner?.model || workflow.model)}</dd><dt>Étapes</dt><dd>${workflow.steps.filter(s => s.status === 'completed').length} terminées / ${workflow.steps.length} lancées</dd><dt>Validation</dt><dd>${esc(workflow.validation || 'UNVERIFIED')}</dd>` : ''}</dl>${workflow?.mission ? `<p>${esc(workflow.mission)}</p>` : ''}${workflow?.error ? `<div class="inline-error">${esc(workflow.error)}</div>` : ''}${workflow && ['queued','running'].includes(workflow.status) ? btn('cancel','Arrêter','pause','secondary full',`data-kind="workflow" data-id="${esc(workflow.id)}"`) : btn('new-workflow','Nouvelle équipe','network','secondary full')}</div>`;
}

function consumptionRecords() {
  const requests = objects('requests');
  const records = [...requests];
  for (const session of objects('sessions').filter(s => s.usage?.total)) {
    const assigned = requests.filter(r => r.sessionId === session.id);
    const remaining = {};
    for (const [key, total] of Object.entries(session.usage.total)) {
      if (typeof total !== 'number') continue;
      const counted = assigned.reduce((sum,r) => sum + (r.usage?.[key] || 0),0);
      if (total >= counted) remaining[key] = total - counted;
    }
    if (!assigned.length || Object.values(remaining).some(v => v > 0)) records.push({id: 'legacy:' + session.id, sessionId:session.id, provider:session.provider || 'codex', runtime:session.runtime || 'codex', consumer:session.consumer || 'session', taskId:session.taskId, model:session.model, usage:remaining, status:session.status, createdAt:session.lastCompletedAt || session.createdAt, title:'Mesures de session antérieures au suivi par requête', legacy:true});
  }
  return records.filter(r => !usageProvider || r.provider === usageProvider);
}
function sumObserved(records, key) {
  const observed = records.filter(r => typeof r.usage?.[key] === 'number');
  return observed.length ? observed.reduce((sum,r) => sum + r.usage[key],0) : null;
}
function csvCell(value) {
  let text = String(value ?? '');
  if (/^\s*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"','""') + '"';
}
function consumptionProviders() {
  return [...new Set(['codex',...(provider('omp').models || []).map(model => model.provider),
    ...objects('requests').map(request => request.provider),...objects('sessions').map(session => session.provider)].filter(Boolean))];
}
function consumptionView() {
  const records = consumptionRecords();
  const providers = consumptionProviders();
  const groups = new Map();
  if (usageGrouping === 'provider') providers.filter(id => !usageProvider || usageProvider === id).forEach(id => groups.set(id,{title:id === 'codex' ? 'Codex · OpenAI' : id,records:[]}));
  for (const record of records) {
    const session = state.sessions.find(s => s.id === record.sessionId);
    let key = record.provider, title = key;
    if (usageGrouping === 'consumer') { key = record.sessionId; title = session?.name || key; }
    if (usageGrouping === 'task') { key = record.taskId || 'unassigned'; title = state.tasks.find(t => t.id === record.taskId)?.title || 'Sans tâche associée'; }
    if (usageGrouping === 'model') { key = record.provider + '/' + record.model; title = record.model; }
    if (usageGrouping === 'request') { key = record.id; title = record.title; }
    if (!groups.has(key)) groups.set(key,{title,records:[]});
    groups.get(key).records.push(record);
  }
  const daily = new Map();
  for (const record of records) {
    if (record.usage?.totalTokens == null) continue;
    const date = (record.completedAt || record.createdAt).slice(0,10);
    daily.set(date,(daily.get(date)||0) + record.usage.totalTokens);
  }
  const days = [...daily.keys()].sort().slice(-7);
  const maximum = Math.max(1,...daily.values());
  return `${heading('CONSOMMATION', 'Tokens & requêtes', 'Mesures reçues du fournisseur', btn('export-usage','Exporter CSV','download'))}<div class="stat-grid usage-stats">${[['Entrée','inputTokens'],['Sortie','outputTokens'],['Cache lu','cachedInputTokens'],['Total','totalTokens']].map(([label,key]) => `<article class="stat-card"><span>${label}${icon('usage')}</span><div>${compact(sumObserved(records,key))}<small>tokens</small></div><p>${records.filter(r => r.usage?.[key] != null).length} mesures disponibles</p></article>`).join('')}</div><div class="consumption-trend"><div class="panel-heading"><h3>Tokens par jour</h3><span class="muted small">UTC · REQUÊTES OBSERVÉES</span></div><div class="token-bars">${days.map(day => `<div class="token-day"><strong>${compact(daily.get(day))}</strong><div><i style="height:${Math.max(2,daily.get(day)/maximum*100)}%"></i></div><small>${day.slice(5)}</small></div>`).join('') || '<p class="muted">Aucune mesure reçue.</p>'}</div></div><div class="view-toolbar"><div class="segmented usage-tabs">${[['provider','Fournisseur'],['consumer','Consommateur'],['task','Tâche'],['model','Modèle'],['request','Requête']].map(([key,label]) => `<button data-action="usage-group" data-group="${key}" class="${usageGrouping === key ? 'selected' : ''}">${label}</button>`).join('')}</div><label>Fournisseur<select id="usage-provider"><option value="">Tous</option>${providers.map(p => `<option value="${esc(p)}" ${usageProvider === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select></label></div><div class="metrics-table"><table><thead><tr><th>${{provider:'Fournisseur',consumer:'Consommateur',task:'Tâche',model:'Modèle',request:'Requête'}[usageGrouping]}</th><th>Mesures</th><th>Entrée</th><th>Sortie</th><th>Cache lu</th><th>Total</th><th>Coût facturé</th></tr></thead><tbody>${[...groups.values()].map(group => `<tr><td><strong>${esc(group.title)}</strong><small>${esc([...new Set(group.records.map(r => r.provider))].join(' · '))}</small>${usageGrouping === 'request' ? `<small>${esc(group.records[0].id)} · ${esc(group.records[0].status)}</small>` : ''}</td><td>${group.records.filter(r => r.usage).length} / ${group.records.length}</td>${['inputTokens','outputTokens','cachedInputTokens','totalTokens'].map(key => `<td>${compact(sumObserved(group.records,key))}</td>`).join('')}<td>—</td></tr>`).join('')}</tbody></table>${!groups.size ? '<p class="panel-description muted">Aucune requête enregistrée pour ce filtre.</p>' : ''}</div><div class="consumption-notes"><span>${icon('shield')} Facturation réelle et équivalent API non importés.</span><span>${records.filter(r => r.legacy).length} mesures de session non attribuables à une requête.</span><span>${records.filter(r => !r.usage).length} requêtes sans mesure reçue.</span></div>`;
}

function connectionsView() {
  const codex = provider(), omp = provider('omp');
  const logins = omp.loginProviders || [];
  const priority = ['openai-codex','anthropic','alibaba-coding-plan','alibaba-token-plan','qwen-portal','deepseek','zai','opencode-zen','opencode-go'];
  const sorted = [...logins].sort((a,b) => (priority.includes(a.id) ? priority.indexOf(a.id) : 100) - (priority.includes(b.id) ? priority.indexOf(b.id) : 100));
  const models = [...(codex.models || []).map(m => ({...m,runtime:'Codex',provider:'OpenAI'})), ...(omp.models || []).map(m => ({...m,runtime:'OMP'}))];
  return `${heading('CONNEXIONS','Comptes & fournisseurs','Authentification native des outils locaux',btn('refresh-provider','Actualiser','plug','primary'))}<div class="connection-engines"><section class="work-band"><div class="panel-heading"><h3>${icon('plug')} Codex · ChatGPT</h3>${badge(codex.connected ? 'ready' : 'stopped')}</div><dl class="engine-details"><dt>Installation</dt><dd>${codex.installed ? 'Détectée' : 'Absente'}</dd><dt>Authentification</dt><dd>${esc(codex.authType || 'Non vérifiée')}</dd><dt>Abonnement</dt><dd>${esc(codex.plan || 'Non communiqué')}</dd><dt>Catalogue</dt><dd>${codex.models?.length || 0} modèles</dd></dl>${codex.error ? `<p class="inline-error">${esc(codex.error)}</p>` : ''}${btn(codex.connected ? 'refresh-provider' : 'login',codex.connected ? 'Actualiser Codex' : 'Se connecter avec ChatGPT','external')}</section><section class="work-band"><div class="panel-heading"><h3>${icon('terminal')} Oh My Pi</h3><span class="micro-pill">${omp.installed ? 'INSTALLÉ' : 'ABSENT'}</span></div><dl class="engine-details"><dt>Modèles disponibles</dt><dd>${omp.models?.length || 0}</dd><dt>Fournisseurs du catalogue</dt><dd>${[...new Set((omp.models || []).map(m => m.provider))].length}</dd><dt>Sessions Atelier</dt><dd>Lecture / écriture approuvée · sans shell</dd><dt>Terminal externe</dt><dd>Lecture seule · suivi non importé</dd></dl>${omp.error ? `<p class="inline-error">${esc(omp.error)}</p>` : ''}${btn('terminal-omp','Préparer un terminal','terminal')}</section></div><div class="panel-heading"><h3>Connexions OMP</h3><span class="muted small">COFFRE NATIF · COMPTE OU CLÉ API</span></div><div class="metrics-table"><table><thead><tr><th>Fournisseur</th><th>Identifiant</th><th>Connexion locale</th><th></th></tr></thead><tbody>${sorted.map(login => `<tr><td><strong>${esc(login.name)}</strong></td><td>${esc(login.id)}</td><td>${login.authenticated ? badge('ready') : '<span class="muted">Non connecté</span>'}</td><td>${btn('omp-connect',login.authenticated ? 'Gérer' : 'Connecter','external','quiet',`data-id="${esc(login.id)}" data-name="${esc(login.name)}"`)}</td></tr>`).join('')}</tbody></table>${!sorted.length ? '<p class="muted panel-description">Actualisez les connexions pour découvrir les fournisseurs proposés par OMP.</p>' : ''}</div><div class="panel-heading"><h3>Modèles disponibles</h3><span class="muted small">ACCÈS EFFECTIF VÉRIFIÉ À LA REQUÊTE</span></div><div class="metrics-table"><table><thead><tr><th>Modèle</th><th>Moteur</th><th>Fournisseur</th><th>Raisonnement</th></tr></thead><tbody>${models.map(m => `<tr><td><strong>${esc(m.displayName)}</strong><small>${esc(m.model)}</small></td><td>${esc(m.runtime)}</td><td>${esc(m.provider)}</td><td>${esc((m.supportedReasoningEfforts || []).map(e => e.reasoningEffort).join(' · '))}</td></tr>`).join('')}</tbody></table></div>${accountLimitsView(codex)}<p class="muted small connection-footer">Les secrets restent dans les outils natifs. Une connexion OMP est indépendante de celle de Codex.</p>`;
}
function accountLimitsView(codex) {
  return quotaWorkbenchView();
}
