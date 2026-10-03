"use strict";

// Normalized geometry stays inside the board when its viewport changes.
const FloatingPanels = (() => {
  const MIN_WIDTH = 280, MIN_HEIGHT = 180, GAP = 8;
  const clamp = (number, minimum, maximum) => Math.max(minimum, Math.min(maximum, number));

  function constrain(rect, viewport) {
    const width = clamp(Number.isFinite(rect?.width) ? rect.width : .6, Math.min(1, MIN_WIDTH / Math.max(1, viewport.width)), 1);
    const height = clamp(Number.isFinite(rect?.height) ? rect.height : .6, Math.min(1, MIN_HEIGHT / Math.max(1, viewport.height)), 1);
    return {x:clamp(Number.isFinite(rect?.x) ? rect.x : 0, 0, 1-width),
      y:clamp(Number.isFinite(rect?.y) ? rect.y : 0, 0, 1-height), width, height};
  }

  function arrange(ids, viewport) {
    if (!ids.length) return {};
    const minimumColumns = ids.length > 1 && viewport.width > 760 ? 2 : 1;
    const columns = Math.min(ids.length, Math.max(minimumColumns, Math.round(Math.sqrt(ids.length * viewport.width / Math.max(1, viewport.height) / 1.65))));
    const rows = Math.ceil(ids.length / columns), gapX = GAP / Math.max(1, viewport.width), gapY = GAP / Math.max(1, viewport.height);
    return Object.fromEntries(ids.map((id, index) => {
      const row = Math.floor(index / columns), count = Math.min(columns, ids.length-row*columns);
      const width = (1-(count-1)*gapX)/count, height = (1-(rows-1)*gapY)/rows;
      return [id, {x:(index % columns)*(width+gapX), y:row*(height+gapY), width, height}];
    }));
  }

  function move(rect, delta, viewport) {
    return constrain({...rect, x:rect.x+delta.x/viewport.width, y:rect.y+delta.y/viewport.height}, viewport);
  }

  function resize(rect, delta, viewport) {
    const bounds = constrain({...rect, width:rect.width+delta.x/viewport.width, height:rect.height+delta.y/viewport.height}, viewport);
    return {...bounds, x:rect.x, y:rect.y, width:Math.min(bounds.width,1-rect.x), height:Math.min(bounds.height,1-rect.y)};
  }

  function fontSize(viewport, preferred=13) {
    const size = Math.floor(Math.min(preferred, viewport.width/(78*.61), viewport.height/(19*1.35))*2)/2;
    return clamp(size, 10, preferred);
  }

  return Object.freeze({arrange, constrain, move, resize, fontSize});
})();
