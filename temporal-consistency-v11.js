"use strict";
/* My Performance 2.7.0 — hot-today temporal consistency.
   Today is the only hot agenda. Past dates are lightweight history/backlog and never invoke Planner allocation. */
(function(){
  const Clock=window.MyPerformanceClock,E=window.MyPerformancePlannerEngine;
  if(!Clock||!E||typeof state==='undefined')return;
  const VERSION=12,basePlan=E.planDay.bind(E),baseEmpty=E.emptyWindows.bind(E);
  const discarded=d=>!!(state.calendarV3?.discardedDays?.[d]||state.calendarV5?.discardedDays?.[d]);
  const factual=s=>!s?.executionHistory||['completed','session','missed'].includes(s.executionStatus);
  function lightPast(date){
    return{date,wake:0,end:0,windows:[],slots:[],outsideCalendar:[],critical:[],pastLocked:true,lightweightPast:true,discarded:discarded(date),plannerSkipped:true};
  }
  function normalize(plan,date){
    if(!plan)return plan;date=date||plan.date||Clock.today();const drop=discarded(date);let slots=[...(plan.slots||[])];
    if(drop){
      slots=slots.filter(s=>!s.executionHistory||factual(s));
      slots=slots.filter(s=>s.eventSlot||s.eventTravel||s.operationalBuffer||s.daySleepAnchor||s.executionHistory);
    }
    const seen=new Set();slots=slots.filter(s=>{const k=s.executionHistory?`h:${s.sourceSlotId||s.id||s.workKey}`:`s:${s.id||`${s.eventId}:${s.start}:${s.end}`}`;if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>Number(a.start||0)-Number(b.start||0)||Number(a.end||0)-Number(b.end||0));
    return Object.assign({},plan,{slots,outsideCalendar:drop?[]:(plan.outsideCalendar||[]),pastLocked:false,discarded:drop});
  }
  function planDay(date=Clock.today()){
    date=date||Clock.today();
    if(date<Clock.today())return lightPast(date);
    return normalize(basePlan(date),date);
  }
  function planWeek(date=Clock.today()){const ws=weekStart(date);return Array.from({length:7},(_,i)=>planDay(addDays(ws,i)))}
  function emptyWindows(input=Clock.today()){const p=typeof input==='string'?planDay(input):input;if(!p||p.date<Clock.today()||p.discarded||p.lightweightPast)return[];return baseEmpty(p)}
  function missionNow(date=Clock.today()){const p=planDay(date);if(date!==Clock.today()||p.discarded)return{current:null,next:null,plan:p};const m=Clock.minutesNow(),live=(p.slots||[]).filter(s=>!s.executionHistory&&!s.eventTravel);return{current:live.find(s=>s.start<=m&&s.end>m)||null,next:live.find(s=>s.start>m)||null,plan:p}}
  E.planDay=planDay;E.planWeek=planWeek;E.emptyWindows=emptyWindows;E.missionNow=missionNow;
  if(window.MyPerformanceRoutine){window.MyPerformanceRoutine.planDay=planDay;window.MyPerformanceRoutine.missionNow=missionNow}
  window.MyPerformanceTemporalConsistency={VERSION,normalize,lightPast};
})();
