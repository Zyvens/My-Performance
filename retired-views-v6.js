"use strict";
/* My Performance 2.3.1 — temporarily retire obsolete Calendar and Gantt screens.
   Planning/calendar internals remain available to Today and the Planner. */
(function(){
  if(typeof state==='undefined')return;
  const VERSION=1,RETIRED=new Set(['agenda','timeline']),FALLBACK='dashboard';
  function normalize(){
    if(RETIRED.has(state.view))state.view=FALLBACK;
    document.querySelectorAll('[data-view="agenda"],[data-view="timeline"]').forEach(el=>el.remove());
    return state.view;
  }
  normalize();
  const baseGo=typeof go==='function'?go:null;
  if(baseGo)go=function(view){return baseGo(RETIRED.has(view)?FALLBACK:view)};
  const baseRender=typeof render==='function'?render:null;
  if(baseRender)render=function(){normalize();return baseRender()};
  window.addEventListener('my-performance-cloud-loaded',()=>setTimeout(()=>{const before=state.view;normalize();if(before!==state.view){try{saveState()}catch{};try{render()}catch{}}},0));
  window.MyPerformanceRetiredViews={VERSION,retired:[...RETIRED],normalize};
})();
