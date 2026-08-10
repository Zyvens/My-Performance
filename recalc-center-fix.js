"use strict";
/* Final guard: Scheduler 2.0 always owns the visible Today recalculation button. */
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

  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('#adaptiveRecalc');
    const api=window.MyPerformanceScheduler2;
    if(!btn||!api?.openRecalcCenter)return;
    e.preventDefault();e.stopImmediatePropagation();api.openRecalcCenter()
  },true);

  const observer=new MutationObserver(()=>bind());
  function start(){
    bind();
    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('my-performance-view-rendered',bind);
    window.addEventListener('pageshow',bind);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)bind()});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.MyPerformanceRecalcCenterFix={bind};
})();
