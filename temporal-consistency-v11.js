"use strict";
/* My Performance 2.6.0 — temporal consistency guard.
   Past dates never receive freshly allocated work. Discarded days keep only factual history. */
(function(){
  const Clock=window.MyPerformanceClock,E=window.MyPerformancePlannerEngine;
  if(!Clock||!E||typeof state==='undefined')return;
  const VERSION=11,basePlan=E.planDay.bind(E),baseWeek=E.planWeek.bind(E),baseEmpty=E.emptyWindows.bind(E);
  const discarded=d=>!!(state.calendarV3?.discardedDays?.[d]||state.calendarV5?.discardedDays?.[d]);
  const factual=s=>!s?.executionHistory||['completed','session','missed'].includes(s.executionStatus);
  function normalize(plan,date){
    if(!plan)return plan;date=date||plan.date||Clock.today();const past=date<Clock.today(),drop=discarded(date);let slots=[...(plan.slots||[])];
    if(past){
      // Every work block in the past is represented by the execution-history snapshot.
      // Fresh Planner output for the same old date is discarded, preventing retroactive fillers/duplicates.
      slots=slots.filter(s=>s.executionHistory||s.eventSlot||s.eventTravel||s.operationalBuffer||s.daySleepAnchor);
    }
    if(drop){
      // "Discard day" means no unfinished work remains attached to that day. Completed/session/missed facts survive.
      slots=slots.filter(s=>!s.executionHistory||factual(s));
      slots=slots.filter(s=>s.eventSlot||s.eventTravel||s.operationalBuffer||s.daySleepAnchor||s.executionHistory);
    }
    const seen=new Set();slots=slots.filter(s=>{const k=s.executionHistory?`h:${s.sourceSlotId||s.id||s.workKey}`:`s:${s.id||`${s.eventId}:${s.start}:${s.end}`}`;if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>Number(a.start||0)-Number(b.start||0)||Number(a.end||0)-Number(b.end||0));
    return Object.assign({},plan,{slots,outsideCalendar:past||drop?[]:(plan.outsideCalendar||[]),pastLocked:past,discarded:drop});
  }
  function planDay(date=Clock.today()){return normalize(basePlan(date),date)}
  function planWeek(date=Clock.today()){const ws=weekStart(date);return Array.from({length:7},(_,i)=>planDay(addDays(ws,i)))}
  function emptyWindows(input=Clock.today()){const p=typeof input==='string'?planDay(input):normalize(input,input?.date);if(!p||p.date<Clock.today()||p.discarded)return[];return baseEmpty(p)}
  function missionNow(date=Clock.today()){const p=planDay(date);if(date<Clock.today()||p.discarded)return{current:null,next:null,plan:p};const m=Clock.minutesNow(),live=(p.slots||[]).filter(s=>!s.executionHistory&&!s.eventTravel);return{current:live.find(s=>s.start<=m&&s.end>m)||null,next:live.find(s=>s.start>m)||null,plan:p}}
  E.planDay=planDay;E.planWeek=planWeek;E.emptyWindows=emptyWindows;E.missionNow=missionNow;
  if(window.MyPerformanceRoutine){window.MyPerformanceRoutine.planDay=planDay;window.MyPerformanceRoutine.missionNow=missionNow}
  window.MyPerformanceTemporalConsistency={VERSION,normalize};
})();
