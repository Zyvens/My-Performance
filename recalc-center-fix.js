"use strict";
/* Ensures the Scheduler 2.0 recalculation center always owns the visible Today button. */
(function(){
  function bind(){
    const api=window.MyPerformanceScheduler2;
    const btn=document.getElementById('adaptiveRecalc');
    if(!api?.openRecalcCenter||!btn)return false;
    btn.textContent='↻ Recalcular / Diagnóstico';
    btn.setAttribute('aria-label','Abrir central de recálculo e diagnóstico');
    btn.dataset.scheduler2Recalc='1';
    btn.onclick=e=>{e.preventDefault();e.stopPropagation();api.openRecalcCenter()};
    return true
  }

  // Capture phase guarantees Scheduler 2.0 wins even if an older handler is rebound later.
  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('#adaptiveRecalc');
    if(!btn||!window.MyPerformanceScheduler2?.openRecalcCenter)return;
    e.preventDefault();e.stopImmediatePropagation();
    window.MyPerformanceScheduler2.openRecalcCenter()
  },true);

  const observer=new MutationObserver(()=>bind());
  const start=()=>{
    bind();
    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('my-performance-view-rendered',bind);
    window.addEventListener('pageshow',bind);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)bind()});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.MyPerformanceRecalcCenterFix={bind};
})();
