let designId = null, designDraft = null, designEditor = null, designSelectedNode = null;

function captureDesign() {
  if (!designEditor || !document.getElementById('design-canvas')) return;
  designDraft = {...designDraft,graph:designEditor.getGraphRawData(),title:$('#design-title').value,explanation:$('#design-explanation').value};
}

function designView() {
  const saved = objects('designs').find(item => item.id === designId);
  if (!designDraft || designDraft.projectId !== projectId) {
    designDraft = saved ? structuredClone(saved) : {projectId,title:'Architecture du projet',explanation:'',graph:{nodes:[],edges:[]}};
    designId = saved?.id || null;
  }
  return `${heading('CONCEPTION','Architecture','',`${btn('new-design','','plus','icon-btn','title="Nouvelle page" aria-label="Nouvelle page"')}${btn('import-design','','code','icon-btn','title="Importer un JSON" aria-label="Importer un JSON"')}${btn('export-design','','download','icon-btn','title="Exporter le JSON" aria-label="Exporter le JSON"')}${btn('save-design','Enregistrer','check','primary')}`)}
    <div class="design-page-bar"><input id="design-title" aria-label="Titre de la page" value="${esc(designDraft.title)}"><select id="design-page" aria-label="Pages du projet"><option value="">Nouvelle page</option>${objects('designs').map(item => `<option value="${esc(item.id)}" ${item.id === designId ? 'selected' : ''}>${esc(item.title)}</option>`).join('')}</select></div>
    <div class="design-workspace"><div><div class="design-tools">${[['add-design-block','Bloc','plus'],['add-design-decision','Décision','network'],['add-design-resource','Ressource','folder'],['import-agents','Agents du projet','agents'],['design-undo','Annuler','chevron'],['design-redo','Rétablir','arrow'],['design-fit','Centrer','grid'],['design-delete','Supprimer','close']].map(([action,label,ico]) => btn(action,'',ico,'icon-btn',`title="${label}" aria-label="${label}"`)).join('')}</div><div id="design-canvas"></div></div><aside class="design-inspector"><h2>Bloc sélectionné</h2><div id="design-inspector-body"><p class="muted">Aucune sélection.</p></div><div class="design-status" id="design-status">${designId ? 'Page enregistrée · révision '+designDraft.revision : 'Brouillon local'}</div>${btn('design-agent','Confier le dessin à un agent','agents','secondary full')}</aside></div>
    <section class="design-explanation"><h2>Explication</h2><textarea id="design-explanation" rows="6" aria-label="Explication de l’architecture">${esc(designDraft.explanation)}</textarea></section>`;
}

function mountDesign() {
  if (!window.Core?.LogicFlow) { $('#design-canvas').innerHTML='<p class="inline-error">Éditeur non installé. Exécute npm ci puis npm run vendor.</p>'; return; }
  const previous=designEditor;
  designEditor=null;
  previous?.destroy();
  const canvas=$('#design-canvas');
  designEditor = new Core.LogicFlow({container:canvas,height:canvas.closest('.workspace-tool-pane') ? Math.max(200,canvas.clientHeight) : 580,grid:{size:20,visible:true,type:'dot',config:{color:'#35434b',thickness:1}},keyboard:{enabled:true},edgeType:'polyline',history:true});
  designEditor.setTheme({baseNode:{fill:'#20282c',stroke:'#62cde1',strokeWidth:1.5},rect:{radius:8,width:200,height:80},diamond:{fill:'#28312c',stroke:'#94d4a5'},nodeText:{color:'#f2f5f6',fontSize:13,overflowMode:'ellipsis',lineHeight:1.3},edgeText:{color:'#d9e3e6',background:{fill:'#101618'}},polyline:{stroke:'#99b0b9'},anchor:{fill:'#62cde1',stroke:'#101618'},outline:{stroke:'#e6ca76'}});
  designEditor.render(designDraft.graph);
  designEditor.on('node:click',({data}) => { designSelectedNode=data.id; updateDesignInspector(data); });
  designEditor.on('edge:click',({data}) => { designSelectedNode=data.id; $('#design-inspector-body').innerHTML=`<p>Lien · ${esc(data.text?.value || '')}</p>`; });
  const editor=designEditor;
  designEditor.on('history:change',() => { if (editor !== designEditor || !$('#design-status')) return; captureDesign(); $('#design-status').textContent='Modifications non enregistrées'; });
}

function updateDesignInspector(node) {
  const session = state.sessions.find(item => item.id === node.properties?.sessionId);
  $('#design-inspector-body').innerHTML=`<label>Libellé<input id="design-node-label" value="${esc(node.text?.value || node.text || '')}"></label><small>${esc(node.properties?.kind || 'bloc')}</small>${node.properties?.path ? `<p class="context-path">${esc(node.properties.path)}</p>` : ''}${session ? `<p>${esc(session.model)}</p>${badge(session.status)}${btn('open-agent','Ouvrir la session','terminal','secondary full',`data-id="${esc(session.id)}"`)}` : ''}`;
}

function addDesignNode(type, text, properties={}) {
  const count=designEditor.getGraphRawData().nodes.length;
  if (count >= 80) throw new Error('Maximum 80 blocs.');
  designEditor.addNode({id:crypto.randomUUID(),type,x:170+(count%3)*260,y:130+Math.floor(count/3)*140,text,properties});
  captureDesign();
}

function installDesignActions() {
  actions['edit-design']=() => {
    if (!designDraft || designDraft.projectId !== projectId) {
      const list=objects('sessions').slice(0,70);
      const nodes=[{id:'project',type:'rect',x:150,y:280,text:project().name,properties:{kind:'folder'}}];
      const edges=[];
      list.forEach((session,index) => {
        nodes.push({id:session.id,type:'rect',x:450+Math.floor(index/4)*270,y:100+(index%4)*140,text:session.name,properties:{kind:'agent',sessionId:session.id}});
        edges.push({id:'association-'+session.id,type:'polyline',sourceNodeId:'project',targetNodeId:session.id,text:'Projet'});
      });
      designDraft={projectId,title:'Organisation · '+project().name,explanation:'',graph:{nodes,edges}};
      designId=null;
    }
    route('design');
  };
  actions['new-design']=() => { designDraft=null; designId=null; designSelectedNode=null; render(); };
  actions['add-design-block']=() => addDesignNode('rect','Nouveau bloc');
  actions['add-design-decision']=() => addDesignNode('diamond','Décision');
  actions['add-design-resource']=() => modal('Ajouter une ressource',project().path,`<form data-form="design-resource"><div class="modal-body">${field('Chemin dans le projet','path','','text','required')}${select('Type','kind',[['file','Fichier'],['folder','Dossier']],'file')}</div>${formFooter('Ajouter au dessin')}</form>`);
  actions['import-agents']=() => {
    const existing=new Set(designEditor.getGraphRawData().nodes.map(node => node.properties?.sessionId));
    for (const session of objects('sessions')) if (!existing.has(session.id)) addDesignNode('rect',session.name,{kind:'agent',sessionId:session.id});
  };
  actions['design-undo']=() => designEditor.undo();
  actions['design-redo']=() => designEditor.redo();
  actions['design-fit']=() => designEditor.fitView(40,40);
  actions['design-delete']=() => { if (designSelectedNode) { designEditor.deleteNode(designSelectedNode); designEditor.deleteEdge(designSelectedNode); designSelectedNode=null; captureDesign(); $('#design-inspector-body').textContent='Aucune sélection.'; } };
  actions['save-design']=async () => { captureDesign(); const saved=await api('designs',designDraft); designDraft=structuredClone(saved); designId=saved.id; await refresh(true); toast('Architecture enregistrée.'); };
  actions['export-design']=() => { captureDesign(); download('architecture.json',JSON.stringify(designDraft,null,2),'application/json'); };
  actions['import-design']=() => modal('Importer une proposition JSON','',`<form data-form="design-import"><div class="modal-body">${area('Page JSON · title, graph {nodes, edges}, explanation','document','',12,'required')}<p class="muted small">Proposition de dessin uniquement. Aucun code exécuté, aucune session lancée.</p></div>${formFooter('Valider & importer')}</form>`,true);
  actions['design-agent']=async () => {
    captureDesign();
    await newAgent('classic','chat');
    const form=$('#modal form');
    form.insertAdjacentHTML('beforeend','<input type="hidden" name="sendInitialMission" value="yes">');
    form.elements.name.value='Conception · '+designDraft.title;
    form.elements.mission.value='Propose une architecture et son explication courte. Réponds uniquement en JSON : {"title":"...","explanation":"...","graph":{"nodes":[{"id":"n1","type":"rect","x":200,"y":160,"text":"Bloc"}],"edges":[{"id":"e1","type":"polyline","sourceNodeId":"n1","targetNodeId":"n2","text":"Flux"}]}}. Types autorisés rect, diamond, ellipse. 80 blocs et 200 liens maximum. Ne modifie aucun fichier. La proposition sera importée et validée par l’utilisateur. Architecture actuelle :\n'+JSON.stringify(designDraft.graph);
  };
}

document.addEventListener('input',event => {
  if (event.target.id === 'design-node-label' && designSelectedNode) { designEditor.updateText(designSelectedNode,event.target.value); captureDesign(); }
  if (['design-title','design-explanation'].includes(event.target.id)) captureDesign();
});
document.addEventListener('change',event => {
  if (event.target.id === 'design-page') { designId=event.target.value || null; designDraft=designId ? structuredClone(objects('designs').find(item => item.id === designId)) : null; render(); }
});
document.addEventListener('submit',async event => {
  const form=event.target.closest('form');
  if (!['design-import','design-resource'].includes(form?.dataset.form)) return;
  event.preventDefault();
  const values=Object.fromEntries(new FormData(form));
  try {
    if (form.dataset.form === 'design-import') {
      const input=JSON.parse(values.document);
      const saved=await api('designs',{projectId,title:input.title,graph:input.graph,explanation:input.explanation});
      designId=saved.id; designDraft=structuredClone(saved); $('#modal').close(); await refresh(true);
    } else {
      const resource=await api('files?project='+encodeURIComponent(projectId)+'&path='+encodeURIComponent(values.path));
      if ((values.kind === 'folder') !== Boolean(resource.entries)) throw new Error('Le type ne correspond pas à la ressource.');
      $('#modal').close(); addDesignNode('rect',values.path,{kind:values.kind,path:values.path});
    }
  } catch (error) { toast(error.message,true); }
});
