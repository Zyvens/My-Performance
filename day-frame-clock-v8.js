"use strict";
/* My Performance 2.4.2 — Sao Paulo authority for Day Frame wake exceptions. */
(function(){
  const Clock=window.MyPerformanceClock,D=window.MyPerformanceCalendarDomain,F=window.MyPerformanceDayFrame;
  if(!Clock||!D||!F||typeof state==='undefined')return;
  const toTime=n=>{n=((Math.round(Number(n)||0)%1440)+1440)%1440;return`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`};
  F.wakeNow=function(date=Clock.today(),minute=Clock.minutesNow()){
    if(date!==Clock.today())return false;
    minute=Number(minute);if(!Number.isFinite(minute)||minute<0||minute>1439)return false;
    const c=D.model();c.dayFrames=c.dayFrames||{};const f=c.dayFrames[date]=Object.assign({},c.dayFrames[date]||{});
    D.recordRevision('Informar horário real de despertar');
    f.plannedWakeMin=Number(F.plannedWake(date));f.actualWakeMin=Math.max(0,Math.min(1439,minute));f.updatedAt=Clock.stamp();
    D.log('day-frame-wake',`Dia replanejado a partir de ${toTime(f.actualWakeMin)}`,{date,actualWakeMin:f.actualWakeMin,timezone:'America/Sao_Paulo'});
    saveState();return true;
  };
  window.MyPerformanceDayFrameClock={VERSION:8};
})();
