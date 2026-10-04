"use strict";
const $ = (s) => document.querySelector(s);
let renderedProjectId = null;
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const paths = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  agents:
    "M8 16h8 M9 3h6 M12 3v4 M5 7h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2 M7 11h1 M16 11h1",
  tasks: "M9 5h12 M9 12h12 M9 19h12 M3 5l1 1 2-2 M3 12l1 1 2-2 M3 19l1 1 2-2",
  sprint: "M13 2 4 14h7l-1 8 10-12h-7z",
  memory:
    "M12 18v-6 M8 4a4 4 0 0 0-4 4 4 4 0 0 0 0 8 4 4 0 0 0 8 2V6a3 3 0 0 0-4-2 M16 4a4 4 0 0 1 4 4 4 4 0 0 1 0 8 4 4 0 0 1-8 2 M5 9h3 M16 9h3 M6 15h2 M16 15h2",
  usage: "M4 19V5 M4 19h17 M8 15l4-5 4 2 5-8",
  bench: "M9 3h6 M10 3v7l-6 9a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2l-6-9V3 M8 15h8",
  folder: "M3 7V5h6l2 2h10v13H3z",
  audit: "M8 3h8l4 4v14H4V3z M8 11h8 M8 15h6 M16 3v5h4",
  plug: "M8 3v5 M16 3v5 M6 8h12v5a6 6 0 0 1-12 0z M12 19v3",
  plus: "M12 5v14 M5 12h14",
  arrow: "M5 12h14 M14 7l5 5-5 5",
  external: "M14 3h7v7 M21 3l-9 9 M10 3H3v18h18v-7",
  terminal: "M4 6l6 6-6 6 M13 18h7",
  'split-horizontal': "M3 4h18v16H3z M12 4v16",
  'split-vertical': "M3 4h18v16H3z M3 12h18",
  chevron: "M9 5l7 7-7 7",
  check: "M5 12l4 4L19 6",
  close: "M6 6l12 12 M6 18 18 6",
  shield: "M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6",
  clock: "M12 8v4l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  network:
    "M12 3v6 M5 14v-4h14v4 M3 15h4v6H3z M10 15h4v6h-4z M17 15h4v6h-4z M9 2h6v5H9z",
  search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  play: "M8 4l13 8-13 8z",
  pause: "M8 5v14 M16 5v14",
  download: "M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5",
  attachment: "M8 12l6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l9-9 M6 14l8-8",
  trash: "M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7",
  code: "M8 6l-6 6 6 6 M16 6l6 6-6 6 M14 3l-4 18",
  git: "M6 3v12 M18 6v6c0 4-12 2-12 6 M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M9 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M21 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  settings: "M4 7h16 M4 17h16 M8 4v6 M16 14v6",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
  spark: "M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z",
  home: "M3 10l9-7 9 7v11h-6v-7H9v7H3z",
};
const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.grid}"/></svg>`;
const nav = [
  ["overview", "Vue d’ensemble", "grid"],
  ["duplica", "Duplica Agent", "spark"],
  ["channels", "Canaux d’agents", "network"],
  ["terminal", "Code", "terminal"],
  ["agents", "Sessions", "agents"],
  ["dashboard", "Dashboard des agents", "grid"],
  ["webchat", "ChatGPT", "agents"],
  ["design", "Architecture", "network"],
  ["tasks", "Tableau des tâches", "tasks"],
  ["sprints", "Sprints", "sprint"],
  ["memory", "Mémoire", "memory"],
  ["brain", "My Brain", "memory"],
  ["usage", "Consommation", "usage"],
  ["benchmarks", "Benchmarks", "bench"],
  ["files", "Explorateur", "folder"],
  ["audit", "Journal & audit", "audit"],
  ["settings", "Connexions", "plug"],
];
let state = {
  projects: [],
  sessions: [],
  tasks: [],
  memories: [],
  sprints: [],
  benchmarks: [],
  workflows: [],
  requests: [],
  providers: [],
  events: [],
  approvals: [],
  discussions: {channels: [], participants: [], messages: [], rounds: []},
  apiConnections: [],
};
let view = "overview",
  projectId = localStorage.getItem("atelier-project") || "atelier",
  agentLayout = "terminals",
  memoryScope = "project",
  memoryFilter = "tous",
  memoryQuery = "",
  selectedMemory = null,
  selectedAgents = [],
  fileData = null,
  filePath = "",
  fileContent = null,
  filesTab = "files",
  gitData = null,
  prData = null,
  selectedBench = null,
  auditQuery = "",
  lastStateHash = "",
  loading = false;
let selectedGraphNode = null, graphWorkflowId = '', graphPage = 0, usageGrouping = 'provider', usageProvider = '', terminalSettings = null;
let selectedChatId = null;
let taskSprintFilter = '', localSessionRefresh = null;
const chatFileCharacters = {};
const project = () =>
  state.projects.find((p) => p.id === projectId) ||
  state.projects[0] || { id: "atelier", name: "Atelier", path: "" };
const provider = (id = 'codex') => state.providers.find((p) => p.id === id) || {};
const objects = (key) =>
  (state[key] || []).filter((o) => o.projectId === project().id && (key !== 'sessions' || !o.removedAt));
const sessions = () => objects("sessions").filter((s) => !s.parentId);
const compact = (value) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("fr-FR", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(value);
const stamp = (value) =>
  value
    ? new Intl.DateTimeFormat("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "—";
const labels = {
  ready: "Prêt",
  running: "En cours",
  initializing: "Démarrage",
  waiting: "À valider",
  waiting_plan: "Plan à valider",
  stopped: "Arrêté",
  closed: "Clôturé",
  failed: "Erreur",
  queued: "En attente",
  completed: "Terminé",
  cancelled: "Annulé",
  interrupted: "Interrompu",
  todo: "À faire",
  review: "En revue",
  done: "Terminé",
};
const badge = (status) =>
  `<span class="badge ${esc(status)}"><i></i>${esc(labels[status] || status)}</span>`;
const btn = (action, label, ico, cls = "secondary", extra = "") =>
  `<button class="button ${cls}" data-action="${action}" ${extra}>${ico ? icon(ico) : ""}${label}</button>`;
const empty = (ico, title, text, action = "", label = "") =>
  `<div class="empty-state"><span class="empty-icon">${icon(ico)}</span><h3>${title}</h3><p>${text}</p>${action ? btn(action, label, "plus") : ""}</div>`;
const heading = (kicker, title, description, actions = "") =>
  `<div class="page-heading"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${description}</p></div><div class="heading-actions">${actions}</div></div>`;
async function api(path, data) {
  const send = () => fetch("/api/" + path, {
    method: data === undefined ? "GET" : "POST",
    headers: {
      "X-Atelier-Token": $('meta[name="atelier-token"]').content,
      "Content-Type": "application/json",
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  let response = await send();
  let result = await response.json();
  if (response.status === 403 && result.error === 'Session locale requise.') {
    // Nonce refusals precede execution. Never retry timeouts or uncertain actions.
    if (!localSessionRefresh) localSessionRefresh = renewLocalSession().finally(() => { localSessionRefresh = null; });
    await localSessionRefresh;
    response = await send();
    result = await response.json();
  }
  if (!response.ok)
    throw new Error(result.error || "Le service est indisponible.");
  return result;
}
async function renewLocalSession() {
  const response = await fetch('/', {cache:'no-store'});
  if (!response.ok) throw new Error('Reconnexion au service local impossible.');
  const document = new DOMParser().parseFromString(await response.text(), 'text/html');
  const nonce = document.querySelector('meta[name="atelier-token"]')?.content;
  if (!nonce) throw new Error('Session locale indisponible.');
  $('meta[name="atelier-token"]').content = nonce;
}
function toast(message, error = false) {
  if ([...$('#toasts').children].some(element => element.textContent === message)) return;
  const el = document.createElement("div");
  el.className = "toast " + (error ? "error" : "");
  el.textContent = message;
  $("#toasts").append(el);
  setTimeout(() => el.remove(), 6000);
}
function download(name, content, mime = "text/plain") {
  const a = document.createElement("a");
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function refresh(force = false) {
  if (loading) return;
  loading = true;
  try {
    const next = await api("state");
    state = next;
    if (!state.projects.some((p) => p.id === projectId))
      projectId = state.projects[0]?.id || "atelier";
    const hash = JSON.stringify(next);
    if (force || hash !== lastStateHash) {
      lastStateHash = hash;
      if (!force && ((view === 'design' && $('#design-canvas')) || $('#native-terminal') || view === 'dashboard')) {$('#notifications-button').innerHTML=notificationBell();renderDuplicaIndicator();updateNativeUsage();renderWorkspaceList();updateAgentDashboard();}
      else render();
    }
  } catch (e) {
    $("#footer-sessions").textContent = "Serveur déconnecté";
    if (force) toast(e.message, true);
  } finally {
    loading = false;
  }
}
function route(next) {
  closePopover();
  view = nav.some((n) => n[0] === next) ? next : "overview";
  history.replaceState(null, "", "#" + view);
  render();
  if (view === 'duplica') { $('#main').scrollTop=0; window.scrollTo(0,0); }
  if (view === "files") loadFiles(filePath);
}
function render() {
  captureDesign();
  $("#main-nav").innerHTML = nav
    .filter(([id]) => !['duplica','channels','terminal','webchat','agents'].includes(id))
    .map(
      ([id, label, ico]) =>
        `<button data-action="navigate" data-view="${id}" aria-label="${esc(label)}" title="${esc(label)}" class="nav-item ${view === id ? "active" : ""}">${icon(ico)}<span>${label}</span>${id === "agents" && sessions().length ? `<small>${sessions().length}</small>` : ""}${id === "audit" && state.approvals.length ? `<small class="notification">${state.approvals.length}</small>` : ""}</button>`,
    )
    .join("");
  $("#project-name").textContent = project().name;
  $("#breadcrumb-project").textContent = project().name;
  $("#breadcrumb-view").textContent = nav.find((n) => n[0] === view)?.[1];
  $('#notifications-button').innerHTML = notificationBell();
  renderDuplicaIndicator();
  renderWorkspaceList();
  renderShellModes();
  const active = objects("sessions").filter((s) =>
    ["running", "ready", "waiting", "initializing"].includes(s.status),
  ).length;
  $("#footer-sessions").textContent = active
    ? `${active} session${active > 1 ? "s" : ""} ouverte${active > 1 ? "s" : ""}`
    : "Aucune session active";
  const focused = document.activeElement;
  const id = focused?.id;
  const selection = focused?.selectionStart;
  const values = {};
  $("#main")
    .querySelectorAll("input,textarea,select")
    .forEach((el) => {
      if (renderedProjectId === projectId && el.id && el.type !== 'file' && !['design-page','design-title','design-explanation','design-node-label','browser-resource-text','browser-instructions','terminal-columns'].includes(el.id)) values[el.id] = el.value;
    });
  const scrolls = {};
  $("#main")
    .querySelectorAll("[data-scroll]")
    .forEach((el) => {
      scrolls[el.dataset.scroll] = {
        top: el.scrollTop,
        bottom: el.scrollHeight - el.clientHeight - el.scrollTop < 60,
      };
    });
  $("#main").className = "view-" + view;
  $("#main").innerHTML = {
    overview: cockpitView,
    duplica: duplicaView,
    channels: channelsView,
    terminal: terminalView,
    agents: agentsView,
    dashboard: dashboardView,
    webchat: webChatView,
    design: designView,
    tasks: tasksView,
    sprints: sprintsView,
    memory: memoryView,
    brain: brainView,
    usage: consumptionView,
    benchmarks: benchmarksView,
    files: filesView,
    audit: auditView,
    settings: () => updatesView() + connectionsView() + apiConnectionsView(),
  }[view]();
  $('#main').classList.toggle('terminal-workspace',Boolean($('#native-terminal')));
  renderedProjectId = projectId;
  mountWorkspaceTools();
  mountWorkbench();
  mountNativeTerminal();
  applyShellLayout();
  Object.entries(values).forEach(([key, val]) => {
    const el = document.getElementById(key);
    if (el && el.tagName !== "BUTTON") el.value = val;
  });
  mountDuplicaResources();
  mountGraphZoom();
  mountTelegram();
  mountBrain();
  $('#main').querySelectorAll('.prompt-form textarea').forEach(updateDraftEstimate);
  $("#main")
    .querySelectorAll("[data-scroll]")
    .forEach((el) => {
      const s = scrolls[el.dataset.scroll];
      el.scrollTop = ['dashboard','agent-graph'].includes(el.dataset.scroll) ? (s?.top || 0) : s ? (s.bottom ? el.scrollHeight : s.top) : el.scrollHeight;
    });
  if (id) {
    const el = document.getElementById(id);
    if (el) {
      el.focus({ preventScroll: true });
      if (selection != null && typeof el.setSelectionRange === "function")
        try {
          el.setSelectionRange(selection, selection);
        } catch (_) {}
    }
  }
}
