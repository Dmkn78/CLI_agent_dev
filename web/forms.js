function modal(title, subtitle, body, wide = false) {
  $('#modal').classList.remove('command-palette');
  $("#modal-content").innerHTML =
    `<header class="modal-header"><div><span class="eyebrow">ATELIER</span><h2>${title}</h2><p>${subtitle}</p></div><button class="icon-btn" data-action="dismiss" aria-label="Fermer la fenêtre">${icon("close")}</button></header>${body}`;
  $("#modal").classList.toggle("wide", wide);
  if (!$("#modal").open) $("#modal").showModal();
}
const field = (label, name, value = "", type = "text", extra = "") =>
  `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
const area = (label, name, value = "", rows = 4, extra = "") =>
  `<label>${label}<textarea name="${name}" rows="${rows}" ${extra}>${esc(value)}</textarea></label>`;
const select = (label, name, options, value) =>
  `<label>${label}<select name="${name}">${options.map(([id, title]) => `<option value="${esc(id)}" ${id === value ? "selected" : ""}>${esc(title)}</option>`).join("")}</select></label>`;
const formFooter = (label = "Enregistrer", hint = "") =>
  `<footer class="modal-footer"><span>${hint}</span><button type="button" class="button secondary" data-action="dismiss">Annuler</button><button class="button primary" type="submit">${label}${icon("arrow")}</button></footer>`;
function modelFields(runtime = 'codex', prefix = '') {
  const models = provider(runtime).models || [];
  const m = models.find((m) => m.isDefault) || models[0];
  return `${select(
    "Modèle",
    prefix + "model",
    models.map((m) => [m.model, m.displayName + (m.hidden ? ' · catalogue étendu' : '')]),
    m?.model,
  )}${select(
    "Raisonnement",
    prefix + "effort",
    (m?.supportedReasoningEfforts || []).map((r) => [
      r.reasoningEffort,
      r.reasoningEffort,
    ]),
    m?.defaultReasoningEffort,
  )}`;
}
function runtimeFields(prefix = '', title = '') {
  return `<fieldset class="model-configuration" data-model-config="${prefix}">${title ? `<legend>${title}</legend>` : ''}${select('Moteur', prefix + 'runtime', [['codex', 'Codex · compte ChatGPT'], ['omp', 'Oh My Pi · fournisseurs connectés']], 'codex')}<div class="form-grid">${modelFields('codex', prefix)}</div></fieldset>`;
}
let nextWorkerIndex = 1;
function workerConfiguration(index) {
  const prefix = 'worker' + index + '_';
  return `<div class="worker-editor" data-worker-index="${index}"><div class="worker-editor-heading"><strong>Sous-agent</strong><button type="button" class="icon-btn" data-action="remove-worker" title="Supprimer ce sous-agent" aria-label="Supprimer ce sous-agent">${icon('close')}</button></div><div class="form-grid">${field('Nom',prefix+'name','Spécialiste '+(index+1),'text','required')}${field('Rôle',prefix+'role','developer','text','required')}</div>${runtimeFields(prefix)}${select('Permissions',prefix+'sandbox',[['read-only','Lecture seule'],['workspace-write','Écriture projet']],'read-only')}${area('Consignes spécifiques',prefix+'instructions','',2)}</div>`;
}
function workflowConfiguration(mode) {
  return `<section id="workflow-configuration" ${mode === 'classic' ? 'hidden' : ''}><span class="form-section-label">ÉQUIPE & ORCHESTRATEUR</span>${runtimeFields('planner_', 'Orchestrateur / planification')}<div id="worker-editors">${workerConfiguration(0)}</div><div class="worker-list-actions">${btn('add-worker','Ajouter un sous-agent','plus','secondary','type="button"')}<span id="worker-count">1 / 8</span></div><label class="check-option"><input type="checkbox" name="reviewer_enabled" checked><span>Inclure un vérificateur</span></label><div data-optional-role="reviewer">${runtimeFields('reviewer_', 'Vérification · lecture seule')}</div><label class="check-option"><input type="checkbox" name="synthesizer_enabled" checked><span>Inclure une synthèse</span></label><div data-optional-role="synthesizer">${runtimeFields('synthesizer_', 'Synthèse · lecture seule')}</div><div class="form-grid">${field('Tâches maximum', 'maxTasks', 3, 'number', 'min="1" max="20"')}${field('Délai par étape (secondes)', 'stepTimeout', 600, 'number', 'min="60" max="1800" step="60"')}</div></section>`;
}
function terminalModal(runtime = 'codex') {
  const models = provider('omp').models || [];
  modal('Terminal natif', project().path,
    `<form data-form="terminal"><div class="modal-body">${select('Agent / rôle', 'role', [['researcher','Recherche'],['developer','Développeur'],['verifier','Vérificateur']], 'developer')}${runtimeFields()}<div id="omp-terminal-variants" ${runtime === 'omp' ? '' : 'hidden'}>${['plan','slow','smol'].map(role => select('Modèle ' + role, role, [['','Par défaut OMP'], ...models.map(m => [m.model, m.displayName + ' · ' + m.provider])], '')).join('')}</div>${select('Permissions', 'sandbox',[['read-only','Lecture seule'],['workspace-write','Écriture projet · Codex']],'read-only')}<p class="muted small">Terminal externe, sans suivi importé. Codex : on-request. OMP : lecture seule, always-ask. Aucune mission envoyée à l'ouverture.</p></div>${formFooter('Préparer le terminal')}</form>`, true);
  const scope = $('#modal [data-model-config]');
  scope.querySelector('[name="runtime"]').value = runtime;
  updateConfigurationModels(scope);
  $('#modal [name="sandbox"] option[value="workspace-write"]').disabled = runtime === 'omp';
}
function terminalReview(plan, title) {
  modal(title, plan.cwd, `<div class="modal-body"><pre id="terminal-command" class="result-output">${esc(plan.display)}</pre><p class="muted small">Le terminal est externe. Son activité, ses outils et sa consommation ne sont pas importés dans les sessions Atelier. Les identifiants restent gérés par le CLI natif choisi.</p></div><footer class="modal-footer">${btn('copy-terminal','Copier la commande','code')}${btn('terminal-launch','Ouvrir le terminal','terminal','primary')}</footer>`, true);
}
async function newAgent(mode = "classic", executionMode = 'code', template = null) {
  nextWorkerIndex = 1;
  modal(
    "Nouvel agent",
    "Choisissez une façon de travailler, puis configurez votre session.",
    `<form data-form="agent"><div class="modal-body"><span class="form-section-label">MODE DE TRAVAIL</span><div class="mode-picker">${[
      ["classic", "Classique", "terminal", "Un agent, une mission."],
      ["duo", "Duo avec revue", "shield", "Un principal, un regard extérieur."],
      [
        "orchestration",
        "Orchestration",
        "network",
        "Un plan, une équipe coordonnée.",
      ],
    ]
      .map(
        ([id, name, ico, desc]) =>
          `<label class="mode-option"><input type="radio" name="mode" value="${id}" ${id === mode ? "checked" : ""}><span>${icon(ico)}<strong>${name}</strong><small>${desc}</small></span></label>`,
      )
      .join(
        "",
      )}</div><span class="form-section-label">IDENTITÉ & MODÈLE</span>${field("Nom de l’agent ou de l’équipe", "name", "", "text", 'placeholder="Ex. Architecture du projet" required')}${runtimeFields()}${btn("refresh-provider", "Actualiser les catalogues", "plug", "quiet")}${workflowConfiguration(mode)}${select("Tâche associée", "taskId", [["", "Aucune tâche"], ...objects("tasks").map((t) => [t.id, t.title])], "")}<span class="form-section-label">DOSSIER DE TRAVAIL</span><div id="worktree-settings"><p class="muted small">Lecture du dépôt Git…</p></div>${area("Mission initiale", "mission", "", 3, 'placeholder="Quel résultat attendez-vous ? Quelles contraintes faut-il respecter ?"')}<div class="form-grid">${select(
      "Permissions",
      "sandbox",
      [
        ["read-only", "Lecture seule"],
        ["workspace-write", "Écriture dans le projet"],
      ],
      "read-only",
    )}${select(
      "Rôle",
      "role",
      [
        ["developer", "Développeur"],
        ["researcher", "Recherche"],
        ["verifier", "Vérificateur"],
        ["synthesizer", "Synthèse"],
      ],
      "developer",
    )}</div><label class="check-option"><input type="checkbox" name="memory" checked><span><strong>Activer la mémoire du projet</strong><small>Le noyau est transmis au fournisseur choisi. La réserve MCP est disponible pour Codex ; OMP reçoit le noyau uniquement.</small></span></label><details class="advanced-settings"><summary>Skills & paramètres d’exécution ${icon("settings")}</summary><div id="skills-list" class="skills-list">Lecture de la bibliothèque du projet…</div><p class="muted small">Profondeur 1, étapes séquentielles. Les spécialistes configurés sont affectés aux tâches dans l'ordre. Planification, revue et synthèse restent en lecture seule.</p><p class="muted small">Dossier : ${esc(project().path)}</p></details></div>${formFooter("Créer & ouvrir", "Compte ou API du moteur sélectionné")}</form>`,
    true,
  );
  const form = $('#modal form');
  form.querySelector('.advanced-settings').insertAdjacentHTML('beforebegin',select('Supervision Duplica','duplicaEnabled',[['inherit','Selon le projet'],['true','Travailler avec Duplica'],['false','Garder la main sur cet agent']],'inherit'));
  const formProjectId=projectId;
  form.querySelector('.modal-body').insertAdjacentHTML('afterbegin',select('Projet','agentProject',state.projects.map(p => [p.id,p.name]),projectId));
  form.querySelector('.advanced-settings').insertAdjacentHTML('beforebegin','<label class="check-option"><input type="checkbox" name="planMode" checked><span>Diagnostic et plan avant implémentation · validation requise</span></label>');
  form.querySelector('.mode-picker').insertAdjacentHTML('beforebegin', `<div class="session-mode-picker">${select('Expérience','executionMode',[['code','Code · tâches du projet'],['chat','Conversation CLI · lecture seule']],executionMode)}</div>`);
  form.querySelector('.advanced-settings').insertAdjacentHTML('beforebegin', '<label class="check-option"><input type="checkbox" name="startWork" checked><span>Prendre les tâches À faire au lancement</span></label>');
  updateAgentMode(form);
  if (template) {
    form.elements.name.value = template.title;
    form.elements.mission.value = template.baseMission || template.mission;
    form.elements.maxTasks.value = template.maxTasks || 3;
    form.elements.stepTimeout.value = template.stepTimeout || 600;
    form.elements.sandbox.value = template.sandbox;
    form.elements.memory.checked = template.memory;
    const configs = template.agents || {workers:[template],planner:template,reviewer:template,synthesizer:template};
    $('#worker-editors').innerHTML = configs.workers.map((config,index) => workerConfiguration(index)).join('');
    nextWorkerIndex = configs.workers.length;
    updateWorkerCount();
    const applyConfiguration = (prefix,configuration) => {
      if (!configuration) return;
      const scope = form.querySelector(`[data-model-config="${prefix}"]`);
      form.elements[prefix+'runtime'].value = configuration.runtime || 'codex';
      updateConfigurationModels(scope);
      form.elements[prefix+'model'].value = configuration.model;
      updateConfigurationEfforts(scope);
      form.elements[prefix+'effort'].value = configuration.effort;
      for (const key of ['name','role','sandbox','instructions']) if (form.elements[prefix+key]) form.elements[prefix+key].value = configuration[key] || (key === 'sandbox' ? 'read-only' : '');
    };
    applyConfiguration('',template);
    configs.workers.forEach((config,index) => applyConfiguration('worker'+index+'_',config));
    for (const role of ['planner','reviewer','synthesizer']) {
      applyConfiguration(role+'_',configs[role]);
      if (role !== 'planner') {
        form.elements[role+'_enabled'].checked = Boolean(configs[role]);
        form.querySelector(`[data-optional-role="${role}"]`).hidden = !configs[role];
      }
    }
  }
  try {
    const trees = await api(
      "worktrees?project=" + encodeURIComponent(formProjectId),
    );
    if ($('#modal form') !== form || projectId !== formProjectId) return;
    if ($("#worktree-settings"))
      $("#worktree-settings").innerHTML = trees.length
        ? `${select(
            "Lieu de travail",
            "worktreeMode",
            [
              ["repository", "Le dossier du projet"],
              ["existing", "Un worktree existant"],
              ["new", "Un nouveau worktree"],
            ],
            "repository",
          )}<div class="form-grid">${select(
            "Worktree existant (si choisi)",
            "existingWorktree",
            trees.map((t) => [t.path, t.branch + " · " + t.path]),
            trees[0].path,
          )}${field("Nouvelle branche (si nouveau worktree)", "branch", "", "text", 'placeholder="Nom auto si vide"')}</div><p class="muted small">Les worktrees sont conservés après clôture. Un workflow utilise le même worktree pour toutes ses étapes.</p>`
        : `<input type="hidden" name="worktreeMode" value="repository"><p class="muted small">${esc(project().path)} · Initialisez Git pour activer les worktrees.</p>`;
    const skills = await api("skills?project=" + encodeURIComponent(formProjectId));
    if ($('#modal form') !== form || projectId !== formProjectId) return;
    if ($("#skills-list"))
      $("#skills-list").innerHTML = skills.length
        ? skills
            .map(
              (s) =>
                `<label class="check-option"><input type="checkbox" name="skills" value="${esc(s)}" ${template?.skills?.includes(s) ? 'checked' : ''}><span>${esc(s)}</span></label>`,
            )
            .join("")
        : '<p class="muted small">Aucun SKILL.md dans ce projet. Ajoutez votre bibliothèque dans un dossier du projet pour la sélectionner ici.</p>';
  } catch (e) {
    if ($("#skills-list")) $("#skills-list").textContent = e.message;
  }
}
function taskModal(id, status = "todo") {
  const t = id ? state.tasks.find((t) => t.id === id) : {};
  modal(
    id ? "Modifier la tâche" : "Nouvelle tâche",
    "Un objectif explicite rend le travail plus simple à vérifier.",
    `<form data-form="task" data-id="${esc(id || "")}"><div class="modal-body">${field("Titre", "title", t?.title, "text", 'required placeholder="Quel travail faut-il accomplir ?"')}${area("Description et critères d’acceptation", "description", t?.description)}<div class="form-grid">${select(
      "État",
      "status",
      [
        ["todo", "À faire"],
        ["running", "En cours"],
        ["review", "En revue"],
        ["done", "Terminé"],
      ],
      t?.status || status,
    )}${select(
      "Priorité",
      "priority",
      [
        ["low", "Basse"],
        ["medium", "Normale"],
        ["high", "Haute"],
      ],
      t?.priority || "medium",
    )}</div>${select("Sprint", "sprintId", [["", "Sans sprint"], ...objects("sprints").map((s) => [s.id, s.title])], id ? t?.sprintId : taskSprintFilter)}</div>${formFooter()}</form>`,
  );
  const agents = sessions().filter(session => session.executionMode !== 'chat' && ['ready','running','waiting'].includes(session.status));
  $('#modal .modal-body').insertAdjacentHTML('beforeend',select('Supervision Duplica de cette tâche','duplicaEnabled',[['inherit','Selon le projet et l’agent'],['true','Superviser cette tâche'],['false','Garder la main sur cette tâche']],t?.id ? String(duplicaScopeValue('task',t.id) ?? 'inherit') : 'inherit'));
  $('#modal .modal-body').insertAdjacentHTML('beforeend',`${select('Agent affecté','assigneeId',[['','File automatique du projet'],...agents.map(session => [session.id,session.name])],t?.assigneeId || '')}<label class="check-option"><input type="checkbox" name="activateAgent"><span>Activer la file TODO de cet agent après enregistrement</span></label>${t?.claimedBy ? `<p>Prise en charge : ${esc(state.sessions.find(session => session.id === t.claimedBy)?.name || state.workflows.find(workflow => workflow.id === t.claimedBy)?.title || t.claimedBy)}</p>` : ''}${t?.lastError ? `<p class="inline-error">${esc(t.lastError)}</p>` : ''}`);
}
function memoryModal(id) {
  const m = id ? state.memories.find((m) => m.id === id) : {};
  modal(
    id ? "Modifier le souvenir" : "Nouveau souvenir",
    "Conservez ce qui aidera vraiment une prochaine session.",
    `<form data-form="memory" data-id="${esc(id || "")}"><div class="modal-body">${field("Titre", "title", m?.title, "text", "required")}${area("Contenu durable", "body", m?.body, 5, "required")}<div class="form-grid">${select(
      "Nature",
      "kind",
      ["règle", "préférence", "piège", "fait", "décision"].map((s) => [s, s]),
      m?.kind || "fait",
    )}${select(
      "Portée",
      "scope",
      [
        ["project", "Ce projet"],
        ["user", "Utilisateur"],
      ],
      m?.scope || memoryScope,
    )}</div>${field("Mots-clés, séparés par des virgules", "tags", m?.tags?.join(", "))}${field("Source ou fichier de référence", "source", m?.source, "text", 'placeholder="docs/decision.md, un résultat d’outil, une URL…"')}<label class="check-option"><input type="checkbox" name="core" ${m?.core ? "checked" : ""}><span><strong>Inclure dans le noyau de démarrage</strong><small>Budget total limité à 4 000 caractères. Sinon, recherche à la demande.</small></span></label></div>${formFooter("Valider le souvenir")}</form>`,
  );
}
function sprintModal(id) {
  const s = id ? state.sprints.find((s) => s.id === id) : {};
  modal(
    id ? "Modifier le sprint" : "Nouveau sprint",
    "Un cap clair et un rythme choisi.",
    `<form data-form="sprint" data-id="${esc(id || "")}"><div class="modal-body">${field("Nom", "title", s?.title, "text", 'required placeholder="Ex. Un premier cockpit utilisable"')}${area("Objectif", "goal", s?.goal)}<div class="form-grid">${field("Début", "start", s?.start, "date")}${field("Échéance", "end", s?.end, "date")}</div></div>${formFooter()}</form>`,
  );
}
function benchmarkModal() {
  modal(
    "Nouvelle campagne",
    "Les runs utiliseront votre connexion Codex et consommeront son quota.",
    `<form data-form="benchmark"><div class="modal-body">${field("Nom de la campagne", "title", "", "text", 'required placeholder="Ex. Contrôle du suivi des consignes"')}<div class="form-grid">${modelFields()}</div>${field("Répétitions par cas (maximum 50 runs au total)", "repeats", 1, "number", 'min="1" max="50" required')}<div class="form-grid">${select(
      "Évaluateur",
      "judge",
      [
        ["exact", "Réponse exacte (déterministe)"],
        ["model", "Review par un autre modèle"],
      ],
      "exact",
    )}${select(
      "Modèle de review (si choisi)",
      "judgeModel",
      (provider().models || []).map((m) => [m.model, m.displayName]),
      provider().models?.[0]?.model,
    )}</div><details class="advanced-settings dataset-generator"><summary>Faire concevoir les tests par un agent ${icon("spark")}</summary>${area("Types de tâches à évaluer", "topic", "", 3, 'placeholder="Ex. extraction, code Python, suivi de consignes, audit…"')}<div class="form-grid">${field("Nombre de cas à générer", "count", 5, "number", 'min="1" max="10"')}${select(
      "Modèle du générateur",
      "generatorModel",
      (provider().models || []).map((m) => [m.model, m.displayName]),
      provider().models?.[0]?.model,
    )}</div><button class="button secondary" type="button" data-action="generate-cases">${icon("spark")} Générer le jeu à examiner</button><p class="muted small" id="generated-case-note">Une inférence est lancée. Examinez les réponses attendues avant de lancer la campagne.</p></details>${area("Jeu de tests JSON : title, prompt, expected", "cases", JSON.stringify(baseline, null, 2), 10, 'required spellcheck="false"')}<p class="muted small">Chaque test démarre une session neuve en lecture seule, sans noyau mémoire. Le score compare la réponse à expected après retrait des espaces en bordure. Les outils restent soumis au sandbox ; un prompt de benchmark leur demande de ne pas les utiliser.</p></div>${formFooter("Lancer les tests", "Exécution séquentielle · 240 s maximum par cas")}</form>`,
    true,
  );
}
async function loadFiles(path = "") {
  try {
    const data = await api(
      "files?project=" +
        encodeURIComponent(projectId) +
        "&path=" +
        encodeURIComponent(path),
    );
    if (data.entries) {
      fileData = data;
      filePath = path;
    } else fileContent = data;
    if (view === "files") render();
  } catch (e) {
    toast(e.message, true);
  }
}
async function openFile(path) {
  filesTab = "files";
  if (/\.(png|jpe?g|webp)$/i.test(path)) {
    const response = await fetch(
      "/api/image?project=" +
        encodeURIComponent(projectId) +
        "&path=" +
        encodeURIComponent(path),
      {
        headers: { "X-Atelier-Token": $('meta[name="atelier-token"]').content },
      },
    );
    if (!response.ok) throw new Error((await response.json()).error);
    if (fileContent?.image) URL.revokeObjectURL(fileContent.image);
    fileContent = { path, image: URL.createObjectURL(await response.blob()) };
  } else await loadFiles(path);
  if (view !== "files") {
    view = "files";
    history.replaceState(null, "", "#files");
    await loadFiles(path.split("/").slice(0, -1).join("/"));
  }
  render();
}
async function gitLoad() {
  gitData = await api("git?project=" + encodeURIComponent(projectId));
  render();
}
async function prLoad() {
  prData = await api("pull-requests?project=" + encodeURIComponent(projectId));
  render();
}
