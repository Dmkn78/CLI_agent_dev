const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context=vm.createContext({});
vm.runInContext(fs.readFileSync('web/floating_panels.js','utf8')+'\nthis.panels=FloatingPanels;',context);
const panels=context.panels,viewport={width:1400,height:820};
const geometry=panels.arrange(['first','second','third','fourth'],viewport);
for (const rect of Object.values(geometry)) {
  assert.ok(rect.x >= 0 && rect.y >= 0 && rect.width > 0 && rect.height > 0);
  assert.ok(rect.x+rect.width <= 1.001 && rect.y+rect.height <= 1.001);
}
const rects=Object.values(geometry);
for (let first=0;first<rects.length;first++) for (let second=first+1;second<rects.length;second++) {
  const a=rects[first],b=rects[second];
  assert.ok(a.x+a.width <= b.x || b.x+b.width <= a.x || a.y+a.height <= b.y || b.y+b.height <= a.y,'Initial windows do not overlap');
}
const moved=panels.move(geometry.first,{x:9999,y:-9999},viewport);
assert.equal(moved.y,0);assert.ok(moved.x+moved.width <= 1);
const enlarged=panels.resize(geometry.fourth,{x:9999,y:9999},viewport);
assert.ok(enlarged.x+enlarged.width <= 1 && enlarged.y+enlarged.height <= 1);
const bounded=panels.constrain({x:Infinity,y:-10,width:NaN,height:10},{width:300,height:200});
assert.equal(bounded.height,1);assert.ok(bounded.width <= 1 && bounded.x >= 0 && bounded.x+bounded.width <= 1);
const single=panels.arrange(['remaining'],viewport).remaining;
assert.equal(single.width,1);assert.equal(single.height,1);
const crowded=panels.fontSize({width:320,height:190});
assert.ok(crowded >= 10 && crowded < 13);
assert.equal(panels.fontSize(viewport),13,'Text returns to preferred size after panels close');
assert.equal(panels.fontSize(viewport,16),16);
console.log('Floating panels passed: bounds, non-overlap, move, resize, collapse, adaptive font.');
