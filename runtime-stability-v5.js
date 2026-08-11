"use strict";
/* Runtime stability guard for My Performance 2.1. No scheduling logic. */
(function(){
  const BUILD=String(document.documentElement.dataset.build||'2.1.0');let renders=0,lastSecond=0,burst=0;
  function patch(){document.querySelectorAll('.planner-head .eyebrow').forEach(e=>{if(/CALENDÁRIO INTELIGENTE/i.test(e.textContent||''))e.textContent=`CALENDÁRIO INTELIGENTE · v${BUILD}`});document.querySelectorAll('.statline').forEach(r=>{const s=r.querySelector('span'),b=r.querySelector('b');if(s?.textContent==='Versão'&&b)b.textContent=BUILD})}
  window.addEventListener('my-performance-view-rendered',()=>{renders++;const sec=Math.floor(Date.now()/1000);if(sec===lastSecond)burst++;else{lastSecond=sec;burst=1}patch();if(burst>12)console.error('My Performance render burst detected',{burst,view:state?.view,planner:window.MyPerformancePlannerEngine?.metrics?.()})});
  window.addEventListener('error',e=>console.error('My Performance runtime error',e.error||e.message));window.addEventListener('unhandledrejection',e=>console.error('My Performance rejected promise',e.reason));window.addEventListener('pageshow',patch);
  window.MyPerformanceRuntimeStability={BUILD,status:()=>({renders,burst,planner:window.MyPerformancePlannerEngine?.metrics?.()||null,domainVersion:window.MyPerformanceCalendarDomain?.VERSION||null})};setTimeout(patch,0)
})();
