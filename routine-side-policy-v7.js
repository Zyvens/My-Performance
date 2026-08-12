"use strict";
/* Final routine routing after mission-context: meals and anchors use the intended dedicated windows. */
(function(){
  const D=window.MyPerformanceCalendarDomain,E=window.MyPerformancePlannerEngine;
  if(!D||!E||typeof state==='undefined')return;
  const all=()=>typeof quests==='function'?quests():[];
  const q=id=>all().find(x=>x.id===id)||null;
  function patchQuest(id,patch){const custom=(state.customQuests||[]).find(x=>x.id===id);if(custom)Object.assign(custom,patch);else state.overrides[id]=Object.assign({},state.overrides[id]||{},patch)}
  function patchMeta(id,patch){const m=D.sideMeta?.(id);if(m)Object.assign(m,patch)}
  patchQuest('personal-lunch',{weekdays:[1,2,3,4,5,6],domain:'Pessoal',durationMin:60});
  patchMeta('personal-lunch',{scheduleType:'flex-window',rigidity:'preferred',durationMode:'flexible',flexMinMin:30,flexMaxMin:60,minSessionMin:30,idealSessionMin:60,windowMode:'exclusive',windowIds:['mon-lunch','tue-lunch','wed-lunch','thu-lunch','fri-lunch','sat-lunch']});
  patchQuest('routine-dinner',{weekdays:[1,2,3,4],domain:'Pessoal',durationMin:30});
  patchMeta('routine-dinner',{scheduleType:'flex-window',rigidity:'preferred',durationMode:'flexible',flexMinMin:20,flexMaxMin:40,minSessionMin:20,idealSessionMin:30,windowMode:'exclusive',windowIds:['mon-personal','tue-personal','wed-personal','thu-personal']});
  patchQuest('routine-shower-post-gym',{weekdays:[1,4,6]});
  patchMeta('routine-shower-post-gym',{windowMode:'exclusive',windowIds:['mon-health','thu-health','sat-health']});
  patchMeta('personal-wake',{scheduleType:'anchor',rigidity:'preferred',durationMode:'fixed',windowMode:'exclusive',windowIds:['mon-health','tue-health','wed-bni-window','thu-health','fri-health','sat-health']});
  patchMeta('personal-sleep',{scheduleType:'anchor',rigidity:'preferred',durationMode:'fixed',windowMode:'exclusive',windowIds:['sun-sleep','mon-sleep','tue-sleep','wed-sleep','thu-sleep','fri-sleep','sat-sleep']});
  patchMeta('routine-hygiene-night',{scheduleType:'flex-window',rigidity:'preferred',durationMode:'flexible',flexMinMin:10,flexMaxMin:20,minSessionMin:10,idealSessionMin:15,windowMode:'exclusive',windowIds:['sun-sleep','mon-sleep','tue-sleep','wed-sleep','thu-sleep','fri-sleep','sat-sleep']});
  try{saveState()}catch{}
  E.invalidate?.();
  window.MyPerformanceRoutineSidePolicy={VERSION:7,lunch:q('personal-lunch')?.id||'',dinner:q('routine-dinner')?.id||''};
})();
