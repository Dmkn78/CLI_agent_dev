import { api, filePayload, toast } from './api.js';
import { escapeHtml as esc, icon } from './icons.js';

export class FactoryPanel {
  constructor({ getBootstrap, refresh, openCourse }) {
    this.getBootstrap = getBootstrap;
    this.refresh = refresh;
    this.openCourse = openCourse;
    this.files = [];
    this.dialog = document.querySelector('#modal');
  }

  openImport() {
    this.files = [];
    this.show(`<div class="modal-eyebrow">TA FABRIQUE DE COURS</div><h2>Un cours à déposer.<br>Un monde à explorer.</h2><p class="modal-intro">Tes documents deviennent des explications, des expériences et des questions à résoudre.</p>
      <form id="import-form"><label class="dropzone" tabindex="0">${icon('upload')}<strong>Dépose tes fichiers ici</strong><span>ou <u>parcourir les fichiers</u></span><small>PDF, images, photos, Markdown, texte · 25 Mo par fichier</small><input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md" aria-label="Fichiers du cours"></label>
      <div id="file-list"></div><label class="field">Nom du cours <span class="muted">facultatif</span><input name="title" placeholder="Par exemple, Processus stochastiques" maxlength="160"></label>
      <div class="import-method">${icon('layers')}<span>Le texte est extrait. Les pages scannées sont conservées en images pour une lecture visuelle.</span></div>
      <p class="form-error" role="alert"></p><button class="primary full-width" type="submit" disabled>Préparer mon cours ${icon('arrow')}</button><p class="privacy-line">Fichiers conservés dans ton dossier Prisme. L’envoi à Codex commence à la création.</p></form>`);
    const input = this.dialog.querySelector('input[type=file]');
    input.addEventListener('change', () => this.selectFiles([...input.files]));
    const zone = this.dialog.querySelector('.dropzone');
    zone.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); input.click(); } });
    zone.addEventListener('dragover', event => { event.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', event => { event.preventDefault(); zone.classList.remove('dragover'); this.selectFiles([...event.dataTransfer.files]); });
    this.dialog.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault();
      const button = this.dialog.querySelector('[type=submit]');
      button.disabled = true; button.textContent = 'Lecture et préparation des sources…';
      try {
        const files = await Promise.all(this.files.map(filePayload));
        const course = await api('/api/import', { title: this.dialog.querySelector('[name=title]').value, files });
        await this.refresh();
        await this.openCourse(course.id);
        this.openGeneration(course);
      } catch (error) {
        this.error(error);
        button.disabled = false; button.textContent = 'Préparer mon cours';
      }
    });
  }

  selectFiles(files) {
    const merged = [...this.files, ...files];
    if (merged.length > 12) { this.error(new Error('12 fichiers maximum par cours.')); return; }
    if (merged.reduce((sum, file) => sum + file.size, 0) > 40 * 1024 * 1024) { this.error(new Error('Le lot dépasse 40 Mo.')); return; }
    this.files = merged;
    this.dialog.querySelector('#file-list').innerHTML = this.files.map((file, index) => `<div class="file-row">${icon('file')}<span>${esc(file.name)}<small>${(file.size / 1024).toFixed(0)} Ko</small></span><button type="button" data-remove="${index}" class="icon-button" aria-label="Retirer ${esc(file.name)}">${icon('close')}</button></div>`).join('');
    this.dialog.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => {
      this.files.splice(Number(button.dataset.remove), 1); this.selectFiles([]);
    }));
    this.dialog.querySelector('[type=submit]').disabled = !this.files.length;
    this.dialog.querySelector('.form-error').textContent = '';
  }

  openGeneration(course) {
    const codex = this.getBootstrap().codex;
    this.show(`<div class="modal-eyebrow">SOURCES PRÊTES</div><h2>${esc(course.title)}</h2><p class="modal-intro">${course.pageCount || 0} pages conservées · ${course.visionPages || 0} à lire visuellement. La création utilise ton compte Codex.</p>
      <div class="pipeline"><div class="done">${icon('check')} Importer</div><i></i><div class="done">${icon('check')} Lire les sources</div><i></i><div>${icon('spark')} Créer</div></div>
      <div class="connection-box">${icon('code')}<div><strong>Codex CLI</strong><span id="connection-text">${codex?.signedIn ? 'Compte détecté · catalogue disponible' : 'Connecte ton compte existant'}</span></div><button class="secondary" id="connect-codex">${codex?.signedIn ? 'Actualiser' : 'Connecter'}</button></div>
      <form id="generation-form"><div class="field-grid"><label class="field">Modèle<select name="model" aria-label="Modèle Codex"><option value="">Connecte Codex pour choisir</option></select></label><label class="field">Effort<select name="effort" aria-label="Effort de raisonnement"></select></label></div>
      <details class="advanced-options"><summary>Permissions de création</summary><label class="field">Accès de Codex<select name="permission"><option value="read-only">Lecture seule des sources</option><option value="workspace-write">Écriture dans le dossier de ce cours</option></select></label><p>Les autorisations restent demandées au besoin. Le parcours peut être généré en lecture seule ; Prisme enregistre sa réponse.</p></details>
      <p class="form-error" role="alert"></p><button class="primary full-width" type="submit" ${!codex?.signedIn ? 'disabled' : ''}>Créer mon parcours ${icon('spark')}</button><p class="privacy-line">Les sources sont envoyées au modèle choisi. Aucune génération ne démarre avant ce clic.</p></form>`);
    if (codex) this.fillModels(codex);
    this.dialog.querySelector('#connect-codex').addEventListener('click', async event => {
      const button = event.currentTarget; button.disabled = true; button.textContent = 'Connexion…';
      try {
        const result = await api('/api/connect', {});
        await this.refresh();
        if (!this.dialog.querySelector('#generation-form')) return;
        this.fillModels(result);
        this.dialog.querySelector('#connection-text').textContent = result.signedIn ? 'Compte détecté · catalogue disponible' : 'Compte absent : utilise codex login dans ton terminal.';
      } catch (error) { this.error(error); }
      finally { button.disabled = false; button.textContent = 'Actualiser'; }
    });
    this.dialog.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault();
      const button = this.dialog.querySelector('[type=submit]'); button.disabled = true;
      const fields = Object.fromEntries(new FormData(event.currentTarget));
      try {
        const job = await api(`/api/courses/${course.id}/generate`, fields);
        this.openJob(job);
      } catch (error) { this.error(error); button.disabled = false; }
    });
  }

  fillModels(codex) {
    const select = this.dialog.querySelector('[name=model]');
    if (!select) return;
    select.innerHTML = codex.models.map(model => `<option value="${esc(model.id)}" ${model.isDefault ? 'selected' : ''}>${esc(model.name)}</option>`).join('');
    const fillEfforts = () => {
      const model = codex.models.find(entry => entry.id === select.value);
      this.dialog.querySelector('[name=effort]').innerHTML = (model?.efforts?.length ? model.efforts : ['']).map(effort => `<option value="${esc(effort)}" ${effort === model?.defaultEffort ? 'selected' : ''}>${esc(effort || 'Par défaut')}</option>`).join('');
    };
    select.addEventListener('change', fillEfforts); fillEfforts();
    this.dialog.querySelector('[type=submit]').disabled = !codex.signedIn || !codex.models.length;
  }

  openJob(job) {
    this.show(`<div class="modal-eyebrow">LA FABRIQUE EST AU TRAVAIL</div><h2>De la matière<br>à la compréhension.</h2><div id="job-status"></div><p class="form-error" role="alert"></p><div id="job-actions"></div><p class="privacy-line">Tu peux fermer ce panneau. La création continue tant que Prisme reste ouvert.</p>`);
    const generation = Symbol('job'); this.jobGeneration = generation;
    const render = async current => {
      if (this.jobGeneration !== generation || !this.dialog.open) return;
      const finished = ['completed', 'failed', 'cancelled', 'interrupted'].includes(current.status);
      this.dialog.querySelector('#job-status').innerHTML = `<div class="job-state ${finished ? '' : 'working'}">${icon(finished ? current.status === 'completed' ? 'check' : 'file' : 'spark')}<strong>${esc(current.message)}</strong></div><div class="job-facts"><span>Lot ${current.batch} / ${current.totalBatches}</span><span>${esc(current.model)}</span></div>${current.usage?.last?.totalTokens ? `<p class="muted">${current.usage.last.totalTokens.toLocaleString('fr-FR')} tokens observés sur le dernier tour</p>` : ''}`;
      const actions = this.dialog.querySelector('#job-actions');
      if (current.status === 'approval') {
        actions.innerHTML = `<div class="approval"><strong>Autorisation demandée</strong><pre>${esc(JSON.stringify(current.approval.details, null, 2))}</pre><button class="secondary" data-decision="false">Refuser</button><button class="primary" data-decision="true">Autoriser cette action</button></div>`;
        actions.querySelectorAll('[data-decision]').forEach(button => button.addEventListener('click', async () => {
          try { await api(`/api/jobs/${current.id}/approve`, { accept: button.dataset.decision === 'true' }); } catch (error) { this.error(error); }
        }));
      } else if (current.status === 'completed') {
        actions.innerHTML = `<button class="primary full-width" id="open-result">Explorer mon cours ${icon('arrow')}</button>`;
        actions.querySelector('button').addEventListener('click', async () => { this.dialog.close(); await this.refresh(); await this.openCourse(current.courseId); });
      } else if (!finished) {
        actions.innerHTML = '<button class="secondary full-width" id="cancel-job">Arrêter la création</button>';
        actions.querySelector('button').addEventListener('click', async event => {
          event.currentTarget.disabled = true;
          try { await api(`/api/jobs/${current.id}/cancel`, {}); } catch (error) { this.error(error); }
        });
      } else actions.innerHTML = '<p class="muted">Les originaux sont conservés dans ta bibliothèque. Tu peux relancer la création depuis le cours.</p>';
      if (!finished) setTimeout(async () => {
        if (this.jobGeneration !== generation || !this.dialog.open) return;
        try { await render(await api(`/api/jobs/${current.id}`)); } catch (error) { this.error(error); }
      }, 1200);
      else await this.refresh();
    };
    render(job);
  }

  openProfile() {
    const profile = this.getBootstrap().profile;
    this.show(`<div class="modal-eyebrow">TON APPRENTISSAGE</div><h2>À ta manière.</h2><p class="modal-intro">Ces préférences orientent la création. Tes difficultés restent à vérifier par tes réponses.</p><form id="profile-form">${[
      ['approach', 'Ce qui m’aide à comprendre'], ['goal', 'Ce que je veux savoir faire'], ['difficulties', 'Ce qui me bloque en ce moment'], ['applications', 'Les applications qui m’intéressent']
    ].map(([key, label]) => `<label class="field">${label}<textarea name="${key}" maxlength="3000" rows="2">${esc(profile[key])}</textarea></label>`).join('')}<p class="form-error" role="alert"></p><button class="primary full-width" type="submit">Enregistrer mes préférences ${icon('check')}</button></form>`);
    this.dialog.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault();
      try { await api('/api/profile', Object.fromEntries(new FormData(event.currentTarget))); await this.refresh(); this.dialog.close(); toast('Préférences enregistrées pour les prochaines créations.'); }
      catch (error) { this.error(error); }
    });
  }

  show(content) {
    this.jobGeneration = null;
    this.dialog.innerHTML = `<button class="modal-close icon-button" aria-label="Fermer">${icon('close')}</button>${content}`;
    this.dialog.querySelector('.modal-close').addEventListener('click', () => this.dialog.close());
    if (!this.dialog.open) this.dialog.showModal();
  }

  error(error) {
    const field = this.dialog.querySelector('.form-error');
    if (field) field.textContent = error.message;
    else toast(error.message, true);
  }
}

