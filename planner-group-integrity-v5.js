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
      if(w.sideQuestDedicated){w.strictSideQuestDedicated=true;w.sideQuestDedicated=false}
      for(const q of side){const m=meta(q),ids=Array.isArray(m?.windowIds)?m.windowIds:[];if(m?.windowMode==='exclusive'&&ids.includes(w.id)){const g=`${ROUTE_PREFIX}${q.id}`;if(!w.groups.includes(g))w.groups.push(g)}}
    }
    return windows
  };
  const originalPlanDay=E.planDay.bind(E),originalPlanWeek=E.planWeek.bind(E);
  function publicGroup(q,g){if(String(g||'').startsWith(ROUTE_PREFIX))return baseGroup(q);return g||baseGroup(q)}
  function blockedIds(){const deps=window.MyPerformancePlannerDependencies;return new Set((deps?.allBlocked?.()||[]).map(x=>x.q.id))}
  function withBlockedSuppressed(fn){const ids=blockedIds();if(!ids.size)return fn();state.overrides=state.overrides||{};const prior=new Map();for(const id of ids){prior.set(id,Object.prototype.hasOwnProperty.call(state.overrides,id)?clone(state.overrides[id]):null);state.overrides[id]=Object.assign({},state.overrides[id]||{},{disabled:true})}try{return fn()}finally{for(const [id,v] of prior){if(v===null)delete state.overrides[id];else state.overrides[id]=v}}}
  function normalize(p){if(!p)return p;for(const w of p.windows||[]){if(w.strictSideQuestDedicated)w.sideQuestDedicated=true;w.groups=(w.displayGroups||w.groups||[]).filter(g=>!String(g).startsWith(ROUTE_PREFIX))}for(const s of p.slots||[])s.group=publicGroup(s.q,s.group);for(const x of p.outsideCalendar||[])x.group=publicGroup(x.q,x.group);return p}
  E.planDay=function(date){return normalize(withBlockedSuppressed(()=>originalPlanDay(date)))};
  E.planWeek=function(date){return(withBlockedSuppressed(()=>originalPlanWeek(date))||[]).map(normalize)};
  E.missionNow=function(date=today(),now=new Date()){const p=E.planDay(date),m=now.getHours()*60+now.getMinutes(),live=(p.slots||[]).filter(x=>!x.eventTravel||x.operationalBuffer);return{current:live.find(x=>x.start<=m&&x.end>m)||null,next:live.find(x=>x.start>m)||null,plan:p}};
  if(window.MyPerformanceRoutine){window.MyPerformanceRoutine.planDay=E.planDay;window.MyPerformanceRoutine.missionNow=E.missionNow}
  window.MyPerformancePlannerGroupIntegrity={VERSION:6,routeGroup,publicGroup,normalize,withBlockedSuppressed,ROUTE_PREFIX};
})();
