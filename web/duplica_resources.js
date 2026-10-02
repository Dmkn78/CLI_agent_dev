"use strict";
const duplicaDraftAttachments=new Map(), duplicaUploading=new Set(), duplicaCommands=new Map();
const duplicaDraftText=new Map(), duplicaSending=new Set();
const attachmentPreviews=new Map(), commandLoads=new Map();
const draftAttachments=() => duplicaDraftAttachments.get(projectId) || [];
const excludedAttachmentNames=new Set(['node_modules','__pycache__','credentials','credentials.json','auth.json','id_rsa','id_ed25519']);

function shareableAttachmentPath(path) {
  return !path.replace(/\\/g,'/').split('/').some(part => part.startsWith('.') ||
    excludedAttachmentNames.has(part.toLowerCase()) || /\.(pem|key|p12|pfx)$/i.test(part));
}

function rememberDuplicaDraft(text, targetProject=projectId) {
  if (text) duplicaDraftText.set(targetProject,text);
  else duplicaDraftText.delete(targetProject);
}

function attachmentMarkup(attachments, editable=false) {
  return attachments.map(attachment => `<span class="chat-attachment" title="${esc(attachment.name)}">${attachment.kind === 'image' ? `<img data-attachment-image="${esc(attachment.id)}" data-project-id="${esc(attachment.projectId)}" alt="${esc(attachment.name)}">` : icon('attachment')}<span><strong>${esc(attachment.name)}</strong><small>${Math.ceil(attachment.size/1024)} Ko</small></span>${editable ? btn('duplica-remove-attachment','','close','icon-btn',`type="button" data-id="${esc(attachment.id)}" aria-label="Retirer ${esc(attachment.name)}"`) : ''}</span>`).join('');
}

function attachmentComposer() {
  return `<div class="chat-attachments" aria-label="Pièces jointes">${attachmentMarkup(draftAttachments(),true)}</div><div id="duplica-slash-menu" class="slash-menu" aria-label="Commandes disponibles" hidden></div><input id="duplica-files" type="file" multiple hidden aria-label="Joindre des fichiers et images"><input id="duplica-folder" type="file" webkitdirectory multiple hidden aria-label="Joindre un dossier">`;
}

async function addDuplicaFiles(files, targetProject=projectId) {
  if (duplicaUploading.has(targetProject)) throw new Error('Un ajout est déjà en cours.');
  const selected=Array.from(files).filter(file => !file.webkitRelativePath || shareableAttachmentPath(file.webkitRelativePath));
  const previous=duplicaDraftAttachments.get(targetProject) || [];
  if (!selected.length) return;
  if (selected.length+previous.length > 12) throw new Error('Maximum 12 pièces jointes par message. Choisis un sous-dossier.');
  if (selected.some(file=>file.size > 8*1024*1024) || selected.reduce((total,file)=>total+file.size,previous.reduce((total,file)=>total+file.size,0)) > 32*1024*1024) throw new Error('Maximum 8 Mo par fichier et 32 Mo par message.');
  duplicaUploading.add(targetProject); render();
  const uploaded=[];
  try {
    for (const file of selected) {
      const content=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Lecture du fichier impossible.'));reader.readAsDataURL(file);});
      uploaded.push(await api('attachments/upload',{projectId:targetProject,name:file.webkitRelativePath || file.name,content}));
    }
  } finally {
    duplicaDraftAttachments.set(targetProject,[...(duplicaDraftAttachments.get(targetProject) || []),...uploaded]);
    duplicaUploading.delete(targetProject); render();
  }
}

async function addProjectAttachment(path, targetProject=projectId) {
  if (duplicaUploading.has(targetProject)) throw new Error('Un ajout est déjà en cours.');
  duplicaUploading.add(targetProject); render();
  try {
    const attachments=await api('attachments/project',{projectId:targetProject,path});
    const previous=duplicaDraftAttachments.get(targetProject) || [];
    if (previous.length+attachments.length > 12 || [...previous,...attachments].reduce((total,file)=>total+file.size,0) > 32*1024*1024) throw new Error('Maximum 12 pièces jointes et 32 Mo par message.');
    duplicaDraftAttachments.set(targetProject,[...previous,...attachments]);
  } finally {duplicaUploading.delete(targetProject);render();}
}

async function loadDuplicaCommands(targetProject=projectId) {
  if (!commandLoads.has(targetProject)) commandLoads.set(targetProject,api('commands?project='+encodeURIComponent(targetProject)).then(commands=>{duplicaCommands.set(targetProject,commands);return commands;}).finally(()=>commandLoads.delete(targetProject)));
  return commandLoads.get(targetProject);
}

function renderSlashMenu() {
  const menu=$('#duplica-slash-menu'), text=$('#duplica-message')?.value || '';
  if (!menu) return;
  const match=/^\/([a-z0-9_-]*)$/.exec(text);
  menu.hidden=!match;
  if (!match) return;
  const commands=(duplicaCommands.get(projectId) || []).filter(command=>command.name.startsWith(match[1])).slice(0,8);
  menu.innerHTML=commands.map(command=>`<button type="button" data-action="duplica-use-command" data-name="${esc(command.name)}"><strong>/${esc(command.name)}</strong><span>${esc(command.description || (command.kind === 'skill' ? 'Skill du projet' : 'Commande personnelle'))}</span></button>`).join('')+`<button type="button" data-action="duplica-commands">${icon('plus')} Programmer une commande</button>`;
}

function mountDuplicaResources() {
  for (const image of document.querySelectorAll('[data-attachment-image]')) {
    const identifier=image.dataset.attachmentImage;
    if (!attachmentPreviews.has(identifier)) {
      const request=fetch('/api/attachments/content?id='+encodeURIComponent(identifier)+'&project='+encodeURIComponent(image.dataset.projectId),{headers:{'X-Atelier-Token':$('meta[name="atelier-token"]').content}}).then(response=>{if (!response.ok) throw new Error('Image indisponible.');return response.blob();}).then(blob=>URL.createObjectURL(blob));
      attachmentPreviews.set(identifier,request);
    }
    attachmentPreviews.get(identifier).then(url=>{if(image.isConnected) image.src=url;}).catch(()=>image.remove());
  }
  if (view !== 'duplica') return;
  if (!duplicaCommands.has(projectId)) loadDuplicaCommands().then(renderSlashMenu).catch(error=>toast(error.message,true));
  renderSlashMenu();
}

async function duplicaCommandsModal() {
  const targetProject=projectId;
  const commands=await loadDuplicaCommands(targetProject);
  if (targetProject !== projectId) return;
  modal('Commandes /','Des consignes réutilisables et les skills présents dans ce projet.',`<div class="modal-body"><div class="command-library">${commands.map(command=>`<div><button data-action="duplica-edit-command" data-id="${esc(command.id)}" ${command.kind === 'skill' ? 'disabled' : ''}><strong>/${esc(command.name)}</strong><span>${esc(command.description || 'Skill du projet')}</span></button>${command.kind !== 'skill' ? btn('duplica-delete-command','','trash','icon-btn',`data-id="${esc(command.id)}" aria-label="Supprimer /${esc(command.name)}"`) : ''}</div>`).join('') || '<p class="muted">Aucune commande pour le moment.</p>'}</div>${btn('duplica-new-command','Nouvelle commande','plus','secondary')}</div>`);
}

function duplicaCommandEditor(identifier) {
  const command=(duplicaCommands.get(projectId) || []).find(command=>command.id === identifier);
  modal(command ? 'Modifier /'+esc(command.name) : 'Programmer une commande','Écrivez la consigne ; {args} représente le texte saisi après la commande.',`<form data-form="duplica-command"><div class="modal-body">${field('Nom après /','name',command?.name || '','text','required pattern="[a-z0-9][a-z0-9_-]{0,59}"')}${field('Description courte','description',command?.description || '')}${area('Consigne','prompt',command?.prompt || '',5,'required maxlength="16000"')}<p class="muted small">La commande prépare le message à Duplica. Les permissions choisies continuent de s’appliquer.</p></div>${formFooter('Enregistrer la commande')}</form>`);
}

async function droppedFiles(transfer) {
  const files=[];
  let visited=0;
  async function visit(entry, parent='') {
    if (++visited > 500) throw new Error('Dossier trop grand ; choisis un sous-dossier.');
    const relative=parent ? parent+'/'+entry.name : entry.name;
    if (!shareableAttachmentPath(relative)) return;
    if (entry.isFile) {
      if (files.length >= 12) throw new Error('Dossier limité à 12 fichiers ; choisis un sous-dossier.');
      const file=await new Promise((resolve,reject)=>entry.file(resolve,reject));
      if (parent) Object.defineProperty(file,'webkitRelativePath',{value:relative});
      files.push(file);
    } else if (entry.isDirectory) {
      const reader=entry.createReader();
      for (;;) {
        const entries=await new Promise((resolve,reject)=>reader.readEntries(resolve,reject));
        if (!entries.length) break;
        for (const child of entries) await visit(child,relative);
      }
    }
  }
  const entries=Array.from(transfer.items || []).map(item=>item.webkitGetAsEntry?.()).filter(Boolean);
  if (entries.length) for (const entry of entries) await visit(entry);
  else files.push(...Array.from(transfer.files));
  return files;
}

document.addEventListener('change',event=>{
  if (['duplica-files','duplica-folder'].includes(event.target.id)) addDuplicaFiles(event.target.files).catch(error=>toast(error.message,true));
});
document.addEventListener('input',event=>{if(event.target.id === 'duplica-message') {rememberDuplicaDraft(event.target.value);renderSlashMenu();}});
document.addEventListener('paste',event=>{
  if (event.target.id !== 'duplica-message' || !event.clipboardData.files.length) return;
  event.preventDefault();addDuplicaFiles(event.clipboardData.files).catch(error=>toast(error.message,true));
});
document.addEventListener('dragover',event=>{
  const composer=event.target.closest('.duplica-chat-composer');
  if (composer && (event.dataTransfer.types.includes('Files') || event.dataTransfer.types.includes('application/x-atelier-resource'))) {event.preventDefault();composer.classList.add('drop-active');}
});
document.addEventListener('dragleave',event=>{const composer=event.target.closest('.duplica-chat-composer');if(composer && !composer.contains(event.relatedTarget)) composer.classList.remove('drop-active');});
document.addEventListener('drop',async event=>{
  const composer=event.target.closest('.duplica-chat-composer');if(!composer) return;
  const resource=event.dataTransfer.getData('application/x-atelier-resource');
  if (!resource && !event.dataTransfer.files.length && !event.dataTransfer.items.length) return;
  event.preventDefault();composer.classList.remove('drop-active');
  const targetProject=projectId;
  try {if(resource) {const selected=JSON.parse(resource);if(selected.projectId !== targetProject) throw new Error('Ressource d’un autre projet.');await addProjectAttachment(selected.path,targetProject);} else await addDuplicaFiles(await droppedFiles(event.dataTransfer),targetProject);} catch(error) {toast(error.message,true);}
});
