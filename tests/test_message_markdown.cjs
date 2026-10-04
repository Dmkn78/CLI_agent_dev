const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const storage=new Map();
const context=vm.createContext({URL,projectId:'fixture',localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},esc:value=>String(value ?? '').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]))});
for(const file of ['web/message_markdown.js','web/channels.js']) vm.runInContext(fs.readFileSync(path.resolve(file),'utf8'),context,{filename:file});
const markdown=text=>context.messageMarkdown(text);
assert.equal(markdown('# Objectif\n\n**Important** et *nuancé*, `x < 1`.\n\n- Étape 1\n- Étape 2'),'<h3>Objectif</h3><p><strong>Important</strong> et <em>nuancé</em>, <code>x &lt; 1</code>.</p><ul><li><p>Étape 1</p></li><li><p>Étape 2</p></li></ul>');
assert.match(markdown('3. Trois\n   - Enfant\n4. Quatre'),/^<ol start="3"><li><p>Trois<\/p><ul><li><p>Enfant<\/p><\/li><\/ul><\/li><li><p>Quatre<\/p><\/li><\/ol>$/);
assert.equal(markdown('> **Citation**\n> suite\n\n---'),'<blockquote><p><strong>Citation</strong><br>suite</p></blockquote><hr>');
assert.equal(markdown('~~~js\n<img onerror="bad()"> **literal**\n~~~'),'<pre><code>&lt;img onerror=&quot;bad()&quot;&gt; **literal**</code></pre>');
assert.equal(markdown('````\n```\n````'),'<pre><code>```</code></pre>');
assert.equal(markdown('```\nnon fermé'),'<pre><code>non fermé</code></pre>');
assert.equal(context.inlineMessageMarkdown('`**literal**` et __gras__ et ~~ancien~~ et identifiant_test'),'<code>**literal**</code> et <strong>gras</strong> et <del>ancien</del> et identifiant_test');
assert.match(markdown('| Choix | Avis |\n| --- | :---: |\n| **API** | `local` |'),/<th>Choix<\/th><th>Avis<\/th>.*<td><strong>API<\/strong><\/td><td><code>local<\/code><\/td>/);
assert.match(markdown('[Source](https://example.test/?a=1&b=2)'),/<a href="https:\/\/example.test\/\?a=1&amp;b=2" target="_blank" rel="noopener noreferrer">Source<\/a>/);
for(const unsafe of ['javascript:alert','data:text/html,pwn','file:///private/secret','//example.test','https://example.test/\u0000','https://example.test/\n']) assert.ok(!markdown('[Source]('+unsafe+')').includes('<a '),unsafe);
for(const malicious of ['<script>window.pwned=true</script>','<img src=x onerror=bad()>','![image](https://example.test/tracker.png)','[x](javascript:alert)']) {
  const result=markdown(malicious);assert.ok(!/<(?:script|img|iframe)\b|href="javascript:/i.test(result),malicious);
}
assert.match(markdown('[texte](https://example.test/\"onload=\"bad)'),/href="https:\/\/example.test\/&quot;onload=&quot;bad"/);

// Deliberately collide seeds: every active participant must still get a unique slot.
const participants=[];
for(let index=0;participants.length<8;index++) if(context.channelColorSeed('peer-'+index)===0) participants.push({id:'peer-'+index});
const colors=()=>Object.fromEntries(participants.map(participant=>[participant.id,context.channelParticipantColor('channel',participant.id)]));
context.prepareChannelColors('channel',participants);const original=colors();
assert.equal(new Set(Object.values(original)).size,8);
context.prepareChannelColors('channel',participants.toReversed());assert.deepEqual(colors(),original);
vm.runInContext('channelColorAssignments.clear()',context);context.prepareChannelColors('channel',participants);assert.deepEqual(colors(),original);
const replacement={id:'replacement'};context.prepareChannelColors('channel',[...participants.slice(1),replacement]);
for(const participant of participants.slice(1)) assert.equal(context.channelParticipantColor('channel',participant.id),original[participant.id]);
assert.equal(new Set([...participants.slice(1),replacement].map(participant=>context.channelParticipantColor('channel',participant.id))).size,8);
assert.equal(context.channelConfigurationEffort({runtime:'api',effort:'off'}),'paramètres serveur');
assert.equal(context.channelConfigurationEffort({runtime:'codex',effort:'high'}),'high');
assert.equal(vm.runInContext('channelRoleLabels.critic',context),'Questionneur / contradicteur');
assert.equal(context.channelContextProjectionNote({truncated:false}),'');
assert.match(context.channelContextProjectionNote({truncated:true,totalMessages:8,includedMessages:5,excerptMessageIds:['message'],omittedUserMessageIds:['user']}),/5\/8 messages transmis, 1 extrait partiel.*1 demande utilisateur absente/);

const luminance=hex=>{const channels=hex.match(/[\da-f]{2}/gi).map(value=>{const unit=parseInt(value,16)/255;return unit<=0.04045?unit/12.92:((unit+0.055)/1.055)**2.4;});return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;};
const css=fs.readFileSync(path.resolve('web/channels.css'),'utf8');
for(const [,color] of css.matchAll(/--channel-color:(#[\da-f]{6})/gi)) for(const background of ['#171717','#222221']) assert.ok((luminance(color)+0.05)/(luminance(background)+0.05)>=4.5,'Insufficient text contrast: '+color);
console.log('Markdown and identity tests passed: structure, nested lists, literal HTML, safe links, 8 colliding identities, persistence, contrast.');
