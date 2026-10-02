"use strict";
let telegramPairing=null,telegramPollTimer=null,telegramPollBusy=false,telegramPairingError='';
let telegramPairingGeneration=0;
const TELEGRAM_POLL_MS=1800;

function telegramQr(link) {
  if (typeof qrcode !== 'function') return '<p class="muted">Utilisez le lien ci-dessous.</p>';
  const code=qrcode(0,'M');
  code.addData(link);code.make();
  return code.createSvgTag({cellSize:5,margin:20,scalable:true});
}

function telegramSelect(label,name,options,value) {
  // Keep in-progress choices when the observed relay state refreshes the page.
  return select(label,name,options,value).replace('<select ',`<select id="${name}" `);
}

function telegramView() {
  const telegram=duplicaData().telegram;
  const connected=telegram.configured;
  const status=telegram.lastError ? 'Connexion interrompue' : telegram.running && telegram.enabled ? 'Relais actif' : connected ? 'Relais en pause' : telegramPairing ? 'Association en cours' : 'À configurer';
  return `<section class="telegram-workspace" aria-label="Bot Telegram de Duplica">
    <header class="telegram-heading"><div><span class="eyebrow">DUPLICA · TELEGRAM</span><h2>Votre bot, à portée de main.</h2><p>La même discussion sur votre téléphone et dans Atelier. Confiez une mission à Duplica, puis retrouvez son suivi ici.</p></div><span class="telegram-status ${connected && telegram.enabled && !telegram.lastError ? 'active' : ''}"><i></i>${status}</span></header>
    ${connected ? telegramConnectedView(telegram) : telegramSetupView(telegram)}
    <footer class="telegram-footnote">${icon('shield')}<span>Le relais fonctionne tant que le service Atelier reste ouvert sur cet ordinateur. Seule votre conversation Telegram privée est acceptée.</span></footer>
  </section>`;
}

function telegramSetupView(telegram) {
  const pairing=telegramPairing;
  return `<div class="telegram-setup"><ol class="telegram-steps">
    <li class="${pairing ? 'complete' : ''}"><span class="step-number">1</span><div><h3>Créez votre bot</h3><p>Ouvrez <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">@BotFather</a>, envoyez <code>/newbot</code> et choisissez un nom. Telegram vous remet un token.</p><a class="button secondary" href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">Ouvrir BotFather ${icon('external')}</a></div></li>
    <li class="${pairing ? 'complete' : 'current'}"><span class="step-number">2</span><div><h3>Reliez-le à Duplica</h3>${pairing ? `<p>Bot reconnu : <strong>@${esc(pairing.botUsername)}</strong>.</p>` : `<form data-form="duplica-telegram" class="telegram-connect"><label for="telegram-token">Token fourni par BotFather</label><div class="telegram-token-field"><input id="telegram-token" type="password" name="botToken" autocomplete="off" spellcheck="false" required placeholder="Collez le token ici" aria-describedby="telegram-token-note"><button type="submit" class="button primary">Préparer la connexion ${icon('arrow')}</button></div><p id="telegram-token-note" class="muted small">Saisi une seule fois, puis conservé chiffré pour votre compte Windows après l’association. Il n’apparaît ni dans le QR code ni dans la discussion.</p></form>${telegram.pairingPending ? `<p class="muted small">Une association a déjà été préparée.</p>${btn('telegram-renew','Reprendre l’association','arrow','quiet')}` : ''}`}</div></li>
    <li class="${pairing ? 'current' : ''}"><span class="step-number">3</span><div><h3>Scannez et démarrez</h3><p>${pairing ? 'Scannez le QR code avec votre téléphone, puis appuyez sur Démarrer dans Telegram. Atelier détecte la connexion automatiquement.' : 'Votre QR code personnel apparaîtra après la vérification du bot.'}</p></div></li>
  </ol><aside class="telegram-pairing-card">${pairing ? telegramPairingView(pairing) : `<div class="telegram-phone-preview"><span>${icon('agents')}</span><strong>Duplica</strong><p>Votre projet vous suit.</p><div class="telegram-preview-message">Une idée, une question,<br>une mission à faire avancer.</div><small>Aperçu du parcours · aucun bot connecté</small></div><p class="muted small">Créez le bot, puis scannez votre QR code pour l’associer.</p>`}</aside></div>`;
}

function telegramPairingView(pairing) {
  const expired=Date.now() >= pairing.expiresAt;
  const chosen=state.projects.find(project => project.id === pairing.projectId);
  return `<div class="telegram-pairing" id="telegram-pairing"><strong>@${esc(pairing.botUsername)}</strong><span class="muted small">${esc(chosen?.name || pairing.projectId)}</span>
    ${expired ? `<div class="telegram-expired">${icon('clock')}<h3>Ce QR code a expiré</h3><p>Générez-en un nouveau pour continuer.</p></div>` : `<div class="telegram-qr" role="img" aria-label="QR code pour associer votre compte Telegram">${telegramQr(pairing.deepLink)}</div><a class="button primary" href="${esc(pairing.deepLink)}" target="_blank" rel="noopener noreferrer">Ouvrir dans Telegram ${icon('external')}</a><p class="telegram-waiting" role="status">En attente de Démarrer dans Telegram…</p><p class="muted small">Valable jusqu’à ${esc(stamp(new Date(pairing.expiresAt).toISOString()))} · 5 minutes</p>`}
    ${telegramPairingError ? `<p class="inline-error" role="alert">${esc(telegramPairingError)}</p>` : ''}
    <div class="row-actions">${btn('telegram-renew',expired ? 'Nouveau QR code' : 'Renouveler','','quiet')}${btn('telegram-cancel','Annuler','','quiet')}</div>
    <details class="telegram-manual"><summary>Connexion manuelle</summary><p>Envoyez cette commande au bot :</p><code>/start ${esc(pairing.pairingCode)}</code></details></div>`;
}

function telegramConnectedView(telegram) {
  const linked=state.projects.find(project => project.id === telegram.projectId);
  const models=provider().models || [];
  return `<div class="telegram-connected"><div class="telegram-account"><span class="telegram-account-icon">${icon('agents')}</span><div><h3>${telegram.botUsername ? '@'+esc(telegram.botUsername) : 'Bot Telegram associé'}</h3><p>${esc(linked?.name || 'Choisissez un projet')} · Discussion partagée avec Duplica</p></div><div class="row-actions">${telegram.botUsername ? `<a class="button secondary" href="https://t.me/${encodeURIComponent(telegram.botUsername)}" target="_blank" rel="noopener noreferrer">Ouvrir Telegram ${icon('external')}</a>` : ''}${btn('telegram-discussion','Discussion dans Atelier','arrow','primary')}</div></div>
    ${telegram.lastError ? `<p class="inline-error" role="alert">${esc(telegram.lastError)}</p>` : ''}
    <div class="telegram-settings-layout"><form data-form="telegram-settings" class="telegram-settings"><h3>Le travail de votre bot</h3>
      ${telegramSelect('Projet relié','telegramProject',state.projects.map(project => [project.id,project.name]),telegram.projectId)}
      ${telegramSelect('Modèle pour les missions /work','telegramModel',[['','Modèle par défaut du catalogue'],...models.map(model => [model.model,model.displayName])],telegram.workModel)}
      ${telegramSelect('Permissions des nouvelles missions /work','telegramSandbox',[['read-only','Diagnostic et plan · lecture seule'],['workspace-write','Implémentation · écriture dans ce projet']],telegram.workSandbox)}
      <p class="muted small">Les messages ordinaires servent à discuter. <code>/work</code> confie du travail avec ces permissions ; les demandes d’autorisation restent actives. Un changement de projet rétablit la lecture seule.</p>
      <button type="submit" class="button primary">Enregistrer</button></form>
      <div class="telegram-commands"><h3>Depuis Telegram</h3><dl><dt>Un message</dt><dd>Discutez avec Duplica. La réponse apparaît aussi dans Atelier.</dd><dt><code>/work votre objectif</code></dt><dd>Démarrez une mission dans le projet relié.</dd><dt><code>/status</code></dt><dd>Consultez l’état observé de Duplica.</dd><dt><code>/pause</code> · <code>/stop</code></dt><dd>Mettez la supervision en pause ou arrêtez-la.</dd></dl><p class="muted small">Les résultats et preuves restent consultables dans Suivi.</p></div></div>
    <div class="telegram-connection-actions"><span class="muted small">${telegram.lastPollAt ? 'Dernier contact Telegram · '+esc(stamp(telegram.lastPollAt)) : 'Premier contact Telegram en attente'}</span>${btn('telegram-toggle',telegram.enabled ? 'Mettre le relais en pause' : 'Activer le relais',telegram.enabled ? 'pause' : 'play','secondary')}${btn('telegram-disconnect','Dissocier le bot','','quiet')}</div></div>`;
}

function openTelegram() {duplicaPanel='telegram';route('duplica');}

function isCurrentTelegramPairing(pairing) {
  return pairing && telegramPairing === pairing && pairing.generation === telegramPairingGeneration;
}

async function prepareTelegramPairing(path,fields) {
  const generation=++telegramPairingGeneration;
  clearTimeout(telegramPollTimer);
  try {
    const pairing=await api(path,fields);
    if (generation !== telegramPairingGeneration) return;
    telegramPairing={...pairing,generation};
    telegramPairingError='';
    render();
  } catch (error) {
    if (generation === telegramPairingGeneration) {
      if (telegramPairing) telegramPairing.generation=generation;
      telegramPairingError=error.message;
      render();
      throw error;
    }
  }
}

function mountTelegram() {
  clearTimeout(telegramPollTimer);
  if (view !== 'duplica' || duplicaPanel !== 'telegram' || !isCurrentTelegramPairing(telegramPairing) || telegramPollBusy) return;
  if (Date.now() >= telegramPairing.expiresAt) return;
  telegramPollTimer=setTimeout(pollTelegramPairing,TELEGRAM_POLL_MS);
}

async function pollTelegramPairing() {
  const pairing=telegramPairing;
  if (!isCurrentTelegramPairing(pairing) || view !== 'duplica' || duplicaPanel !== 'telegram') return;
  telegramPollBusy=true;
  try {
    const result=await api('duplica/telegram/pair',{pairingId:pairing.pairingId});
    if (!isCurrentTelegramPairing(pairing)) return;
    telegramPairingError='';
    if (result.connected) {
      telegramPairing=null;
      await refresh(true);
      toast('Votre bot est relié à Duplica. Vous pouvez lui écrire sur Telegram.');
    } else if (result.expired) {pairing.expiresAt=0;render();}
  } catch (error) {
    if (isCurrentTelegramPairing(pairing)) {telegramPairingError=error.message;render();}
  } finally {
    telegramPollBusy=false;
    if (isCurrentTelegramPairing(pairing) && Date.now() >= pairing.expiresAt) render();
    mountTelegram();
  }
}

async function submitTelegram(form,fields) {
  if (form.dataset.form === 'duplica-telegram') {
    try {
      await prepareTelegramPairing('duplica/telegram/connect',{projectId,botToken:fields.botToken.trim()});
    } finally {form.reset();}
  } else {
    await api('duplica/telegram/configure',{projectId:fields.telegramProject,workModel:fields.telegramModel,workSandbox:fields.telegramSandbox});
    await refresh(true);toast('Réglages du bot enregistrés.');
  }
}

Object.assign(duplicaActions,{
  'duplica-telegram':openTelegram,
  'telegram-renew':() => prepareTelegramPairing('duplica/telegram/renew',{}),
  'telegram-cancel':async () => {++telegramPairingGeneration;clearTimeout(telegramPollTimer);await api('duplica/telegram/cancel',{});telegramPairing=null;telegramPairingError='';await refresh(true);},
  'telegram-toggle':async () => {await api('duplica/telegram/configure',{enabled:!duplicaData().telegram.enabled});await refresh(true);},
  'telegram-disconnect':async () => {++telegramPairingGeneration;clearTimeout(telegramPollTimer);await api('duplica/telegram/disconnect',{});telegramPairing=null;await refresh(true);toast('Bot dissocié. La discussion est conservée dans Atelier.');},
  'telegram-discussion':async () => {const id=duplicaData().telegram.projectId;duplicaPanel='discussion';if (id) await actions.project({dataset:{id}});else render();},
});

document.addEventListener('change',event => {
  if (event.target.name === 'telegramProject') $('[name="telegramSandbox"]').value='read-only';
});
