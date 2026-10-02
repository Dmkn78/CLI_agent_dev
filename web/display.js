"use strict";
const APP_ZOOM_STEPS=[50,60,67,75,80,90,100,110,125,150,175];
const DEFAULT_APP_ZOOM=100;
let appZoom=Number(localStorage.getItem('atelier-display-zoom')) || DEFAULT_APP_ZOOM;
let graphZoom=Number(localStorage.getItem('atelier-graph-zoom')) || 0;
let graphResizeObserver=null;

function zoomStep(current, direction) {
  return direction === 'in' ? APP_ZOOM_STEPS.find(step => step > current) || 175 : [...APP_ZOOM_STEPS].reverse().find(step => step < current) || 50;
}

async function setAppZoom(percent) {
  appZoom=Number.isFinite(percent) ? Math.max(50,Math.min(175,percent)) : DEFAULT_APP_ZOOM;
  localStorage.setItem('atelier-display-zoom',String(appZoom));
  if (window.atelierDesktop?.setZoom) await window.atelierDesktop.setZoom(appZoom);
  else {
    document.documentElement.style.zoom=appZoom/100;
    document.documentElement.style.setProperty('--app-viewport-height',(10000/appZoom)+'dvh');
  }
  requestAnimationFrame(() => {syncBrowserPanel();fitNativeTerminals();mountGraphZoom();});
}

function graphZoomControls() {
  return `<div class="zoom-control graph-zoom-control" role="group" aria-label="Zoom du graphe">
    ${btn('graph-zoom','−','','icon-btn','data-direction="out" aria-label="Dézoomer le graphe"')}
    <output id="graph-zoom-label" aria-label="Échelle du graphe">Auto</output>
    ${btn('graph-zoom','+','','icon-btn','data-direction="in" aria-label="Zoomer le graphe"')}
    ${btn('graph-zoom','Ajuster','','quiet','data-direction="fit" title="Afficher tout le graphe"')}
  </div>`;
}

function mountGraphZoom() {
  graphResizeObserver?.disconnect();
  const viewport=$('.graph-scroll'),canvas=$('.graph-canvas');
  if (!viewport || !canvas) return;
  const update = () => {
    const height=parseFloat(canvas.style.height) || 560;
    const percent=graphZoom || Math.max(25,Math.min(100,Math.floor(Math.min(viewport.clientWidth/1000,(viewport.clientHeight-12)/height)*100)));
    canvas.style.zoom=percent/100;
    canvas.dataset.zoom=percent;
    $('#graph-zoom-label').textContent=percent+' %';
  };
  update();
  graphResizeObserver=new ResizeObserver(update);
  graphResizeObserver.observe(viewport);
}

function installDisplayActions() {
  actions['graph-zoom']=element => {
    const direction=element.dataset.direction;
    graphZoom=direction === 'fit' ? 0 : Math.max(25,Math.min(175,Number($('.graph-canvas')?.dataset.zoom || 100)+(direction === 'in' ? 10 : -10)));
    localStorage.setItem('atelier-graph-zoom',String(graphZoom));
    mountGraphZoom();
    if (!graphZoom) { $('.graph-scroll').scrollTop=0;$('.graph-scroll').scrollLeft=0; }
  };
  window.atelierDesktop?.onZoomShortcut(direction => setAppZoom(direction === 'reset' ? DEFAULT_APP_ZOOM : zoomStep(appZoom,direction)).catch(error => toast(error.message,true)));
  document.addEventListener('keydown',event => {
    if (window.atelierDesktop?.setZoom || !(event.ctrlKey || event.metaKey) || event.altKey) return;
    const direction=['-','_'].includes(event.key) || event.code === 'NumpadSubtract' ? 'out' : ['+','='].includes(event.key) || event.code === 'NumpadAdd' ? 'in' : event.key === '0' || event.code === 'Numpad0' ? 'reset' : null;
    if (direction) {event.preventDefault();setAppZoom(direction === 'reset' ? DEFAULT_APP_ZOOM : zoomStep(appZoom,direction));}
  });
  document.addEventListener('wheel',event => {
    if (!event.ctrlKey || window.atelierDesktop?.setZoom) return;
    event.preventDefault();
    setAppZoom(zoomStep(appZoom,event.deltaY < 0 ? 'in' : 'out'));
  },{passive:false});
  setAppZoom(appZoom).catch(error => toast(error.message,true));
}
