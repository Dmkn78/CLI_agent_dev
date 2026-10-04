"use strict";

// Layout contains pane identities and proportions, never terminal processes.
const TerminalLayout = (() => {
  let sequence = 0;
  const pane = id => ({type:'pane', id});
  const split = (axis, first, second) => ({type:'split', id:'split-'+(++sequence), axis, ratio:.5, first, second});
  const paneIds = node => !node ? [] : node.type === 'pane' ? [node.id] : [...paneIds(node.first), ...paneIds(node.second)];

  function remove(node, id) {
    if (!node || node.type === 'pane') return node?.id === id ? null : node;
    const first = remove(node.first, id), second = remove(node.second, id);
    return !first ? second : !second ? first : {...node, first, second};
  }

  function insertAt(node, target, id, side) {
    if (!node) return pane(id);
    if (node.type === 'pane') {
      if (node.id !== target) return node;
      const axis = ['left','right'].includes(side) ? 'horizontal' : 'vertical';
      return ['left','top'].includes(side) ? split(axis,pane(id),node) : split(axis,node,pane(id));
    }
    return {...node, first:insertAt(node.first,target,id,side), second:insertAt(node.second,target,id,side)};
  }

  function shallowestPane(node, depth=0) {
    if (node.type === 'pane') return {id:node.id,depth};
    const first=shallowestPane(node.first,depth+1), second=shallowestPane(node.second,depth+1);
    return first.depth <= second.depth ? first : second;
  }

  function append(node, id, placement={}) {
    if (!node) return pane(id);
    if (paneIds(node).includes(id)) return node;
    const fallback=shallowestPane(node);
    const target=paneIds(node).includes(placement.anchorId) ? placement.anchorId : fallback.id;
    const side=placement.side || (fallback.depth % 2 ? 'bottom' : 'right');
    return insertAt(node,target,id,side);
  }

  function move(node, id, target, side) {
    const ids=paneIds(node);
    if (id === target || !ids.includes(id) || !ids.includes(target) || !['left','right','top','bottom'].includes(side)) return node;
    return insertAt(remove(node,id),target,id,side);
  }

  function reconcile(node, ids) {
    for (const id of paneIds(node)) if (!ids.includes(id)) node=remove(node,id);
    for (const id of ids) node=append(node,id);
    return node;
  }

  function join(nodes, axis) {
    if (!nodes.length) return null;
    if (nodes.length === 1) return nodes[0];
    const middle=Math.ceil(nodes.length/2);
    const node=split(axis,join(nodes.slice(0,middle),axis),join(nodes.slice(middle),axis));
    node.ratio=middle/nodes.length;
    return node;
  }

  function arrange(ids, columns=2) {
    const count=Math.min(Math.max(1,columns),ids.length);
    const stacks=Array.from({length:count},(_,column) => join(ids.filter((_,index) => index % count === column).map(pane),'vertical'));
    return join(stacks,'horizontal');
  }

  function resize(node, id, ratio) {
    if (!node || node.type === 'pane') return node;
    if (node.id === id && Number.isFinite(ratio)) return {...node,ratio:Math.max(.12,Math.min(.88,ratio))};
    return {...node,first:resize(node.first,id,ratio),second:resize(node.second,id,ratio)};
  }

  return Object.freeze({paneIds,remove,append,move,reconcile,arrange,resize});
})();
