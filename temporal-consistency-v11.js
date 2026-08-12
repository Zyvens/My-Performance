"use strict";
/* My Performance 2.8.0 — today-only temporal consistency.
   Past dates do not exist as operational plans. Future dates remain available only to internal Planner consumers / lazy forecast. */
(function(){
  const Clock=window.MyPerformanceClock,E=window.MyPerformancePlannerEngine;
  if(!Clock||!E||typeof state==='undefined')return;
  const VERSION=13,basePlan=E.planDay.bind(E),baseEmpty=E.emptyWindows.bind(E);
  const discarded=d=>!!(state.calendarV3?.discardedDays?.[d]||state.calendarV5?.discardedDays?.[d]);
  function gonePast(date){return{date,wake:0,end:0,windows:[],slots:[],outsideCalendar:[],critical:[],pastGone:true,plannerSkipped:true,discarded:false}}
  function normalize(plan,date){if(!plan)return plan;date=date||plan.date||Clock.today();const drop=date===Clock.today()&&discarded(date);let slots=[...(plan.slots||[])];if(drop)slots=slots.filter(s=>s.eventSlot||s.eventTravel||s.operationalBuffer||s.daySleepAnchor||s.executionHistory&&['completed','session','missed'].includes(s.executionStatus));const seen=new Set();slots=slots.filter(s=>{const k=s.executionHistory?`h:${s.sourceSlotId||s.id||s.workKey}`:`s:${s.id||`${s.eventId}:${s.start}:${s.end}`}`;if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>Number(a.start||0)-Number(b.start||0)||Number(a.end||0)-Number(b.end||0));return Object.assign({},plan,{slots,outsideCalendar:drop?[]:(plan.outsideCalendar||[]),discarded:drop})}
  function planDay(date=Clock.today()){date=date||Clock.today();if(date<Clock.today())return gonePast(date);return normalize(basePlan(date),date)}
  function planWeek(date=Clock.today()){const ws=weekStart(date);return Array.from({length:7},(_,i)=>planDay(addDays(ws,i)))}
  function emptyWindows(input=Clock.today()){const p=typeof input==='string'?planDay(input):input;if(!p||p.pastGone||p.discarded)return[];return baseEmpty(p)}
  function missionNow(date=Clock.today()){const p=planDay(date);if(date!==Clock.today()||p.discarded)return{current:null,next:null,plan:p};const m=Clock.minutesNow(),live=(p.slots||[]).filter(s=>!s.executionHistory&&!s.eventTravel);return{current:live.find(s=>s.start<=m&&s.end>m)||null,next:live.find(s=>s.start>m)||null,plan:p}}
  E.planDay=planDay;E.planWeek=planWeek;E.emptyWindows=emptyWindows;E.missionNow=missionNow;
  if(window.MyPerformanceRoutine){window.MyPerformanceRoutine.planDay=planDay;window.MyPerformanceRoutine.missionNow=missionNow}
  window.MyPerformanceTemporalConsistency={VERSION,normalize,gonePast};
})();
