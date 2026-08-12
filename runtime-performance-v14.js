"use strict";
/* My Performance 2.9.4 — navigation/performance/stability hot-path guard.
   UI-only navigation must not invalidate Planner caches or trigger cloud/state mutation listeners.
   Today navigation is captured authoritatively so stale/replaced button handlers cannot block the view. */
(function(){
  if(typeof state==='undefined'||typeof render!=='function')return;
  const VERSION=15,STATE_KEY='my_performance_v1',SCHEMA_VERSION=1,Clock=window.MyPerformanceClock;
  const BUILD=String(document.documentElement.dataset.build||'2.9.4');
  const VALID_VIEWS=new Set(['dashboard','today','quests','player','rewards','config']);
  const baseRender=render,baseSaveState=typeof saveState==='function'?saveState:null;
  let rendering=false,queued=false,lastRenderAt=0,skippedReentry=0,todayNavigations=0,todayRenderErrors=0,navigationToken=0;

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
  function activateNav(view){
    document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
    document.documentElement.dataset.activeView=view;
  }
  function updateRoute(view){
    try{
      const u=new URL(location.href);
      if(u.searchParams.get('view')!==view){u.searchParams.set('view',view);history.replaceState(history.state,'',u)}
    }catch(_e){}
  }
  function scrollTop(){try{window.scrollTo({top:0,behavior:'smooth'})}catch(_e){try{window.scrollTo(0,0)}catch(_e2){}}}
  function renderTodaySafe(){
    try{render();return true}
    catch(error){
      todayRenderErrors++;
      console.error('My Performance Today render failed',error);
      const direct=window.MyPerformanceCalendarUI?.renderToday;
      if(typeof direct==='function'){
        try{direct();activateNav('today');window.dispatchEvent(new CustomEvent('my-performance-view-rendered',{detail:{view:'today',engine:'calendar-v5',recovered:true}}));return true}catch(recoveryError){console.error('My Performance Today direct recovery failed',recoveryError)}
      }
      const host=document.getElementById('view');
      if(host)host.innerHTML='<div class="card danger"><span class="eyebrow">HOJE</span><h2>Não foi possível montar o calendário agora.</h2><p class="muted">O estado da aba foi preservado. Tente novamente sem sair desta tela.</p><button class="btn primary" id="retryTodayNavigation">Tentar novamente</button></div>';
      document.getElementById('retryTodayNavigation')?.addEventListener('click',()=>go('today'));
      activateNav('today');
      return false;
    }
  }

  /* Preserve every previously-installed saveState wrapper, but make metadata authoritative after it runs. */
  if(baseSaveState)saveState=function(){
    stampMutation();
    const out=baseSaveState.apply(this,arguments);
    state.appVersion=BUILD;
    state.schemaVersion=Math.max(SCHEMA_VERSION,Number(state.schemaVersion||0));
    correctPersistedMetadata();
    return out;
  };

  function navigate(view,options={}){
    if(!view)return;
    view=VALID_VIEWS.has(view)?view:'dashboard';
    const token=++navigationToken;
    state.view=view;
    if(view==='today')state.plannerDate=currentToday();
    persistUiOnly();
    activateNav(view);
    updateRoute(view);

    if(view==='today'&&options.defer!==false){
      todayNavigations++;
      /* Yield one frame so the pressed/active state becomes visible before the Planner builds Today. */
      requestAnimationFrame(()=>{
        if(token!==navigationToken||state.view!=='today')return;
        renderTodaySafe();
        scrollTop();
      });
      return;
    }
    if(view==='today'){todayNavigations++;renderTodaySafe()}else render();
    scrollTop();
  }
  go=function(view){return navigate(view,{defer:view==='today'})};

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

  /* Deep links/manifest shortcuts are authoritative at boot. */
  try{
    const requested=new URL(location.href).searchParams.get('view');
    if(requested){state.view=VALID_VIEWS.has(requested)?requested:'dashboard';if(state.view==='today')state.plannerDate=currentToday();persistUiOnly();activateNav(state.view)}
  }catch(_e){}

  const Planner=window.MyPerformancePlannerEngine;
  if(Planner?.missionNow)window.MyPerformanceRoutine={
    missionNow:function(){return Planner.missionNow()},
    toTime:typeof Planner.toTime==='function'?Planner.toTime:function(n){n=Math.max(0,Number(n)||0);return`${String(Math.floor(n/60)%24).padStart(2,'0')}:${String(Math.round(n)%60).padStart(2,'0')}`},
    source:'planner-engine-v5-compat'
  };

  /* Today is intercepted in capture phase. This intentionally wins over stale onclick handlers installed earlier. */
  document.addEventListener('click',e=>{
    const b=e.target?.closest?.('[data-view="today"]');
    if(!b||b.disabled)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    navigate('today',{defer:true});
  },true);

  /* Generic fallback for any nav node that has no direct handler. */
  document.addEventListener('click',e=>{
    const b=e.target?.closest?.('[data-view]');
    if(!b||b.disabled||b.dataset.view==='today')return;
    if(typeof b.onclick==='function')return;
    e.preventDefault();
    navigate(b.dataset.view,{defer:false});
  });

  try{navigator.serviceWorker?.addEventListener?.('message',e=>{if(e.data?.type==='OPEN_TODAY')navigate('today',{defer:true})})}catch(_e){}

  window.MyPerformanceRuntimePerformance={
    VERSION,BUILD,SCHEMA_VERSION,
    validViews:[...VALID_VIEWS],
    navigate,
    metrics:()=>({lastRenderMs:Math.round(lastRenderAt*10)/10,skippedReentry,todayNavigations,todayRenderErrors,view:state.view,planner:window.MyPerformancePlannerEngine?.metrics?.()||null}),
    persistUiOnly,stampMutation
  };
})();
