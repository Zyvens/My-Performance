"use strict";
/* Adaptive Fairness — distribute deadline work across days instead of letting one critical parent or one near deadline consume the calendar. */
(function(){
  if(!window.MyPerformanceAdaptive)return;
  const BASE_RECALCULATE=window.MyPerformanceAdaptive.recalculate;
  const PRIORITY={critical:4,high:3,normal:2,low:1};
  let balancing=false;

  const dayOf=d=>dfrom(d).getDay();
  const pLevel=q=>window.MyPerformanceAdaptive?.priority?.(q)||q?.priorityLevel||(q?.questType==='main'?'high':'normal');
  function allowed(q,date){const wd=dayOf(date);if(q?.domain==='GSA'||q?.domain==='Carreira')return wd>=1&&wd<=5;if(q?.domain==='Estudos')return wd!==0;return true}
  function range(from,to,q){const out=[];for(let d=from;d<=to;d=addDays(d,1))if(allowed(q,d))out.push(d);return out}
  function parent(id){try{return questById(id)}catch{return null}}
  function cap(){const s=state.adaptive?.settings||{};return Math.max(60,Number(s.maxAdaptiveMinPerDay||240)-Number(s.dailyBufferMin||90))}
  function loadKey(parentId,date){return `${parentId}@${date}`}
  function dateMax(a,b){return a>b?a:b}

  function rebalance(now=today()){
    if(balancing||!Array.isArray(state.adaptive?.schedule))return{changed:false,emergencies:0};
    balancing=true;
    try{
      const schedule=state.adaptive.schedule,active=schedule.filter(s=>!state.completed?.[s.questId]&&s.date>=now),untouched=schedule.filter(s=>state.completed?.[s.questId]||s.date<now);
      if(active.length<2)return{changed:false,emergencies:0};
      const groups=new Map();
      for(const s of active){if(!groups.has(s.parentId))groups.set(s.parentId,[]);groups.get(s.parentId).push(s)}
      for(const xs of groups.values())xs.sort((a,b)=>Number(a.index||0)-Number(b.index||0)||String(a.date).localeCompare(String(b.date)));
      const ordered=[...groups.entries()].map(([id,xs])=>({id,xs,q:parent(id)})).sort((a,b)=>(PRIORITY[pLevel(b.q)]||2)-(PRIORITY[pLevel(a.q)]||2)||String(a.q?.dueDate||'9999').localeCompare(String(b.q?.dueDate||'9999'))||a.id.localeCompare(b.id));
      const dailyLoad={},parentDays=new Set(),placed=[],maxDay=cap(),maxRounds=Math.max(...ordered.map(g=>g.xs.length)),original=JSON.stringify(active.map(s=>[s.questId,s.date]));let emergencies=0;
      for(let round=0;round<maxRounds;round++){
        for(const g of ordered){
          const s=g.xs[round];if(!s)continue;const q=g.q||{},due=q.dueDate&&q.dueDate>=now?q.dueDate:s.date,from=dateMax(now,q.startDate&&q.startDate>=now?q.startDate:now),days=range(from,due,q);if(!days.length)days.push(due);
          const ideal=days.length===1?0:Math.round(Math.min(round,Math.max(0,g.xs.length-1))*(days.length-1)/Math.max(1,g.xs.length-1));
          const candidates=days.map((d,i)=>({d,i,load:dailyLoad[d]||0})).sort((a,b)=>Math.abs(a.i-ideal)-Math.abs(b.i-ideal)||a.load-b.load||a.d.localeCompare(b.d));
          let chosen=candidates.find(c=>!parentDays.has(loadKey(g.id,c.d))&&c.load+Number(s.minutes||0)<=maxDay)?.d;
          let emergency=false;
          if(!chosen){chosen=candidates.find(c=>!parentDays.has(loadKey(g.id,c.d)))?.d||days[days.length-1];emergency=true;emergencies++}
          const next=Object.assign({},s,{date:chosen,fairnessBalanced:true});if(emergency)next.fairnessEmergency=true;else delete next.fairnessEmergency;
          dailyLoad[chosen]=(dailyLoad[chosen]||0)+Number(s.minutes||0);parentDays.add(loadKey(g.id,chosen));placed.push(next)
        }
      }
      placed.sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.parentId).localeCompare(String(b.parentId))||Number(a.index||0)-Number(b.index||0));
      state.adaptive.schedule=untouched.concat(placed);
      state.adaptive.fairness={version:1,lastBalancedAt:new Date().toISOString(),maxAdaptiveMinutesPerDay:maxDay,emergencies};
      const changed=original!==JSON.stringify(placed.map(s=>[s.questId,s.date]));
      return{changed,emergencies,maxDay}
    }finally{balancing=false}
  }

  function recalculate(args){const result=BASE_RECALCULATE(args);rebalance();return result}
  window.MyPerformanceAdaptive.recalculate=recalculate;
  window.addEventListener('my-performance-plan-recalculated',()=>rebalance());
  window.addEventListener('my-performance-cloud-loaded',()=>setTimeout(()=>rebalance(),60));
  setTimeout(()=>rebalance(),0);
  window.MyPerformanceAdaptiveFairness={rebalance,cap};
})();
