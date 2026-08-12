"use strict";
/* Final routine routing: meals, breakfast and training are preferred Side Quest lanes, not generic fillers. */
(function(){
  const D=window.MyPerformanceCalendarDomain,E=window.MyPerformancePlannerEngine;
  if(!D||!E||typeof state==='undefined')return;
  const all=()=>typeof quests==='function'?quests():[];
  const q=id=>all().find(x=>x.id===id)||null;
  function patchQuest(id,patch){state.overrides=state.overrides||{};const custom=(state.customQuests||[]).find(x=>x.id===id);if(custom)Object.assign(custom,patch);else state.overrides[id]=Object.assign({},state.overrides[id]||{},patch)}
  function patchMeta(id,patch){const m=D.sideMeta?.(id);if(m)Object.assign(m,patch)}
  function apply(){
    patchQuest('personal-gym',{weekdays:[1,2,3,4,5,6],domain:'Pessoal',durationMin:90});
    patchMeta('personal-gym',{scheduleType:'flex-window',rigidity:'preferred',durationMode:'flexible',flexMinMin:60,flexMaxMin:90,minSessionMin:60,idealSessionMin:90,windowMode:'exclusive',windowIds:['mon-health','tue-training','wed-training','thu-health','fri-health','sat-health'],maxRepeatsPerDay:1});
    patchQuest('personal-breakfast',{weekdays:[1,2,3,4,5,6],domain:'Pessoal',durationMin:30});
    patchMeta('personal-breakfast',{scheduleType:'flex-window',rigidity:'preferred',durationMode:'flexible',flexMinMin:20,flexMaxMin:30,minSessionMin:20,idealSessionMin:30,windowMode:'exclusive',windowIds:['mon-health','tue-health','wed-bni-window','thu-health','fri-health','sat-health'],maxRepeatsPerDay:1});
    patchQuest('personal-lunch',{weekdays:[1,2,3,4,5,6],domain:'Pessoal',durationMin:60});
    patchMeta('personal-lunch',{scheduleType:'flex-window',rigidity:'preferred',durationMode:'flexible',flexMinMin:30,flexMaxMin:60,minSessionMin:30,idealSessionMin:60,windowMode:'exclusive',windowIds:['mon-lunch','tue-lunch','wed-lunch','thu-lunch','fri-lunch','sat-lunch'],maxRepeatsPerDay:1});
    patchQuest('routine-dinner',{weekdays:[1,2,3,4],domain:'Pessoal',durationMin:30});
    patchMeta('routine-dinner',{scheduleType:'flex-window',rigidity:'preferred',durationMode:'flexible',flexMinMin:20,flexMaxMin:40,minSessionMin:20,idealSessionMin:30,windowMode:'exclusive',windowIds:['mon-personal','tue-personal','wed-personal','thu-personal'],maxRepeatsPerDay:1});
    patchQuest('routine-shower-post-gym',{weekdays:[1,2,3,4,5,6]});
    patchMeta('routine-shower-post-gym',{rigidity:'preferred',windowMode:'exclusive',windowIds:['mon-health','tue-training','wed-training','thu-health','fri-health','sat-health'],maxRepeatsPerDay:1});
    patchMeta('personal-wake',{scheduleType:'anchor',rigidity:'preferred',durationMode:'fixed',windowMode:'exclusive',windowIds:['mon-health','tue-health','wed-bni-window','thu-health','fri-health','sat-health']});
    patchMeta('personal-sleep',{scheduleType:'anchor',rigidity:'preferred',durationMode:'fixed',windowMode:'exclusive',windowIds:['sun-sleep','mon-sleep','tue-sleep','wed-sleep','thu-sleep','fri-sleep','sat-sleep']});
    patchMeta('routine-hygiene-night',{scheduleType:'flex-window',rigidity:'preferred',durationMode:'flexible',flexMinMin:10,flexMaxMin:20,minSessionMin:10,idealSessionMin:15,windowMode:'exclusive',windowIds:['sun-sleep','mon-sleep','tue-sleep','wed-sleep','thu-sleep','fri-sleep','sat-sleep']});
    E.invalidate?.('routine-side-lanes');
  }
  apply();
  window.addEventListener?.('my-performance-cloud-loaded',()=>{try{apply()}catch{}});
  window.MyPerformanceRoutineSidePolicy={VERSION:8,apply,lunch:()=>q('personal-lunch'),dinner:()=>q('routine-dinner'),breakfast:()=>q('personal-breakfast'),gym:()=>q('personal-gym')};
})();
