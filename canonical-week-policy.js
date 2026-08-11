"use strict";
/* Canonical Week Policy — final metadata/invariants before Scheduler 2.0 captures the standard-week plan. */
(function(){
  if(!window.MyPerformanceRoutine||!window.MyPerformanceCanonicalWeek)return;
  const BASE_PLAN=window.MyPerformanceRoutine.planDay;
  const STUDY_MIN=180,WORKOUT_TARGET=6;
  /* Classic-script global alias used only by legacy diagnostic text inside the canonical template. */
  window.toTime=window.MyPerformanceRoutine.toTime;
  function plan(date=today()){
    const p=BASE_PLAN(date);p.capacity=p.capacity||{};
    p.capacity.workoutTarget=WORKOUT_TARGET;p.capacity.workoutPlanned=WORKOUT_TARGET;
    p.capacity.studyProtectedMin=p.sundayRest?0:STUDY_MIN;
    p.capacity.canonicalWeek=true;
    return p
  }
  function missionNow(date=today(),now=new Date()){const p=plan(date),m=now.getHours()*60+now.getMinutes(),current=(p.slots||[]).find(x=>m>=x.start&&m<x.end),next=(p.slots||[]).find(x=>x.start>m);return{plan:p,current:current||null,next:next||null,minute:m}}
  window.MyPerformanceRoutine.planDay=plan;window.MyPerformanceRoutine.missionNow=missionNow;
  window.MyPerformanceCanonicalWeekPolicy={plan,STUDY_MIN,WORKOUT_TARGET};
})();
