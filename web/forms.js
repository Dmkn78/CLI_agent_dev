function modal(title, subtitle, body, wide = false) {
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
function modelFields() {
  const models = provider().models || [];
  const m = models.find((m) => m.isDefault) || models[0];
  return `${select(
    "Modèle",
    "model",
    models.map((m) => [m.model, m.displayName]),
    m?.model,
  )}${select(
    "Raisonnement",
    "effort",
    (m?.supportedReasoningEfforts || []).map((r) => [
      r.reasoningEffort,
      r.reasoningEffort,
    ]),
    m?.defaultReasoningEffort,
  )}`;
}
async function newAgent(mode = "classic") {
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
      )}</div><span class="form-section-label">IDENTITÉ & MODÈLE</span>${field("Nom de l’agent ou de l’équipe", "name", "", "text", 'placeholder="Ex. Architecture du projet" required')}<div class="form-grid">${modelFields()}</div>${!provider().models?.length ? `<div class="inline-error">Le catalogue doit être chargé depuis Codex. ${btn("refresh-provider", "Vérifier la connexion", "plug", "quiet")}</div>` : ""}${select("Tâche associée", "taskId", [["", "Aucune tâche"], ...objects("tasks").map((t) => [t.id, t.title])], "")}<span class="form-section-label">DOSSIER DE TRAVAIL</span><div id="worktree-settings"><p class="muted small">Lecture du dépôt Git…</p></div>${area("Mission initiale", "mission", "", 3, 'placeholder="Quel résultat attendez-vous ? Quelles contraintes faut-il respecter ?"')}<div class="form-grid">${select(
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
    )}</div><label class="check-option"><input type="checkbox" name="memory" checked><span><strong>Activer la mémoire du projet</strong><small>Noyau court au démarrage, réserve consultable par MCP. Le noyau et les souvenirs consultés sont transmis au fournisseur du modèle.</small></span></label><details class="advanced-settings"><summary>Skills & paramètres d’exécution ${icon("settings")}</summary><div id="skills-list" class="skills-list">Lecture de la bibliothèque du projet…</div><p class="muted small">Workflows : profondeur 1, exécution séquentielle, 1 à 3 tâches, puis revue. Les agents utilisent le modèle choisi et demandent les permissions requises.</p><p class="muted small">Dossier : ${esc(project().path)}</p></details></div>${formFooter("Créer & ouvrir", "Codex · connexion locale")}</form>`,
    true,
  );
  try {
    const trees = await api(
      "worktrees?project=" + encodeURIComponent(projectId),
    );
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
    const skills = await api("skills?project=" + encodeURIComponent(projectId));
    if ($("#skills-list"))
      $("#skills-list").innerHTML = skills.length
        ? skills
            .map(
              (s) =>
                `<label class="check-option"><input type="checkbox" name="skills" value="${esc(s)}"><span>${esc(s)}</span></label>`,
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
    )}</div>${select("Sprint", "sprintId", [["", "Sans sprint"], ...objects("sprints").map((s) => [s.id, s.title])], t?.sprintId || "")}</div>${formFooter()}</form>`,
  );
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
