"use strict";
/* Calendar V5 group/window integrity. Policy adapter only: it does not allocate slots. */
(function(){
  const B=window.MyPerformanceCalendarModel,D=window.MyPerformanceCalendarDomain,E=window.MyPerformancePlannerEngine;
  if(!B||!D||!E)return;
  const baseGroup=B.groupForQuest.bind(B),baseWindows=D.windowsForWeekday.bind(D),clone=x=>JSON.parse(JSON.stringify(x||{}));
  const ROUTE_PREFIX='__SQ_WINDOW__:';
  function meta(q){return q?.questType==='main'?null:D.sideMeta?.(q?.id)}
  function routeGroup(q){const m=meta(q),ids=Array.isArray(m?.windowIds)?m.windowIds.filter(Boolean):[];if(ids.length&&m.windowMode==='exclusive')return`${ROUTE_PREFIX}${q.id}`;return baseGroup(q)}
  B.groupForQuest=function(q){return routeGroup(q)};
  D.windowsForWeekday=function(wd){
    const windows=baseWindows(wd).map(clone),side=(typeof quests==='function'?quests():[]).filter(q=>q&&q.questType!=='main'&&D.isSideEnabled?.(q.id));
    for(const w of windows){
      w.displayGroups=Array.isArray(w.displayGroups)&&w.displayGroups.length?[...w.displayGroups]:[...(w.groups||[])];
      /* A dedicated Side Quest window must never become an emergency escape hatch for a Main Quest from another Group. */
      if(w.sideQuestDedicated){w.strictSideQuestDedicated=true;w.sideQuestDedicated=false}
      for(const q of side){const m=meta(q),ids=Array.isArray(m?.windowIds)?m.windowIds:[];if(m?.windowMode==='exclusive'&&ids.includes(w.id)){const g=`${ROUTE_PREFIX}${q.id}`;if(!w.groups.includes(g))w.groups.push(g)}}
    }
    return windows
  };
  const originalPlanDay=E.planDay.bind(E),originalPlanWeek=E.planWeek.bind(E);
  function publicGroup(q,g){if(String(g||'').startsWith(ROUTE_PREFIX))return baseGroup(q);if(g==='__BLOCKED_DEPENDENCY__'){const deps=window.MyPerformancePlannerDependencies;return deps?.originalGroup?.(q)||q?.domain||'Pessoal'}return g}
  function normalize(p){if(!p)return p;for(const w of p.windows||[]){if(w.strictSideQuestDedicated)w.sideQuestDedicated=true;w.groups=(w.displayGroups||w.groups||[]).filter(g=>!String(g).startsWith(ROUTE_PREFIX))}for(const s of p.slots||[])s.group=publicGroup(s.q,s.group);for(const x of p.outsideCalendar||[]){x.group=publicGroup(x.q,x.group);const deps=window.MyPerformancePlannerDependencies?.status?.(x.q);if(deps&&!deps.ready){x.dependencyBlocked=true;x.dependencyMissing=deps.missing||[];x.dependencyCycle=deps.cycle||null;x.reason=deps.cycle?'Aguardando correção de um ciclo de dependências':`Aguardando conclusão de: ${(deps.missing||[]).map(id=>{try{return questById(id)?.title||id}catch{return id}}).join(', ')}`}}return p}
  E.planDay=function(date){return normalize(originalPlanDay(date))};
  E.planWeek=function(date){return(originalPlanWeek(date)||[]).map(normalize)};
  E.missionNow=function(date=today(),now=new Date()){const p=E.planDay(date),m=now.getHours()*60+now.getMinutes(),live=(p.slots||[]).filter(x=>!x.eventTravel||x.operationalBuffer);return{current:live.find(x=>x.start<=m&&x.end>m)||null,next:live.find(x=>x.start>m)||null,plan:p}};
  if(window.MyPerformanceRoutine){window.MyPerformanceRoutine.planDay=E.planDay;window.MyPerformanceRoutine.missionNow=E.missionNow}
  window.MyPerformancePlannerGroupIntegrity={VERSION:5,routeGroup,publicGroup,normalize,ROUTE_PREFIX};
})();
