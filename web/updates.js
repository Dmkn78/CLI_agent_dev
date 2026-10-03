let desktopUpdateStatus = null;

function updatesView() {
  if (!window.atelierDesktop?.updateState) return '';
  const status = desktopUpdateStatus;
  if (!status) return '<section id="desktop-updates" class="work-band"><h3>Atelier · mises à jour</h3><p>Chargement…</p></section>';
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
  return `<section id="desktop-updates" class="work-band" aria-label="Mises à jour Atelier">
    <div class="panel-heading"><h3>${icon('download')} Atelier ${esc(status.currentVersion)}</h3></div>
    <p role="status">${esc(messages[status.phase] || '')}</p>
    ${status.error ? `<p class="inline-error">${esc(status.error)}</p>` : ''}
    <p><label><input type="checkbox" data-update-preference="checkAutomatically" ${status.preferences.checkAutomatically ? 'checked' : ''}> Vérifier automatiquement les mises à jour</label></p>
    <p><label><input type="checkbox" data-update-preference="downloadAutomatically" ${status.preferences.downloadAutomatically ? 'checked' : ''}> Télécharger automatiquement les mises à jour</label></p>
    <p class="muted small">Le redémarrage vous sera proposé. Vos projets et données restent sur cet ordinateur.</p>
    ${canCheck ? btn('updates-check','Rechercher une mise à jour','refresh','secondary') : ''}
    ${status.phase === 'available' ? btn('updates-download','Télécharger','download','primary') : ''}
    ${status.phase === 'downloaded' ? btn('updates-install','Installer et redémarrer','refresh','primary') : ''}
  </section>`;
}

function receiveUpdateStatus(status) {
  const previous = desktopUpdateStatus?.phase;
  desktopUpdateStatus = status;
  const panel = document.querySelector('#desktop-updates');
  if (panel) panel.outerHTML = updatesView();
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
