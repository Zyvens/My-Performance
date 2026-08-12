"use strict";
/* My Performance 2.9.0 — cached quest repository.
   Preserves the public quests()/questById() API while avoiding repeated merge/filter/find work. */
(function(){
  if(typeof quests!=='function'||typeof questById!=='function'||typeof state==='undefined')return;
  const VERSION=1,baseQuests=quests;
  let cache=null,byId=new Map(),generation=1,hits=0,misses=0,rebuilds=0;
  function rebuild(){
    const list=baseQuests();
    cache=Array.isArray(list)?list:[];
    byId=new Map(cache.map(q=>[q.id,q]));
    rebuilds++;misses++;
    return cache;
  }
  function invalidate(){cache=null;byId.clear();generation++}
  quests=function(){
    if(!cache)rebuild();else hits++;
    return cache.slice();
  };
  questById=function(id){
    if(!cache)rebuild();else hits++;
    return byId.get(id);
  };
  window.addEventListener?.('my-performance-state-saved',invalidate);
  window.addEventListener?.('my-performance-cloud-loaded',invalidate);
  window.MyPerformanceQuestRepository={VERSION,invalidate,metrics:()=>({generation,hits,misses,rebuilds,size:cache?.length||0,hitRatio:(hits+misses)?Math.round(hits/(hits+misses)*1000)/10:0})};
})();
