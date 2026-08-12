"use strict";
/* Strong dependency constraint for Planner V5. Dependency state is semantic metadata, never a fake public Group. */
(function(){
  const B=window.MyPerformanceCalendarModel,D=window.MyPerformanceCalendarDomain;if(!B||!D||typeof quests!=='function')return;
  const originalGroup=B.groupForQuest.bind(B);
  function byId(id){try{return questById(id)}catch{return quests().find(q=>q.id===id)}}
  function completed(id){try{if(typeof hasEverDone==='function'&&hasEverDone(id))return true}catch{};const c=state.completed||{};return Object.keys(c).some(k=>k===id||k.startsWith(id+'@'))}
  function dependencyIds(q){return Array.isArray(q?.dependencies)?q.dependencies.filter(Boolean):[]}
  function cycleFrom(id,stack=[],seen=new Set()){if(stack.includes(id))return stack.slice(stack.indexOf(id)).concat(id);if(seen.has(id))return null;seen.add(id);const q=byId(id);for(const d of dependencyIds(q)){const c=cycleFrom(d,stack.concat(id),seen);if(c)return c}return null}
  function status(q){if(!q||q.questType!=='main')return{ready:true,missing:[],cycle:null};const deps=dependencyIds(q);if(!deps.length)return{ready:true,missing:[],cycle:null};const cycle=cycleFrom(q.id,[],new Set()),missing=deps.filter(id=>!completed(id));return{ready:!cycle&&!missing.length,missing,cycle}}
  /* Public Group identity always remains the real Group inherited from Campaign/Quest. */
  B.groupForQuest=function(q){return originalGroup(q)};
  B.dependencyStatusForQuest=status;
  function allBlocked(){return quests().filter(q=>q.questType==='main'&&!q.disabled).map(q=>({q,status:status(q)})).filter(x=>!x.status.ready)}
  window.MyPerformancePlannerDependencies={VERSION:6,status,allBlocked,originalGroup,completed};
})();
