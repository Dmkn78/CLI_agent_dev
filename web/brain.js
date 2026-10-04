"use strict";
let brainTab = 'inbox', brainPreviewTab = 'original', selectedBrainId = null;
let brainDetail = null, brainDetailLoading = null, brainLoadingProject = null;
let brainSearchResult = null, brainAnswer = null, brainNote = null, brainBusy = false;
let brainCurrentProject = null;
let brainComparisonCache = null, brainRecovery = null;
const brainDrafts = new Map();
const brainFiles = new Map();
const brainYoutubeDrafts = new Map();
const brainQueryDrafts = new Map();
const brainImportErrors = new Map();
const brainFileMetadata = new WeakMap();
const brainFolderSelections = new Map();
const brainReadingFolders = new Set();
const brainUploadProgress = new Map();
const brainBatchDetails = new Map();
const brainBatchLoading = new Set();
const brainFileExtensions = /\.(txt|wav|mp3|m4a|ogg|flac|webm|mp4)$/i;
const brainSourceTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const brainBatches = () => (state.brain?.batches || []).filter(batch => batch.projectId === project().id);
const brainFileInfo = file => brainFileMetadata.get(file) || {
  relativePath:file.webkitRelativePath || file.name,modifiedAt:new Date(file.lastModified).toISOString(),directory:Boolean(file.webkitRelativePath)};
const brainSourceDate = (value,timeZone) => value ? /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('/') : new Date(value).toLocaleString('fr-FR',timeZone ? {timeZone} : {}) : '';
const brainStatuses = {queued:'En attente', downloading:'Téléchargement YouTube', transcribing:'Transcription audio', correcting:'Proposition IA',
  review:'À relire', exported:'Dans Obsidian', failed:'Erreur', cancelled:'Annulé', interrupted:'À relancer'};
const brainConfig = () => (state.brain?.configs || []).find(config => config.projectId === project().id) || {};
const brainJobs = () => (state.brain?.jobs || []).filter(job => job.projectId === project().id);
const brainActive = status => ['queued','downloading','transcribing','correcting'].includes(status);
const brainSelect = (label, name, options, value) => `<label>${esc(label)}<select name="${name}" aria-label="${esc(label)}">${options.map(([id,title]) => `<option value="${esc(id)}" ${id === value ? 'selected' : ''}>${esc(title)}</option>`).join('')}</select></label>`;
const brainArea = (label, name, value, extra) => `<label>${esc(label)}<textarea name="${name}" aria-label="${esc(label)}" rows="3" ${extra}>${esc(value || '')}</textarea></label>`;
const brainPill = status => `<span class="brain-status ${esc(status)}"><i></i>${esc(brainStatuses[status] || status)}</span>`;

function brainView() {
  if (brainCurrentProject !== project().id) {
    brainCurrentProject = project().id;
    brainDetail = null; selectedBrainId = null; brainPreviewTab = 'original'; brainSearchResult = null; brainAnswer = null; brainNote = null;
  }
  const config = brainConfig(), jobs = brainJobs();
  const active = jobs.filter(job => brainActive(job.status)).length;
  const exported = jobs.filter(job => job.status === 'exported').length;
  const steps = [
    ['01','Vos sources',config.inputSource === 'fluidvoice' ? 'Fluid Voice, fichiers ou YouTube' : 'Audio, texte ou lien YouTube','attachment',Boolean(config.inputSource === 'fluidvoice' || config.inputPath)],
    ['02','Transcription',config.sttProvider === 'fluidvoice' ? 'Parakeet · Fluid Voice sur ce Mac' : 'Serveur audio compatible','terminal',Boolean(config.sttUrl)],
    ['03','Relecture minimale',config.model || 'Modèle local à choisir','spark',Boolean(config.model)],
    ['04','Note Obsidian','Texte brut + proposition à relire','memory',Boolean(config.vaultPath)],
  ];
  return `<div class="brain-page">
    ${heading('SECOND CERVEAU','My Brain','Vos fichiers et vidéos deviennent des notes. Vos idées restent les vôtres.',
      `${btn('brain-detect','Détecter mes outils','plug','secondary')}${btn('brain-config','Configurer','settings','secondary')}${btn('brain-watch',config.watching ? 'Mettre en pause' : 'Activer la surveillance',config.watching ? 'pause' : 'play',config.watching ? 'secondary' : 'primary',`data-enabled="${!config.watching}"`)}`)}
    <div class="brain-overline"><span class="brain-local">${icon('shield')} Modèles locaux</span><span>${config.watching ? config.inputSource === 'fluidvoice' ? 'Nouvelles dictées Fluid Voice suivies' : 'Dossier surveillé' : 'Surveillance en pause'}</span><span>${active} en cours</span><span>${exported} note${exported > 1 ? 's' : ''} exportée${exported > 1 ? 's' : ''}</span></div>
    ${config.localSetup ? brainLocalStatus(config) : ''}
    <ol class="brain-pipeline" aria-label="Pipeline de vos vocaux">${steps.map(([number,title,subtitle,ico,configured]) => `<li><span class="brain-step-icon">${icon(ico)}</span><div><small>ÉTAPE ${number}</small><strong>${esc(title)}</strong><p>${esc(subtitle)}</p></div><i class="brain-config-dot ${configured ? 'configured' : ''}" title="${configured ? 'Paramètre configuré · accès à vérifier au traitement' : 'À configurer'}"></i></li>`).join('')}</ol>
    ${config.watchError ? `<p class="brain-alert" role="status">${icon('pause')}${esc(config.watchError)}</p>` : ''}
    <nav class="brain-tabs" aria-label="My Brain">${[['inbox','Boîte vocale','attachment'],['workflow','Mon workflow','network'],['search','Explorer mon cerveau','search']].map(([id,label,ico]) => `<button data-action="brain-tab" data-tab="${id}" aria-current="${brainTab === id ? 'page' : 'false'}" class="${brainTab === id ? 'active' : ''}">${icon(ico)}${label}</button>`).join('')}</nav>
    ${brainTab === 'inbox' ? brainInbox(config,jobs) : brainTab === 'workflow' ? brainWorkflow(config) : brainSearchView(config)}
  </div>`;
}

function brainLocalStatus(config) {
  const fluid = config.localSetup.fluidVoice || {};
  return `<div class="brain-local-status" role="status"><strong>${fluid.installed ? 'Fluid Voice '+esc(fluid.version || '')+' détecté' : 'Fluid Voice non détecté sur ce Mac'}</strong><span>${fluid.modelPresent ? 'Fichiers Parakeet V3 présents' : 'Modèle Parakeet à vérifier'}</span><span>${fluid.historyEnabled || config.watching && config.inputSource === 'fluidvoice' ? 'Historique des dictées activé' : 'Réception des dictées : historique Fluid Voice à activer'}</span><span>${config.model ? 'LLM sélectionné : '+esc(config.model) : esc(config.catalogError || 'Serveur LLM à connecter')}</span></div>`;
}

function brainAudioSetup(config) {
  if (!config.model) return 'Choisissez votre modèle de correction dans Configurer.';
  if (!config.sttUrl || (config.sttProvider !== 'fluidvoice' && !config.sttModel)) return 'Configurez la transcription audio dans Configurer, puis importez votre source.';
  return '';
}

function brainYoutubeComposer(config) {
  const media = state.brain?.media;
  const limits = media?.limits || {};
  const minutes = Math.floor((limits.maxDurationSeconds || 1200) / 60);
  const megabytes = Math.floor((limits.maxAudioBytes || 20*1024*1024) / (1024*1024));
  const setup = brainAudioSetup(config);
  const missing = media?.ready === false ? (media.missing || []).join(', ') || 'yt-dlp et ffmpeg' : '';
  return `<section class="brain-card brain-composer brain-youtube"><div class="brain-section-title"><span>${icon('play')} Depuis YouTube</span><small>MP3</small></div>
    <form data-form="brain-import" data-source="youtube"><label class="brain-text-label" for="brain-youtube-url">Lien de la vidéo YouTube</label><input id="brain-youtube-url" name="url" type="url" required maxlength="2048" value="${esc(brainYoutubeDrafts.get(project().id) || '')}" placeholder="https://www.youtube.com/watch?v=…" aria-describedby="brain-youtube-hint" ${brainBusy ? 'readonly' : ''}>
    <p id="brain-youtube-hint" class="brain-hint">Atelier télécharge le MP3, puis lance la transcription et la correction locales. ${minutes} min maximum · MP3 de ${megabytes} Mo maximum. Le MP3 reste téléchargeable dans l’historique.</p>
    ${missing ? `<p class="brain-alert" role="status">Téléchargement indisponible : ${esc(missing)} manquant(s) sur le service local.</p>` : media?.ready ? '<p class="brain-media-ready">Outils de téléchargement détectés</p>' : ''}
    ${setup ? `<p class="brain-hint">${esc(setup)}</p>` : ''}
    <button type="submit" class="button primary" ${brainBusy || setup || missing ? 'disabled' : ''}>${icon('download')}${brainBusy ? 'Import en cours…' : 'Importer et transcrire'}</button>
    ${brainImportErrors.get(project().id)?.source === 'youtube' ? `<p class="brain-alert" role="alert">${esc(brainImportErrors.get(project().id).message)}</p>` : ''}</form></section>`;
}

function brainBatchProgressView() {
  const batches = brainBatches();
  const upload = brainUploadProgress.get(project().id);
  if (!batches.length && !upload) return '';
  return `<section class="brain-card brain-batches" aria-label="Progression des imports de dossiers"><div class="brain-section-title"><span>${icon('folder')} Mes imports de dossiers</span><small>CONSERVÉS</small></div>
    ${upload ? `<p class="brain-upload-current" role="status">${esc(upload.error || (upload.active ? 'Copie '+upload.current+' / '+upload.total+' · '+upload.path : 'Sources transmises au service local.'))}</p>` : ''}
    <div class="brain-batch-list">${batches.map(batch => {
      const detail = brainBatchDetails.get(batch.id);
      const errors = (detail?.entries || []).filter(entry => entry.error || ['failed','cancelled','interrupted'].includes(entry.status));
      const copied = Math.max(0,batch.total-batch.pending), finished = Math.min(batch.total,batch.completed+batch.failed);
      const labels = {uploading:'Réception incomplète',processing:'Traitement en cours',completed:'Lot terminé',failed:'Lot terminé avec erreurs'};
      return `<article class="brain-batch" data-batch-id="${esc(batch.id)}"><div class="brain-batch-heading"><strong>${esc(batch.name)}</strong><span>${esc(labels[batch.state] || batch.state)}</span></div>
        <label>Réception · ${copied} / ${batch.total} fichiers<progress max="${batch.total}" value="${copied}"></progress></label><label>Traitement · ${finished} / ${batch.total} fichiers<progress max="${batch.total}" value="${finished}"></progress></label>
        <p>${batch.received} source${batch.received > 1 ? 's' : ''} reçue${batch.received > 1 ? 's' : ''} · ${batch.completed} terminée${batch.completed > 1 ? 's' : ''} · ${batch.active} en cours · ${batch.failed} erreur${batch.failed > 1 ? 's' : ''}${batch.duplicates ? ' · '+batch.duplicates+' doublon(s) reconnu(s)' : ''}</p>
        ${batch.pending > 0 && !(upload?.active && upload.id === batch.id) ? `<div class="brain-batch-resume"><span>Pour copier les fichiers restants, rechoisissez le même dossier avec les mêmes chemins et dates. Les sources déjà reçues sont conservées.</span>${btn('brain-pick-upload-folder','Rechoisir le dossier','folder','secondary',`type="button" ${brainBusy ? 'disabled' : ''}`)}</div>` : ''}
        ${batch.failed ? `<details class="brain-batch-errors" open><summary>${batch.failed} erreur${batch.failed > 1 ? 's' : ''} à examiner</summary>${errors.length ? errors.map(entry => `<div><span><strong>${esc(entry.relativePath)}</strong><small>${esc(entry.error || brainStatuses[entry.status] || entry.status)}</small></span>${entry.jobId ? btn('brain-retry','Relancer','play','quiet',`type="button" data-id="${esc(entry.jobId)}" ${entry.retryable === false ? 'disabled' : ''}`) : '<small>Rechoisir le dossier pour réessayer ce fichier.</small>'}</div>`).join('') : '<p>Lecture du détail des erreurs…</p>'}</details>` : ''}
        </article>`;
    }).join('')}</div></section>`;
}

function brainInbox(config, jobs) {
  const selected = jobs.find(job => job.id === selectedBrainId) || jobs[0];
  selectedBrainId = selected?.id || null;
  const files = brainFiles.get(project().id) || [];
  const draft = brainDrafts.get(project().id) || '';
  const folder = brainFolderSelections.get(project().id);
  const reading = brainReadingFolders.has(project().id);
  const locked = brainBusy || reading;
  const needsAudio = files.some(file => brainFileExtensions.test(file.name) && !file.name.toLowerCase().endsWith('.txt'));
  const setup = needsAudio ? brainAudioSetup(config) : !config.model ? 'Configurez votre API et choisissez un modèle local pour commencer.' : '';
  return `${brainBatchProgressView()}<div class="brain-inbox"><aside class="brain-input-column"><section class="brain-card brain-composer">
    <div class="brain-section-title"><span>${icon('plus')} Ajouter mes fichiers</span><small>LOCAL</small></div>
    <form data-form="brain-import"><label class="brain-drop" for="brain-file" tabindex="0" role="button" aria-label="Choisir des fichiers audio ou transcrits" aria-disabled="${locked}">${icon('attachment')}<strong>${reading ? 'Lecture du dossier…' : 'Déposer fichiers ou dossier'}</strong><span>Audio ou .txt · sous-dossiers inclus</span><small>20 fichiers seuls · jusqu’à 1 000 par dossier</small></label>
    <input id="brain-file" type="file" accept=".txt,.wav,.mp3,.m4a,.ogg,.flac,.webm,.mp4" multiple hidden ${locked ? 'disabled' : ''}><input id="brain-directory" type="file" webkitdirectory directory multiple hidden ${locked ? 'disabled' : ''}>
    <div class="brain-folder-picker">${btn('brain-pick-upload-folder','Choisir un dossier','folder','secondary',`type="button" ${locked ? 'disabled' : ''}`)}<span>20 Mo / audio · 16 000 caractères / texte</span></div>
    ${files.length ? `<div class="brain-staged"><p>${folder ? 'Dossier '+esc(folder.name)+' · ' : ''}${files.length} fichier${files.length > 1 ? 's' : ''} prêt${files.length > 1 ? 's' : ''}${folder?.ignored ? ' · '+folder.ignored+' élément(s) caché(s) ignoré(s)' : ''}</p><div class="brain-staged-list" data-scroll="brain-staged">${files.map((file,index) => `<div class="brain-staged-file">${icon('attachment')}<span>${esc(brainFileInfo(file).relativePath)}<small>${Math.max(1,Math.ceil(file.size/1024)).toLocaleString('fr-FR')} Ko · ${esc(brainSourceDate(brainFileInfo(file).modifiedAt))}</small></span><button type="button" class="icon-btn" data-action="brain-remove-file" data-index="${index}" aria-label="Retirer ${esc(file.name)}" ${locked ? 'disabled' : ''}>${icon('close')}</button></div>`).join('')}</div>${btn('brain-clear-files','Retirer les fichiers','close','quiet',`type="button" ${locked ? 'disabled' : ''}`)}</div>` : ''}
    ${folder ? '<p class="brain-hint">Copie fichier par fichier, puis traitement en file. Gardez cette page ouverte pendant la copie. En cas d’interruption, rechoisissez le même dossier pour reprendre.</p>' : ''}
    <label class="brain-text-label" for="brain-draft">Ou coller une transcription</label><textarea id="brain-draft" name="text" rows="7" maxlength="16000" placeholder="Saisissez ou collez votre texte brut. Vous pouvez le modifier avant de traiter…" ${files.length ? 'disabled' : brainBusy ? 'readonly' : ''}>${esc(draft)}</textarea>
    ${files.length && draft ? '<p class="brain-hint">Votre texte collé est conservé. Retirez les fichiers pour le traiter.</p>' : ''}
    <div class="brain-composer-footer"><span>Le texte brut reste la référence.</span><button type="submit" class="button primary" ${setup || locked ? 'disabled' : ''}>${icon('spark')}${brainBusy ? 'Import en cours…' : reading ? 'Lecture du dossier…' : folder ? 'Traiter tout le dossier' : 'Traiter la dictée'}</button></div>
    ${setup ? `<p class="brain-hint">${esc(setup)}</p>` : ''}
    ${brainImportErrors.get(project().id)?.source === 'files' ? `<p class="brain-alert" role="alert">${esc(brainImportErrors.get(project().id).message)}</p>` : ''}</form>
    </section>${brainYoutubeComposer(config)}<section class="brain-card brain-history"><div class="brain-section-title"><span>Mes sources</span><small>${jobs.length}</small></div>
    <div class="brain-job-list" data-scroll="brain-history">${jobs.map(job => `<button data-action="brain-select" data-id="${esc(job.id)}" class="brain-job ${job.id === selectedBrainId ? 'selected' : ''}"><span class="brain-job-icon">${icon(job.sourceType === 'youtube' ? 'play' : job.sourceType === 'audio' ? 'attachment' : 'audit')}</span><span><strong>${esc(job.title || job.sourceTitle || job.sourceName)}</strong>${job.subject ? '<span class="brain-job-subject">'+esc(job.subject)+'</span>' : ''}${brainPill(job.status)}<small>${job.noteDate ? 'Date note : '+esc(brainSourceDate(job.noteDate))+' · ' : ''}Import : ${esc(new Date(job.createdAt).toLocaleString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}))}</small></span></button>`).join('') || '<p class="brain-empty-small">Aucune source pour le moment.<br>Vos fichiers et vidéos apparaîtront ici.</p>'}</div></section></aside>
    <section class="brain-card brain-preview">${selected ? brainJobPreview(selected, config) : `<div class="brain-welcome"><div class="brain-orbit">${icon('memory')}</div><small>DE VOS SOURCES À LA MÉMOIRE</small><h2>Une place pour chaque idée.</h2><p>Déposez vos fichiers, saisissez un texte ou ajoutez une vidéo YouTube. Le texte brut reste la référence. Vous pouvez comparer la proposition IA avant d’utiliser votre note Obsidian.</p><div class="brain-example-fields"><span>topics</span><span>tags</span><span>entities</span><span>source</span></div><p class="brain-hint">Les propriétés YAML relient vos notes à leur sujet et à leur provenance.</p></div>`}</section></div>`;
}

function brainCompareTexts(original, proposed) {
  if (brainComparisonCache?.original === original && brainComparisonCache?.proposed === proposed) return brainComparisonCache;
  const tokenize = value => value.match(/\s+|[\p{L}\p{N}_'’-]+|[^\s]/gu) || [];
  const before = tokenize(original), after = tokenize(proposed), pieces = [];
  const append = (kind,text) => {
    if (!text) return;
    if (pieces.at(-1)?.kind === kind) pieces.at(-1).text += text;
    else pieces.push({kind,text});
  };
  let first = 0, lastBefore = before.length, lastAfter = after.length;
  while (first < Math.min(lastBefore,lastAfter) && before[first] === after[first]) first++;
  while (lastBefore > first && lastAfter > first && before[lastBefore-1] === after[lastAfter-1]) {lastBefore--;lastAfter--;}
  append('equal',before.slice(0,first).join(''));
  const rows = lastBefore-first, columns = lastAfter-first;
  // Bound work for completely rewritten transcripts; the full changed span remains visible.
  if ((rows+1)*(columns+1) > 250000) {
    append('remove',before.slice(first,lastBefore).join(''));
    append('add',after.slice(first,lastAfter).join(''));
  } else {
    const width = columns+1, table = new Uint16Array((rows+1)*width);
    for (let row=rows-1;row>=0;row--) for (let column=columns-1;column>=0;column--)
      table[row*width+column] = before[first+row] === after[first+column] ? table[(row+1)*width+column+1]+1 : Math.max(table[(row+1)*width+column],table[row*width+column+1]);
    let row = 0, column = 0;
    while (row < rows || column < columns) {
      if (row < rows && column < columns && before[first+row] === after[first+column]) {append('equal',before[first+row++]);column++;}
      else if (row < rows && (column === columns || table[(row+1)*width+column] >= table[row*width+column+1])) append('remove',before[first+row++]);
      else append('add',after[first+column++]);
    }
  }
  append('equal',before.slice(lastBefore).join(''));
  const changes = [];
  for (let index=0;index<pieces.length;index++) {
    if (pieces[index].kind === 'equal') continue;
    const change = {before:'',after:''};
    while (index < pieces.length && pieces[index].kind !== 'equal') {
      change[pieces[index].kind === 'remove' ? 'before' : 'after'] += pieces[index].text;index++;
    }
    index--;changes.push(change);
  }
  brainComparisonCache = {original,proposed,pieces,changes,changed:original !== proposed};
  return brainComparisonCache;
}

function brainComparisonView(comparison) {
  const column = (side,label) => `<section class="brain-comparison-column"><h3>${label}</h3><div class="brain-comparison-text">${comparison.pieces.filter(piece => piece.kind !== (side === 'before' ? 'add' : 'remove')).map(piece => piece.kind === 'equal' ? esc(piece.text) : `<mark class="${piece.kind}">${esc(piece.text)}</mark>`).join('')}</div></section>`;
  return `<div class="brain-comparison"><p class="brain-comparison-hint">${comparison.changed ? 'Les passages surlignés montrent les écarts entre les deux textes. Relisez-les avant d’utiliser la proposition.' : 'Les deux textes sont identiques.'}</p><div class="brain-comparison-columns">${column('before','Avant · texte brut de référence')}${column('after','Après · proposition IA non validée')}</div></div>`;
}

function brainReviewView(detail, comparison) {
  const review = detail?.transcriptionReview;
  const status = !comparison.changed ? 'unchanged' : review?.status === 'minimal' ? 'minimal' : 'review-required';
  const labels = {unchanged:'Texte brut conservé à l’identique',minimal:'Modifications limitées · à relire', 'review-required':'Modifications à examiner avant utilisation'};
  return `<div class="brain-fidelity ${status}" role="status"><strong>${labels[status]}</strong><p>Le texte brut reste la référence. ${comparison.changed ? 'La proposition IA n’est pas validée et ne remplace pas votre transcription.' : 'Aucun écart constaté entre le texte brut et la proposition IA.'}</p>${(review?.warnings || []).map(warning => `<p class="brain-fidelity-warning">${esc(warning)}</p>`).join('')}</div>`;
}

function brainCurrentDraft() {
  return $('#brain-draft')?.value ?? brainDrafts.get(project().id) ?? '';
}

function brainSetRecoveredDraft(text) {
  if (text.length > 16000) throw new Error('Ce texte dépasse les 16 000 caractères du brouillon. Votre brouillon actuel est conservé ; utilisez la source .txt pour un autre traitement.');
  brainDrafts.set(project().id,text);
  if ($('#brain-draft')) $('#brain-draft').value = text;
  brainTab = 'inbox'; render();
  $('#brain-draft')?.focus();
  toast((brainFiles.get(project().id) || []).length ? 'Texte repris et conservé. Retirez les fichiers sélectionnés pour le modifier et le traiter.' : 'Texte brut repris dans le brouillon. Vous pouvez le modifier avant de traiter.');
}

function brainReuseOriginal() {
  if (brainBusy) return;
  const text = brainDetail?.id === selectedBrainId ? brainDetail.original : null;
  if (typeof text !== 'string' || !text) throw new Error('La transcription originale n’est pas disponible.');
  const previous = brainCurrentDraft();
  if (!previous || previous === text) {brainSetRecoveredDraft(text);return;}
  brainRecovery = {projectId:project().id,text,previous};
  modal('Votre brouillon contient déjà du texte','Choisissez comment reprendre la transcription brute. Votre brouillon est conservé tant que vous ne choisissez pas de le remplacer.',
    `<div class="modal-body brain-recovery"><h3>Brouillon actuel</h3><pre>${esc(previous)}</pre><h3>Texte brut à reprendre</h3><pre>${esc(text)}</pre></div><footer class="modal-footer brain-recovery-actions">${btn('dismiss','Conserver mon brouillon','','secondary','type="button"')}${btn('brain-apply-recovery','Ajouter à la suite','plus','secondary','type="button" data-mode="append"')}${btn('brain-apply-recovery','Remplacer mon brouillon','audit','primary','type="button" data-mode="replace"')}</footer>`,true);
}

function brainApplyRecovery(element) {
  if (brainBusy || !brainRecovery || brainRecovery.projectId !== project().id) throw new Error('Le projet ou le traitement a changé. Reprenez le texte depuis la source choisie.');
  if (brainCurrentDraft() !== brainRecovery.previous) {
    throw new Error('Votre brouillon a changé depuis l’ouverture. Il est conservé ; fermez cette fenêtre et choisissez à nouveau Reprendre le texte.');
  }
  const text = element.dataset.mode === 'append' ? brainRecovery.previous+'\n\n'+brainRecovery.text : brainRecovery.text;
  brainSetRecoveredDraft(text);
  brainRecovery = null; $('#modal').close();
}

function brainJobPreview(summary, config) {
  const detail = brainDetail?.id === summary.id ? brainDetail : null;
  const result = detail?.result;
  const metadata = detail?.noteMetadata || {};
  const subject = summary.subject || metadata.subject || '';
  const description = summary.description || metadata.description || result?.description || '';
  const noteDate = summary.noteDate || metadata.note_date;
  const dateBasis = {summary:'Date annoncée du résumé',filename:'Nom du fichier',source_modified_at:'Modification du fichier',source_created_at:'Création du fichier',source_recorded_at:'Date du vocal',imported_at:'Date d’import utilisée en repli'}[summary.noteDateBasis || metadata.note_date_basis];
  const tabContent = brainPreviewTab === 'yaml' ? detail?.markdown : brainPreviewTab === 'original' ? detail?.original : result?.text;
  const comparison = result && typeof detail?.original === 'string' && typeof result.text === 'string' ? brainCompareTexts(detail.original,result.text) : null;
  const audioAvailable = summary.audioAvailable || detail?.audioAvailable;
  const audioSuffix = summary.audioSuffix || detail?.audioSuffix || (summary.sourceType === 'youtube' ? '.mp3' : '');
  const waiting = {queued:'Votre source est en file d’attente.',downloading:'Téléchargement de la vidéo YouTube et conversion en MP3. La transcription locale suit automatiquement.',transcribing:'Le serveur audio local transcrit le MP3. L’original sera conservé.',correcting:'Votre modèle local prépare une proposition fidèle et les métadonnées de la note.'};
  return `<header class="brain-preview-header"><div><small>${esc(summary.sourceName)}</small><h2>${esc(summary.title || summary.sourceTitle || 'Votre source')}</h2>${subject ? '<p class="brain-note-subject">Sujet : '+esc(subject)+'</p>' : ''}${description ? '<p class="brain-note-description">'+esc(description)+'</p>' : ''}${brainPill(summary.status)}</div><div class="row-actions">${brainActive(summary.status) ? btn('brain-cancel','Annuler','pause','secondary',`data-id="${esc(summary.id)}"`) : ''}${['failed','cancelled','interrupted'].includes(summary.status) ? btn('brain-retry','Relancer','play','secondary',`data-id="${esc(summary.id)}"`) : ''}${audioAvailable ? btn('brain-download-audio',audioSuffix === '.mp3' ? 'Télécharger MP3' : 'Télécharger l’audio','download','secondary',`data-id="${esc(summary.id)}" data-suffix="${esc(audioSuffix)}"`) : ''}${result ? btn('brain-download','Télécharger .md','download','secondary') : ''}${summary.status === 'review' ? btn('brain-export','Créer dans Obsidian','folder','primary',`data-id="${esc(summary.id)}" ${config.permission !== 'vault-write' ? 'disabled title="Autorisez l’écriture dans la configuration"' : ''}`) : ''}</div></header>
    ${(noteDate || summary.sourceRelativePath || metadata.source_relative_path) ? `<p class="brain-source-meta"><span>${noteDate ? 'Date de la note : '+esc(brainSourceDate(noteDate)) : ''}${dateBasis ? '<small>Provenance de la date : '+esc(dateBasis)+'</small>' : ''}${summary.sourceRelativePath || metadata.source_relative_path ? '<small>Fichier source : '+esc(summary.sourceRelativePath || metadata.source_relative_path)+'</small>' : ''}${metadata.source_modified_at ? '<small>Fichier modifié le '+esc(brainSourceDate(metadata.source_modified_at,metadata.source_timezone))+'</small>' : ''}${metadata.source_timezone ? '<small>Fuseau de la source : '+esc(metadata.source_timezone)+'</small>' : ''}<small>Import le ${esc(brainSourceDate(summary.createdAt))}</small></span></p>` : ''}
    ${metadata.metadata_uncertainties?.length ? `<div class="brain-meta-uncertainties"><strong>Dates et provenance à vérifier</strong>${metadata.metadata_uncertainties.map(message => '<p>'+esc(message)+'</p>').join('')}</div>` : ''}
    ${summary.sourceType === 'youtube' && summary.sourceUrl ? `<p class="brain-source-meta">${icon('play')}<span>Source YouTube · ${esc(summary.sourceUrl)}${Number.isFinite(summary.sourceDuration) ? '<small>Durée de la source : '+Math.floor(summary.sourceDuration/60)+' min '+Math.floor(summary.sourceDuration%60)+' s</small>' : ''}${audioAvailable ? '<small>MP3 conservé localement · téléchargement disponible</small>' : ''}</span></p>` : ''}
    ${summary.error || summary.exportError ? `<p class="brain-alert">${esc(summary.error || summary.exportError)}</p>` : ''}
    ${summary.exportPath ? `<p class="brain-export-path">${icon('check')} Note créée · ${esc(summary.exportPath)}</p>` : ''}
    ${comparison ? brainReviewView(detail,comparison) : ''}
    <div class="brain-preview-tabs" aria-label="Version de la dictée">${[['original','Texte brut'],['compare','Comparer avant / après'],['text','Proposition IA'],['yaml','Note + YAML']].map(([id,label]) => `<button data-action="brain-preview-tab" data-tab="${id}" class="${brainPreviewTab === id ? 'active' : ''}" aria-pressed="${brainPreviewTab === id}">${label}</button>`).join('')}</div>
    ${brainPreviewTab === 'compare' && comparison ? brainComparisonView(comparison) : typeof tabContent === 'string' ? (brainPreviewTab === 'yaml' ? `<pre class="brain-yaml" data-scroll="brain-note">${esc(tabContent)}</pre>` : `<div class="brain-version-label"><strong>${brainPreviewTab === 'original' ? 'Transcription brute · référence' : 'Proposition IA · non validée'}</strong>${brainPreviewTab === 'original' ? btn('brain-reuse-original','Reprendre le texte','audit','quiet',`type="button" ${brainBusy ? 'disabled' : ''}`) : ''}</div><div class="brain-note-body" data-scroll="brain-note">${esc(tabContent)}</div>`) : `<div class="brain-waiting" role="status">${icon(brainActive(summary.status) ? 'clock' : 'audit')}<p>${waiting[summary.status] || (brainPreviewTab === 'original' ? 'Aucune transcription originale disponible.' : 'Aucune proposition IA disponible.')}</p></div>`}
    ${result ? `<footer class="brain-note-meta"><div class="brain-topic-list">${(result.topics || []).map(topic => `<span>${esc(topic)}</span>`).join('')}${(result.tags || []).map(tag => `<span class="brain-tag">#${esc(tag)}</span>`).join('')}</div><p>${esc(detail.configuration?.model || 'Modèle non communiqué')} · ${summary.usage?.totalTokens == null ? 'Tokens non communiqués' : compact(summary.usage.totalTokens)+' tokens reçus'}</p>
    ${(result.uncertainties || []).length ? `<div class="brain-uncertainties"><strong>Passages vocaux à relire</strong>${result.uncertainties.map(text => `<p>${esc(text)}</p>`).join('')}</div>` : ''}
    ${detail.contextSources?.length ? `<details class="brain-corrections"><summary>Contexte retrouvé automatiquement · ${detail.contextSources.length} note(s)</summary>${detail.contextSources.map(source => `<p>${esc(source.title)}<small>${esc(source.path)}</small></p>`).join('')}</details>` : ''}
    <small>La note conserve le texte brut intégral. Une proposition différente figure à part ; ses écarts sont consultables dans Comparer.</small></footer>` : ''}`;
}

function brainWorkflow(config) {
  return `<div class="brain-workflow"><section class="brain-card"><div class="brain-section-title"><span>${icon('network')} Connexions & destination</span>${btn('brain-config','Modifier','settings','quiet')}</div><dl class="brain-config-summary"><dt>Modèle de relecture</dt><dd>${esc(config.model || 'À choisir')}<small>${esc(config.baseUrl || '')}</small></dd><dt>Transcription audio</dt><dd>${config.sttProvider === 'fluidvoice' ? 'Parakeet dans Fluid Voice' : esc(config.sttModel || 'Connecteur à renseigner')}<small>${esc(config.sttUrl || 'Importer des transcriptions .txt reste possible.')}</small></dd><dt>Réception automatique</dt><dd>${config.inputSource === 'fluidvoice' ? 'Nouvelles dictées de Fluid Voice' : esc(config.inputPath || 'Dossier à choisir')}<small>${config.watching ? 'Surveillance active' : 'En pause'} · doublons évités</small></dd><dt>Contexte & vocabulaire</dt><dd>Déduits par le LLM pour chaque dictée<small>${config.autoContext ? 'Les notes proches dans Obsidian apportent des repères de vocabulaire.' : 'Contexte fondé sur la dictée seule.'}</small></dd><dt>Coffre Obsidian</dt><dd>${esc(config.vaultPath || 'my_brain · chemin à choisir')}<small>${esc(config.outputFolder || 'Inbox/Voix')}</small></dd><dt>Création des notes</dt><dd>${config.permission === 'vault-write' ? config.autoExport ? 'Automatique après traitement' : 'Au clic sur Créer dans Obsidian' : 'Aperçu uniquement · lecture seule'}<small>Texte brut conservé intégralement ; proposition IA séparée à relire. Nouvelles notes uniquement.</small></dd></dl></section>
    <section class="brain-card"><div class="brain-section-title"><span>${icon('shield')} Les règles de fidélité</span></div><ul class="brain-rules"><li>Proposer seulement des corrections évidentes, sans reformuler les passages déjà lisibles.</li><li>Conserver les idées, détails, chiffres, ton et langues.</li><li>Conserver répétitions, fragments et ton ; ne pas ajouter de jugement, de conseil ou de résumé.</li><li>Garder les mots ambigus et signaler les passages à relire.</li><li>Conserver le texte brut comme référence et comparer les écarts avant d’utiliser la proposition.</li></ul><details class="brain-instructions"><summary>Lire les instructions automatiques envoyées au LLM</summary><pre id="brain-system-instructions"></pre></details><div class="brain-retrieval-note"><strong>Retrouver vos idées</strong><p>Recherche par texte, sujets et métadonnées YAML, puis réponse du modèle local fondée sur les notes retrouvées.</p><small>La recherche actuelle est lexicale. Aucun moteur RLCD ou modèle de prédiction n’est entraîné.</small></div></section></div>`;
}

function brainSearchView(config) {
  return `<section class="brain-card brain-search"><div class="brain-section-title"><span>${icon('search')} Une idée, toutes ses traces</span><small>RECHERCHE LOCALE</small></div><p class="brain-hint">Cherchez un sujet dans les notes Markdown de votre coffre. Le modèle peut ensuite répondre à partir des cinq premiers résultats.</p><form data-form="brain-search"><label class="brain-search-field">${icon('search')}<input id="brain-query" name="query" aria-label="Sujet à rechercher" value="${esc(brainQueryDrafts.get(project().id) || '')}" placeholder="Un projet, un concept, une personne…" maxlength="300" required></label><div class="row-actions"><button class="button secondary" type="submit" ${!config.vaultPath ? 'disabled' : ''}>Rechercher</button>${btn('brain-ask',brainBusy ? 'Recherche en cours…' : 'Demander au modèle','spark','primary',`type="button" ${!config.vaultPath || !config.model || brainBusy ? 'disabled' : ''}`)}</div></form>
    ${brainAnswer ? `<div class="brain-answer"><h3>Réponse à partir de vos notes</h3><div class="message-markdown">${messageMarkdown(brainAnswer.answer)}</div><p class="brain-hint">${brainAnswer.sources.length} source${brainAnswer.sources.length > 1 ? 's' : ''} retrouvée${brainAnswer.sources.length > 1 ? 's' : ''} · extraits de 4 000 caractères maximum par note · ${brainAnswer.usage?.totalTokens == null ? 'Tokens non communiqués' : compact(brainAnswer.usage.totalTokens)+' tokens reçus'}</p></div>` : ''}
    ${brainSearchResult ? `<div class="brain-search-results"><p class="brain-hint">${brainSearchResult.total} résultat${brainSearchResult.total > 1 ? 's' : ''} · texte et YAML · ${esc(brainSearchResult.query)}</p>${brainSearchResult.matches.map(note => `<button class="brain-search-result" data-action="brain-open-note" data-path="${esc(note.path)}">${icon('audit')}<span><strong>${esc(note.title)}</strong><p>${esc(note.excerpt)}</p><small>${esc(note.path)}</small></span>${icon('arrow')}</button>`).join('') || '<p>Aucune note trouvée. Essayez un autre mot-clé.</p>'}</div>` : '<div class="brain-search-empty">'+icon('memory')+'<p>Les liens entre vos idées commencent par une recherche.</p></div>'}
    ${brainNote ? `<details class="brain-found-note" open><summary>${esc(brainNote.path)}</summary><pre>${esc(brainNote.content)}</pre></details>` : ''}</section>`;
}

function brainConfigurationModal() {
  const config = brainConfig();
  modal('Configurer My Brain','Branchez vos modèles locaux, puis choisissez où arrivent vos notes.',
    `<form data-form="brain-config"><div class="modal-body brain-config-form"><p class="brain-hint">Fluid Voice transcrit vos dictées. Le LLM propose une relecture minimale ; la note conserve le texte brut et présente la proposition séparément.</p>${btn('brain-detect','Détecter mes outils','plug','secondary','type="button"')}<fieldset><legend>1 · Relecture minimale avec votre LLM local</legend>${field('URL de base du LLM','baseUrl',config.baseUrl || 'http://127.0.0.1:1234/v1','url','required')}
      <div class="brain-catalog-row">${brainSelect('Modèle local','model',[['','Choisir après lecture du catalogue'],...(config.models || []).map(model => [model,model])],config.model)}${btn('brain-discover','Lire le catalogue','plug','secondary','type="button"')}</div><p id="brain-catalog-state" class="brain-hint">${esc(config.catalogError || 'LM Studio : démarrer le serveur dans Developer, puis lire le catalogue. Cette lecture ne lance aucune génération.')}</p>
      ${field('Variable de clé locale (facultative)','credentialEnvironment',config.credentialEnvironment || '','text','placeholder="ATELIER_BRAIN_LLM_API_KEY"')}
      <label class="check-option"><input type="checkbox" name="structuredOutput" ${config.structuredOutput !== false ? 'checked' : ''}><span>Sortie JSON structurée (LM Studio). Décochez uniquement si votre serveur ne la prend pas en charge.</span></label>
      <div class="form-grid">${field('Délai par appel (secondes)','timeout',config.timeout || 120,'number','min="5" max="180" required')}${field('Tokens de sortie maximum','maxOutputTokens',config.maxOutputTokens || 8192,'number','min="512" max="16384" required')}</div></fieldset>
      <fieldset><legend>2 · Réception & transcription</legend>${brainSelect('Recevoir automatiquement','inputSource',[['fluidvoice','Mes nouvelles dictées Fluid Voice'],['folder','Les fichiers d’un dossier']],config.inputSource || 'folder')}<p class="brain-hint">Fluid Voice : activez Save Transcription History dans Settings. À l’activation, seuls les futurs vocaux sont importés ; le texte brut de Parakeet est conservé. Aucun dossier d’arrivée ou serveur audio n’est nécessaire pour les dictées.</p>
      ${brainSelect('Transcrire les fichiers audio déposés','sttProvider',[['fluidvoice','Avec Fluid Voice et son modèle installé'],['openai-compatible','Avec une autre API audio locale']],config.sttProvider || 'openai-compatible')}
      <div id="brain-fluid-audio" ${config.sttProvider !== 'fluidvoice' ? 'hidden' : ''}><p class="brain-hint">Le connecteur Fluid Voice utilise son API locale /v1/transcribe. ${config.localSetup?.fluidVoice?.apiEnabled ? 'API activée dans ses préférences ; accès vérifié lors du traitement.' : 'Elle est désactivée par défaut : nécessaire seulement pour les fichiers audio déposés.'}</p></div>
      ${field('URL complète de transcription audio','sttUrl',config.sttUrl || '','url','placeholder="Détectée automatiquement pour Fluid Voice"')}<div id="brain-asr-model" ${config.sttProvider === 'fluidvoice' ? 'hidden' : ''}>${field('Identifiant ASR attendu par votre serveur','sttModel',config.sttModel || '','text','maxlength="200"')}</div></fieldset>
      <fieldset><legend>3 · Dossiers & automatisation</legend><div class="brain-folder-field">${field('Chemin du coffre Obsidian my_brain','vaultPath',config.vaultPath || '','text','placeholder="/chemin/vers/my_brain"')}${btn('brain-pick-folder','Choisir','folder','secondary','type="button" data-field="vaultPath"')}</div>${field('Sous-dossier des nouvelles notes','outputFolder',config.outputFolder || 'Inbox/Voix','text','required')}<div class="brain-folder-field">${field('Dossier d’arrivée des audio et .txt','inputPath',config.inputPath || '')}${btn('brain-pick-folder','Choisir','folder','secondary','type="button" data-field="inputPath"')}</div>
      ${brainSelect('Permission sur le coffre','permission',[['read-only','Lecture seule · aperçu et recherche'],['vault-write','Autoriser la création de nouvelles notes']],config.permission || 'read-only')}
      <label class="check-option"><input type="checkbox" name="autoExport" ${config.autoExport ? 'checked' : ''}><span>Créer automatiquement la note avec le texte brut intégral et une proposition IA séparée à relire.</span></label><p class="brain-hint">L’enregistrement ne démarre pas la surveillance. Activez-la depuis My Brain. Une pause arrête les nouveaux imports ; les traitements déjà en file continuent. Après redémarrage, la reprise est explicite.</p></fieldset>
      <fieldset><legend>4 · Contexte automatique</legend><p class="brain-hint">Le LLM déduit le sujet et le vocabulaire de chaque dictée. Rien à remplir pour passer d’un domaine à un autre.</p><label class="check-option"><input type="checkbox" name="autoContext" ${config.autoContext !== false ? 'checked' : ''}><span>Retrouver automatiquement jusqu’à trois notes proches dans le coffre pour aider à reconnaître les termes.</span></label><details><summary>Ajouter des repères personnalisés (facultatif)</summary>${brainArea('Contexte pour désambiguïser','context',config.context,'maxlength="4000"')}${brainArea('Glossaire de noms et termes','glossary',config.glossary,'maxlength="4000"')}</details></fieldset>
    </div>${formFooter('Enregistrer le workflow')}</form>`,true);
  const provider = $('#modal form').elements.sttProvider;
  provider.addEventListener('change',() => {
    const fluid = provider.value === 'fluidvoice';
    $('#brain-fluid-audio').hidden = !fluid; $('#brain-asr-model').hidden = fluid;
    if (fluid && config.localSetup?.fluidVoice?.apiUrl) $('#modal form').elements.sttUrl.value = config.localSetup.fluidVoice.apiUrl;
  });
}

function brainFormValues(form) {
  const values = Object.fromEntries(new FormData(form));
  return {...values, projectId:project().id, timeout:Number(values.timeout), maxOutputTokens:Number(values.maxOutputTokens),
    autoExport:form.elements.autoExport.checked, structuredOutput:form.elements.structuredOutput.checked,
    autoContext:form.elements.autoContext.checked};
}

async function brainFilePayload(file) {
  if (file.name.toLowerCase().endsWith('.txt')) {
    let text;
    try {text = new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(await file.arrayBuffer());}
    catch (_) {throw new Error('Transcription .txt illisible : utilisez du texte UTF-8 valide.');}
    if (text.length > 16000) throw new Error('Transcription trop longue : 16 000 caractères maximum.');
    return {sourceType:'text',text};
  }
  return {sourceType:'audio',audioBase64:await new Promise((resolve,reject) => {
    const reader = new FileReader(); reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
    reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.readAsDataURL(file);
  })};
}

function brainFileProblem(file) {
  if (!brainFileExtensions.test(file.name)) return 'Format non pris en charge. Utilisez un audio compatible ou une transcription .txt.';
  if (file.size > 20*1024*1024) return 'Fichier trop volumineux : 20 Mo maximum par audio.';
  return '';
}

async function brainImportFolder(targetProject, files, folder) {
  const timeZone = brainSourceTimeZone();
  const batch = await api('brain/batch/create',{projectId:targetProject,name:folder.name,timeZone,
    entries:files.map(file => ({relativePath:brainFileInfo(file).relativePath,size:file.size,modifiedAt:file.lastModified}))});
  const byPath = new Map(batch.entries.map(entry => [entry.relativePath,entry]));
  const progress = {id:batch.id,total:files.length,current:0,path:'',active:true};
  brainUploadProgress.set(targetProject,progress);
  await refresh(true);
  try {
    for (let position=0;position<files.length;position++) {
      const file = files[position], metadata = brainFileInfo(file), entry = byPath.get(metadata.relativePath);
      if (!entry) throw new Error('Le manifeste du dossier ne correspond plus à la sélection. Rechoisissez le dossier.');
      Object.assign(progress,{current:position+1,path:metadata.relativePath});
      if (view === 'brain' && project().id === targetProject) render();
      if (entry.jobId) continue;
      try {
        const problem = brainFileProblem(file);
        if (problem) throw new Error(problem);
        const payload = await brainFilePayload(file);
        const job = await api('brain/import',{...payload,projectId:targetProject,sourceName:file.name,
          sourceRelativePath:metadata.relativePath,sourceModifiedAt:metadata.modifiedAt,sourceTimeZone:timeZone,
          batchId:batch.id,batchIndex:entry.index});
        if (project().id === targetProject) {selectedBrainId = job.id; brainDetail = null; brainPreviewTab = 'original';}
      } catch (error) {
        // A durable file error leaves the rest of the manifest ready for receipt.
        await api('brain/batch/error',{id:batch.id,index:entry.index,error:error.message});
      }
      brainBatchDetails.delete(batch.id);
      await refresh(true);
    }
    brainFiles.delete(targetProject); brainFolderSelections.delete(targetProject);
    brainUploadProgress.delete(targetProject);
    toast('Dossier transmis. Le service local poursuit le traitement fichier par fichier ; les erreurs restent consultables.');
  } catch (error) {
    Object.assign(progress,{active:false,error:'Copie interrompue : '+error.message+' Rechoisissez le même dossier pour reprendre.'});
    throw error;
  } finally {progress.active = false;}
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
  if (brainBusy) return;
  const source = form.dataset.source === 'youtube' ? 'youtube' : 'files';
  brainBusy = true;
  brainImportErrors.delete(targetProject);
  render();
  try {
    if (source === 'youtube') {
      const url = String(values.url || '').trim();
      if (!url) throw new Error('Collez le lien de la vidéo YouTube.');
      const job = await api('brain/youtube',{projectId:targetProject,url,sourceTimeZone:brainSourceTimeZone()});
      brainYoutubeDrafts.delete(targetProject);
      if (project().id === targetProject) {
        selectedBrainId = job.id; brainDetail = null; brainPreviewTab = 'original';
        if ($('#brain-youtube-url')) $('#brain-youtube-url').value = '';
      }
      toast(job.duplicate ? 'Cette vidéo est déjà dans votre historique.' : 'Vidéo ajoutée : MP3, transcription puis correction locales.');
      return;
    }
    const files = brainFiles.get(targetProject) || [];
    const folder = brainFolderSelections.get(targetProject);
    if (files.length && folder) {await brainImportFolder(targetProject,[...files],folder); return;}
    const importJobs = [];
    if (files.length) {
      while (files.length) {
        const file = files[0];
        const payload = await brainFilePayload(file), metadata = brainFileInfo(file);
        const job = await api('brain/import',{...payload,projectId:targetProject,sourceName:file.name,
          sourceRelativePath:metadata.relativePath,sourceModifiedAt:metadata.modifiedAt,sourceTimeZone:brainSourceTimeZone()});
        importJobs.push(job); files.shift();
        if (project().id === targetProject) {selectedBrainId = job.id; brainDetail = null; brainPreviewTab = 'original';}
      }
      brainFiles.delete(targetProject);
    } else {
      const job = await api('brain/import',{projectId:targetProject,sourceType:'text',sourceName:'Dictée collée',text:values.text,sourceTimeZone:brainSourceTimeZone()});
      importJobs.push(job); brainDrafts.delete(targetProject);
      if (project().id === targetProject && $('#brain-draft')) $('#brain-draft').value = '';
    }
    if (project().id === targetProject) {selectedBrainId = importJobs.at(-1).id; brainDetail = null; brainPreviewTab = 'original';}
    toast(importJobs.some(job => job.duplicate) ? 'Source déjà présente : historique conservé, aucun traitement en double.' : 'Dictée ajoutée au pipeline local.');
  } catch (error) {
    brainImportErrors.set(targetProject,{source,message:error.message});
    throw error;
  } finally {brainBusy = false; await refresh(true);}
}

async function brainDownloadAudio(identifier, suffix) {
  const send = () => fetch('/api/brain/audio?id='+encodeURIComponent(identifier),{
    headers:{'X-Atelier-Token':$('meta[name="atelier-token"]').content},cache:'no-store'});
  let response = await send();
  if (response.status === 403) {
    const result = await response.clone().json().catch(() => ({}));
    if (result.error === 'Session locale requise.') {
      if (!localSessionRefresh) localSessionRefresh = renewLocalSession().finally(() => {localSessionRefresh = null;});
      await localSessionRefresh; response = await send();
    }
  }
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || 'Le MP3 est indisponible. Vérifiez l’état du téléchargement dans l’historique.');
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url; link.download = 'voice_'+identifier+(/^\.(wav|mp3|m4a|ogg|flac|webm|mp4)$/i.test(suffix) ? suffix : '.audio'); link.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
}

function brainAcceptFiles(files, folder = null, targetProject = project().id) {
  if (brainBusy || brainReadingFolders.has(targetProject)) throw new Error('Attendez la fin de la lecture ou de la copie avant d’ajouter des fichiers.');
  const incoming = [], hidden = file => brainFileInfo(file).relativePath.split('/').some(part => part.startsWith('.'));
  let ignored = folder?.ignored || 0;
  for (const file of files) {
    const metadata = brainFileInfo(file);
    if (hidden(file)) {ignored++; continue;}
    if (metadata.relativePath.length > 500 || metadata.relativePath.split('/').length > 40 || file.name.length > 200)
      throw new Error('Dossier trop profond ou nom trop long : 40 niveaux, 500 caractères de chemin et 200 par nom maximum.');
    if (!folder && brainFileProblem(file)) throw new Error(brainFileProblem(file));
    incoming.push(file);
  }
  const pending = folder ? [] : [...(brainFiles.get(targetProject) || [])];
  const fingerprint = file => JSON.stringify([brainFileInfo(file).relativePath,file.size,file.lastModified]);
  const seen = new Set(pending.map(fingerprint));
  for (const file of incoming) {const key = fingerprint(file); if (!seen.has(key)) {pending.push(file);seen.add(key);}}
  const isFolder = folder || brainFolderSelections.get(targetProject);
  if (pending.length > (isFolder ? 1000 : 20)) throw new Error(isFolder ? 'Maximum 1 000 fichiers par dossier.' : 'Maximum 20 fichiers seuls. Utilisez Choisir un dossier pour une sélection complète.');
  if (!pending.length) throw new Error('Ce dossier ne contient aucun fichier visible à importer. Les éléments cachés sont ignorés.');
  brainFiles.set(targetProject,pending);
  if (folder) brainFolderSelections.set(targetProject,{...folder,ignored});
  brainImportErrors.delete(targetProject);
  if (!brainUploadProgress.get(targetProject)?.active) brainUploadProgress.delete(targetProject);
  if (view === 'brain' && project().id === targetProject) render();
}

async function brainReadDroppedEntries(entries) {
  const files = [];
  let ignored = 0;
  async function walk(entry,path,depth) {
    if (entry.name.startsWith('.')) {ignored++;return;}
    if (depth > 39 || path.length > 500 || entry.name.length > 200) throw new Error('Dossier trop profond ou nom trop long : 40 niveaux, 500 caractères de chemin et 200 par nom maximum.');
    if (entry.isFile) {
      const file = await new Promise((resolve,reject) => entry.file(resolve,reject));
      brainFileMetadata.set(file,{relativePath:path,modifiedAt:new Date(file.lastModified).toISOString(),directory:true});
      files.push(file);
      if (files.length > 1000) throw new Error('Maximum 1 000 fichiers par dossier.');
      return;
    }
    if (entry.isDirectory) {
      const reader = entry.createReader();
      while (true) {
        const children = await new Promise((resolve,reject) => reader.readEntries(resolve,reject));
        if (!children.length) break;
        for (const child of children) await walk(child,path+'/'+child.name,depth+1);
      }
    }
  }
  for (const entry of entries) await walk(entry,entry.name,0);
  return {files,ignored,name:entries.filter(entry => !entry.name.startsWith('.')).map(entry => entry.name).join(' + ').slice(0,200)};
}

function mountBrain() {
  if (view !== 'brain') return;
  for (const batch of brainBatches()) {
    if (!batch.failed) continue;
    const signature = JSON.stringify([batch.updatedAt,batch.state,batch.completed,batch.failed,batch.active,batch.pending]);
    if (brainBatchDetails.get(batch.id)?.signature === signature || brainBatchLoading.has(batch.id)) continue;
    brainBatchLoading.add(batch.id);
    api('brain/batch?id='+encodeURIComponent(batch.id)).then(detail => {
      brainBatchDetails.set(batch.id,{...detail,signature});
      if (view === 'brain' && project().id === batch.projectId) render();
    }).catch(error => toast(error.message,true)).finally(() => brainBatchLoading.delete(batch.id));
  }
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
  const fileInput = $('#brain-file'), directoryInput = $('#brain-directory'), drop = $('.brain-drop');
  const acceptFiles = (files,folder) => {try {brainAcceptFiles(files,folder);} catch(error) {toast(error.message,true);}};
  fileInput?.addEventListener('change',() => {if (fileInput.files.length) acceptFiles([...fileInput.files]);});
  directoryInput?.addEventListener('change',() => {
    const files = [...directoryInput.files];
    if (files.length) acceptFiles(files,{name:(files[0].webkitRelativePath || files[0].name).split('/')[0]});
  });
  drop?.addEventListener('keydown',event => {if (['Enter',' '].includes(event.key)) {event.preventDefault(); fileInput.click();}});
  drop?.addEventListener('dragover',event => {event.preventDefault(); if (!brainBusy) drop.classList.add('dragging');});
  drop?.addEventListener('dragleave',() => drop.classList.remove('dragging'));
  drop?.addEventListener('drop',async event => {
    event.preventDefault(); drop.classList.remove('dragging');
    const entries = [...(event.dataTransfer.items || [])].map(item => item.webkitGetAsEntry?.()).filter(Boolean);
    const files = [...event.dataTransfer.files], targetProject = project().id;
    if (!entries.some(entry => entry.isDirectory)) {acceptFiles(files);return;}
    if (brainBusy || brainReadingFolders.has(targetProject)) {toast('Attendez la fin de la lecture ou de la copie.',true);return;}
    brainReadingFolders.add(targetProject); render();
    try {
      const folder = await brainReadDroppedEntries(entries);
      brainReadingFolders.delete(targetProject);
      brainAcceptFiles(folder.files,{name:folder.name,ignored:folder.ignored},targetProject);
    } catch(error) {toast(error.message,true);}
    finally {brainReadingFolders.delete(targetProject);if (view === 'brain' && project().id === targetProject) render();}
  });
  $('#brain-draft')?.addEventListener('input',event => brainDrafts.set(project().id,event.target.value));
  $('#brain-youtube-url')?.addEventListener('input',event => brainYoutubeDrafts.set(project().id,event.target.value));
  $('#brain-query')?.addEventListener('input',event => brainQueryDrafts.set(project().id,event.target.value));
  const instruction = $('#brain-system-instructions');
  if (instruction) instruction.textContent = brainConfig().structuredOutput === false ? state.brain?.compatibilityInstructions || '' : state.brain?.instructions || '';
}

function installBrainActions() {
  window.addEventListener('beforeunload',event => {
    if ([...brainUploadProgress.values()].some(upload => upload.active)) {event.preventDefault();event.returnValue = '';}
  });
  Object.assign(actions,{
    'brain-config':brainConfigurationModal,
    'brain-detect':async () => {
      const form = $('#modal [data-form="brain-config"]');
      if (form) await api('brain/configure',brainFormValues(form));
      await api('brain/detect',{projectId:project().id}); await refresh(true);
      if ($('#modal').open) $('#modal').close();
      brainConfigurationModal();
    },
    'brain-tab':element => {brainTab = element.dataset.tab; render();},
    'brain-preview-tab':element => {brainPreviewTab = element.dataset.tab; render();},
    'brain-select':element => {selectedBrainId = element.dataset.id; brainDetail = null; brainPreviewTab = 'original'; render();},
    'brain-reuse-original':brainReuseOriginal,
    'brain-apply-recovery':brainApplyRecovery,
    'brain-pick-upload-folder':() => {if (!brainBusy && !brainReadingFolders.has(project().id)) $('#brain-directory')?.click();},
    'brain-clear-files':() => {if (!brainBusy) {brainFiles.delete(project().id); brainFolderSelections.delete(project().id); brainImportErrors.delete(project().id); render();}},
    'brain-remove-file':element => {
      if (brainBusy) return;
      const files = [...(brainFiles.get(project().id) || [])];
      const index = Number(element.dataset.index);
      if (Number.isInteger(index) && index >= 0 && index < files.length) files.splice(index,1);
      if (files.length) brainFiles.set(project().id,files); else {brainFiles.delete(project().id);brainFolderSelections.delete(project().id);}
      brainImportErrors.delete(project().id); render();
    },
    'brain-pick-folder':async element => {
      const form = $('#modal form'), input = form?.elements[element.dataset.field];
      element.disabled = true;
      try {
        const result = window.atelierDesktop ? await window.atelierDesktop.pickDirectory() : await api('projects/pick',{});
        if (result.path && input && form.isConnected) {input.value = result.path; input.dispatchEvent(new Event('input',{bubbles:true}));}
      } finally {element.disabled = false;}
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
    'brain-retry':async element => {await api('brain/retry',{id:element.dataset.id}); brainBatchDetails.clear(); await refresh(true);},
    'brain-download':() => {if (brainDetail?.markdown) download(brainDetail.id+'.md',brainDetail.markdown,'text/markdown');},
    'brain-download-audio':element => brainDownloadAudio(element.dataset.id,element.dataset.suffix),
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
