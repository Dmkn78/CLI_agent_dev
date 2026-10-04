const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');

async function main() {
  const requests=[],host={innerHTML:''};
  const context=vm.createContext({
    projectId:'project-a',view:'terminal',
    ResizeObserver:class {disconnect() {} observe() {}},
    document:{addEventListener() {},querySelector:() => host},
    localStorage:{getItem:() => null},
    project:() => ({name:context.projectId}),
    icon:() => '',btn:() => '',
    esc:value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),
    api:() => new Promise((resolve,reject) => requests.push({resolve,reject})),
  });
  vm.runInContext(fs.readFileSync('web/workspace_panels.js','utf8')+'\nthis.filesState=id => workspaceFileStates.get(id);this.selectFiles=() => {workspaceTools().active="files";};',context);
  const directory=name => ({entries:[{path:name,name,directory:false}]});
  context.selectFiles();
  const away=context.loadWorkspaceFiles();
  assert.match(context.workspaceFilesContent(),/Chargement/,'A pending request is not an empty directory');
  context.projectId='project-b';context.selectFiles();host.innerHTML='Project B content';
  requests.shift().resolve(directory('File from A'));await away;
  assert.equal(host.innerHTML,'Project B content','An inactive project never replaces the active panel');
  context.projectId='project-a';
  assert.match(context.workspaceFilesContent(),/File from A/,'A finished response is available when returning to its project');

  const older=context.loadWorkspaceFiles('older'),oldRequest=requests.shift();
  const newer=context.loadWorkspaceFiles('newer'),newRequest=requests.shift();
  newRequest.resolve(directory('Latest file'));await newer;
  const latest=host.innerHTML;
  oldRequest.resolve(directory('Old file'));await older;
  assert.equal(host.innerHTML,latest,'A late earlier request cannot replace newer content');
  assert.equal(context.filesState('project-a').path,'newer');

  const rejected=context.loadWorkspaceFiles('missing'),missing=requests.shift();
  const checkError=assert.rejects(rejected,/<unavailable>/);
  missing.reject(new Error('<unavailable>'));await checkError;
  assert.match(host.innerHTML,/&lt;unavailable&gt;/,'Errors are visible and escaped');
  const retry=context.loadWorkspaceFiles();
  requests.shift().resolve(directory('Recovered'));await retry;
  assert.match(host.innerHTML,/Recovered/,'Retry recovers after a failed load');

  const staleError=context.loadWorkspaceFiles('stale-error'),stale=requests.shift();
  const success=context.loadWorkspaceFiles('success'),current=requests.shift();
  current.resolve(directory('Current file'));await success;
  stale.reject(new Error('Old failure'));await staleError;
  assert.match(host.innerHTML,/Current file/,'An obsolete error cannot replace success');

  const closing=context.loadWorkspaceFiles('closing'),closed=requests.shift();
  context.view='settings';host.innerHTML='Settings';
  closed.resolve(directory('Loaded while closed'));await closing;
  assert.equal(host.innerHTML,'Settings','Files cannot paint a different view');
  console.log('Workspace files passed: pending, project return, stale responses/errors, escaped errors, retry and closed views.');
}
main().catch(error => {console.error(error);process.exitCode=1;});
