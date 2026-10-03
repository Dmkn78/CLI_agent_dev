const documentCourse = JSON.parse(document.querySelector('#course-data').textContent);
const lessonScroll = document.querySelector('#course-scroll');
const lessonSections = [...document.querySelectorAll('[data-chapter]')];
const chapterPicker = document.querySelector('#chapter-picker');
const labHost = document.querySelector('#lab');
const sourceDialog = document.querySelector('#source-dialog');
const noteStorageKey = `prisme-document:${documentCourse.id}:notes`;
const courseNotes = Object.fromEntries(documentCourse.chapters.map((chapter, index) => [index, documentCourse.learning[chapter.id]?.notes || '']));
let activeChapterIndex = -1;
let activeLab = null;
let scrollQueued = false;
const frameScrollBridge = `<script>
window.addEventListener('wheel', function(event) {
  if (event.ctrlKey || event.target.closest('input,select,textarea,canvas,svg')) return;
  event.preventDefault();
  window.parent.postMessage({ type: 'prisme-export-scroll', delta: event.deltaY, mode: event.deltaMode }, '*');
}, { passive: false });
<\/script>`;

try {
  const savedNotes = JSON.parse(localStorage.getItem(noteStorageKey) || '{}');
  Object.keys(courseNotes).forEach(index => {
    if (typeof savedNotes[index] === 'string') courseNotes[index] = savedNotes[index];
  });
} catch { /* file:// storage varies by browser; notes can always be downloaded. */ }

function activateChapter(index) {
  if (index === activeChapterIndex || !documentCourse.chapters[index]) return;
  activeLab?.dispose();
  activeChapterIndex = index;
  chapterPicker.value = String(index);
  lessonSections.forEach((section, position) => section.classList.toggle('active', position === index));
  try {
    const chapter = documentCourse.chapters[index];
    const displayChapter = chapter.lab.kind === 'custom'
      ? { ...chapter, lab: { ...chapter.lab, html: chapter.lab.html + frameScrollBridge } }
      : chapter;
    activeLab = new ConceptLab(labHost, displayChapter, async () => {});
  } catch {
    labHost.replaceChildren();
    const failure = document.createElement('p');
    failure.className = 'lab-error';
    failure.textContent = 'Cette expérience ne peut pas être affichée dans ce navigateur. Le cours et les sources restent disponibles.';
    labHost.append(failure);
  }
}

function syncChapterFromScroll() {
  scrollQueued = false;
  const readingLine = lessonScroll.getBoundingClientRect().top + Math.min(150, lessonScroll.clientHeight * 0.22);
  let visibleIndex = 0;
  lessonSections.forEach((section, index) => {
    if (section.getBoundingClientRect().top <= readingLine) visibleIndex = index;
  });
  activateChapter(visibleIndex);
}

lessonScroll.addEventListener('scroll', () => {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(syncChapterFromScroll);
}, { passive: true });

chapterPicker.addEventListener('change', () => {
  const index = Number(chapterPicker.value);
  const section = lessonSections[index];
  if (!section) return;
  lessonScroll.scrollTop += section.getBoundingClientRect().top - lessonScroll.getBoundingClientRect().top - 24;
  activateChapter(index);
});

// The lab remains stationary: ordinary wheel gestures follow the lesson, while
// explicit controls and canvas gestures remain available to the experiment.
document.querySelector('.lab-shell').addEventListener('wheel', event => {
  if (event.ctrlKey || event.target.closest('input, select, textarea, canvas, svg')) return;
  event.preventDefault();
  lessonScroll.scrollTop += scrollDistance(event.deltaY, event.deltaMode);
}, { passive: false });

function scrollDistance(delta, mode) {
  return Math.max(-2000, Math.min(2000, delta * (mode === 1 ? 16 : mode === 2 ? lessonScroll.clientHeight : 1)));
}

window.addEventListener('message', event => {
  const frame = labHost.querySelector('iframe');
  if (!frame || event.source !== frame.contentWindow || event.data?.type !== 'prisme-export-scroll') return;
  if (!Number.isFinite(event.data.delta) || ![0, 1, 2].includes(event.data.mode)) return;
  lessonScroll.scrollTop += scrollDistance(event.data.delta, event.data.mode);
});

document.querySelectorAll('[data-note]').forEach(input => {
  const index = input.dataset.note;
  input.value = courseNotes[index];
  input.addEventListener('input', () => {
    courseNotes[index] = input.value;
    const status = document.querySelector(`[data-note-status="${index}"]`);
    try {
      localStorage.setItem(noteStorageKey, JSON.stringify(courseNotes));
      status.textContent = 'Note conservée dans ce navigateur.';
    } catch {
      status.textContent = 'Note gardée dans cet onglet. Télécharge tes notes avant de fermer.';
    }
  });
});

document.querySelector('#download-notes').addEventListener('click', () => {
  const notes = documentCourse.chapters.map((chapter, index) => ({ chapter: chapter.title, chapterId: chapter.id, notes: courseNotes[index] }));
  const noteFile = new Blob([JSON.stringify({ courseId: documentCourse.id, notes }, null, 2)], { type: 'application/json' });
  const downloadUrl = URL.createObjectURL(noteFile);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = 'prisme-notes.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
});

document.querySelectorAll('[data-source]').forEach(button => button.addEventListener('click', () => {
  const source = documentCourse.sources[Number(button.dataset.source)];
  const page = source?.pages?.find(entry => entry.number === Number(button.dataset.page));
  if (!page) return;
  document.querySelector('#source-title').textContent = `${source.name} · page ${page.number}`;
  const content = document.querySelector('#source-content');
  content.replaceChildren();
  if (page.imageData) {
    const pageImage = document.createElement('img');
    pageImage.src = page.imageData;
    pageImage.alt = `${source.name}, page ${page.number}`;
    content.append(pageImage);
  }
  if (page.text) {
    const extracted = document.createElement('pre');
    extracted.textContent = page.text;
    if (page.imageData) {
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = 'Texte extrait de cette page';
      details.append(summary, extracted);
      content.append(details);
    } else content.append(extracted);
  }
  if (!page.text && !page.imageData) {
    const unavailable = document.createElement('p');
    unavailable.textContent = 'L’image de cette page n’est pas embarquée dans ce document. Exporte depuis la bibliothèque Prisme pour conserver toutes les sources.';
    content.append(unavailable);
  }
  if (source.originalData) {
    const download = document.createElement('a');
    download.textContent = 'Télécharger le fichier original';
    download.href = source.originalData;
    download.download = source.name;
    download.className = 'source-download';
    content.append(download);
  }
  sourceDialog.showModal();
}));
document.querySelector('#close-source').addEventListener('click', () => sourceDialog.close());
sourceDialog.addEventListener('click', event => { if (event.target === sourceDialog) sourceDialog.close(); });
window.addEventListener('pagehide', () => activeLab?.dispose());
window.addEventListener('resize', syncChapterFromScroll);
activateChapter(0);
