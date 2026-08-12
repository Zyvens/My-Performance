"use strict";
/* My Performance 2.6.0 — edited Window authority.
   Invalidates planner caches and removes stale per-day pins/checkpoints tied to changed window geometry. */
(function(){
  const Clock=window.MyPerformanceClock,D=window.MyPerformanceCalendarDomain,E=window.MyPerformancePlannerEngine;
  if(!Clock||!D||!E||typeof state==='undefined')return;
  const VERSION=11,baseUpdate=D.updateWindow.bind(D),baseAdd=D.addWindow.bind(D),baseRemove=D.removeWindow.bind(D);
  const wd=d=>dfrom(d).getDay();
  function invalidateDates(weekdays,windowIds=[]){
    const days=new Set([...weekdays].map(Number)),ids=new Set(windowIds.filter(Boolean)),today=Clock.today(),c=D.model();
    const exec=state.calendarExecutionV8;
    if(exec?.dayCheckpoints)for(const date of Object.keys(exec.dayCheckpoints))if(date>=today&&days.has(wd(date)))delete exec.dayCheckpoints[date];
    c.manualPins=c.manualPins||{};for(const [date,list] of Object.entries(c.manualPins))if(date>=today&&days.has(wd(date)))c.manualPins[date]=(list||[]).filter(p=>!ids.has(p.windowId));
    c.manualReplacements=c.manualReplacements||{};for(const [date,list] of Object.entries(c.manualReplacements))if(date>=today&&days.has(wd(date)))c.manualReplacements[date]=(list||[]).filter(p=>!ids.has(p.windowId));
    c.windowRevisionV11=Number(c.windowRevisionV11||0)+1;c.windowRevisionAt=new Date().toISOString();
    E.invalidate?.();try{window.MyPerformanceTemporalExecution?.refreshNow?.()}catch{};try{saveState()}catch{}
  }
  D.updateWindow=function(id,patch={}){const before=D.windowForId(id),oldWd=Number(before?.weekday),ok=baseUpdate(id,patch);const after=D.windowForId(id);if(ok&&after)invalidateDates(new Set([oldWd,Number(after.weekday)].filter(Number.isFinite)),[id]);return ok};
  D.addWindow=function(data={}){const w=baseAdd(data);if(w)invalidateDates(new Set([Number(w.weekday)]),[w.id]);return w};
  D.removeWindow=function(id){const before=D.windowForId(id),day=Number(before?.weekday),out=baseRemove(id);if(Number.isFinite(day))invalidateDates(new Set([day]),[id]);return out};
  window.addEventListener?.('my-performance-cloud-loaded',()=>{E.invalidate?.();try{window.MyPerformanceTemporalExecution?.refreshNow?.()}catch{}});
  window.MyPerformanceWindowAuthority={VERSION,invalidateDates};
})();
