"use strict";
/* My Performance 2.8.2 — navigation/performance hot-path guard.
   UI-only navigation must not invalidate Planner caches or trigger cloud/state mutation listeners. */
(function(){
  if(typeof state==='undefined'||typeof render!=='function')return;
  const VERSION=14,STATE_KEY='my_performance_v1',Clock=window.MyPerformanceClock;
  const baseRender=render;
  let rendering=false,queued=false,lastRenderAt=0,skippedReentry=0;

  function persistUiOnly(){
    try{
      const raw=JSON.parse(localStorage.getItem(STATE_KEY)||'{}');
      raw.view=state.view;
      if(state.plannerDate)raw.plannerDate=state.plannerDate;
      localStorage.setItem(STATE_KEY,JSON.stringify(raw));
    }catch(_e){}
  }

  go=function(view){
    if(!view)return;
    state.view=view;
    if(view==='today')state.plannerDate=Clock?.today?.()||(typeof today==='function'?today():state.plannerDate);
    persistUiOnly();
    render();
    try{window.scrollTo({top:0,behavior:'smooth'})}catch(_e){try{window.scrollTo(0,0)}catch(_e2){}}
  };

  render=function(){
    if(rendering){queued=true;skippedReentry++;return;}
    rendering=true;
    const started=performance?.now?.()||Date.now();
    try{return baseRender()}
    finally{
      lastRenderAt=(performance?.now?.()||Date.now())-started;
      rendering=false;
      if(queued){queued=false;queueMicrotask(()=>{try{render()}catch(e){console.error('My Performance queued render',e)}})}
    }
  };

  /* Resilient delegated navigation: static nav normally has onclick from app.js,
     but this keeps Dashboard/Hoje operational if a later module replaces nodes/listeners. */
  document.addEventListener('click',e=>{
    const b=e.target?.closest?.('[data-view]');
    if(!b||b.disabled)return;
    if(typeof b.onclick==='function')return;
    e.preventDefault();
    go(b.dataset.view);
  });

  window.MyPerformanceRuntimePerformance={
    VERSION,
    metrics:()=>({lastRenderMs:Math.round(lastRenderAt*10)/10,skippedReentry,view:state.view,planner:window.MyPerformancePlannerEngine?.metrics?.()||null})
  };
})();
