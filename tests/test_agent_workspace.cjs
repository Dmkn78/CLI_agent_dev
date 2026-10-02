const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context=vm.createContext({document:{addEventListener(){}},nativeTerminals:new Map(),labels:{ready:'Prêt',running:'En cours'},
  state:{projects:[{id:'a',name:'Projet A'},{id:'b',name:'Projet B'}],sessions:[],tasks:[],workflows:[],benchmarks:[],nativeSessions:[],nativeSubagents:[]},projectId:'a'});
vm.runInContext(fs.readFileSync('web/terminal_layout.js','utf8')+'\nthis.layout=TerminalLayout;',context);
vm.runInContext(fs.readFileSync('web/agent_dashboard.js','utf8'),context);
const layout=context.layout;
let tree=layout.arrange(['one','two','three','four','five','six','seven'],2);
assert.deepEqual(Array.from(layout.paneIds(tree)).sort(),['five','four','one','seven','six','three','two']);
tree=layout.move(tree,'seven','one','bottom');
assert.equal(layout.paneIds(tree).filter(id=>id === 'seven').length,1);
assert.ok(layout.paneIds(tree).indexOf('seven') === layout.paneIds(tree).indexOf('one')+1);
tree=layout.remove(tree,'one');
assert.ok(!layout.paneIds(tree).includes('one'));
tree=layout.reconcile(tree,['two','seven','new']);
assert.deepEqual(Array.from(layout.paneIds(tree)).sort(),['new','seven','two']);
assert.equal(layout.move(tree,'seven','seven','left'),tree);
assert.equal(layout.move(tree,'seven','missing','left'),tree);
assert.equal(layout.resize(tree,tree.id,10).ratio,.88);
assert.equal(layout.remove(layout.arrange(['only'],1),'only'),null);

context.state.workflows=[{id:'team',title:'Équipe réelle observée'}];
context.state.sessions=[
  {id:'main',projectId:'a',name:'Principal',status:'running'},
  {id:'child',projectId:'a',parentId:'team',name:'Vérification',status:'waiting'},
  {id:'done',projectId:'a',parentId:'team',name:'Implémentation',status:'closed',lastTurnStatus:'completed'},
  {id:'removed',projectId:'a',removedAt:'now',status:'ready'},
  {id:'other',projectId:'b',name:'Autre projet',status:'ready'},
];
context.state.nativeSessions=[{id:'pty',projectId:'a',runtime:'claude',status:'open'}];
context.nativeTerminals.set('pty',{id:'pty',projectId:'a',runtime:'claude',exited:false,title:'Terminal local'});
context.state.nativeSubagents=[{id:'native-child',projectId:'a',terminalId:'pty',activityStatus:'completed',name:'Revue native'}];
let agents=context.dashboardAgents();
assert.equal(agents.length,6);
assert.equal(agents.filter(agent=>agent.id === 'pty').length,1,'A PTY in state and renderer must be counted once');
assert.equal(agents.find(agent=>agent.id === 'pty').status,'unknown','An open PTY does not prove a running agent');
assert.equal(agents.find(agent=>agent.id === 'done').status,'done','A completed turn is distinct from validation');
assert.equal(agents.find(agent=>agent.id === 'child').parentName,'Équipe réelle observée');
assert.equal(context.dashboardRows().length,5);
vm.runInContext("dashboardKind='children';",context);
assert.equal(context.dashboardRows().length,3,'Children include structured and observed native subagents');
vm.runInContext("dashboardKind='all';dashboardScope='all';",context);
assert.equal(context.dashboardRows().length,6);
console.log('Workspace layout and observed dashboard projections passed.');
