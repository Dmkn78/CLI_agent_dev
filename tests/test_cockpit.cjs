const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({
  objects: kind => context.records[kind] || [],
  usageProvider: '',
  records: {},
  esc: value => String(value ?? ''),
  provider: () => ({models:[]}),
});
vm.runInContext(fs.readFileSync('web/cockpit.js','utf8'),context);

assert.equal(context.sumObserved([], 'totalTokens'),null);
context.records = {};
assert.deepEqual(Array.from(context.consumptionProviders()),['codex']);
assert.equal(context.sumObserved([{usage:{totalTokens:0}}], 'totalTokens'),0);
assert.equal(context.sumObserved([{usage:null},{usage:{totalTokens:12}}], 'totalTokens'),12);
context.records = {
  sessions: [{id:'s',provider:'p',model:'m',usage:{total:{totalTokens:30}},createdAt:'2026-10-01'}],
  requests: [{id:'r',sessionId:'s',provider:'p',model:'m',usage:{totalTokens:10}}],
};
const records = context.consumptionRecords();
assert.equal(records.length,2);
assert.equal(records[1].legacy,true);
assert.equal(records[1].usage.totalTokens,20);
assert.equal(context.sumObserved(records,'totalTokens'),30);
context.records.requests[0].usage.totalTokens = 30;
assert.equal(context.consumptionRecords().length,1);
context.usageProvider = 'other';
assert.equal(context.consumptionRecords().length,0);
assert.equal(context.csvCell('=SUM(A1)'), '"\'=SUM(A1)"');
assert.equal(context.csvCell(' \t=SUM(A1)'), '"\' \t=SUM(A1)"');
assert.equal(context.csvCell('a"b'), '"a""b"');
context.selectedGraphNode = 'role:Vérification';
const details = context.graphDetails({agents:{reviewer:{runtime:'omp',model:'provider/reviewer',effort:'low',sandbox:'read-only'}}},[]);
assert.match(details,/provider\/reviewer/);
assert.match(details,/Configuré/);
assert.doesNotMatch(details,/Orchestrateur/);
console.log('Cockpit tests passed: unknown/zero usage, partial totals, legacy accounting, provider filter, CSV, configured reviewer.');
context.document={addEventListener:() => {}};
context.setInterval=() => {};
vm.runInContext(fs.readFileSync('web/workbench.js','utf8'),context);
assert.equal(context.estimateCost({inputTokens:1000000,cachedInputTokens:250000,outputTokens:1000000},{input:2,cache:1,output:3}),4.75);
assert.equal(context.estimateCost({inputTokens:100,cachedInputTokens:120,outputTokens:10},{input:2,cache:1,output:3}),null);
assert.equal(context.estimateCost({inputTokens:100,outputTokens:10},{input:2,cache:1,output:3}),null);
assert.equal(context.durationLabel(62000),'1 min 2 s');
context.compact=value => value == null ? '—' : String(value);context.usageGrouping='provider';
const charts=context.consumptionCharts([
  {id:'r1',provider:'real-provider',createdAt:'2026-10-01T12:00:00Z',usage:{totalTokens:10}},
  {id:'r2',provider:'other-provider',createdAt:'2026-10-02T12:00:00Z',usage:{totalTokens:20}},
  {id:'r3',provider:'real-provider',createdAt:'2026-10-03T12:00:00Z',usage:{totalTokens:30}},
  {id:'native:one',provider:'real-provider',createdAt:'2026-10-01T12:00:00Z',usage:{totalTokens:99999}},
],new Map([['real-provider',{title:'real-provider',records:[{usage:{totalTokens:40}}]}]]));
assert.match(charts,/consumption-plot/);assert.match(charts,/real-provider/);assert.match(charts,/other-provider/);
assert.doesNotMatch(charts,/99999/,'Native cumulative tokens cannot be attributed to creation date');
assert.doesNotMatch(charts,/points="60,165 400,/,'Missing provider day breaks curve rather than generating a zero');
assert.equal(context.sumObserved([{usage:{totalTokens:NaN}},{usage:{totalTokens:-1}}],'totalTokens'),null);
console.log('Observed supplier curves, missing-day gaps, aggregate exclusion and comparisons passed.');
