"use strict";

// Structural Markdown for conversations; supplied HTML stays literal.
function inlineMessageMarkdown(text) {
  return text.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*)/g).map(part => {
    if (part.startsWith('`') && part.endsWith('`')) return '<code>'+esc(part.slice(1,-1))+'</code>';
    if (part.startsWith('**') && part.endsWith('**')) return '<strong>'+esc(part.slice(2,-2))+'</strong>';
    return esc(part);
  }).join('');
}

function messageMarkdown(text) {
  const lines=String(text || '').replace(/\r\n?/g,'\n').split('\n'), blocks=[];
  let paragraph=[],list=[],listType='',code=null,fenceLength=0;
  const flushParagraph=()=>{if(paragraph.length) blocks.push('<p>'+paragraph.map(inlineMessageMarkdown).join('<br>')+'</p>');paragraph=[];};
  const flushList=()=>{if(list.length) blocks.push('<'+listType+'>'+list.map(line=>'<li>'+inlineMessageMarkdown(line)+'</li>').join('')+'</'+listType+'>');list=[];listType='';};
  for (const line of lines) {
    const fence=line.match(/^\s*(`{3,})(.*)$/);
    if (code !== null) {
      if(fence && fence[1].length >= fenceLength && !fence[2].trim()) {blocks.push('<pre><code>'+esc(code.join('\n'))+'</code></pre>');code=null;}
      else code.push(line);
      continue;
    }
    if(fence) {flushParagraph();flushList();code=[];fenceLength=fence[1].length;continue;}
    const heading=line.match(/^(#{1,6})\s+(.+)$/),bullet=line.match(/^\s*(?:([-*+])\s+|(\d+)\.\s+)(.+)$/);
    if(heading) {flushParagraph();flushList();const level=Math.min(6,heading[1].length+2);blocks.push('<h'+level+'>'+inlineMessageMarkdown(heading[2])+'</h'+level+'>');}
    else if(bullet) {flushParagraph();const type=bullet[2]?'ol':'ul';if(listType && listType !== type)flushList();listType=type;list.push(bullet[3]);}
    else if(!line.trim()) {flushParagraph();flushList();}
    else {flushList();paragraph.push(line);}
  }
  if(code !== null) blocks.push('<pre><code>'+esc(code.join('\n'))+'</code></pre>');
  flushParagraph();flushList();
  return blocks.join('');
}

function structureDuplicaInstruction() {
  const draft=$('#duplica-message');
  const structured=draft.value.trim() ? '<demande>\n\n'+esc(draft.value)+'\n\n</demande>' :
    '<demande>\n# Objectif\n\n\n## Travail attendu\n\n- \n\n## Critères de réussite\n\n- \n</demande>';
  if(structured.length > draft.maxLength) {toast('Cette consigne dépasse 16 000 caractères.',true);return;}
  draft.value=structured;
  rememberDuplicaDraft(structured);
  draft.focus();draft.setSelectionRange(draft.value.indexOf('\n\n')+2,draft.value.indexOf('\n\n')+2);
}
