"use strict";
/* My Performance 2.9.0 — consolidated performance telemetry for diagnostics. */
(function(){
  const VERSION=1,startedAt=performance?.now?.()||Date.now();let loadedAt=0;
  window.addEventListener('load',()=>{loadedAt=performance?.now?.()||Date.now()},{once:true});
  function navigationMetrics(){
    try{const n=performance.getEntriesByType('navigation')?.[0];return n?{domContentLoadedMs:Math.round(n.domContentLoadedEventEnd*10)/10,loadMs:Math.round(n.loadEventEnd*10)/10,transferSize:n.transferSize||0}:null}catch{return null}
  }
  window.MyPerformancePerformance={VERSION,metrics:()=>({
    build:String(document.documentElement.dataset.build||''),
    bootObservedMs:Math.round(((loadedAt||performance?.now?.()||Date.now())-startedAt)*10)/10,
    navigation:navigationMetrics(),
    runtime:window.MyPerformanceRuntimePerformance?.metrics?.()||null,
    quests:window.MyPerformanceQuestRepository?.metrics?.()||null,
    planning:window.MyPerformancePlanningContext?.metrics?.()||null,
    planner:window.MyPerformancePlannerEngine?.metrics?.()||null
  })};
})();
