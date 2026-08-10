"use strict";
/* Final guard: Scheduler 2.0 always owns the visible Today recalculation button without creating DOM mutation loops. */
(function(){
  let scheduled=false;
  function bind(){
    const api=window.MyPerformanceScheduler2;
    const btn=document.getElementById('adaptiveRecalc');
    if(!api?.openRecalcCenter||!btn)return false;
    const label='↻ Recalcular / Diagnóstico';
    if(btn.textContent!==label)btn.textContent='↻ Recalcular / Diagnóstico';
    if(btn.getAttribute('aria-label')!=='Abrir central de recálculo e diagnóstico')btn.setAttribute('aria-label','Abrir central de recálculo e diagnóstico');
    if(btn.dataset.scheduler2Recalc!=='1')btn.dataset.scheduler2Recalc='1';
    if(!btn.__scheduler2Bound){
      btn.__scheduler2Bound=true;
      btn.onclick=e=>{e.preventDefault();e.stopPropagation();api.openRecalcCenter()};
    }
    return true
  }
  function scheduleBind(){
    if(scheduled)return;scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;bind()})
  }

  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('#adaptiveRecalc');
    const api=window.MyPerformanceScheduler2;
    if(!btn||!api?.openRecalcCenter)return;
    e.preventDefault();e.stopImmediatePropagation();api.openRecalcCenter()
  },true);

  const observer=new MutationObserver(mutations=>{
    if(mutations.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&(n.id==='adaptiveRecalc'||n.querySelector?.('#adaptiveRecalc')))))scheduleBind()
  });
  function start(){
    bind();
    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('my-performance-view-rendered',scheduleBind);
    window.addEventListener('pageshow',scheduleBind);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleBind()});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.MyPerformanceRecalcCenterFix={bind};
})();
