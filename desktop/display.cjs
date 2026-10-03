// One zoom setting for the workspace and its embedded browser surfaces.
const MIN_ZOOM = 50, MAX_ZOOM = 175;

function registerDisplay({ipcMain, trusted, getWindow, browsers}) {
  ipcMain.handle('display:zoom', (event, percent) => {
    trusted(event);
    if (!Number.isFinite(percent) || percent < MIN_ZOOM || percent > MAX_ZOOM) throw new Error('Zoom invalide.');
    const factor = percent / 100;
    getWindow().webContents.setZoomFactor(factor);
    for (const view of browsers.values()) {
      if (!view.webContents.isDestroyed()) view.webContents.setZoomFactor(factor * (view.atelierZoomFactor || 1));
    }
    // Chromium shares zoom between pages at the same origin. Apply the visible
    // tab last so each Atelier tab restores its chosen scale when selected.
    for (const view of getWindow().contentView.children) {
      if ([...browsers.values()].includes(view) && !view.webContents.isDestroyed()) view.webContents.setZoomFactor(factor * (view.atelierZoomFactor || 1));
    }
    return percent;
  });
}

function bindZoomShortcuts(contents, getWindow, onShortcut) {
  const send = action => onShortcut ? onShortcut(action) : getWindow()?.webContents.send('display:zoom-shortcut', action);
  contents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown' || !(input.control || input.meta) || input.alt) return;
    const action = ['-', '_'].includes(input.key) || input.code === 'NumpadSubtract' ? 'out' : ['+', '='].includes(input.key) || input.code === 'NumpadAdd' ? 'in' : input.key === '0' || input.code === 'Numpad0' ? 'reset' : null;
    if (action) { event.preventDefault(); send(action); }
  });
  contents.on('zoom-changed', (event, direction) => { event.preventDefault(); send(direction); });
}

module.exports = {registerDisplay, bindZoomShortcuts};
