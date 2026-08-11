"use strict";
/* Lightweight production guard: no scheduling logic lives here. */
(function(){
  const BUILD='2.0.2';
  let renders=0,lastSecond=0,burst=0;
  function patch(){
    document.documentElement.dataset.build=BUILD;
    const e=document.querySelector('.planner-head .eyebrow');if(e&&/CALENDÁRIO INTELIGENTE/.test(e.textContent||''))e.textContent=`CALENDÁRIO INTELIGENTE · v${BUILD}`;
    document.querySelectorAll('.mini-stat').forEach(card=>{const b=card.querySelector('b'),s=card.querySelector('small');if(b?.textContent==='Calendar V3'){b.textContent='Calendar V4';if(s)s.textContent='projeção única em cache, memória limitada'}});
  }
  window.addEventListener('my-performance-view-rendered',()=>{
    renders++;const sec=Math.floor(Date.now()/1000);if(sec===lastSecond)burst++;else{lastSecond=sec;burst=1}patch();
    if(burst>12)console.error('My Performance render burst detected', {burst,view:state?.view});
  });
  window.addEventListener('error',e=>console.error('My Performance runtime error',e.error||e.message));
  window.addEventListener('unhandledrejection',e=>console.error('My Performance rejected promise',e.reason));
  window.MyPerformanceRuntimeStability={BUILD,status:()=>({renders,burst,planner:window.MyPerformancePlannerEngine?.metrics?.()||null})};
  setTimeout(patch,0);
})();