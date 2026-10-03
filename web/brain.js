"use strict";
let brainTab = 'inbox', brainPreviewTab = 'text', selectedBrainId = null;
let brainDetail = null, brainDetailLoading = null, brainLoadingProject = null;
let brainSearchResult = null, brainAnswer = null, brainNote = null, brainBusy = false;
let brainCurrentProject = null;
const brainDrafts = new Map();
const brainFiles = new Map();
const brainStatuses = {queued:'En attente', transcribing:'Transcription audio', correcting:'Correction fidèle',
  review:'À relire', exported:'Dans Obsidian', failed:'Erreur', cancelled:'Annulé', interrupted:'À relancer'};
const brainConfig = () => (state.brain?.configs || []).find(config => config.projectId === project().id) || {};
const brainJobs = () => (state.brain?.jobs || []).filter(job => job.projectId === project().id);
const brainActive = status => ['queued','transcribing','correcting'].includes(status);
const brainSelect = (label, name, options, value) => `<label>${esc(label)}<select name="${name}" aria-label="${esc(label)}">${options.map(([id,title]) => `<option value="${esc(id)}" ${id === value ? 'selected' : ''}>${esc(title)}</option>`).join('')}</select></label>`;
const brainArea = (label, name, value, extra) => `<label>${esc(label)}<textarea name="${name}" aria-label="${esc(label)}" rows="3" ${extra}>${esc(value || '')}</textarea></label>`;
const brainPill = status => `<span class="brain-status ${esc(status)}"><i></i>${esc(brainStatuses[status] || status)}</span>`;

function brainView() {
  if (brainCurrentProject !== project().id) {
    brainCurrentProject = project().id;
    brainDetail = null; selectedBrainId = null; brainSearchResult = null; brainAnswer = null; brainNote = null;
  }
  const config = brainConfig(), jobs = brainJobs();
  const active = jobs.filter(job => brainActive(job.status)).length;
  const exported = jobs.filter(job => job.status === 'exported').length;
  const steps = [
    ['01','Votre voix','Audio ou texte transcrit','attachment',Boolean(config.sttUrl || config.inputPath)],
    ['02','Transcription','Paratek V3 · API séparée','terminal',Boolean(config.sttUrl)],
    ['03','Correction fidèle',config.model || 'Modèle local à choisir','spark',Boolean(config.model)],
    ['04','Note Obsidian','YAML + texte · my_brain','memory',Boolean(config.vaultPath)],
  ];
  return `<div class="brain-page">
    ${heading('SECOND CERVEAU','My Brain','Votre voix devient une note. Vos idées restent les vôtres.',
      `${btn('brain-config','Configurer','settings','secondary')}${btn('brain-watch',config.watching ? 'Mettre en pause' : 'Activer la surveillance',config.watching ? 'pause' : 'play',config.watching ? 'secondary' : 'primary',`data-enabled="${!config.watching}"`)}`)}
    <div class="brain-overline"><span class="brain-local">${icon('shield')} Modèles locaux</span><span>${config.watching ? 'Dossier surveillé' : 'Surveillance en pause'}</span><span>${active} en cours</span><span>${exported} note${exported > 1 ? 's' : ''} exportée${exported > 1 ? 's' : ''}</span></div>
    <ol class="brain-pipeline" aria-label="Pipeline de vos vocaux">${steps.map(([number,title,subtitle,ico,configured]) => `<li><span class="brain-step-icon">${icon(ico)}</span><div><small>ÉTAPE ${number}</small><strong>${esc(title)}</strong><p>${esc(subtitle)}</p></div><i class="brain-config-dot ${configured ? 'configured' : ''}" title="${configured ? 'Paramètre configuré · accès à vérifier au traitement' : 'À configurer'}"></i></li>`).join('')}</ol>
    ${config.watchError ? `<p class="brain-alert" role="status">${icon('pause')}${esc(config.watchError)}</p>` : ''}
    <nav class="brain-tabs" aria-label="My Brain">${[['inbox','Boîte vocale','attachment'],['workflow','Mon workflow','network'],['search','Explorer mon cerveau','search']].map(([id,label,ico]) => `<button data-action="brain-tab" data-tab="${id}" aria-current="${brainTab === id ? 'page' : 'false'}" class="${brainTab === id ? 'active' : ''}">${icon(ico)}${label}</button>`).join('')}</nav>
    ${brainTab === 'inbox' ? brainInbox(config,jobs) : brainTab === 'workflow' ? brainWorkflow(config) : brainSearchView(config)}
  </div>`;
}

function brainInbox(config, jobs) {
  const selected = jobs.find(job => job.id === selectedBrainId) || jobs[0];
  selectedBrainId = selected?.id || null;
  const files = brainFiles.get(project().id) || [];
  const draft = brainDrafts.get(project().id) || '';
  return `<div class="brain-inbox"><aside class="brain-input-column"><section class="brain-card brain-composer">
    <div class="brain-section-title"><span>${icon('plus')} Ajouter une dictée</span><small>LOCAL</small></div>
    <form data-form="brain-import"><label class="brain-drop" for="brain-file" tabindex="0" role="button" aria-label="Choisir des fichiers audio ou transcrits">${icon('attachment')}<strong>Déposer mes vocaux</strong><span>Audio ou .txt · jusqu’à 20 fichiers</span><small>20 Mo / audio · 16 000 caractères / texte</small></label>
    <input id="brain-file" type="file" accept=".txt,.wav,.mp3,.m4a,.ogg,.flac,.webm,.mp4" multiple hidden>
    ${files.length ? `<div class="brain-staged">${files.map(file => `<span>${icon('attachment')}${esc(file.name)}</span>`).join('')}${btn('brain-clear-files','Retirer les fichiers','close','quiet','type="button"')}</div>` : ''}
    <label class="brain-text-label" for="brain-draft">Ou coller une transcription</label><textarea id="brain-draft" name="text" rows="7" maxlength="16000" placeholder="Collez ici le texte brut produit par Paratek…" ${files.length ? 'disabled' : ''}>${esc(draft)}</textarea>
    <div class="brain-composer-footer"><span>Corriger, sans résumer.</span><button type="submit" class="button primary" ${!config.model || brainBusy ? 'disabled' : ''}>${icon('spark')}${brainBusy ? 'Import en cours…' : 'Traiter la dictée'}</button></div>
    ${!config.model ? '<p class="brain-hint">Configurez votre API et choisissez un modèle local pour commencer.</p>' : ''}</form>
    </section><section class="brain-card brain-history"><div class="brain-section-title"><span>Mes dictées</span><small>${jobs.length}</small></div>
    <div class="brain-job-list" data-scroll="brain-history">${jobs.map(job => `<button data-action="brain-select" data-id="${esc(job.id)}" class="brain-job ${job.id === selectedBrainId ? 'selected' : ''}"><span class="brain-job-icon">${icon(job.sourceType === 'audio' ? 'attachment' : 'audit')}</span><span><strong>${esc(job.title || job.sourceName)}</strong>${brainPill(job.status)}<small>${esc(new Date(job.createdAt).toLocaleString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}))}</small></span></button>`).join('') || '<p class="brain-empty-small">Aucune dictée pour le moment.<br>Votre historique apparaîtra ici.</p>'}</div></section></aside>
    <section class="brain-card brain-preview">${selected ? brainJobPreview(selected, config) : `<div class="brain-welcome"><div class="brain-orbit">${icon('memory')}</div><small>DE LA VOIX À LA MÉMOIRE</small><h2>Une place pour chaque idée.</h2><p>Ajoutez une dictée. Retrouvez ici sa version corrigée, la transcription originale et le fichier prêt pour Obsidian.</p><div class="brain-example-fields"><span>topics</span><span>tags</span><span>entities</span><span>source</span></div><p class="brain-hint">Les champs YAML relient vos notes à leur sujet et à leur provenance.</p></div>`}</section></div>`;
}

function brainJobPreview(summary, config) {
  const detail = brainDetail?.id === summary.id ? brainDetail : null;
  const result = detail?.result;
  const tabContent = brainPreviewTab === 'yaml' ? detail?.markdown : brainPreviewTab === 'original' ? detail?.original : result?.text;
  return `<header class="brain-preview-header"><div><small>${esc(summary.sourceName)}</small><h2>${esc(summary.title || 'Votre dictée')}</h2>${brainPill(summary.status)}</div><div class="row-actions">${brainActive(summary.status) ? btn('brain-cancel','Annuler','pause','secondary',`data-id="${esc(summary.id)}"`) : ''}${['failed','cancelled','interrupted'].includes(summary.status) ? btn('brain-retry','Relancer','play','secondary',`data-id="${esc(summary.id)}"`) : ''}${result ? btn('brain-download','Télécharger .md','download','secondary') : ''}${summary.status === 'review' ? btn('brain-export','Créer dans Obsidian','folder','primary',`data-id="${esc(summary.id)}" ${config.permission !== 'vault-write' ? 'disabled title="Autorisez l’écriture dans la configuration"' : ''}`) : ''}</div></header>
    ${summary.error || summary.exportError ? `<p class="brain-alert">${esc(summary.error || summary.exportError)}</p>` : ''}
    ${summary.exportPath ? `<p class="brain-export-path">${icon('check')} Note créée · ${esc(summary.exportPath)}</p>` : ''}
    <div class="brain-preview-tabs" aria-label="Version de la dictée">${[['text','Texte corrigé'],['original','Original'],['yaml','Markdown + YAML']].map(([id,label]) => `<button data-action="brain-preview-tab" data-tab="${id}" class="${brainPreviewTab === id ? 'active' : ''}" aria-pressed="${brainPreviewTab === id}">${label}</button>`).join('')}</div>
    ${tabContent ? (brainPreviewTab === 'yaml' ? `<pre class="brain-yaml" data-scroll="brain-note">${esc(tabContent)}</pre>` : `<div class="brain-note-body" data-scroll="brain-note">${esc(tabContent)}</div>`) : `<div class="brain-waiting">${icon(brainActive(summary.status) ? 'clock' : 'audit')}<p>${brainActive(summary.status) ? 'Le pipeline traite votre dictée sur les serveurs locaux configurés.' : 'Aucun texte corrigé disponible.'}</p></div>`}
    ${result ? `<footer class="brain-note-meta"><div class="brain-topic-list">${result.topics.map(topic => `<span>${esc(topic)}</span>`).join('')}${result.tags.map(tag => `<span class="brain-tag">#${esc(tag)}</span>`).join('')}</div><p>${result.corrections.length} correction${result.corrections.length > 1 ? 's' : ''} signalée${result.corrections.length > 1 ? 's' : ''} · ${esc(detail.configuration.model)} · ${summary.usage?.totalTokens == null ? 'Tokens non communiqués' : compact(summary.usage.totalTokens)+' tokens reçus'}</p>
    ${result.uncertainties.length ? `<div class="brain-uncertainties"><strong>Passages à relire</strong>${result.uncertainties.map(text => `<p>${esc(text)}</p>`).join('')}</div>` : ''}
    ${result.corrections.length ? `<details class="brain-corrections"><summary>Voir les corrections</summary>${result.corrections.map(item => `<p><del>${esc(item.from)}</del> → <strong>${esc(item.to)}</strong><small>${esc(item.reason)}</small></p>`).join('')}</details>` : ''}
    <small>La correction est une proposition du modèle. L’original est conservé dans l’historique local.</small></footer>` : ''}`;
}

function brainWorkflow(config) {
  return `<div class="brain-workflow"><section class="brain-card"><div class="brain-section-title"><span>${icon('network')} Connexions & destination</span>${btn('brain-config','Modifier','settings','quiet')}</div><dl class="brain-config-summary"><dt>Modèle de correction</dt><dd>${esc(config.model || 'À choisir')}<small>${esc(config.baseUrl || '')}</small></dd><dt>Transcription audio</dt><dd>${esc(config.sttModel || 'Paratek V3 · connecteur à renseigner')}<small>${esc(config.sttUrl || 'Alternative : importer les fichiers .txt produits par votre logiciel.')}</small></dd><dt>Dossier d’arrivée</dt><dd>${esc(config.inputPath || 'Non configuré')}<small>${config.watching ? 'Surveillance active' : 'En pause'} · fichiers stables uniquement · doublons évités</small></dd><dt>Coffre Obsidian</dt><dd>${esc(config.vaultPath || 'my_brain · chemin à choisir')}<small>${esc(config.outputFolder || 'Inbox/Voix')}</small></dd><dt>Création des notes</dt><dd>${config.permission === 'vault-write' ? config.autoExport ? 'Automatique après traitement' : 'Au clic sur Créer dans Obsidian' : 'Aperçu uniquement · lecture seule'}<small>Nouvelles notes uniquement. Les notes existantes ne sont pas écrasées.</small></dd></dl></section>
    <section class="brain-card"><div class="brain-section-title"><span>${icon('shield')} Les règles de fidélité</span></div><ul class="brain-rules"><li>Corriger les homophones et erreurs probables avec le contexte.</li><li>Conserver les idées, détails, chiffres, ton et langues.</li><li>Transcrire le contenu sans jugement, conseil ni résumé.</li><li>Garder les mots ambigus et signaler les passages à relire.</li><li>Conserver l’original et la provenance de chaque fichier.</li></ul><details class="brain-instructions"><summary>Lire les instructions automatiques envoyées au LLM</summary><pre id="brain-system-instructions"></pre></details><div class="brain-retrieval-note"><strong>Retrouver vos idées</strong><p>Recherche par texte, sujets et métadonnées YAML, puis réponse du modèle local fondée sur les notes retrouvées.</p><small>La recherche actuelle est lexicale. Aucun moteur RLCD ou modèle de prédiction n’est entraîné.</small></div></section></div>`;
}

function brainSearchView(config) {
  return `<section class="brain-card brain-search"><div class="brain-section-title"><span>${icon('search')} Une idée, toutes ses traces</span><small>RECHERCHE LOCALE</small></div><p class="brain-hint">Cherchez un sujet dans les notes Markdown de votre coffre. Le modèle peut ensuite répondre à partir des cinq premiers résultats.</p><form data-form="brain-search"><label class="brain-search-field">${icon('search')}<input id="brain-query" name="query" aria-label="Sujet à rechercher" placeholder="Un projet, un concept, une personne…" maxlength="300" required></label><div class="row-actions"><button class="button secondary" type="submit" ${!config.vaultPath ? 'disabled' : ''}>Rechercher</button>${btn('brain-ask',brainBusy ? 'Recherche en cours…' : 'Demander au modèle','spark','primary',`type="button" ${!config.vaultPath || !config.model || brainBusy ? 'disabled' : ''}`)}</div></form>
    ${brainAnswer ? `<div class="brain-answer"><h3>Réponse à partir de vos notes</h3><div class="message-markdown">${messageMarkdown(brainAnswer.answer)}</div><p class="brain-hint">${brainAnswer.sources.length} source${brainAnswer.sources.length > 1 ? 's' : ''} retrouvée${brainAnswer.sources.length > 1 ? 's' : ''} · extraits de 4 000 caractères maximum par note · ${brainAnswer.usage?.totalTokens == null ? 'Tokens non communiqués' : compact(brainAnswer.usage.totalTokens)+' tokens reçus'}</p></div>` : ''}
    ${brainSearchResult ? `<div class="brain-search-results"><p class="brain-hint">${brainSearchResult.total} résultat${brainSearchResult.total > 1 ? 's' : ''} · texte et YAML · ${esc(brainSearchResult.query)}</p>${brainSearchResult.matches.map(note => `<button class="brain-search-result" data-action="brain-open-note" data-path="${esc(note.path)}">${icon('audit')}<span><strong>${esc(note.title)}</strong><p>${esc(note.excerpt)}</p><small>${esc(note.path)}</small></span>${icon('arrow')}</button>`).join('') || '<p>Aucune note trouvée. Essayez un autre mot-clé.</p>'}</div>` : '<div class="brain-search-empty">'+icon('memory')+'<p>Les liens entre vos idées commencent par une recherche.</p></div>'}
    ${brainNote ? `<details class="brain-found-note" open><summary>${esc(brainNote.path)}</summary><pre>${esc(brainNote.content)}</pre></details>` : ''}</section>`;
}

function brainConfigurationModal() {
  const config = brainConfig();
  modal('Configurer My Brain','Branchez vos modèles locaux, puis choisissez où arrivent vos notes.',
    `<form data-form="brain-config"><div class="modal-body brain-config-form"><fieldset><legend>1 · Correction avec votre LLM local</legend>${field('URL de base du LLM','baseUrl',config.baseUrl || 'http://127.0.0.1:1234/v1','url','required')}
      <div class="brain-catalog-row">${brainSelect('Modèle local','model',[['','Choisir après lecture du catalogue'],...(config.models || []).map(model => [model,model])],config.model)}${btn('brain-discover','Lire le catalogue','plug','secondary','type="button"')}</div><p id="brain-catalog-state" class="brain-hint">${esc(config.catalogError || 'LM Studio : démarrer le serveur dans Developer, puis lire le catalogue. Cette lecture ne lance aucune génération.')}</p>
      ${field('Variable de clé locale (facultative)','credentialEnvironment',config.credentialEnvironment || '','text','placeholder="ATELIER_BRAIN_LLM_API_KEY"')}
      <label class="check-option"><input type="checkbox" name="structuredOutput" ${config.structuredOutput !== false ? 'checked' : ''}><span>Sortie JSON structurée (LM Studio). Décochez uniquement si votre serveur ne la prend pas en charge.</span></label>
      <div class="form-grid">${field('Délai par appel (secondes)','timeout',config.timeout || 120,'number','min="5" max="180" required')}${field('Tokens de sortie maximum','maxOutputTokens',config.maxOutputTokens || 8192,'number','min="512" max="16384" required')}</div></fieldset>
      <fieldset><legend>2 · Audio avec Paratek V3</legend>${field('URL complète de transcription audio','sttUrl',config.sttUrl || '','url','placeholder="http://127.0.0.1:PORT/v1/audio/transcriptions"')}${field('Identifiant ASR attendu par votre serveur','sttModel',config.sttModel || '','text','maxlength="200"')}<p class="brain-hint">Connecteur compatible POST multipart : file, model, response_format=json → réponse {"text":"…"}. LM Studio fournit le LLM ; l’API audio dépend de votre installation Paratek. Vous pouvez aussi importer ses fichiers .txt.</p></fieldset>
      <fieldset><legend>3 · Dossiers & automatisation</legend><div class="brain-folder-field">${field('Chemin du coffre Obsidian my_brain','vaultPath',config.vaultPath || '','text','placeholder="/chemin/vers/my_brain"')}${btn('brain-pick-folder','Choisir','folder','secondary','type="button" data-field="vaultPath"')}</div>${field('Sous-dossier des nouvelles notes','outputFolder',config.outputFolder || 'Inbox/Voix','text','required')}<div class="brain-folder-field">${field('Dossier d’arrivée des audio et .txt','inputPath',config.inputPath || '')}${btn('brain-pick-folder','Choisir','folder','secondary','type="button" data-field="inputPath"')}</div>
      ${brainSelect('Permission sur le coffre','permission',[['read-only','Lecture seule · aperçu et recherche'],['vault-write','Autoriser la création de nouvelles notes']],config.permission || 'read-only')}
      <label class="check-option"><input type="checkbox" name="autoExport" ${config.autoExport ? 'checked' : ''}><span>Créer automatiquement la note après correction, dans le coffre choisi.</span></label><p class="brain-hint">L’enregistrement ne démarre pas la surveillance. Activez-la depuis My Brain. Une pause arrête les nouveaux imports ; les traitements déjà en file continuent. Après redémarrage, la reprise est explicite.</p></fieldset>
      <fieldset><legend>4 · Votre vocabulaire</legend>${brainArea('Contexte pour désambiguïser','context',config.context,'maxlength="4000" placeholder="Domaine, projets, contexte de vos dictées…"')}${brainArea('Glossaire de noms et termes','glossary',config.glossary,'maxlength="4000" placeholder="Obsidian, my_brain, noms de projets…"')}</fieldset>
    </div>${formFooter('Enregistrer le workflow')}</form>`,true);
}

function brainFormValues(form) {
  const values = Object.fromEntries(new FormData(form));
  return {...values, projectId:project().id, timeout:Number(values.timeout), maxOutputTokens:Number(values.maxOutputTokens),
    autoExport:form.elements.autoExport.checked, structuredOutput:form.elements.structuredOutput.checked};
}

async function handleBrainSubmit(form, values) {
  const targetProject = project().id;
  if (form.dataset.form === 'brain-config') {
    if (!form.elements.model.value) throw new Error('Lisez le catalogue, puis choisissez un modèle local avant d’enregistrer le workflow.');
    await api('brain/configure',brainFormValues(form));
    $('#modal').close(); await refresh(true); toast('Workflow local enregistré.'); return;
  }
  if (form.dataset.form === 'brain-search') {
    brainAnswer = null; brainNote = null;
    const results = await api('brain/search?project='+encodeURIComponent(targetProject)+'&q='+encodeURIComponent(values.query));
    if (project().id === targetProject) {brainSearchResult = results; render();} return;
  }
  brainBusy = true;
  try {
    const files = brainFiles.get(targetProject) || [];
    const importJobs = [];
    if (files.length) {
      while (files.length) {
        const file = files[0];
        let payload;
        if (file.name.toLowerCase().endsWith('.txt')) payload = {sourceType:'text',text:await file.text()};
        else payload = {sourceType:'audio',audioBase64:await new Promise((resolve,reject) => {
          const reader = new FileReader(); reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
          reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.readAsDataURL(file);
        })};
        const job = await api('brain/import',{...payload,projectId:targetProject,sourceName:file.name});
        importJobs.push(job); files.shift();
      }
      brainFiles.delete(targetProject);
    } else {
      const job = await api('brain/import',{projectId:targetProject,sourceType:'text',sourceName:'Dictée collée',text:values.text});
      importJobs.push(job); brainDrafts.delete(targetProject);
      if (project().id === targetProject && $('#brain-draft')) $('#brain-draft').value = '';
    }
    if (project().id === targetProject) {selectedBrainId = importJobs.at(-1).id; brainDetail = null;}
    toast(importJobs.some(job => job.duplicate) ? 'Source déjà présente : historique conservé, aucun traitement en double.' : 'Dictée ajoutée au pipeline local.');
  } finally {brainBusy = false; await refresh(true);}
}

function mountBrain() {
  if (view !== 'brain') return;
  const summary = brainJobs().find(job => job.id === selectedBrainId);
  if (brainTab === 'inbox' && summary && (!brainDetail || brainDetail.id !== summary.id || brainDetail.updatedAt !== summary.updatedAt)
      && !(brainDetailLoading === summary.id && brainLoadingProject === project().id)) {
    const id = summary.id, targetProject = project().id;
    brainDetailLoading = id; brainLoadingProject = targetProject;
    api('brain/job?id='+encodeURIComponent(id)).then(detail => {
      if (brainDetailLoading === id && brainLoadingProject === targetProject) {brainDetailLoading = null; brainLoadingProject = null;}
      if (selectedBrainId === id && project().id === targetProject) {brainDetail = detail; if (view === 'brain') render();}
    }).catch(error => toast(error.message,true)).finally(() => {
      if (brainDetailLoading === id && brainLoadingProject === targetProject) {brainDetailLoading = null; brainLoadingProject = null;}
    });
  }
  const fileInput = $('#brain-file'), drop = $('.brain-drop');
  const acceptFiles = files => {
    if (files.length > 20) {toast('Maximum 20 fichiers par import.',true); return;}
    if (files.some(file => file.size > 20*1024*1024 || !/\.(txt|wav|mp3|m4a|ogg|flac|webm|mp4)$/i.test(file.name))) {
      toast('Utilisez un audio de 20 Mo maximum ou une transcription .txt.',true); return;
    }
    brainFiles.set(project().id, files); render();
  };
  fileInput?.addEventListener('change',() => acceptFiles([...fileInput.files]));
  drop?.addEventListener('keydown',event => {if (['Enter',' '].includes(event.key)) {event.preventDefault(); fileInput.click();}});
  drop?.addEventListener('dragover',event => {event.preventDefault(); drop.classList.add('dragging');});
  drop?.addEventListener('dragleave',() => drop.classList.remove('dragging'));
  drop?.addEventListener('drop',event => {event.preventDefault(); acceptFiles([...event.dataTransfer.files]);});
  $('#brain-draft')?.addEventListener('input',event => brainDrafts.set(project().id,event.target.value));
  const instruction = $('#brain-system-instructions');
  if (instruction) instruction.textContent = brainConfig().structuredOutput === false ? state.brain?.compatibilityInstructions || '' : state.brain?.instructions || '';
}

function installBrainActions() {
  Object.assign(actions,{
    'brain-config':brainConfigurationModal,
    'brain-tab':element => {brainTab = element.dataset.tab; render();},
    'brain-preview-tab':element => {brainPreviewTab = element.dataset.tab; render();},
    'brain-select':element => {selectedBrainId = element.dataset.id; brainDetail = null; render();},
    'brain-clear-files':() => {brainFiles.delete(project().id); render();},
    'brain-pick-folder':async element => {
      const result = window.atelierDesktop ? await window.atelierDesktop.pickDirectory() : await api('projects/pick',{});
      const input = $('#modal form')?.elements[element.dataset.field];
      if (result.path && input) input.value = result.path;
    },
    'brain-discover':async () => {
      const form = $('#modal [data-form="brain-config"]');
      const values = brainFormValues(form), modelSelect = form.elements.model;
      const saveButton = form.querySelector('[type="submit"]');
      modelSelect.disabled = true; saveButton.disabled = true;
      $('#brain-catalog-state').textContent = 'Lecture du catalogue local…';
      try {
        await api('brain/configure',values);
        const config = await api('brain/discover',{projectId:project().id});
        modelSelect.innerHTML = `<option value="">Choisir un modèle</option>`+config.models.map(model => `<option value="${esc(model)}" ${config.model === model ? 'selected' : ''}>${esc(model)}</option>`).join('');
        $('#brain-catalog-state').textContent = config.models.length+' modèle(s) reçu(s). Choisissez votre modèle, puis enregistrez.';
        await refresh(true);
      } catch (error) {
        $('#brain-catalog-state').textContent = error.message;
        throw error;
      } finally {modelSelect.disabled = false; saveButton.disabled = false;}
    },
    'brain-watch':async element => {await api('brain/watch',{projectId:project().id,enabled:element.dataset.enabled === 'true'}); await refresh(true);},
    'brain-export':async element => {await api('brain/export',{id:element.dataset.id}); await refresh(true);},
    'brain-cancel':async element => {await api('brain/cancel',{id:element.dataset.id}); await refresh(true);},
    'brain-retry':async element => {await api('brain/retry',{id:element.dataset.id}); await refresh(true);},
    'brain-download':() => {if (brainDetail?.markdown) download(brainDetail.id+'.md',brainDetail.markdown,'text/markdown');},
    'brain-open-note':async element => {const targetProject = project().id; const note = await api('brain/note?project='+encodeURIComponent(targetProject)+'&path='+encodeURIComponent(element.dataset.path)); if (project().id === targetProject) {brainNote = note; render();}},
    'brain-ask':async () => {
      const query = $('#brain-query').value, targetProject = project().id;
      if (!query.trim()) throw new Error('Indiquez le sujet ou la question.');
      brainBusy = true; brainAnswer = null; render();
      try {
        const answer = await api('brain/ask',{projectId:targetProject,query});
        if (project().id === targetProject) {brainAnswer = answer; brainSearchResult = {query,matches:answer.sources,total:answer.sources.length};}
      } finally {brainBusy = false; if (view === 'brain') render();}
    },
  });
}
