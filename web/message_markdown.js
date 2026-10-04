"use strict";

// A bounded Markdown subset for conversations. Raw HTML and image syntax stay
// literal; only explicit HTTP(S) and mailto links become clickable.
function inlineMessageMarkdown(text, depth=0, allowLinks=true) {
  text=String(text);
  if(depth > 12) return esc(text);
  let result='',offset=0;
  while(offset < text.length) {
    const rest=text.slice(offset);
    const escaped=rest.match(/^\\([\\`*_[\]{}()#+.!|>~\-])/);
    if(escaped) {result+=esc(escaped[1]);offset+=escaped[0].length;continue;}
    const code=rest.match(/^(`+)([\s\S]*?)\1(?!`)/);
    if(code) {result+='<code>'+esc(code[2].replace(/\n/g,' '))+'</code>';offset+=code[0].length;continue;}
    const link=allowLinks && text[offset-1] !== '!' && rest.match(/^\[([^\]\n]+)\]\((<[^>\n]+>|[^\s()]+)\)/);
    if(link) {
      const target=link[2].startsWith('<') ? link[2].slice(1,-1) : link[2];
      let safe=false;
      try {safe=!/[\u0000-\u0020\u007f]/.test(target) && ['http:','https:','mailto:'].includes(new URL(target).protocol);} catch (_) {}
      result+=safe ? '<a href="'+esc(target)+'" target="_blank" rel="noopener noreferrer">'+inlineMessageMarkdown(link[1],depth+1,false)+'</a>' : esc(link[0]);
      offset+=link[0].length;continue;
    }
    const emphasis=rest.match(/^(\*\*|__|~~|\*|_)(?=\S)([\s\S]*?\S)\1/);
    if(emphasis && !(emphasis[1].includes('_') && /[\p{L}\p{N}]/u.test(text[offset-1] || ''))) {
      const tag=emphasis[1] === '~~' ? 'del' : emphasis[1].length === 2 ? 'strong' : 'em';
      result+='<'+tag+'>'+inlineMessageMarkdown(emphasis[2],depth+1,allowLinks)+'</'+tag+'>';offset+=emphasis[0].length;continue;
    }
    result+=esc(text[offset++]);
  }
  return result;
}

function messageMarkdownCells(line) {
  return line.trim().replace(/^\||(?<!\\)\|$/g,'').split(/(?<!\\)\|/).map(cell=>cell.trim());
}

function messageMarkdown(text, depth=0) {
  const lines=String(text || '').replace(/\r\n?/g,'\n').split('\n'),blocks=[];
  if(depth > 12) return '<p>'+esc(lines.join('\n'))+'</p>';
  let paragraph=[];
  const flushParagraph=()=>{if(paragraph.length) blocks.push('<p>'+paragraph.map(line=>inlineMessageMarkdown(line)).join('<br>')+'</p>');paragraph=[];};
  const bullet=line=>line.match(/^(\s*)(?:([-*+])\s+|(\d+)[.)]\s+)(.+)$/);
  for(let index=0;index < lines.length;index++) {
    const line=lines[index],fence=line.match(/^\s{0,3}(`{3,}|~{3,})(.*)$/);
    if(fence) {
      flushParagraph();const code=[];
      while(++index < lines.length) {
        const closing=lines[index].match(/^\s{0,3}(`{3,}|~{3,})\s*$/);
        if(closing && closing[1][0] === fence[1][0] && closing[1].length >= fence[1].length) break;
        code.push(lines[index]);
      }
      blocks.push('<pre><code>'+esc(code.join('\n'))+'</code></pre>');continue;
    }
    const heading=line.match(/^\s{0,3}(#{1,6})\s+(.+)$/);
    if(heading) {flushParagraph();const level=Math.min(6,heading[1].length+2);blocks.push('<h'+level+'>'+inlineMessageMarkdown(heading[2].replace(/\s+#+\s*$/,''))+'</h'+level+'>');continue;}
    if(/^\s{0,3}(?:\*\s*){3,}$|^\s{0,3}(?:-\s*){3,}$|^\s{0,3}(?:_\s*){3,}$/.test(line)) {flushParagraph();blocks.push('<hr>');continue;}
    if(/^\s{0,3}>/.test(line)) {
      flushParagraph();const quote=[];
      do {quote.push(lines[index].replace(/^\s{0,3}> ?/,''));index++;} while(index < lines.length && /^\s{0,3}>/.test(lines[index]));
      index--;blocks.push('<blockquote>'+messageMarkdown(quote.join('\n'),depth+1)+'</blockquote>');continue;
    }
    const first=bullet(line);
    if(first) {
      flushParagraph();const indent=first[1].length,type=first[3] ? 'ol' : 'ul',items=[];
      let item=[];
      while(index < lines.length) {
        const match=bullet(lines[index]),currentIndent=lines[index].match(/^\s*/)[0].length;
        if(match && match[1].length === indent && (match[3] ? 'ol' : 'ul') === type) {
          if(item.length) items.push('<li>'+messageMarkdown(item.join('\n'),depth+1)+'</li>');
          item=[match[4]];
        } else if(lines[index].trim() && currentIndent > indent) item.push(lines[index].slice(Math.min(indent+2,currentIndent)));
        else break;
        index++;
      }
      index--;if(item.length) items.push('<li>'+messageMarkdown(item.join('\n'),depth+1)+'</li>');
      const start=type === 'ol' && Number(first[3]) !== 1 ? ' start="'+Number(first[3])+'"' : '';
      blocks.push('<'+type+start+'>'+items.join('')+'</'+type+'>');continue;
    }
    if(index+1 < lines.length && line.includes('|')) {
      const cells=messageMarkdownCells(line),separator=messageMarkdownCells(lines[index+1]);
      if(cells.length >= 2 && separator.length === cells.length && separator.every(cell=>/^:?-{3,}:?$/.test(cell))) {
        flushParagraph();const rows=[];index+=2;
        while(index < lines.length && lines[index].includes('|') && lines[index].trim()) {
          const row=messageMarkdownCells(lines[index]);
          rows.push('<tr>'+cells.map((_,cellIndex)=>'<td>'+inlineMessageMarkdown(row[cellIndex] || '')+'</td>').join('')+'</tr>');index++;
        }
        index--;blocks.push('<div class="message-markdown-table"><table><thead><tr>'+cells.map(cell=>'<th>'+inlineMessageMarkdown(cell)+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>');continue;
      }
    }
    if(!line.trim()) flushParagraph(); else paragraph.push(line);
  }
  flushParagraph();return blocks.join('');
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
