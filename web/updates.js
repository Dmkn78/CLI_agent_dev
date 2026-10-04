let desktopUpdateStatus = null;

function updatesView() {
  if (!window.atelierDesktop?.updateState) return '';
  const status = desktopUpdateStatus;
  if (!status) return `<section id="desktop-updates" class="updates-card" aria-label="Mises à jour Atelier"><div class="updates-heading"><span class="updates-icon">${icon('download')}</span><div><span class="updates-eyebrow">Mises à jour</span><h3>Atelier</h3></div></div><p class="updates-status" role="status">Chargement…</p></section>`;
  const messages = {
    disabled: 'Les mises à jour sont disponibles dans la version installée.',
    idle: 'Vous pouvez rechercher une nouvelle version.', checking: 'Recherche en cours…',
    current: 'Vous utilisez la dernière version disponible sur ce canal.',
    available: `La version ${status.nextVersion} est disponible.`,
    downloading: `Téléchargement : ${status.percent || 0} %`,
    downloaded: 'La mise à jour est prête. Choisissez quand redémarrer.',
    installing: 'Préparation du redémarrage…', error: 'La vérification ou le téléchargement a échoué. Vous pouvez réessayer.',
  };
  const canCheck = ['idle', 'current', 'available', 'error'].includes(status.phase);
  const phaseLabels = {
    disabled: 'Version de développement', idle: 'À vérifier', checking: 'Recherche…',
    current: 'À jour', available: 'Nouvelle version', downloading: 'Téléchargement…',
    downloaded: 'Prête à installer', installing: 'Redémarrage…', error: 'À réessayer',
  };
  const preference = (key, title, description) => `<label class="update-option">
    <span class="update-option-copy"><span class="update-option-title" id="update-${key}-label">${title}</span><span class="update-option-description" id="update-${key}-description">${description}</span></span>
    <span class="update-switch"><input type="checkbox" role="switch" data-update-preference="${key}" aria-labelledby="update-${key}-label" aria-describedby="update-${key}-description" ${status.preferences[key] ? 'checked' : ''}><span class="update-switch-track" aria-hidden="true"></span></span>
  </label>`;
  return `<section id="desktop-updates" class="updates-card" data-phase="${esc(status.phase)}" aria-label="Mises à jour Atelier">
    <div class="updates-heading"><span class="updates-icon">${icon('download')}</span><div><span class="updates-eyebrow">Mises à jour</span><h3>Atelier ${esc(status.currentVersion)}</h3></div><span class="updates-phase">${esc(phaseLabels[status.phase] || 'Mises à jour')}</span></div>
    <p class="updates-status" role="status">${esc(messages[status.phase] || '')}</p>
    ${status.phase === 'downloading' ? `<progress class="updates-progress" max="100" value="${esc(status.percent || 0)}" aria-label="Téléchargement de la mise à jour">${esc(status.percent || 0)} %</progress>` : ''}
    ${status.error ? `<p class="inline-error">${esc(status.error)}</p>` : ''}
    <div class="update-options">
      ${preference('checkAutomatically', 'Vérification automatique', 'Repérer les nouvelles versions dès leur disponibilité.')}
      ${preference('downloadAutomatically', 'Téléchargement automatique', 'Préparer l’installation en arrière-plan.')}
    </div>
    <div class="updates-footer"><p class="updates-note">${icon('shield')}<span>Le redémarrage vous sera proposé. Vos projets et données restent sur cet ordinateur.</span></p><div class="updates-actions">
      ${canCheck ? btn('updates-check','Rechercher une mise à jour','search','secondary') : ''}
      ${status.phase === 'available' ? btn('updates-download','Télécharger','download','primary') : ''}
      ${status.phase === 'downloaded' ? btn('updates-install','Installer et redémarrer','download','primary') : ''}
    </div></div>
  </section>`;
}

function receiveUpdateStatus(status) {
  const previous = desktopUpdateStatus?.phase;
  desktopUpdateStatus = status;
  const panel = document.querySelector('#desktop-updates');
  if (panel) {
    const focused = panel.contains(document.activeElement) ? document.activeElement : null;
    const preference = focused?.dataset.updatePreference;
    const action = focused?.dataset.action;
    panel.outerHTML = updatesView();
    if (preference || action) {
      const controls = document.querySelectorAll('#desktop-updates input, #desktop-updates button');
      [...controls].find(control => preference ? control.dataset.updatePreference === preference : control.dataset.action === action)?.focus({preventScroll: true});
    }
  }
  if (status.phase !== previous && status.phase === 'available') toast(`Atelier ${status.nextVersion} disponible dans Connexions.`);
  if (status.phase !== previous && status.phase === 'downloaded') toast('Mise à jour prête : ouvrez Connexions pour redémarrer.');
}

document.addEventListener('change', async event => {
  const preference = event.target.dataset.updatePreference;
  if (!preference) return;
  try { receiveUpdateStatus(await window.atelierDesktop.updatePreferences({[preference]: event.target.checked})); }
  catch (error) { toast(error.message); receiveUpdateStatus(desktopUpdateStatus); }
});

if (window.atelierDesktop?.updateState) {
  window.atelierDesktop.onUpdateState(receiveUpdateStatus);
  window.atelierDesktop.updateState().then(receiveUpdateStatus).catch(error => toast(error.message));
}
