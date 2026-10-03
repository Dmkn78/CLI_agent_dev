import { api, toast } from './api.js';
import { FactoryPanel } from './factory.js';
import { ConceptLab } from './lab.js';
import { escapeHtml as esc, icon } from './icons.js';

const ACTIVE_JOB_STATUSES = new Set(['queued', 'running', 'approval', 'starting']);
const STATUS_LABELS = { imported: 'Sources prêtes', generating: 'En création', ready: 'À explorer', failed: 'Création à reprendre', partial: 'Parcours partiel' };
const REVIEW_LABELS = { again: 'À revoir', partial: 'Encore fragile', remembered: 'Je peux l’expliquer' };
const app = document.querySelector('#app');
const modal = document.querySelector('#modal');
const state = { bootstrap: null, view: 'home', course: null, learning: {}, activeChapter: null, request: 0, abort: null, lab: null, observer: null, scrollFrame: 0 };
const factory = new FactoryPanel({ getBootstrap: () => state.bootstrap, refresh: refreshBootstrap, openCourse });

await start();

async function start() {
  modal.addEventListener('click', event => {
    if (event.target !== modal) return;
    const bounds = modal.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) modal.close();
  });
  modal.addEventListener('close', () => {
    modal.className = '';
    if (state.bootstrap) refreshBootstrap().catch(error => toast(error.message, true));
  });
  window.addEventListener('popstate', route);
  try {
    await refreshBootstrap();
    await route();
    window.setInterval(() => {
      if (activeJobs().length && !modal.open) refreshBootstrap().catch(() => {});
    }, 6000);
  } catch (error) {
    app.innerHTML = `<main class="connection-error"><img src="/prisme.svg" alt="" width="42" height="42"><h1>Prisme n’est pas disponible.</h1><p>${esc(error.message)}</p><button class="primary" id="retry">Réessayer ${icon('reset')}</button></main>`;
    document.querySelector('#retry').addEventListener('click', () => location.reload());
  }
}

async function refreshBootstrap() {
  state.bootstrap = await api('/api/bootstrap');
  if (state.view === 'home' && state.abort) renderHome();
  if (state.view === 'reader') syncReaderJobs();
  return state.bootstrap;
}

async function route() {
  const courseId = location.hash.match(/^#\/course\/([a-zA-Z0-9_-]+)$/)?.[1];
  if (courseId) await openCourse(courseId, { updateHistory: false });
  else showHome({ updateHistory: false });
}

function resetView() {
  state.abort?.abort();
  state.abort = new AbortController();
  state.observer?.disconnect();
  state.observer = null;
  state.lab?.dispose();
  state.lab = null;
  cancelAnimationFrame(state.scrollFrame);
  state.activeChapter = null;
}

function listen(target, event, callback, options = {}) {
  target?.addEventListener(event, callback, { ...options, signal: state.abort.signal });
}

function showHome({ updateHistory = true } = {}) {
  state.request++;
  state.view = 'home';
  state.course = null;
  if (updateHistory && location.hash) history.pushState(null, '', location.pathname);
  renderHome();
}

function renderHome() {
  resetView();
  document.title = 'Prisme — ta fabrique de cours interactifs';
  const courses = state.bootstrap.courses.filter(course => course.origin !== 'example');
  const examples = state.bootstrap.courses.filter(course => course.origin === 'example');
  const jobs = activeJobs();
  app.innerHTML = `<div class="home-shell">
    <header class="home-header"><a class="brand" href="#" aria-label="Prisme, accueil"><img src="/prisme.svg" alt="" width="30" height="30"><span>prisme<span class="brand-period">.</span></span></a><div class="home-header-actions"><span class="local-indicator"><span></span>Ton espace local</span><button class="icon-button" id="profile" aria-label="Mes préférences d’apprentissage" title="Mes préférences d’apprentissage">${icon('settings')}</button></div></header>
    <main class="home-main" id="workspace">
      <section class="welcome"><div class="eyebrow">LA FABRIQUE DE COURS INTERACTIFS</div><h1>Fais de ton cours<br>un terrain <em>d’exploration.</em></h1><p>Dépose tes documents. Retrouve le cours à droite,<br class="wide-break"> les concepts à manipuler à gauche. Avance à ton rythme.</p>
        <button class="home-dropzone" id="import-course"><span class="drop-symbol">${icon('upload')}</span><strong>Dépose ton cours ici</strong><span>ou choisis tes fichiers <span class="inline-arrow">↗</span></span><small>PDF, photos, images, notes et texte</small></button>
        <div class="welcome-caption"><span>Ton cours.</span><i></i><span>Ton intuition.</span><i></i><span>Ta manière d’apprendre.</span></div>
      </section>
      ${jobs.length ? `<section class="ongoing-creations" aria-label="Créations en cours">${jobs.map(jobCard).join('')}</section>` : ''}
      <section class="library-section" aria-label="Ma bibliothèque"><div class="section-heading"><div><span class="eyebrow">POUR REPRENDRE LE FIL</span><h2>Ma bibliothèque <span>${courses.length ? String(courses.length).padStart(2, '0') : ''}</span></h2></div>${examples.length ? `<button class="text-button example-link" id="show-example">Voir un exemple ${icon('arrow')}</button>` : ''}</div>
        ${courses.length ? `<div class="course-list">${courses.map(courseRow).join('')}</div>` : '<div class="library-empty"><span class="empty-book">' + icon('book') + '</span><div><strong>Le premier cours ouvre le chemin.</strong><p>Les documents que tu crées apparaîtront ici.</p></div></div>'}
      </section>
      <footer class="home-footer"><span>Comprendre commence par une question.</span><span>Conçu pour explorer, pas seulement regarder.</span></footer>
    </main></div>`;
  listen(document.querySelector('.brand'), 'click', event => { event.preventDefault(); });
  listen(document.querySelector('#profile'), 'click', () => factory.openProfile());
  listen(document.querySelector('#import-course'), 'click', () => factory.openImport());
  const dropzone = document.querySelector('#import-course');
  listen(dropzone, 'dragover', event => { event.preventDefault(); dropzone.classList.add('dragover'); });
  listen(dropzone, 'dragleave', event => { if (!dropzone.contains(event.relatedTarget)) dropzone.classList.remove('dragover'); });
  listen(dropzone, 'drop', event => {
    event.preventDefault();
    dropzone.classList.remove('dragover');
    const files = [...event.dataTransfer.files];
    if (files.length) { factory.openImport(); factory.selectFiles(files); }
  });
  listen(document.querySelector('#show-example'), 'click', () => {
    if (examples.length === 1) openCourse(examples[0].id);
    else showExamples(examples);
  });
  document.querySelectorAll('[data-course]').forEach(button => listen(button, 'click', () => openCourse(button.dataset.course)));
  bindJobs();
}

function activeJobs() {
  return (state.bootstrap.jobs || []).filter(job => ACTIVE_JOB_STATUSES.has(job.status));
}

function courseRow(course) {
  const count = course.chapterCount || 0;
  const description = count ? `${count} ${count > 1 ? 'chapitres' : 'chapitre'}` : `${course.pageCount || 0} pages importées`;
  return `<button class="course-row" data-course="${esc(course.id)}"><span class="course-cover">${icon('book')}</span><span class="course-row-copy"><strong>${esc(course.title)}</strong><span>${esc(description)} <i>·</i> ${esc(formatDate(course.createdAt))}</span></span><span class="course-state ${course.status === 'ready' ? 'ready' : ''}">${esc(STATUS_LABELS[course.status] || 'À reprendre')}</span>${icon('arrow', 'course-row-arrow')}</button>`;
}

function jobCard(job) {
  const course = state.bootstrap.courses.find(entry => entry.id === job.courseId);
  return `<button class="job-strip" data-job="${esc(job.id)}"><span class="job-indicator ${job.status === 'approval' ? 'needs-attention' : ''}">${icon(job.status === 'approval' ? 'eye' : 'spark')}</span><span><strong>${esc(course?.title || 'Création de ton cours')}</strong><small>${esc(job.message || 'Création en cours')}</small></span><span class="job-strip-action">${job.status === 'approval' ? 'Autorisation demandée' : 'Voir la création'} ${icon('arrow')}</span></button>`;
}

function bindJobs() {
  document.querySelectorAll('[data-job]').forEach(button => listen(button, 'click', async () => {
    try { factory.openJob(await api(`/api/jobs/${encodeURIComponent(button.dataset.job)}`)); }
    catch (error) { toast(error.message, true); }
  }));
}

function syncReaderJobs() {
  const job = activeJobs().find(entry => entry.courseId === state.course?.id);
  const header = document.querySelector('.reader-header-end');
  if (!header) return;
  header.querySelector('.creation-button')?.remove();
  if (job) {
    const button = document.createElement('button');
    button.className = 'text-button creation-button';
    button.innerHTML = `${icon('spark')} ${job.status === 'approval' ? 'Autorisation demandée' : 'Création en cours'}`;
    button.title = job.message;
    listen(button, 'click', async () => {
      try { factory.openJob(await api(`/api/jobs/${encodeURIComponent(job.id)}`)); }
      catch (error) { toast(error.message, true); }
    });
    header.insertBefore(button, header.querySelector('.reader-menu'));
  }
  if (state.course.chapters.length) return;
  const pendingButton = document.querySelector('.preparation-lab .primary');
  if (!pendingButton) return;
  const courseSummary = state.bootstrap.courses.find(course => course.id === state.course.id);
  const replacement = pendingButton.cloneNode(false);
  replacement.removeAttribute('id');
  if (courseSummary?.chapterCount) {
    replacement.innerHTML = `Explorer mon parcours ${icon('arrow')}`;
    listen(replacement, 'click', () => openCourse(state.course.id));
  } else if (job) {
    replacement.innerHTML = `Voir la création ${icon('arrow')}`;
    listen(replacement, 'click', async () => {
      try { factory.openJob(await api(`/api/jobs/${encodeURIComponent(job.id)}`)); }
      catch (error) { toast(error.message, true); }
    });
  } else {
    replacement.innerHTML = `Créer mon parcours ${icon('spark')}`;
    listen(replacement, 'click', () => factory.openGeneration(state.course));
  }
  pendingButton.replaceWith(replacement);
}

function showExamples(examples) {
  factory.show(`<div class="modal-eyebrow">UN APERÇU DES POSSIBILITÉS</div><h2>Des concepts à explorer.</h2><p class="modal-intro">Ces exemples te permettent de découvrir le lecteur. Tes propres documents définissent les prochains parcours.</p><div class="course-list">${examples.map(courseRow).join('')}</div>`);
  modal.querySelectorAll('[data-course]').forEach(button => button.addEventListener('click', () => { modal.close(); openCourse(button.dataset.course); }));
}

async function openCourse(courseId, { updateHistory = true } = {}) {
  const request = ++state.request;
  state.view = 'loading';
  resetView();
  app.innerHTML = '<main class="boot-screen">Prisme<span>Ouverture de ton cours…</span></main>';
  try {
    const [course, learning] = await Promise.all([api(`/api/courses/${encodeURIComponent(courseId)}`), api(`/api/courses/${encodeURIComponent(courseId)}/learning`)]);
    if (request !== state.request) return;
    state.course = course;
    state.learning = learning;
    state.view = 'reader';
    if (updateHistory && location.hash !== `#/course/${courseId}`) history.pushState(null, '', `#/course/${courseId}`);
    renderReader();
  } catch (error) {
    if (request !== state.request) return;
    showHome();
    toast(error.message, true);
  }
}

function renderReader() {
  resetView();
  const course = state.course;
  const chapters = course.chapters || [];
  const job = activeJobs().find(entry => entry.courseId === course.id);
  document.title = `${course.title} — Prisme`;
  app.innerHTML = `<div class="reader-shell"><header class="reader-header">
    <div class="reader-header-start"><button class="icon-button" id="back-library" aria-label="Retour à la bibliothèque" title="Bibliothèque">${icon('back')}</button><a class="brand reader-brand" href="#" aria-label="Bibliothèque"><img src="/prisme.svg" width="25" height="25" alt=""><span>prisme<span class="brand-period">.</span></span></a><span class="header-divider"></span><div class="course-identity"><strong title="${esc(course.title)}">${esc(course.title)}</strong>${course.origin === 'example' ? '<span class="example-badge">Exemple</span>' : ''}</div></div>
    <div class="reader-header-end">${chapters.length ? `<label class="chapter-picker"><span class="sr-only">Aller à un chapitre</span><select aria-label="Aller à un chapitre">${chapters.map((chapter, index) => `<option value="${esc(chapter.id)}">${String(index + 1).padStart(2, '0')} · ${esc(chapter.title)}</option>`).join('')}</select>${icon('down')}</label>` : ''}${job ? `<button class="text-button creation-button" data-job="${esc(job.id)}">${icon('spark')} Création en cours</button>` : ''}<details class="reader-menu"><summary class="icon-button" aria-label="Options du cours" title="Options du cours">${icon('menu')}</summary><div class="reader-menu-panel"><button id="reader-import">${icon('plus')}Importer un cours</button>${chapters.length ? `<a href="/api/courses/${encodeURIComponent(course.id)}/document" download>${icon('download')}Télécharger le document</a>` : ''}<a href="/api/courses/${encodeURIComponent(course.id)}/export" download>${icon('layers')}Exporter le dossier complet</a>${course.origin !== 'example' ? `<button id="regenerate">${icon('spark')}${chapters.length ? 'Recréer le parcours' : 'Créer le parcours'}</button>` : ''}<button id="reader-profile">${icon('settings')}Ma manière d’apprendre</button></div></details></div>
    </header>
    <main class="reader" id="workspace"><aside class="lab-pane" aria-label="Expérience liée au chapitre"><div id="lab-host"></div><div class="lab-sync-caption">${icon('link')}<span>L’expérience suit ton chapitre. Explore sans perdre le fil.</span></div></aside><div class="reader-divider" role="separator" tabindex="0" aria-label="Largeur du laboratoire" aria-orientation="vertical" aria-valuenow="50" aria-valuemin="32" aria-valuemax="65"><span></span></div><section class="reading-pane" aria-label="Cours"><div class="reading-toolbar"><span class="reading-label">${chapters.length ? 'LE COURS' : 'TES SOURCES'}<span id="chapter-position"></span></span><div>${course.sources?.length ? `<button class="text-button" id="open-sources">${icon('file')}<span>Sources</span></button>` : ''}${chapters.length ? `<button class="text-button" id="open-notes">${icon('note')}<span>Notes</span></button>` : ''}</div></div><div class="course-scroll" tabindex="0" aria-label="Lecture continue du cours">${chapters.length ? chapters.map(renderChapter).join('') : renderImportedSources(course)}</div></section></main></div>`;
  listen(document.querySelector('#back-library'), 'click', () => showHome());
  listen(document.querySelector('.reader-brand'), 'click', event => { event.preventDefault(); showHome(); });
  listen(document.querySelector('#reader-import'), 'click', () => { closeReaderMenu(); factory.openImport(); });
  listen(document.querySelector('#reader-profile'), 'click', () => { closeReaderMenu(); factory.openProfile(); });
  listen(document.querySelector('#regenerate'), 'click', () => { closeReaderMenu(); factory.openGeneration(course); });
  listen(document.querySelector('#open-sources'), 'click', () => openSources());
  listen(document.querySelector('#open-notes'), 'click', () => openNotes());
  listen(document.querySelector('.chapter-picker select'), 'change', event => jumpToChapter(event.target.value));
  bindJobs();
  bindDivider();
  bindReadingScroll();
  if (chapters.length) {
    bindChapterActions();
    observeChapters();
    activateChapter(chapters[0].id);
  } else {
    document.querySelector('#lab-host').innerHTML = `<div class="preparation-lab"><div class="preparation-art" aria-hidden="true"><div class="preparation-page"><i></i><i></i><i></i><span>↗</span><i></i><i></i></div><span class="preparation-orbit"></span></div><div class="eyebrow">TOUT COMMENCE AVEC TON COURS</div><h1>La matière est là.<br><em>L’intuition arrive.</em></h1><p>Prisme s’appuie sur tes sources pour créer des explications, des expériences et des démonstrations à reconstruire.</p>${job ? `<button class="primary" id="pending-job">Voir la création ${icon('arrow')}</button>` : `<button class="primary" id="create-course">Créer mon parcours ${icon('spark')}</button>`}<span class="preparation-note">${course.pageCount || 0} pages conservées · ${course.visionPages || 0} à lire visuellement</span></div>`;
    listen(document.querySelector('#create-course'), 'click', () => factory.openGeneration(course));
    listen(document.querySelector('#pending-job'), 'click', async () => {
      try { factory.openJob(await api(`/api/jobs/${encodeURIComponent(job.id)}`)); }
      catch (error) { toast(error.message, true); }
    });
    document.querySelector('.lab-sync-caption').hidden = true;
  }
}

function bindReadingScroll() {
  const scrollRoot = document.querySelector('.course-scroll');
  const labPane = document.querySelector('.lab-pane');
  const followCourse = (delta, mode) => {
    const pixels = delta * (mode === 1 ? 16 : mode === 2 ? scrollRoot.clientHeight : 1);
    scrollRoot.scrollTop += Math.max(-2000, Math.min(2000, pixels));
  };
  listen(labPane, 'wheel', event => {
    if (event.ctrlKey || event.target.closest('input, select, textarea')) return;
    event.preventDefault();
    followCourse(event.deltaY, event.deltaMode);
  }, { passive: false });
  listen(window, 'message', event => {
    const frame = labPane.querySelector('iframe');
    if (!frame || event.source !== frame.contentWindow || event.data?.type !== 'prisme-lab-scroll') return;
    if (!Number.isFinite(event.data.delta) || ![0, 1, 2].includes(event.data.mode)) return;
    followCourse(event.data.delta, event.data.mode);
  });
}

function renderChapter(chapter, index) {
  const learning = state.learning[chapter.id] || {};
  const attempt = [...(learning.attempts || [])].reverse().find(entry => entry.kind === 'reconstruction');
  const review = learning.review?.selfAssessment;
  const sourceCount = chapter.sourceRefs?.length || 0;
  const warnings = index === 0 ? state.course.warnings || [] : [];
  return `<article class="course-chapter" id="chapter-${esc(chapter.id)}" data-chapter="${esc(chapter.id)}">
    <div class="chapter-kicker"><span>CHAPITRE ${String(index + 1).padStart(2, '0')}</span><span>${esc(chapter.kicker?.replace(/^\d+\s*[·.\-]\s*/, '') || 'COMPRENDRE & EXPLORER')}</span></div><h1>${esc(chapter.title)}</h1><p class="chapter-intro text-flow">${esc(chapter.intro)}</p>
    ${sourceCount ? `<button class="source-reference text-button" data-sources="${esc(chapter.id)}">${icon('link')}${sourceCount} ${sourceCount === 1 ? 'page source' : 'pages sources'}</button>` : state.course.origin === 'example' ? '<p class="example-note">Parcours de démonstration · contenu original de Prisme</p>' : ''}
    ${warnings.length ? `<details class="course-warning"><summary>Points à vérifier dans les sources ${icon('down')}</summary>${warnings.map(warning => `<p class="text-flow">${esc(warning)}</p>`).join('')}</details>` : ''}
    <div class="intuition-block"><span class="small-label">L’IDÉE À SAISIR</span><p class="text-flow">${esc(chapter.intuition)}</p></div>
    ${chapter.prerequisites ? `<details class="prerequisite-block"><summary>Un prérequis à retrouver ${icon('plus')}</summary><p class="text-flow">${esc(chapter.prerequisites)}</p></details>` : ''}
    ${chapter.formula ? `<section class="formula-section"><h2>Mettre des mots sur la formule</h2><div class="formula" role="math">${esc(chapter.formula)}</div>${chapter.variables?.length ? `<dl class="variable-list">${chapter.variables.map(variable => `<div><dt>${esc(variable.symbol)}</dt><dd>${esc(variable.meaning)}</dd></div>`).join('')}</dl>` : ''}</section>` : ''}
    <details class="proof-block"><summary><span><span class="small-label">COMPRENDRE LE POURQUOI</span><strong>Déplier la démonstration</strong></span>${icon('plus')}</summary><div class="proof-content">${(chapter.proof || []).map(step => `<section><h3>${esc(step.title)}</h3><p class="text-flow">${esc(step.body)}</p></section>`).join('')}</div></details>
    ${chapter.pitfall ? `<section class="pitfall-block"><h2>Et si on se trompait ?</h2><p class="text-flow">${esc(chapter.pitfall)}</p></section>` : ''}
    <section class="reconstruction"><div class="small-label">À TOI DE RECONSTRUIRE</div><h2>Le déclic, avec tes mots.</h2><p class="text-flow">${esc(chapter.exercise?.question)}</p><form data-attempt="${esc(chapter.id)}"><label class="sr-only" for="answer-${esc(chapter.id)}">Ma réponse pour ${esc(chapter.title)}</label><textarea id="answer-${esc(chapter.id)}" name="answer" rows="4" maxlength="10000" placeholder="Pose ton raisonnement ici. Une phrase, un calcul, une intuition…">${esc(attempt?.answer || '')}</textarea><div class="answer-actions"><span class="answer-status" aria-live="polite">${attempt ? 'Dernière réponse enregistrée' : 'Ton brouillon reste à toi.'}</span><button class="secondary" type="submit">Enregistrer ma réponse ${icon('check')}</button></div></form><details class="exercise-hint"><summary>Un petit indice ${icon('down')}</summary><p class="text-flow">${esc(chapter.exercise?.hint)}</p></details><details class="exercise-solution"><summary>Comparer avec la correction ${icon('down')}</summary><p class="text-flow">${esc(chapter.exercise?.solution)}</p></details>
    </section>
    ${chapter.application ? `<section class="application-block"><span class="small-label">POURQUOI C’EST UTILE</span><h2>Emporter l’idée plus loin.</h2><p class="text-flow">${esc(chapter.application)}</p></section>` : ''}
    ${chapter.questions?.length ? `<details class="recall-block"><summary>Quelques questions pour demain ${icon('plus')}</summary><ul>${chapter.questions.map(question => `<li>${esc(question)}</li>`).join('')}</ul></details>` : ''}
    <footer class="chapter-footer"><p>Où en es-tu avec cette idée ? <span>Ton propre repère, sans note.</span></p><div class="review-choices">${Object.entries(REVIEW_LABELS).map(([key, label]) => `<button class="${review === key ? 'selected' : ''}" data-review="${key}" data-review-chapter="${esc(chapter.id)}" aria-pressed="${review === key}">${esc(label)}</button>`).join('')}</div><span class="review-status" data-review-status="${esc(chapter.id)}">${learning.review?.due ? `Prochain rappel conseillé : ${formatDate(learning.review.due)}.` : ''}</span>${index < state.course.chapters.length - 1 ? `<button class="next-chapter text-button" data-next="${esc(state.course.chapters[index + 1].id)}">Continuer vers le chapitre ${String(index + 2).padStart(2, '0')} ${icon('arrow')}</button>` : '<div class="end-course">Tu as parcouru toutes les idées. Reviens sur celles qui résistent.</div>'}</footer>
    </article>`;
}

function renderImportedSources(course) {
  return `<div class="imported-source-intro"><span class="eyebrow">DOCUMENTS ORIGINAUX</span><h1>${esc(course.title)}</h1><p>Ces pages seront le point de départ de ton parcours.</p></div>${(course.sources || []).map(source => `<section class="imported-source"><div class="source-heading"><strong>${esc(source.name)}</strong><a class="text-button" href="${fileUrl(source.file)}" target="_blank" rel="noopener">Ouvrir l’original ${icon('arrow')}</a></div>${source.pages.map(page => `<div class="source-page"><span class="source-page-number">PAGE ${page.number}</span>${renderSourcePage(page)}</div>`).join('')}</section>`).join('')}`;
}

function renderSourcePage(page) {
  return page.image ? `<img class="source-image" src="${fileUrl(page.image)}" alt="Page ${page.number} du document original" loading="lazy">` : `<pre class="source-text">${esc(page.text || 'Cette page ne contient pas de texte extrait.')}</pre>`;
}

function observeChapters() {
  const scrollRoot = document.querySelector('.course-scroll');
  const chapters = [...scrollRoot.querySelectorAll('[data-chapter]')];
  const detectChapter = () => {
    state.scrollFrame = 0;
    const activationLine = scrollRoot.getBoundingClientRect().top + Math.min(140, scrollRoot.clientHeight * 0.24);
    let active = chapters[0];
    for (const chapter of chapters) {
      if (chapter.getBoundingClientRect().top <= activationLine) active = chapter;
      else break;
    }
    activateChapter(active.dataset.chapter);
  };
  const scheduleDetection = () => {
    if (!state.scrollFrame) state.scrollFrame = requestAnimationFrame(detectChapter);
  };
  listen(scrollRoot, 'scroll', scheduleDetection, { passive: true });
  state.observer = new IntersectionObserver(scheduleDetection, { root: scrollRoot, threshold: [0, 0.05, 0.3] });
  chapters.forEach(chapter => state.observer.observe(chapter));
}

function activateChapter(chapterId) {
  if (state.activeChapter === chapterId) return;
  const chapter = state.course.chapters.find(entry => entry.id === chapterId);
  if (!chapter) return;
  state.activeChapter = chapterId;
  const courseId = state.course.id;
  state.lab?.dispose();
  state.lab = new ConceptLab(document.querySelector('#lab-host'), chapter, async answer => {
    try { await recordLearning(courseId, chapter.id, { attempt: { kind: 'prediction', answer } }); }
    catch (error) { toast(error.message, true); }
  }, courseId);
  document.querySelector('.lab-pane').scrollTop = 0;
  document.querySelector('.chapter-picker select').value = chapterId;
  const index = state.course.chapters.indexOf(chapter);
  document.querySelector('#chapter-position').textContent = `${String(index + 1).padStart(2, '0')} / ${String(state.course.chapters.length).padStart(2, '0')}`;
}

function jumpToChapter(chapterId) {
  const section = document.getElementById(`chapter-${chapterId}`);
  const scrollRoot = document.querySelector('.course-scroll');
  if (!section || !scrollRoot) return;
  const top = section.getBoundingClientRect().top - scrollRoot.getBoundingClientRect().top + scrollRoot.scrollTop;
  scrollRoot.scrollTo({ top, behavior: 'instant' });
  activateChapter(chapterId);
}

function bindChapterActions() {
  document.querySelectorAll('[data-sources]').forEach(button => listen(button, 'click', () => openSources(button.dataset.sources)));
  document.querySelectorAll('[data-next]').forEach(button => listen(button, 'click', () => jumpToChapter(button.dataset.next)));
  document.querySelectorAll('[data-attempt]').forEach(form => listen(form, 'submit', async event => {
    event.preventDefault();
    const answer = new FormData(form).get('answer').trim();
    if (!answer) { form.querySelector('textarea').focus(); return; }
    const submit = form.querySelector('[type=submit]');
    const status = form.querySelector('.answer-status');
    submit.disabled = true;
    try {
      await recordLearning(state.course.id, form.dataset.attempt, { attempt: { kind: 'reconstruction', answer } });
      status.textContent = 'Réponse enregistrée dans ton dossier.';
    } catch (error) { status.textContent = error.message; }
    finally { submit.disabled = false; }
  }));
  document.querySelectorAll('[data-review]').forEach(button => listen(button, 'click', async () => {
    const chapterId = button.dataset.reviewChapter;
    button.disabled = true;
    try {
      const entry = await recordLearning(state.course.id, chapterId, { review: button.dataset.review });
      document.querySelectorAll(`[data-review-chapter="${CSS.escape(chapterId)}"]`).forEach(choice => {
        choice.classList.toggle('selected', choice === button);
        choice.setAttribute('aria-pressed', String(choice === button));
      });
      document.querySelector(`[data-review-status="${CSS.escape(chapterId)}"]`).textContent = `Prochain rappel conseillé : ${formatDate(entry.review.due)}.`;
    } catch (error) { toast(error.message, true); }
    finally { button.disabled = false; }
  }));
}

async function recordLearning(courseId, chapterId, payload) {
  const entry = await api(`/api/courses/${encodeURIComponent(courseId)}/learning/${encodeURIComponent(chapterId)}`, payload);
  if (state.course?.id === courseId) state.learning[chapterId] = entry;
  return entry;
}

function openNotes() {
  const courseId = state.course.id;
  const chapter = state.course.chapters.find(entry => entry.id === state.activeChapter);
  if (!chapter) return;
  const learning = state.learning[chapter.id] || {};
  factory.show(`<div class="modal-eyebrow">MES NOTES · CHAPITRE ${String(state.course.chapters.indexOf(chapter) + 1).padStart(2, '0')}</div><h2>${esc(chapter.title)}</h2><p class="modal-intro">Les déclics, les questions, les liens que tu veux garder.</p><form id="notes-form"><label class="sr-only" for="chapter-notes">Mes notes</label><textarea class="notes-editor" id="chapter-notes" maxlength="20000" rows="12" placeholder="Ce que j’ai compris. Ce qui me résiste encore…">${esc(learning.notes || '')}</textarea><p class="form-error" role="alert"></p><button class="primary full-width" type="submit">Enregistrer mes notes ${icon('check')}</button></form>`);
  modal.querySelector('form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button');
    button.disabled = true;
    try {
      await recordLearning(courseId, chapter.id, { notes: modal.querySelector('textarea').value });
      modal.close();
      toast('Notes enregistrées.');
    } catch (error) { factory.error(error); }
    finally { button.disabled = false; }
  });
}

function openSources(chapterId = state.activeChapter) {
  const course = state.course;
  const chapter = course.chapters.find(entry => entry.id === chapterId);
  const references = chapter?.sourceRefs || [];
  const pages = course.sources.flatMap(source => source.pages.map(page => ({ source, page })));
  const preferred = references.length ? pages.filter(entry => references.some(reference => reference.sourceId === entry.source.id && reference.page === entry.page.number)) : pages;
  if (!preferred.length) { toast('Aucune page source pour ce chapitre.'); return; }
  factory.show(`<div class="modal-eyebrow">REVENIR AU DOCUMENT</div><h2>${esc(chapter?.title || course.title)}</h2><div class="source-modal-toolbar"><label class="field"><span class="sr-only">Page source</span><select aria-label="Page source">${preferred.map((entry, index) => `<option value="${index}">${esc(entry.source.name)} · page ${entry.page.number}</option>`).join('')}</select></label><a class="text-button" id="source-original" target="_blank" rel="noopener">Original ${icon('arrow')}</a></div><div id="source-preview"></div>`);
  modal.classList.add('source-modal');
  const select = modal.querySelector('select');
  const renderPage = () => {
    const entry = preferred[Number(select.value)];
    modal.querySelector('#source-preview').innerHTML = renderSourcePage(entry.page);
    modal.querySelector('#source-original').href = fileUrl(entry.source.file);
  };
  select.addEventListener('change', renderPage);
  renderPage();
}

function bindDivider() {
  const divider = document.querySelector('.reader-divider');
  const reader = document.querySelector('.reader');
  let isDragging = false;
  let width = 50;
  const setWidth = percentage => {
    width = Math.max(32, Math.min(65, percentage));
    reader.style.setProperty('--lab-width', `${width}%`);
    divider.setAttribute('aria-valuenow', String(Math.round(width)));
  };
  listen(divider, 'pointerdown', event => {
    isDragging = true;
    divider.setPointerCapture(event.pointerId);
    reader.classList.add('resizing');
  });
  listen(divider, 'pointermove', event => {
    if (!isDragging) return;
    const bounds = reader.getBoundingClientRect();
    setWidth((event.clientX - bounds.left) / bounds.width * 100);
  });
  const stopDragging = () => { isDragging = false; reader.classList.remove('resizing'); };
  listen(divider, 'pointerup', stopDragging);
  listen(divider, 'pointercancel', stopDragging);
  listen(divider, 'dblclick', () => setWidth(50));
  listen(divider, 'keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) return;
    event.preventDefault();
    setWidth(event.key === 'Home' ? 50 : width + (event.key === 'ArrowLeft' ? -3 : 3));
  });
}

function closeReaderMenu() {
  const menu = document.querySelector('.reader-menu');
  if (menu) menu.open = false;
}

function fileUrl(relative) {
  return `/files/${String(relative).split('/').map(encodeURIComponent).join('/')}`;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'Europe/Paris' }).format(date);
}
