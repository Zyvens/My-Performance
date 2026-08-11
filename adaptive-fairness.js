"use strict";
/* Adaptive Fairness — hard invariant: one active Avançar session per parent objective per day. */
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
  function extendAfterDue(due,q,count=1){const out=[];let d=due,guard=0;while(out.length<count&&guard<366){d=addDays(d,1);guard++;if(allowed(q,d))out.push(d)}return out}

  function rebalance(now=today()){
    if(balancing||!Array.isArray(state.adaptive?.schedule))return{changed:false,emergencies:0,lateSessions:0};
    balancing=true;
    try{
      const schedule=state.adaptive.schedule;
      const active=schedule.filter(s=>!state.completed?.[s.questId]&&s.date>=now);
      const untouched=schedule.filter(s=>state.completed?.[s.questId]||s.date<now);
      if(!active.length)return{changed:false,emergencies:0,lateSessions:0};

      const groups=new Map();
      for(const s of active){if(!groups.has(s.parentId))groups.set(s.parentId,[]);groups.get(s.parentId).push(s)}
      for(const xs of groups.values())xs.sort((a,b)=>Number(a.index||0)-Number(b.index||0)||String(a.date).localeCompare(String(b.date)));

      const ordered=[...groups.entries()].map(([id,xs])=>({id,xs,q:parent(id)})).sort((a,b)=>(PRIORITY[pLevel(b.q)]||2)-(PRIORITY[pLevel(a.q)]||2)||String(a.q?.dueDate||'9999').localeCompare(String(b.q?.dueDate||'9999'))||a.id.localeCompare(b.id));
      const dailyLoad={},parentDays=new Set(),placed=[],maxDay=cap();
      const maxRounds=Math.max(...ordered.map(g=>g.xs.length));
      const original=JSON.stringify(active.map(s=>[s.questId,s.date]));
      let emergencies=0,lateSessions=0;

      for(let round=0;round<maxRounds;round++){
        for(const g of ordered){
          const s=g.xs[round];if(!s)continue;
          const q=g.q||{},minutes=Math.max(1,Number(s.minutes||0));
          const due=q.dueDate&&q.dueDate>=now?q.dueDate:(s.date>=now?s.date:now);
          const from=dateMax(now,q.startDate&&q.startDate>=now?q.startDate:now);
          let days=range(from,due,q);if(!days.length)days=[due];
          const ideal=days.length===1?0:Math.round(Math.min(round,Math.max(0,g.xs.length-1))*(days.length-1)/Math.max(1,g.xs.length-1));
          const candidates=days.map((d,i)=>({d,i,load:dailyLoad[d]||0})).sort((a,b)=>Math.abs(a.i-ideal)-Math.abs(b.i-ideal)||a.load-b.load||a.d.localeCompare(b.d));

          let chosen=candidates.find(c=>!parentDays.has(loadKey(g.id,c.d))&&c.load+minutes<=maxDay)?.d;
          let late=false;
          if(!chosen){
            /* Hard rule: NEVER reuse parentId+date. Extend beyond the deadline instead of stacking. */
            const future=extendAfterDue(due,q,Math.max(g.xs.length+7,14));
            chosen=future.find(d=>!parentDays.has(loadKey(g.id,d))&&(dailyLoad[d]||0)+minutes<=maxDay);
            if(!chosen){
              let cursor=future[future.length-1]||due,guard=0;
              while(!chosen&&guard<366){cursor=addDays(cursor,1);guard++;if(!allowed(q,cursor))continue;if(parentDays.has(loadKey(g.id,cursor)))continue;if((dailyLoad[cursor]||0)+minutes>maxDay)continue;chosen=cursor}
            }
            late=true;emergencies++;lateSessions++;
          }

          if(!chosen){
            /* Defensive fallback: keep the session out of today's stack and surface it as unscheduled risk. */
            chosen=extendAfterDue(due,q,1)[0]||addDays(due,1);late=true;emergencies++;lateSessions++;
          }

          const next=Object.assign({},s,{date:chosen,fairnessBalanced:true});
          if(late){next.fairnessEmergency=true;next.fairnessLate=true;next.originalDueDate=due}else{delete next.fairnessEmergency;delete next.fairnessLate;delete next.originalDueDate}
          dailyLoad[chosen]=(dailyLoad[chosen]||0)+minutes;
          parentDays.add(loadKey(g.id,chosen));
          placed.push(next)
        }
      }

      /* Final defensive dedupe: parentId+date can never occur twice among active sessions. */
      const seen=new Set();
      for(const s of placed){const k=loadKey(s.parentId,s.date);if(seen.has(k))throw new Error(`Adaptive fairness invariant violated: ${k}`);seen.add(k)}

      placed.sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.parentId).localeCompare(String(b.parentId))||Number(a.index||0)-Number(b.index||0));
      state.adaptive.schedule=untouched.concat(placed);
      state.adaptive.fairness={version:2,lastBalancedAt:new Date().toISOString(),maxAdaptiveMinutesPerDay:maxDay,emergencies,lateSessions,hardDedup:true};
      const changed=original!==JSON.stringify(placed.map(s=>[s.questId,s.date]));
      return{changed,emergencies,lateSessions,maxDay}
    }finally{balancing=false}
  }

  function recalculate(args){const result=BASE_RECALCULATE(args);const fairness=rebalance();return Object.assign({},result||{},{fairness})}
  window.MyPerformanceAdaptive.recalculate=recalculate;
  window.addEventListener('my-performance-plan-recalculated',()=>rebalance());
  window.addEventListener('my-performance-cloud-loaded',()=>setTimeout(()=>rebalance(),60));
  setTimeout(()=>rebalance(),0);
  window.MyPerformanceAdaptiveFairness={rebalance,cap};
})();
