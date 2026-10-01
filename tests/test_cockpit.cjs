const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({
  objects: kind => context.records[kind] || [],
  usageProvider: '',
  records: {},
  esc: value => String(value ?? ''),
});
vm.runInContext(fs.readFileSync('web/cockpit.js','utf8'),context);

assert.equal(context.sumObserved([], 'totalTokens'),null);
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
