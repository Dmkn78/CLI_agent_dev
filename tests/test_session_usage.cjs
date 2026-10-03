const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context=vm.createContext({esc:text=>String(text??'').replaceAll('&','&amp;').replaceAll('<','&lt;'),compact:value=>value==null?'—':String(value)});
vm.runInContext(fs.readFileSync('web/session_usage.js','utf8'),context);
const render=context.sessionUsageSummary;
const session={usage:{total:{inputTokens:120,outputTokens:30,cachedInputTokens:80,totalTokens:150}}};
const html=render(session,{plan:'plus',limits:{rateLimitsByLimitId:{codex:{primary:{usedPercent:25.5}}}}});
for(const text of ['150 tokens','120 tokens','30 tokens','80 tokens','plus','25.5','compte partagé'])assert.ok(html.includes(text),text);
assert.ok(!html.includes('230 tokens'));
assert.ok(render({usage:null},{}).includes('—'));assert.ok(!render({usage:null},{}).includes('0 tokens'));
assert.ok(render({usage:{total:{totalTokens:0}}},{}).includes('0 tokens'));
for(const totalTokens of [-1,NaN,Infinity,0.5,'<img src=x>'])assert.ok(!render({usage:{total:{totalTokens}}},{}).includes(String(totalTokens)+' tokens'));
assert.ok(!render(session,{plan:'<script>x</script>'}).includes('<script>'));
assert.ok(!render(session,{limits:{rateLimits:{primary:{usedPercent:150}}}}).includes('150%'));
const aggregate=context.conversationUsage([
  {role:'user',usage:{totalTokens:999999}},
  {role:'agent',usage:{inputTokens:100,outputTokens:20,cachedInputTokens:50,totalTokens:120}},
  {role:'agent',usage:{inputTokens:200,outputTokens:30,cachedInputTokens:90,totalTokens:230}}
]);
assert.equal(aggregate.usage.total.totalTokens,350,'User messages are not provider requests');
assert.equal(aggregate.usage.total.cachedInputTokens,140,'Cache is reported separately, not added to total');
assert.equal(aggregate.partialUsage,false);
const partial=context.conversationUsage([{role:'agent',usage:{inputTokens:0,totalTokens:0}},{role:'agent'}]);
assert.equal(partial.usage.total.totalTokens,0);assert.equal(partial.partialUsage,true);
assert.ok(render(partial,{}).includes('Entrée (partiel)'));
assert.ok(!context.sessionUsageChip(context.conversationUsage([])).includes('0 tokens'));
assert.ok(context.sessionUsageChip({usage:{total:{totalTokens:150},last:{totalTokens:50},modelContextWindow:500}}).includes('50 / 500'));
assert.match(context.sessionEquivalentCost({id:'priced',projectId:'project'}),/Coût non communiqué/,'No pricing runtime means unknown cost');
context.document={addEventListener:()=>{}};
context.setInterval=()=>{};
vm.runInContext(fs.readFileSync('web/workbench.js','utf8'),context);
const pricedSession={id:'priced',projectId:'project'};
context.state={requests:[],tariffs:[]};
assert.match(context.sessionEquivalentCost(pricedSession),/Coût non communiqué/,'No measured request is not a zero cost');
context.state.requests=[
  {sessionId:'other',provider:'provider',model:'first',usage:{inputTokens:999999,cachedInputTokens:0,outputTokens:999999}},
  {sessionId:'priced',provider:'provider',model:'first',usage:{inputTokens:1000000,cachedInputTokens:250000,outputTokens:1000000}},
  {sessionId:'priced',provider:'provider',model:'second',usage:{inputTokens:100000,cachedInputTokens:20000,outputTokens:40000}},
];
context.state.tariffs=[
  {projectId:'other',provider:'provider',model:'first',input:999,cache:999,output:999},
  {projectId:'project',provider:'other',model:'first',input:999,cache:999,output:999},
  {projectId:'project',provider:'provider',model:'first',input:2,cache:1,output:3},
  {projectId:'project',provider:'provider',model:'second',input:6,cache:3,output:8},
];
const pricedHtml=context.sessionEquivalentCost(pricedSession);
assert.match(pricedHtml,/5\.6100 USD/,'Only this session and matching project/model/provider tariffs are accumulated');
assert.match(pricedHtml,/distinct de l’abonnement/);
context.state.requests[2].usage.cachedInputTokens=undefined;
assert.match(context.sessionEquivalentCost(pricedSession),/Coût non communiqué/,'A missing measure prevents a complete cost');
context.state.requests[2].usage={inputTokens:0,cachedInputTokens:0,outputTokens:0};
assert.match(context.sessionEquivalentCost(pricedSession),/4\.7500 USD/,'Observed zero is a valid request cost');
context.state.tariffs.pop();
assert.match(context.sessionEquivalentCost(pricedSession),/Coût non communiqué/,'A missing tariff is not silently omitted from the cost');
console.log('Session counters passed: totals, cache, missing/zero, shared quota, HTML escaping, scoped API-equivalent costs.');
const architecture={role:'agent',text:JSON.stringify({title:'Architecture claire',explanation:'Une proposition <script>bad</script>',graph:{nodes:[{id:'one',text:'Entrée'},{id:'two',text:'Sortie'}],edges:[{sourceNodeId:'one',targetNodeId:'two',text:'Transmission'}]}})};
const proposal=context.sessionMessageContent(architecture);
assert.match(proposal,/Architecture claire/);assert.match(proposal,/Entrée/);assert.match(proposal,/Transmission/);
assert.match(proposal,/Consulter le JSON source/);assert.doesNotMatch(proposal,/<script>/);
assert.equal(context.sessionMessageContent({role:'user',text:'{"explanation":"raw"}'}),'{"explanation":"raw"}');
context.state.officialPricing={entries:[{provider:'openai',model:'exact-version',input:2,cache:.1,output:10,longInput:4,longCache:.2,longOutput:15,contextThreshold:272000}]};
const official=context.requestTariff({provider:'codex',model:'exact-version'},'project');
assert.equal(official.input,2);assert.equal(context.requestTariff({provider:'codex',model:'exact-version-new'},'project'),null);
assert.equal(context.estimateCost({inputTokens:1000,cachedInputTokens:500,outputTokens:100},official),.00205);
assert.equal(context.estimateCost({inputTokens:300000,cachedInputTokens:100000,outputTokens:1000},official),.835);
assert.equal(context.estimateCost({inputTokens:-1,cachedInputTokens:0,outputTokens:1},official),null);
assert.equal(context.estimateCost({inputTokens:100,cachedInputTokens:0,cacheWriteTokens:40,outputTokens:1},{provider:'anthropic',input:2,cache:.1,output:10,cacheWrite:2.5}),null,'Cache duration must be known');
console.log('Readable JSON proposals, exact official model matching, long context pricing, unknown cache writes passed.');
assert.doesNotThrow(()=>context.sessionMessageContent({role:'agent',text:JSON.stringify({explanation:'OK',graph:{nodes:[null,123,{id:'good',text:{value:'safe'}}],edges:[null,{text:'invalid'}]}})}));
assert.equal(context.estimateCost({inputTokens:100,cachedInputTokens:0,outputTokens:1},{provider:'anthropic',input:2,cache:.1,output:10,cacheWrite:2.5}),null,'Unreported cache writes cannot be priced as zero');
