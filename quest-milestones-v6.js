"use strict";
/* Final catalog normalization after semantic audit.
   Fixed-date Campaign milestones are one-off Main Quests; hard dependencies belong only to Main Quests. */
(function(){
  if(typeof state==='undefined'||typeof QUEST_SEED==='undefined')return;
  state.overrides=state.overrides||{};
  for(const q of QUEST_SEED.concat(state.customQuests||[])){
    if(/^study-(aug|sep|oct|nov|final)/.test(String(q.id||''))){q.cadence='once';q.questType='main';state.overrides[q.id]=Object.assign({},state.overrides[q.id]||{},{cadence:'once',questType:'main'})}
    const effectiveType=state.overrides[q.id]?.questType||q.questType;if(effectiveType!=='main'&&!q.specialCommitment){q.dependencies=[];state.overrides[q.id]=Object.assign({},state.overrides[q.id]||{},{dependencies:[]})}
  }
})();
