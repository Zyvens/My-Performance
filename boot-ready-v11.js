"use strict";
/* My Performance 2.7.0 — fail-open boot + hot-today authority. */
(function(){
  const VERSION=13,WATCHDOG_MS=1800;
  let released=false,renderStarted=false;
  const current=()=>window.MyPerformanceClock?.today?.()||(typeof today==='function'?today():new Date().toISOString().slice(0,10));
  function forceToday(){try{if(typeof state!=='undefined')state.plannerDate=current()}catch{}return current()}
  function dispatch(status){try{window.dispatchEvent(new CustomEvent('my-performance-runtime-ready',{detail:{version:VERSION,status,date:current()}}))}catch(_e){}}
  function reveal(status='ready'){if(!released){released=true;document.documentElement.classList.remove('mp-booting');document.documentElement.classList.add('mp-runtime-revealed');document.documentElement.dataset.runtimeReady='1'}document.documentElement.dataset.bootStatus=status;dispatch(status)}
  function finalRender(){if(renderStarted)return;renderStarted=true;forceToday();reveal('rendering');setTimeout(()=>{try{forceToday();if(typeof render==='function')render();document.documentElement.dataset.bootStatus='ready'}catch(e){console.error('My Performance final boot render',e);document.documentElement.dataset.bootStatus='degraded';try{window.dispatchEvent(new CustomEvent('my-performance-boot-error',{detail:{message:String(e?.message||e)}}))}catch(_e){}}},0)}
  const watchdog=setTimeout(()=>{forceToday();reveal('watchdog')},WATCHDOG_MS);
  function finish(){clearTimeout(watchdog);forceToday();if(typeof requestAnimationFrame==='function')requestAnimationFrame(finalRender);else setTimeout(finalRender,0)}
  function returnToday(renderNow=false){const changed=typeof state!=='undefined'&&state.plannerDate!==current();forceToday();if(renderNow&&changed)try{render()}catch{}return changed}
  window.addEventListener('error',()=>reveal('degraded'),{once:true});window.addEventListener('unhandledrejection',()=>reveal('degraded'),{once:true});
  window.addEventListener('pageshow',()=>returnToday(true));window.addEventListener('my-performance-cloud-loaded',()=>returnToday(true));document.addEventListener('visibilitychange',()=>{if(!document.hidden)returnToday(true)});
  document.addEventListener('click',e=>{const todayNav=e.target?.closest?.('[data-view="today"]');if(todayNav)forceToday();const oldNav=e.target?.closest?.('#calPrev,#calNext');if(oldNav){e.preventDefault();e.stopImmediatePropagation();forceToday();try{toast('A agenda ativa é sempre o dia de hoje. O passado fica no backlog leve.')}catch{}try{render()}catch{}}},true);
  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',finish,{once:true});else queueMicrotask(finish);
  window.MyPerformanceBootReady={VERSION,finish,reveal,finalRender,forceToday};
})();
