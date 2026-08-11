"use strict";
/* Canonical Week Policy — final metadata/invariants before Scheduler 2.0 captures the standard-week plan. */
(function(){
  if(!window.MyPerformanceRoutine||!window.MyPerformanceCanonicalWeek)return;
  const BASE_PLAN=window.MyPerformanceRoutine.planDay;
  const STUDY_MIN=180,WORKOUT_TARGET=6,WORKOUT_DAYS=[1,2,3,4,5,6];
  /* Classic-script global alias used only by legacy diagnostic text inside the canonical template. */
  window.toTime=window.MyPerformanceRoutine.toTime;
  const gymSeed=typeof QUEST_SEED!=='undefined'&&Array.isArray(QUEST_SEED)?QUEST_SEED.find(q=>q.id==='personal-gym'):null;
  if(gymSeed)Object.assign(gymSeed,{weekdays:WORKOUT_DAYS.slice(),durationMin:90,tags:[...new Set([...(gymSeed.tags||[]),'treino','6x semana','saúde'])]});
  if(typeof state!=='undefined'){
    state.overrides=state.overrides||{};
    state.overrides['personal-gym']=Object.assign({},state.overrides['personal-gym']||{},{weekdays:WORKOUT_DAYS.slice(),durationMin:90});
  }
  function plan(date=today()){
    const p=BASE_PLAN(date);p.capacity=p.capacity||{};
    p.capacity.workoutTarget=WORKOUT_TARGET;p.capacity.workoutPlanned=WORKOUT_TARGET;
    p.capacity.studyProtectedMin=p.sundayRest?0:STUDY_MIN;
    p.capacity.canonicalWeek=true;
    return p
  }
  function missionNow(date=today(),now=new Date()){const p=plan(date),m=now.getHours()*60+now.getMinutes(),current=(p.slots||[]).find(x=>m>=x.start&&m<x.end),next=(p.slots||[]).find(x=>x.start>m);return{plan:p,current:current||null,next:next||null,minute:m}}
  window.MyPerformanceRoutine.planDay=plan;window.MyPerformanceRoutine.missionNow=missionNow;
  window.MyPerformanceCanonicalWeekPolicy={plan,STUDY_MIN,WORKOUT_TARGET,WORKOUT_DAYS};
})();
