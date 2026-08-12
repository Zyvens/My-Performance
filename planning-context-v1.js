"use strict";
/* My Performance 2.9.0 — short-lived PlanningContext read cache.
   Coalesces duplicate Planner V5 reads within a UI render burst without changing allocation rules. */
(function(){
  const E=window.MyPerformancePlannerEngine;if(!E)return;
  const VERSION=1,TTL_MS=250,cache=new Map();
  let generation=1,hits=0,misses=0,invalidations=0;
  const now=()=>performance?.now?.()||Date.now();
  function invalidate(){cache.clear();generation++;invalidations++}
  function wrap(name,keyFn){
    const base=E[name];if(typeof base!=='function')return;
    E[name]=function(...args){
      const key=`${generation}|${name}|${keyFn?keyFn(args):JSON.stringify(args)}`;
      const t=now(),found=cache.get(key);
      if(found&&t-found.at<=TTL_MS){hits++;return found.value}
      misses++;
      const value=base.apply(this,args);
      cache.set(key,{at:t,value});
      if(cache.size>32){const first=cache.keys().next().value;cache.delete(first)}
      return value;
    };
  }
  wrap('planDay',a=>String(a[0]||''));
  wrap('planWeek',a=>String(a[0]||''));
  wrap('strategicWeek',a=>String(a[0]||''));
  window.addEventListener?.('my-performance-state-saved',invalidate);
  window.addEventListener?.('my-performance-cloud-loaded',invalidate);
  window.MyPerformancePlanningContext={VERSION,TTL_MS,invalidate,metrics:()=>({generation,hits,misses,invalidations,entries:cache.size,hitRatio:(hits+misses)?Math.round(hits/(hits+misses)*1000)/10:0})};
})();
