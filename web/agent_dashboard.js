"use strict";

const DASHBOARD_STATES = [
  ['waiting','À valider','À valider'], ['working','En cours','En cours'], ['done','Tours terminés','Tour terminé'],
  ['idle','Disponibles','Disponible'], ['unknown','État non communiqué','Non communiqué'], ['failed','Erreurs','Erreur'], ['stopped','Arrêtés','Arrêté'],
];
const CLI_LABELS = {codex:'Codex',claude:'Claude Code',opencode:'OpenCode',omp:'OMP'};
let dashboardFilter='all', dashboardQuery='', dashboardGrouping='status';
let dashboardScope='workspace', dashboardKind='all';
const foldedWorkspaces=new Set();

function dashboardSessionState(session) {
  if (['waiting','waiting_plan'].includes(session.status)) return 'waiting';
  if (session.status === 'running') return 'working';
  if (session.status === 'failed' || session.lastTurnStatus === 'failed') return 'failed';
  if (['stopped','interrupted','cancelled'].includes(session.status)) return 'stopped';
  if (session.lastTurnStatus === 'completed' || session.status === 'completed') return 'done';
  if (session.status === 'closed') return 'stopped';
  return 'idle';
}

function dashboardNativeState(session) {
  if (session.status === 'closed' || session.exited) return 'stopped';
  return {running:'working',completed:'done',interrupted:'stopped',failed:'failed'}[session.activityStatus] || 'unknown';
}

function dashboardAgents() {
  const projects=new Map(state.projects.map(workspace => [workspace.id,workspace]));
  const rows=(state.sessions || []).filter(session => !session.removedAt).map(session => {
    const parent=(state.workflows || []).find(workflow => workflow.id === session.parentId)
      || (state.benchmarks || []).find(benchmark => benchmark.id === session.parentId)
      || state.sessions.find(agent => agent.id === session.parentId);
    const task=(state.tasks || []).find(task => task.id === session.taskId);
    return {key:'session:'+session.id,id:session.id,type:'session',projectId:session.projectId,
      name:session.name,title:task?.title || session.mission || session.name,runtime:session.runtime || 'codex',
      model:session.model,status:dashboardSessionState(session),detail:labels[session.status] || session.status,
      isChild:Boolean(session.parentId),parentName:parent?.title || parent?.name || (session.parentId ? 'Équipe' : ''),
      startedAt:session.turnStartedAt,completedAt:session.lastCompletedAt,duration:session.lastTurnDurationMs,
      usage:session.usage,source:session};
  });
  const terminals=new Map((state.nativeSessions || []).map(terminal => [terminal.id,{...terminal}]));
  for (const terminal of nativeTerminals.values()) {
    terminals.set(terminal.id,{...terminals.get(terminal.id),...terminal,
      status:terminal.exited ? 'closed' : 'open',workingPath:terminal.cwd});
  }
  for (const terminal of terminals.values()) rows.push({key:'native:'+terminal.id,id:terminal.id,type:'native',
    projectId:terminal.projectId,name:terminal.title || CLI_LABELS[terminal.runtime] || 'Terminal',
    title:terminal.title || CLI_LABELS[terminal.runtime] || 'Terminal',runtime:terminal.runtime,model:terminal.model,
    status:dashboardNativeState(terminal),detail:terminal.exited || terminal.status === 'closed' ? 'Terminal arrêté' : 'Terminal ouvert',
    isChild:false,parentName:'',startedAt:terminal.turnStartedAt,completedAt:terminal.lastCompletedAt,
    duration:terminal.lastTurnDurationMs,usage:terminal.usage,source:terminal});
  for (const child of state.nativeSubagents || []) {
    const title=child.name || 'Sous-agent Codex · '+String(child.id).slice(0,8);
    rows.push({key:'subagent:'+child.id,id:child.id,type:'subagent',
    projectId:child.projectId,name:title,title,
    runtime:'codex',model:child.model,status:dashboardNativeState(child),detail:child.activityStatus || 'État non communiqué',
    isChild:true,parentName:terminals.get(child.terminalId)?.title || 'Codex',startedAt:child.turnStartedAt,
    completedAt:child.lastCompletedAt,duration:child.lastTurnDurationMs,usage:child.usage,source:child});
  }
  return rows.map(agent => ({...agent,workspace:projects.get(agent.projectId)?.name || 'Espace inconnu'}));
}

function dashboardRows() {
  return dashboardAgents().filter(agent => (dashboardScope === 'all' || agent.projectId === projectId)
    && (dashboardKind === 'all' || agent.isChild));
}

function dashboardCard(agent) {
  const status=agent.status === 'unknown' && !agent.isChild ? 'Ouvert' : ['initializing','queued'].includes(agent.source.status) ? agent.detail : DASHBOARD_STATES.find(([id]) => id === agent.status)?.[2] || agent.detail;
  const duration=agent.status === 'working' && agent.startedAt ? Date.now()-Date.parse(agent.startedAt) : agent.duration;
  const timing=Number.isFinite(duration) ? durationLabel(duration) : '';
  return `<button class="dashboard-agent" data-action="dashboard-open" data-key="${esc(agent.key)}" data-agent-kind="${agent.isChild ? 'child' : 'root'}" title="${esc(agent.title)}"><span class="dashboard-agent-symbol">${icon(agent.isChild ? 'network' : 'terminal')}</span><span class="dashboard-agent-copy"><strong>${esc(agent.title)}</strong><small>${esc(CLI_LABELS[agent.runtime] || agent.runtime || 'Agent')} · ${esc(agent.workspace)}${agent.isChild ? ' · Sous-agent de '+esc(agent.parentName) : ''}</small></span><span class="dashboard-state" data-status="${agent.status}" title="${agent.status === 'done' ? 'Tour terminé ; validation indépendante à consulter dans la session.' : agent.status === 'unknown' ? 'Activité native non communiquée' : esc(agent.detail)}"><i></i>${status}${timing ? '<small>'+timing+'</small>' : ''}</span></button>`;
}

function dashboardContent() {
  const rows=dashboardRows(), counts=Object.fromEntries(DASHBOARD_STATES.map(([status]) => [status,rows.filter(agent => agent.status === status).length]));
  const query=dashboardQuery.trim().toLocaleLowerCase('fr-FR');
  const visible=rows.filter(agent => (dashboardFilter === 'all' || agent.status === dashboardFilter)
    && (!query || [agent.title,agent.name,agent.workspace,agent.model,agent.parentName].join(' ').toLocaleLowerCase('fr-FR').includes(query)));
  const groups=dashboardGrouping === 'status' ? DASHBOARD_STATES.map(([id,title]) => ({id,title,agents:visible.filter(agent => agent.status === id)}))
    : state.projects.map(workspace => ({id:workspace.id,title:workspace.name,agents:visible.filter(agent => agent.projectId === workspace.id)}));
  const children=rows.filter(agent => agent.isChild).length;
  return `<div class="dashboard-summary"><strong>${rows.length}</strong><span>agent${rows.length > 1 ? 's' : ''}<small>${children} sous-agent${children > 1 ? 's' : ''} · ${counts.working} en cours · ${counts.waiting} à valider</small></span><div class="segmented dashboard-grouping">${[['status','État'],['project','Projet']].map(([id,label]) => `<button data-action="dashboard-group" data-group="${id}" class="${dashboardGrouping === id ? 'selected' : ''}">${label}</button>`).join('')}</div></div><div class="dashboard-progress" role="img" aria-label="${DASHBOARD_STATES.filter(([id]) => counts[id]).map(([id,label]) => label+' '+counts[id]).join(', ') || 'Aucun agent observé'}">${DASHBOARD_STATES.filter(([id]) => counts[id]).map(([id,label]) => `<span data-status="${id}" style="flex-grow:${counts[id]}" title="${label} : ${counts[id]}"></span>`).join('')}</div><div class="dashboard-filters">${[['all','Tous',rows.length],...DASHBOARD_STATES.filter(([id]) => counts[id]).map(([id,label]) => [id,label,counts[id]])].map(([id,label,count]) => `<button data-action="dashboard-filter" data-filter="${id}" aria-pressed="${dashboardFilter === id}" class="${dashboardFilter === id ? 'selected' : ''}">${label} <small>${count}</small></button>`).join('')}</div><div class="dashboard-search">${icon('search')}<input type="search" id="dashboard-search" value="${esc(dashboardQuery)}" placeholder="Rechercher un agent…" aria-label="Rechercher un agent">${select('Afficher','dashboardKind',[['all','Tous les agents'],['children','Sous-agents']],dashboardKind)}</div><div class="dashboard-groups" data-scroll="dashboard">${groups.filter(group => group.agents.length).map(group => `<section class="dashboard-group"><h3>${dashboardGrouping === 'status' ? `<i data-status="${group.id}"></i>` : icon('folder')}${esc(group.title)} <small>${group.agents.length}</small></h3><div class="dashboard-cards">${group.agents.map(dashboardCard).join('')}</div></section>`).join('') || `<div class="dashboard-empty">${icon('agents')}<strong>${rows.length ? 'Aucun agent ne correspond' : dashboardKind === 'children' ? 'Aucun sous-agent observé' : 'Aucun agent dans cet espace'}</strong><p>${rows.length ? 'Modifie la recherche ou le filtre.' : 'Les agents apparaissent ici au fil de leur travail.'}</p></div>`}</div>`;
}

function dashboardScopeSelector() {
  return select('Périmètre','dashboardScope',[['workspace','Cet espace'],['all','Tous les espaces']],dashboardScope);
}

function dashboardView() {
  return heading('SUPERVISION','Dashboard des agents','',dashboardScopeSelector()+btn('navigate','Ouvrir Code','terminal','secondary','data-view="terminal"'))
    + `<section class="agent-dashboard" aria-label="Dashboard des agents"><div data-dashboard-content>${dashboardContent()}</div></section>`;
}

function dashboardDock() {
  return `<aside class="agent-dashboard dashboard-dock" aria-label="Dashboard des agents"><header class="dashboard-dock-header"><strong>${icon('grid')} Dashboard</strong>${dashboardScopeSelector()}${btn('navigate','','external','icon-btn','data-view="dashboard" title="Ouvrir le dashboard" aria-label="Agrandir le dashboard"')}${btn('toggle-agent-dashboard','','close','icon-btn','title="Fermer le dashboard" aria-label="Fermer le dashboard"')}</header><div data-dashboard-content>${dashboardContent()}</div></aside>`;
}

function updateAgentDashboard() {
  const host=document.querySelector('[data-dashboard-content]');
  if (!host) return;
  const focused=document.activeElement, selection=focused?.selectionStart;
  const focusedName=focused?.name;
  const scroll=host.querySelector('.dashboard-groups')?.scrollTop || 0;
  host.innerHTML=dashboardContent();
  host.querySelector('.dashboard-groups').scrollTop=scroll;
  if (focused?.id === 'dashboard-search') {
    const input=host.querySelector('#dashboard-search');input.focus({preventScroll:true});
    if (selection != null) input.setSelectionRange(selection,selection);
  }
  if (focusedName === 'dashboardKind') host.querySelector('[name=dashboardKind]')?.focus({preventScroll:true});
}

function renderWorkspaceList() {
  const agents=dashboardAgents();
  $('#project-list').innerHTML=state.projects.map(workspace => {
    const workspaceAgents=agents.filter(agent => agent.projectId === workspace.id);
    const roots=agents.filter(agent => agent.projectId === workspace.id && !agent.isChild && agent.source.status !== 'closed');
    const running=agents.filter(agent => agent.projectId === workspace.id && agent.status === 'working').length;
    const folded=foldedWorkspaces.has(workspace.id);
    return `<section class="workspace-tree ${workspace.id === projectId ? 'selected' : ''}"><div class="workspace-tree-heading"><button class="workspace-disclosure" data-action="workspace-fold" data-id="${esc(workspace.id)}" aria-expanded="${!folded}" aria-label="${folded ? 'Déplier' : 'Replier'} ${esc(workspace.name)}">${icon('chevron')}</button><button class="project-item ${workspace.id === projectId ? 'selected' : ''}" data-action="project" data-id="${esc(workspace.id)}" title="${esc(workspace.path)}"><span>${esc(workspace.name)}</span><small title="${workspaceAgents.length} agents observés">${workspaceAgents.length}</small>${running ? `<i class="workspace-running" title="${running} en cours"></i>` : ''}</button></div>${folded ? '' : `<div class="workspace-agents">${roots.slice(0,8).map(agent => `<button class="workspace-agent" data-action="dashboard-open" data-key="${esc(agent.key)}" title="${esc(agent.name)}"><i data-status="${agent.status}"></i><span>${esc(agent.name)}</span></button>`).join('')}${roots.length > 8 ? `<button class="workspace-agent" data-action="workspace-dashboard" data-id="${esc(workspace.id)}">+ ${roots.length-8} autres</button>` : ''}</div>`}</section>`;
  }).join('');
}

function installDashboardActions() {
  actions['dashboard-filter']=element => {dashboardFilter=element.dataset.filter;updateAgentDashboard();};
  actions['dashboard-group']=element => {dashboardGrouping=element.dataset.group;updateAgentDashboard();};
  actions['workspace-fold']=element => {foldedWorkspaces.has(element.dataset.id) ? foldedWorkspaces.delete(element.dataset.id) : foldedWorkspaces.add(element.dataset.id);renderWorkspaceList();};
  actions['workspace-dashboard']=element => {actions.project(element);dashboardScope='workspace';route('dashboard');};
  actions['dashboard-open']=element => {
    const agent=dashboardAgents().find(agent => agent.key === element.dataset.key);
    if (!agent) return;
    if (agent.projectId !== projectId) actions.project({dataset:{id:agent.projectId}});
    if (agent.type === 'session') return actions['open-agent']({dataset:{id:agent.id}});
    const terminalId=agent.type === 'subagent' ? agent.source.terminalId : agent.id;
    if (nativeTerminals.has(terminalId)) {activeNativeTerminal=terminalId;zoomedNativeTerminal=terminalId;agentLayout='terminals';route('terminal');return;}
    modal(esc(agent.name),esc(agent.workspace),`<div class="modal-body"><p>${esc(agent.model || CLI_LABELS[agent.runtime] || 'Codex')}</p><p>${esc(agent.status === 'unknown' ? 'Activité native non communiquée' : DASHBOARD_STATES.find(([id]) => id === agent.status)?.[2])}</p>${agent.isChild ? '<p>Sous-agent de '+esc(agent.parentName)+'</p>' : ''}${sessionUsageSummary(agent.source,provider(agent.runtime))}<p class="muted small">${agent.type === 'subagent' ? 'Événements Codex observés ; le terminal parent est ouvert dans une autre fenêtre ou a été fermé.' : 'Ce terminal est ouvert dans une autre fenêtre ou a été fermé.'}</p></div>`);
  };
}

document.addEventListener('input',event => {if (event.target.id === 'dashboard-search') {dashboardQuery=event.target.value;updateAgentDashboard();}});
document.addEventListener('change',event => {
  if (event.target.name === 'dashboardScope') {dashboardScope=event.target.value;updateAgentDashboard();}
  if (event.target.name === 'dashboardKind') {dashboardKind=event.target.value;updateAgentDashboard();}
});
