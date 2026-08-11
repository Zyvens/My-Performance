"use strict";
/* Fixed-date Campaign milestones are one-off Main Quests, never repeating monthly occurrences. */
(function(){
  if(typeof state==='undefined'||typeof QUEST_SEED==='undefined')return;
  state.overrides=state.overrides||{};
  for(const q of QUEST_SEED.concat(state.customQuests||[])){
    if(!/^study-(aug|sep|oct|nov|final)/.test(String(q.id||'')))continue;
    q.cadence='once';q.questType='main';state.overrides[q.id]=Object.assign({},state.overrides[q.id]||{},{cadence:'once',questType:'main'});
  }
})();
