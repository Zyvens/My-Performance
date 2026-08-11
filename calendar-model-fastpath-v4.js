"use strict";
/* Calendar Model V4 fast path.
   calendar-model-v3 owns migration/editor semantics, but its legacy model() re-runs migration and localStorage persistence on every read.
   Production planning is read-heavy, so hot-path reads use the already-normalized state object directly. */
(function(){
  const M=window.MyPerformanceCalendarModel;if(!M||typeof state==='undefined')return;
  const originalModel=M.model;
  let stateRef=null,calendarRef=null;
  const GROUPS=new Set(['GSA','Estudos','Pessoal']);
  function fastModel(){
    const current=state?.calendarV3;
    if(current&&current===calendarRef&&state===stateRef)return current;
    // Run the legacy migration exactly once when a new state/calendar object arrives (startup, import or cloud load).
    const c=originalModel();stateRef=state;calendarRef=c;return c
  }
  // Prime once at startup. From this point normal reads do not stringify/persist state.
  fastModel();
  M.model=fastModel;
  M.groupForQuest=function(q){const c=fastModel(),meta=c.missionMeta?.[q?.id]||{},g=meta.groupId||q?.domain;return GROUPS.has(g)?g:'Pessoal'};
  M.campaignForQuest=function(q){const c=fastModel(),id=c.missionMeta?.[q?.id]?.campaignId||q?.campaignId||M.inferCampaign?.(q)||'';return(c.campaigns||[]).find(x=>x.id===id)||null};
  M.fixedMissions=function(){return QUEST_SEED.concat(state.customQuests||[]).filter(q=>q.specialCommitment&&q.fixedTime&&q.immovable&&!q.disabled)};
  M.prefFor=function(q,date){const c=fastModel(),p=c.preferences?.[q?.id],w=dfrom(date).getDay();return p?.[w]||null};
  M.fastPath=true;
  M.fastPathStatus=()=>({active:true,sameState:state===stateRef,sameCalendar:state?.calendarV3===calendarRef});
})();
