const actions = {
  'select-graph-node': (el) => { selectedGraphNode = el.dataset.id; render(); },
  'select-workflow': (el) => { graphWorkflowId = el.dataset.id; selectedGraphNode = null; render(); },
  'graph-page': (el) => { graphPage = Math.max(0, graphPage + Number(el.dataset.direction)); selectedGraphNode = null; render(); },
  'usage-group': (el) => { usageGrouping = el.dataset.group; render(); },
  'terminal-omp': () => terminalModal('omp'),
  'terminal': () => terminalModal(),
  'new-chat': () => newAgent('classic','chat'),
  'open-chat': async (el) => { selectedChatId = el.dataset.id; agentLayout = 'chat'; route('agents'); await loadChatFiles(el.dataset.id); },
  'session-context': (el) => sessionContextModal(el.dataset.id),
  'toggle-work': async (el) => { await api('sessions/work',{id:el.dataset.id,enabled:el.dataset.enabled === 'true'}); await refresh(true); },
  'add-worker': () => {
    if (document.querySelectorAll('[data-worker-index]').length >= 8) throw new Error('Maximum 8 sous-agents.');
    $('#worker-editors').insertAdjacentHTML('beforeend',workerConfiguration(nextWorkerIndex++));
    updateWorkerCount();
  },
  'remove-worker': (el) => { el.closest('[data-worker-index]').remove(); updateWorkerCount(); },
  'omp-connect': async (el) => {
    terminalSettings = {projectId, loginProvider: el.dataset.id};
    const plan = await api('terminal/prepare', terminalSettings);
    terminalReview(plan, 'Connexion ' + el.dataset.name);
  },
  'terminal-launch': async () => {
    await api('terminal/open', terminalSettings);
    $('#modal').close();
    toast('Terminal ouvert. L’activité et les tokens de ce terminal ne sont pas suivis par Atelier.');
    await refresh(true);
  },
  'copy-terminal': async () => {
    await navigator.clipboard.writeText($('#terminal-command').textContent);
    toast('Commande copiée.');
  },
  navigate: (el) => route(el.dataset.view),
  dismiss: () => $("#modal").close(),
  "new-agent": (el) => newAgent(el.dataset.mode || "classic"),
  "new-workflow": () => newAgent("orchestration"),
  'configure-team': (el) => { const workflow = state.workflows.find(workflow => workflow.id === el.dataset.id); return newAgent(workflow.mode,'code',workflow); },
  "new-task": (el) => taskModal(null, el.dataset.status),
  "edit-task": (el) => taskModal(el.dataset.id),
  "new-memory": () => memoryModal(),
  "edit-memory": (el) => memoryModal(el.dataset.id),
  "new-sprint": () => sprintModal(),
  "edit-sprint": (el) => sprintModal(el.dataset.id),
  "new-benchmark": () => benchmarkModal(),
  "agent-layout": async (el) => {
    agentLayout = el.dataset.layout;
    if (agentLayout === "panes" && !selectedAgents.length && sessions().length)
      selectedAgents = [sessions()[0].id];
    render();
    if (agentLayout === 'chat' && selectedChatId) await loadChatFiles(selectedChatId);
  },
  "open-agent": (el) => {
    const id = el.dataset.id;
    if (state.sessions.find(session => session.id === id)?.executionMode === 'chat') return actions['open-chat'](el);
    if (!selectedAgents.includes(id))
      selectedAgents = [...selectedAgents.slice(-2), id];
    agentLayout = "panes";
    $("#modal").close();
    route("agents");
  },
  "unpin-agent": (el) => {
    selectedAgents = selectedAgents.filter((id) => id !== el.dataset.id);
    render();
  },
  "choose-agent": () =>
    modal(
      "Ouvrir une session",
      "Choisissez un agent existant ou créez une nouvelle session.",
      `<div class="modal-body agent-chooser">${objects("sessions")
        .map((s) => agentRow(s))
        .join(
          "",
        )}${btn("new-agent", "Nouvel agent", "plus", "secondary full")}</div>`,
    ),
  "memory-scope": (el) => {
    memoryScope = el.dataset.scope;
    selectedMemory = null;
    render();
  },
  "memory-filter": (el) => {
    memoryFilter = el.dataset.filter;
    render();
  },
  "select-memory": (el) => {
    selectedMemory = el.dataset.id;
    render();
  },
  "open-memory": (el) => {
    selectedMemory = el.dataset.id;
    route("memory");
  },
  "open-file": (el) => openFile(el.dataset.path),
  "file-root": () => loadFiles(""),
  "file-up": () => loadFiles(filePath.split("/").slice(0, -1).join("/")),
  "files-tab": async (el) => {
    filesTab = el.dataset.tab;
    render();
    if (filesTab === "git") await gitLoad();
    else if (filesTab === "pr") await prLoad();
  },
  "refresh-git": () => gitLoad(),
  "refresh-pr": () => prLoad(),
  "select-benchmark": (el) => {
    selectedBench = el.dataset.id;
    render();
  },
  "benchmark-result": (el) => {
    const b = state.benchmarks.find((b) => b.id === el.dataset.id);
    const r = b.results[+el.dataset.index];
    modal(
      "Résultat du test",
      r.passed
        ? "Réponse exacte selon l’oracle."
        : "Écart ou erreur à examiner.",
      `<div class="modal-body"><span class="form-section-label">PROMPT</span><pre class="result-output">${esc(b.cases[r.case].prompt)}</pre><span class="form-section-label">RÉPONSE ATTENDUE</span><pre class="result-output">${esc(r.expected ?? b.cases[r.case].expected)}</pre><span class="form-section-label">RÉPONSE OBSERVÉE</span><pre class="result-output">${esc(r.output || r.error)}</pre>${r.review ? `<span class="form-section-label">REVIEW INDÉPENDANTE (AVIS DU MODÈLE)</span><pre class="result-output">${esc(JSON.stringify(r.review, null, 2))}</pre>` : ""}${btn("open-agent", "Examiner la session", "external", "secondary", `data-id="${esc(r.sessionId)}"`)}</div>`,
      true,
    );
  },
  "generate-cases": async (el) => {
    const form = el.closest("form");
    $("#generated-case-note").textContent =
      "Le générateur travaille. Les cas seront proposés ici avant le lancement.";
    const result = await api("benchmarks/generate", {
      projectId,
      model: form.elements.generatorModel.value,
      effort: form.elements.effort.value,
      topic: form.elements.topic.value,
      count: Number(form.elements.count.value),
    });
    form.elements.cases.value = JSON.stringify(result.cases, null, 2);
    form.dataset.generatedBy = result.generatedBy;
    $("#generated-case-note").textContent =
      "Jeu généré, à examiner et corriger. Ces réponses attendues ne sont pas une vérité certifiée.";
    toast("Jeu proposé. Vérifiez-le avant de lancer les tests.");
    await refresh(true);
  },
  "export-benchmark": (el) => {
    const b = state.benchmarks.find((b) => b.id === el.dataset.id);
    download(b.id + ".json", JSON.stringify(b, null, 2), "application/json");
  },
  "export-usage": () => {
    const rows = consumptionRecords();
    const csv = [
      "request,session,provider,runtime,consumer,task,model,status,input,output,cached_input,total,observed_at",
      ...rows.map((s) =>
        [
          s.id,
          s.sessionId,
          s.provider,
          s.runtime,
          s.consumer,
          s.taskId,
          s.model,
          s.status,
          s.usage?.inputTokens,
          s.usage?.outputTokens,
          s.usage?.cachedInputTokens,
          s.usage?.totalTokens,
          s.completedAt || s.createdAt,
        ].map(csvCell).join(","),
      ),
    ].join("\n");
    download("atelier-consommation.csv", csv, "text/csv");
  },
  "export-events": async () => {
    let after = 0;
    const all = [];
    while (true) {
      const page = await api("events?after=" + after);
      if (!page.length) break;
      all.push(...page);
      after = page.at(-1).seq;
    }
    download(
      "atelier-journal.jsonl",
      all
        .filter((e) => e.projectId === projectId || !e.projectId)
        .map((e) => JSON.stringify(e))
        .join("\n") + "\n",
      "application/x-ndjson",
    );
  },
  interrupt: async (el) => {
    await api("sessions/interrupt", { id: el.dataset.id });
    toast("Arrêt demandé au moteur ; file TODO désactivée.");
    await refresh(true);
  },
  resume: async (el) => {
    await api("sessions/resume", { id: el.dataset.id });
    await refresh(true);
  },
  report: async (el) => {
    const result = await api("sessions/report", { id: el.dataset.id });
    download("rapport-" + el.dataset.id + ".md", result.content);
    toast("Rapport enregistré dans les artefacts locaux et téléchargé.");
    await refresh(true);
  },
  "close-session": async (el) => {
    const result = await api("sessions/report", {
      id: el.dataset.id,
      close: true,
    });
    download("rapport-" + el.dataset.id + ".md", result.content);
    toast("Session clôturée. Rapport, sortie et handoff conservés.");
    await refresh(true);
  },
  approve: async (el) => {
    await api("approvals", {
      id: el.dataset.id,
      decision: el.dataset.decision,
    });
    await refresh(true);
  },
  cancel: async (el) => {
    await api("cancel", { id: el.dataset.id, kind: el.dataset.kind });
    toast("Arrêt demandé. Le run actif sera interrompu.");
    await refresh(true);
  },
  "refresh-provider": async () => {
    toast("Vérification des comptes et des catalogues…");
    await api("providers/refresh", {});
    await refresh(true);
    const form = $("#modal form");
    if (form?.dataset.form === "agent" || form?.dataset.form === "benchmark") {
      if (form.querySelector('[data-model-config]')) {
        form.querySelectorAll('[data-model-config]').forEach(scope => updateConfigurationModels(scope));
      } else {
      const models = provider().models || [];
      form.elements.model.innerHTML = models
        .map(
          (m) =>
            `<option value="${esc(m.model)}" ${m.isDefault ? "selected" : ""}>${esc(m.displayName)}</option>`,
        )
        .join("");
      updateEfforts(form);
      }
    }
    toast(
      provider().connected
        ? "Compte connecté. Catalogue actualisé."
        : provider().error || "Connexion nécessaire.",
      !provider().connected,
    );
  },
  login: async () => {
    const blank = window.open("about:blank", "_blank");
    try {
      const result = await api("providers/login", {});
      const url = result.authUrl || result.verificationUri;
      if (!url || !safeURL(url) || safeURL(url) === "#")
        throw new Error(
          "Aucune URL de connexion retournée. Utilise « codex login » dans ton terminal.",
        );
      if (blank) blank.location.href = url;
      else
        modal(
          "Se connecter à Codex",
          "Ouvrez le lien officiel de connexion.",
          `<div class="modal-body"><a class="button primary" href="${safeURL(url)}" target="_blank" rel="noopener noreferrer">Ouvrir la connexion ${icon("external")}</a></div>`,
        );
      toast("Après la connexion, cliquez sur « Vérifier les connexions ».");
    } catch (e) {
      blank?.close();
      throw e;
    }
  },
  project: (el) => {
    projectId = el.dataset.id;
    localStorage.setItem("atelier-project", projectId);
    selectedAgents = [];
    selectedMemory = null;
    selectedGraphNode = null;
    graphWorkflowId = '';
    graphPage = 0;
    usageProvider = '';
    filePath = "";
    fileData = null;
    fileContent = null;
    gitData = null;
    prData = null;
    $("#modal").close();
    render();
    if (view === "files") loadFiles("");
  },
};
function updateEfforts(form) {
  const m = provider().models?.find(
    (m) => m.model === form.elements.model.value,
  );
  form.elements.effort.innerHTML = (m?.supportedReasoningEfforts || [])
    .map(
      (r) =>
        `<option value="${esc(r.reasoningEffort)}" ${r.reasoningEffort === m.defaultReasoningEffort ? "selected" : ""}>${esc(r.reasoningEffort)}</option>`,
    )
    .join("");
}
function updateConfigurationModels(scope) {
  const prefix = scope.dataset.modelConfig;
  const runtime = scope.querySelector(`[name="${prefix}runtime"]`).value;
  const models = provider(runtime).models || [];
  const modelSelect = scope.querySelector(`[name="${prefix}model"]`);
  const previous = modelSelect.value;
  modelSelect.innerHTML = models.map(m => `<option value="${esc(m.model)}">${esc(m.displayName)}${m.hidden ? ' · catalogue étendu' : ''}${runtime === 'omp' ? ' · ' + esc(m.provider) : ''}</option>`).join('');
  if (models.some(m => m.model === previous)) modelSelect.value = previous;
  updateConfigurationEfforts(scope);
}
function updateConfigurationEfforts(scope) {
  const prefix = scope.dataset.modelConfig;
  const runtime = scope.querySelector(`[name="${prefix}runtime"]`).value;
  const model = provider(runtime).models?.find(m => m.model === scope.querySelector(`[name="${prefix}model"]`).value);
  const effort = scope.querySelector(`[name="${prefix}effort"]`);
  const previous = effort.value;
  effort.innerHTML = (model?.supportedReasoningEfforts || []).map(e => `<option value="${esc(e.reasoningEffort)}">${esc(e.reasoningEffort)}</option>`).join('');
  effort.value = model?.supportedReasoningEfforts?.some(e => e.reasoningEffort === previous) ? previous : (model?.defaultReasoningEffort || effort.options[0]?.value || '');
}
function configurationValues(form, prefix) {
  return Object.fromEntries(['runtime', 'model', 'effort'].map(key => [key, form.elements[prefix + key].value]));
}
function updateWorkerCount() {
  const count = document.querySelectorAll('[data-worker-index]').length;
  $('#worker-count').textContent = count+' / 8';
  $('[data-action="add-worker"]').disabled = count >= 8;
}
function updateAgentMode(form) {
  const chat = form.elements.executionMode?.value === 'chat';
  const picker = form.querySelector('.mode-picker');
  picker.hidden = chat;
  if (chat) form.querySelector('[name="mode"][value="classic"]').checked = true;
  $('#workflow-configuration').hidden = chat || form.elements.mode.value === 'classic';
  form.elements.sandbox.value = chat ? 'read-only' : form.elements.sandbox.value;
  form.elements.sandbox.disabled = chat;
  form.elements.startWork.checked = !chat;
  form.elements.startWork.disabled = chat;
  if (chat && !form.elements.name.value) form.elements.name.value = 'Nouvelle conversation';
}
document.addEventListener("click", async (event) => {
  const el = event.target.closest("[data-action]");
  if (!el || !el.dataset.action) return;
  const action = actions[el.dataset.action];
  if (!action) return;
  event.preventDefault();
  try {
    el.disabled = true;
    await action(el);
  } catch (e) {
    toast(e.message, true);
  } finally {
    el.disabled = false;
  }
});
document.addEventListener("submit", async (event) => {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();
  const fd = new FormData(form);
  const value = Object.fromEntries(fd.entries());
  const submit =
    form.querySelector('[type="submit"]') || form.querySelector(".send-btn");
  if (submit) submit.disabled = true;
  try {
    switch (form.dataset.form) {
      case "agent": {
        const data = {
          ...value,
          projectId,
          memory: fd.has("memory"),
          skills: fd.getAll("skills"),
          startWork: fd.has('startWork'),
          sandbox: value.executionMode === 'chat' ? 'read-only' : value.sandbox,
        };
        if (value.mode !== 'classic') {
          data.agents = {
            planner: configurationValues(form, 'planner_'),
            reviewer: fd.has('reviewer_enabled') ? configurationValues(form, 'reviewer_') : null,
            synthesizer: fd.has('synthesizer_enabled') ? configurationValues(form, 'synthesizer_') : null,
            workers: [...form.querySelectorAll('[data-worker-index]')].map(editor => {
              const prefix = 'worker'+editor.dataset.workerIndex+'_';
              return {...configurationValues(form,prefix),...Object.fromEntries(['name','role','sandbox','instructions'].map(key => [key,value[prefix+key]]))};
            }),
          };
          if (!data.agents.workers.length) throw new Error('Ajoute au moins un sous-agent pour lancer une équipe.');
        }
        if (!data.model)
          throw new Error("Chargez le catalogue de modèles depuis Connexions.");
        if (value.mode !== 'classic' && !value.mission.trim()) {
          const task = objects('tasks').find(task => task.status === 'todo' && (!value.taskId || task.id === value.taskId));
          if (!data.startWork || !task) throw new Error('Indique une mission ou choisis une tâche À faire.');
          data.mission = task.title;
        }
        if (value.mode === "classic") {
          const s = await api("sessions", data);
          selectedAgents = [s.id];
          agentLayout = value.executionMode === 'chat' ? 'chat' : 'panes';
          if (value.executionMode === 'chat') selectedChatId = s.id;
          view = "agents";
        } else {
          await api("workflows", data);
          agentLayout = "graph";
          view = "agents";
        }
        $("#modal").close();
        await refresh(true);
        break;
      }
      case 'terminal': {
        terminalSettings = {...value, projectId};
        const plan = await api('terminal/prepare', terminalSettings);
        terminalReview(plan, value.runtime === 'omp' ? 'Oh My Pi' : 'Codex');
        break;
      }
      case "prompt":
        await api("sessions/prompt", { id: form.dataset.id, text: value.text });
        form.reset();
        {
          const current = document.getElementById('prompt-'+form.dataset.id);
          if (current && current.value === value.text) current.value = '';
        }
        await refresh(true);
        break;
      case 'session-context':
        await api('sessions/context',{id:form.dataset.id,model:value.model,effort:value.effort,memory:fd.has('memory'),skills:fd.getAll('skills'),contextFiles:value.contextFiles.split(/\r?\n/).map(path => path.trim()).filter(Boolean)});
        delete chatFileCharacters[form.dataset.id];
        $('#modal').close();
        await refresh(true);
        await loadChatFiles(form.dataset.id);
        break;
      case "answers":
        await api("approvals", { id: form.dataset.id, answers: value });
        await refresh(true);
        break;
      case "memory":
        value.tags = value.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        value.core = fd.has("core");
        await api("save", {
          kind: "memory",
          value: {
            ...value,
            projectId,
            ...(form.dataset.id ? { id: form.dataset.id } : {}),
          },
        });
        $("#modal").close();
        await refresh(true);
        toast("Souvenir validé et conservé.");
        break;
      case "task":
      case "sprint":
        if (form.dataset.form === 'task') value.activateAgent = fd.has('activateAgent');
        await api("save", {
          kind: form.dataset.form,
          value: {
            ...value,
            projectId,
            ...(form.dataset.id ? { id: form.dataset.id } : {}),
          },
        });
        $("#modal").close();
        await refresh(true);
        toast("Enregistré dans le projet.");
        break;
      case "project": {
        const p = await api("save", {
          kind: "project",
          value: { ...value, color: "#b7c69a" },
        });
        projectId = p.id;
        localStorage.setItem("atelier-project", projectId);
        $("#modal").close();
        selectedAgents = [];
        fileData = null;
        fileContent = null;
        await refresh(true);
        break;
      }
      case "benchmark": {
        let cases;
        try {
          cases = JSON.parse(value.cases);
        } catch (_) {
          throw new Error("Le jeu de tests doit être un tableau JSON valide.");
        }
        if (!Array.isArray(cases))
          throw new Error("Le jeu de tests doit être un tableau.");
        const b = await api("benchmarks", {
          ...value,
          cases,
          repeats: Number(value.repeats),
          projectId,
          generatedBy: form.dataset.generatedBy,
        });
        selectedBench = b.id;
        view = "benchmarks";
        $("#modal").close();
        await refresh(true);
        break;
      }
    }
  } catch (e) {
    toast(e.message, true);
  } finally {
    if (submit) submit.disabled = false;
  }
});
document.addEventListener("input", (event) => {
  if (event.target.closest('.prompt-form') && event.target.name === 'text') updateDraftEstimate(event.target);
  if (event.target.id === "memory-search") {
    memoryQuery = event.target.value;
    render();
  }
  if (event.target.id === "audit-search") {
    auditQuery = event.target.value;
    render();
  }
  if (event.target.id === "quick-search-input")
    quickSearchResults(event.target.value);
});
document.addEventListener("change", (event) => {
  const scope = event.target.closest('[data-model-config]');
  if (scope && event.target.name.endsWith('runtime')) updateConfigurationModels(scope);
  else if (scope && event.target.name.endsWith('model')) updateConfigurationEfforts(scope);
  else if (event.target.name === "model") {
    const form = event.target.closest("form");
    if (form?.elements.effort) updateEfforts(form);
  }
  if (event.target.name === 'mode') $('#workflow-configuration').hidden = event.target.value === 'classic';
  if (event.target.name === 'executionMode') updateAgentMode(event.target.closest('form'));
  if (['reviewer_enabled','synthesizer_enabled'].includes(event.target.name)) {
    $(`[data-optional-role="${event.target.name.split('_')[0]}"]`).hidden = !event.target.checked;
  }
  if (event.target.closest('[data-form="terminal"]') && event.target.name === 'runtime') {
    $('#omp-terminal-variants').hidden = event.target.value !== 'omp';
    const sandbox = event.target.closest('form').elements.sandbox;
    if (event.target.value === 'omp') sandbox.value = 'read-only';
    sandbox.options[1].disabled = event.target.value === 'omp';
  }
  if (event.target.id === 'graph-workflow') { graphWorkflowId = event.target.value; selectedGraphNode = null; render(); }
  if (event.target.id === 'usage-provider') { usageProvider = event.target.value; render(); }
});
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    quickSearch();
  }
  if (
    (event.metaKey || event.ctrlKey) &&
    event.key === "Enter" &&
    document.activeElement.closest(".prompt-form")
  ) {
    event.preventDefault();
    document.activeElement.closest("form").requestSubmit();
  }
});
function quickSearch() {
  modal(
    "Retrouver le fil",
    "Cherchez un agent, une tâche ou un souvenir de ce projet.",
    `<div class="modal-body"><label class="search-field">${icon("search")}<input id="quick-search-input" placeholder="Que cherchez-vous ?" autofocus></label><div id="quick-search-results"></div></div>`,
  );
  quickSearchResults("");
  setTimeout(() => $("#quick-search-input")?.focus(), 20);
}
function quickSearchResults(query) {
  const q = query.toLowerCase();
  const values = [
    ...objects("memories").map((m) => ({
      id: m.id,
      title: m.title,
      type: "Souvenir",
      action: "open-memory",
    })),
    ...objects("sessions").map((s) => ({
      id: s.id,
      title: s.name,
      type: "Agent",
      action: "open-agent",
    })),
    ...objects("tasks").map((t) => ({
      id: t.id,
      title: t.title,
      type: "Tâche",
      action: "edit-task",
    })),
  ]
    .filter((o) => o.title.toLowerCase().includes(q))
    .slice(0, 12);
  $("#quick-search-results").innerHTML =
    values
      .map(
        (v) =>
          `<button class="quick-result" data-action="${v.action}" data-id="${esc(v.id)}"><span>${esc(v.title)}</span><small>${v.type}</small>${icon("arrow")}</button>`,
      )
      .join("") || '<p class="muted panel-description">Aucun résultat.</p>';
}
$("#global-search").addEventListener("click", quickSearch);
$("#audit-shortcut").innerHTML = icon("audit");
$("#audit-shortcut").addEventListener("click", () => route("audit"));
$("#settings-shortcut").addEventListener("click", () => route("settings"));
$("#project-switch").addEventListener("click", () =>
  modal(
    "Votre espace de travail",
    "Chaque projet possède ses sessions, ses tâches et sa mémoire.",
    `<div class="modal-body project-chooser">${state.projects.map((p) => `<button class="quick-result" data-action="project" data-id="${esc(p.id)}"><span>${esc(p.name)}</span><small>${esc(p.path)}</small>${icon("chevron")}</button>`).join("")}</div>`,
  ),
);
$("#add-project").addEventListener("click", () =>
  modal(
    "Ajouter un projet",
    "Sélectionnez explicitement un dossier existant sur votre Mac.",
    `<form data-form="project"><div class="modal-body">${field("Nom du projet", "name", "", "text", "required")}${field("Chemin absolu du dossier", "path", "", "text", 'required placeholder="/Users/vous/Projets/mon-projet"')}<p class="muted small">Ce dossier devient le périmètre des agents et de l’explorateur pour ce projet.</p></div>${formFooter("Ajouter le projet")}</form>`,
  ),
);
$("#modal").addEventListener("click", (event) => {
  if (event.target === $("#modal")) {
    const r = $("#modal").getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      $("#modal").close();
  }
});
window.addEventListener("hashchange", () => route(location.hash.slice(1)));
view = nav.some((n) => n[0] === location.hash.slice(1))
  ? location.hash.slice(1)
  : "overview";
refresh(true);
setInterval(() => refresh(), 1800);
