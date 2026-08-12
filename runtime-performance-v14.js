"use strict";
/* My Performance 2.8.3 — navigation/performance/stability hot-path guard.
   UI-only navigation must not invalidate Planner caches or trigger cloud/state mutation listeners.
   Runtime mutations receive build/schema/sync metadata, deep links are authoritative, and notifications use Planner V5. */
(function(){
  if(typeof state==='undefined'||typeof render!=='function')return;
  const VERSION=14,STATE_KEY='my_performance_v1',SCHEMA_VERSION=1,Clock=window.MyPerformanceClock;
  const BUILD=String(document.documentElement.dataset.build||'2.8.3');
  const VALID_VIEWS=new Set(['dashboard','today','quests','player','rewards','config']);
  const baseRender=render,baseSaveState=typeof saveState==='function'?saveState:null;
  let rendering=false,queued=false,lastRenderAt=0,skippedReentry=0;

  function currentToday(){return Clock?.today?.()||(typeof today==='function'?today():new Date().toISOString().slice(0,10))}
  function persistUiOnly(){
    try{
      const raw=JSON.parse(localStorage.getItem(STATE_KEY)||'{}');
      raw.view=state.view;
      if(state.plannerDate)raw.plannerDate=state.plannerDate;
      localStorage.setItem(STATE_KEY,JSON.stringify(raw));
    }catch(_e){}
  }
  function stampMutation(){
    const at=new Date().toISOString();
    state.appVersion=BUILD;
    state.schemaVersion=Math.max(SCHEMA_VERSION,Number(state.schemaVersion||0));
    state.syncMeta=Object.assign({},state.syncMeta||{},{lastMutationAt:at});
    return at;
  }
  function correctPersistedMetadata(){
    try{
      const raw=JSON.parse(localStorage.getItem(STATE_KEY)||'{}');
      raw.appVersion=BUILD;
      raw.schemaVersion=Math.max(SCHEMA_VERSION,Number(raw.schemaVersion||state.schemaVersion||0));
      raw.syncMeta=Object.assign({},raw.syncMeta||{},state.syncMeta||{});
      localStorage.setItem(STATE_KEY,JSON.stringify(raw));
    }catch(_e){}
  }

  /* Preserve every previously-installed saveState wrapper, but make metadata authoritative after it runs.
     app.js still has a historical APP_VERSION constant; this layer prevents it from leaking into persisted state. */
  if(baseSaveState)saveState=function(){
    stampMutation();
    const out=baseSaveState.apply(this,arguments);
    state.appVersion=BUILD;
    state.schemaVersion=Math.max(SCHEMA_VERSION,Number(state.schemaVersion||0));
    correctPersistedMetadata();
    return out;
  };

  go=function(view){
    if(!view)return;
    view=VALID_VIEWS.has(view)?view:'dashboard';
    state.view=view;
    if(view==='today')state.plannerDate=currentToday();
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

  /* Deep links/manifest shortcuts are now authoritative at boot. Retired/unknown views fail closed to Dashboard. */
  try{
    const requested=new URL(location.href).searchParams.get('view');
    if(requested){state.view=VALID_VIEWS.has(requested)?requested:'dashboard';if(state.view==='today')state.plannerDate=currentToday();persistUiOnly()}
  }catch(_e){}

  /* Compatibility facade only: Notifications V1 historically asks MyPerformanceRoutine for missionNow/toTime.
     The facade points those reads at the single production scheduling authority, Planner Engine V5. */
  const Planner=window.MyPerformancePlannerEngine;
  if(Planner?.missionNow)window.MyPerformanceRoutine={
    missionNow:function(){return Planner.missionNow()},
    toTime:typeof Planner.toTime==='function'?Planner.toTime:function(n){n=Math.max(0,Number(n)||0);return`${String(Math.floor(n/60)%24).padStart(2,'0')}:${String(Math.round(n)%60).padStart(2,'0')}`},
    source:'planner-engine-v5-compat'
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

  /* Notification clicks focus an existing PWA client through a SW message. Make that message actually route to Today. */
  try{navigator.serviceWorker?.addEventListener?.('message',e=>{if(e.data?.type==='OPEN_TODAY')go('today')})}catch(_e){}

  window.MyPerformanceRuntimePerformance={
    VERSION,BUILD,SCHEMA_VERSION,
    validViews:[...VALID_VIEWS],
    metrics:()=>({lastRenderMs:Math.round(lastRenderAt*10)/10,skippedReentry,view:state.view,planner:window.MyPerformancePlannerEngine?.metrics?.()||null}),
    persistUiOnly,stampMutation
  };
})();
