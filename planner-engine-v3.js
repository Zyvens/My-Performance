"use strict";
/* Planner Engine V3 — the single scheduling authority.
   It plans missions into user-defined calendar windows, preserves immovable recurring commitments,
   distributes deadline work with campaign fairness, and replans deterministically after skips/discards. */
(function(){
  const M=window.MyPerformanceCalendarModel;
  if(!M||typeof state==='undefined'||typeof quests!=='function')return;

  const VERSION=3;
  const DAY_MS=86400000;
  const clone=x=>JSON.parse(JSON.stringify(x||{}));
  const toMin=t=>{if(typeof t==='number')return t;if(!t||!/^[0-2]?\d:\d\d$/.test(String(t)))return null;const[h,m]=String(t).split(':').map(Number);return h*60+m};
  const toTime=n=>{n=((Math.round(Number(n)||0)%1440)+1440)%1440;return`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`};
  const dateObj=s=>dfrom(s);
  const dow=s=>dateObj(s).getDay();
  const add=(s,n)=>addDays(s,n);
  const days=(a,b)=>diffDays(a,b);
  const duration=x=>Math.max(0,Number(x?.end||0)-Number(x?.start||0));
  const overlap=(a,b)=>Number(a.start)<Number(b.end)&&Number(a.end)>Number(b.start);
  const itemKey=(q,occ)=>`${q.id}@${occ}`;
  const cal=()=>M.model();

  function dateRange(start,end){const out=[];for(let d=start;d<=end;d=add(d,1))out.push(d);return out}
  function monthStart(date){return date.slice(0,7)+'-01'}
  function monthEnd(date){const d=dateObj(monthStart(date));d.setMonth(d.getMonth()+1);d.setDate(0);return iso(d)}
  function safeDone(q,date){try{return done(q,date)}catch{return false}}
  function completedOccurrence(q,occDate){return safeDone(q,occDate)}
  function skipped(date,key){return !!cal().skippedDates?.[date]?.[key]}
  function discarded(date){return !!cal().discardedDays?.[date]}
  function groupOf(q){return M.groupForQuest(q)}
  function campaignOf(q){return M.campaignForQuest(q)}
  function priorityLevel(q){return q?.priorityLevel||(q?.questType==='main'?'high':'normal')}
  function missionEstimate(q){
    const configured=Number(state.questPlans?.[q.id]?.durationMin||0);if(configured>0)return configured;
    const direct=Number(q?.durationMin||0);if(direct>0)return direct;
    if(q?.timeStart&&q?.timeEnd){const a=toMin(q.timeStart),b=toMin(q.timeEnd);if(a!==null&&b!==null&&b>a)return b-a}
    if(q?.questType==='main')return q?.difficulty>=4?90:60;
    return q?.domain==='GSA'||q?.domain==='Estudos'?45:30
  }
  function recurrenceDates(q,start,end){
    const out=[];
    for(const date of dateRange(start,end)){
      if(q.startDate&&date<q.startDate)continue;
      if(q.dueDate&&date>q.dueDate&&q.cadence!=='once'&&q.cadence!=='monthly')continue;
      const w=dow(date),allowed=(q.weekdays||[]);if(allowed.length&&!allowed.includes(w))continue;
      out.push(date)
    }
    return out
  }

  function workItems(start,end){
    const items=[];
    for(const q0 of quests()){
      const q=clone(q0);if(!q||q.disabled||q.specialCommitment||q.calendarBuffer||q.campaignContainer)continue;
      if(q.id?.startsWith('routine-gsa-')||q.id?.startsWith('routine-muay'))continue;
      const group=groupOf(q),campaign=campaignOf(q),estimate=missionEstimate(q),cadence=q.cadence||'once';
      if(cadence==='daily'){
        for(const date of recurrenceDates(q,start,end)){
          const occ=date;if(completedOccurrence(q,occ))continue;
          const key=itemKey(q,occ);items.push({key,q,group,campaign,occurrence:occ,earliest:date,deadline:date,exactDate:date,effort:estimate,remaining:estimate,carryAfterDeadline:false,recurring:true})
        }
        continue
      }
      if(cadence==='weekly'){
        const seen=new Set();for(const date of dateRange(start,end)){
          const ws=weekStart(date);if(seen.has(ws))continue;seen.add(ws);
          const we=add(ws,6),earliest=q.startDate&&q.startDate>ws?q.startDate:ws,deadline=q.dueDate&&q.dueDate<we?q.dueDate:we;if(deadline<start||earliest>end)continue;
          const occ=ws;if(completedOccurrence(q,occ))continue;
          const allowed=(q.weekdays||[]).length?q.weekdays:[1,2,3,4,5,6,0];items.push({key:itemKey(q,occ),q,group,campaign,occurrence:occ,earliest,deadline,allowedWeekdays:allowed,effort:estimate,remaining:estimate,carryAfterDeadline:false,recurring:true})
        }
        continue
      }
      if(cadence==='monthly'){
        const months=new Set(dateRange(start,end).map(d=>d.slice(0,7)));
        for(const ym of months){
          const ms=`${ym}-01`,me=monthEnd(ms),target=q.dueDate&&q.dueDate.startsWith(ym)?q.dueDate:(q.monthDay?`${ym}-${String(q.monthDay).padStart(2,'0')}`:me),earliest=q.startDate&&q.startDate>ms?q.startDate:ms,deadline=target<me?target:me;if(deadline<start||earliest>end)continue;
          const occ=ms;if(completedOccurrence(q,occ))continue;const ledger=Number(cal().workLedger?.[itemKey(q,occ)]||0),remaining=Math.max(0,estimate-ledger);
          items.push({key:itemKey(q,occ),q,group,campaign,occurrence:occ,earliest,deadline,allowedWeekdays:(q.weekdays||[]),effort:estimate,remaining:remaining||15,finalization:remaining===0,carryAfterDeadline:q.questType==='main',recurring:true})
        }
        continue
      }
      const earliest=q.startDate||start,deadline=q.dueDate||add(earliest,Math.min(30,cal().engine.horizonDays||90));if(deadline<start&&q.questType!=='main')continue;
      if(completedOccurrence(q,deadline))continue;
      const key=itemKey(q,q.id),ledger=Number(cal().workLedger?.[key]||0),remaining=Math.max(0,estimate-ledger);
      items.push({key,q,group,campaign,occurrence:q.id,earliest,deadline,allowedWeekdays:(q.weekdays||[]),effort:estimate,remaining:remaining||15,finalization:remaining===0,carryAfterDeadline:true,recurring:false})
    }
    return items
  }

  function windowsFor(date,includeEmergency=false){return cal().windows.filter(w=>Number(w.weekday)===dow(date)&&(!w.emergencyOnly||includeEmergency)).map(clone).sort((a,b)=>a.start-b.start)}
  function fixedSlots(date){
    const out=[];
    for(const q0 of M.fixedMissions()){
      const q=clone(q0);let active=false;try{active=scheduled(q,date)}catch{}if(!active)continue;
      const start=toMin(q.timeStart),end=toMin(q.timeEnd);if(start===null||end===null||end<=start)continue;
      const before=Math.max(0,Number(q.bufferBeforeMin||0)),after=Math.max(0,Number(q.bufferAfterMin||0));
      if(before)out.push({id:`buffer-before:${q.id}:${date}`,q:{id:`buffer-before-${q.id}`,title:q.id==='gsa-bni-weekly'?'Preparação + deslocamento → BNI':`Deslocamento / preparação → ${q.title}`,domain:'Pessoal',category:'Deslocamento',questType:'side',calendarBuffer:true,movable:false,xp:0},originDate:date,start:start-before,end:start,fixed:true,buffer:true,reason:'buffer logístico do compromisso fixo'});
      out.push({id:`fixed:${q.id}:${date}`,q,originDate:date,start,end,fixed:true,immovable:true,reason:'compromisso semanal fixo',completed:safeDone(q,date)});
      if(after)out.push({id:`buffer-after:${q.id}:${date}`,q:{id:`buffer-after-${q.id}`,title:q.id==='personal-zion-brave-weekly'?'Deslocamento para casa':`Retorno / margem · ${q.title}`,domain:'Pessoal',category:'Deslocamento',questType:'side',calendarBuffer:true,movable:false,xp:0},originDate:date,start:end,end:end+after,fixed:true,buffer:true,reason:'buffer logístico do compromisso fixo'})
    }
    return out.sort((a,b)=>a.start-b.start)
  }
  function freeSegments(start,end,slots,min=10){const xs=slots.filter(x=>overlap(x,{start,end})).slice().sort((a,b)=>a.start-b.start),out=[];let cur=start;for(const x of xs){if(x.start>cur&&x.start-cur>=min)out.push([cur,Math.min(x.start,end)]);cur=Math.max(cur,x.end);if(cur>=end)break}if(end-cur>=min)out.push([cur,end]);return out.filter(x=>x[1]>x[0])}
  function inWindowGroup(date,start,end,group){return windowsFor(date,true).some(w=>w.start<=start&&w.end>=end&&w.groups.includes(group))}
  function nearestFree(date,prefStart,dur,slots,group){
    const wins=windowsFor(date,false).filter(w=>w.groups.includes(group));const candidates=[];
    for(const w of wins)for(const seg of freeSegments(w.start,w.end,slots,dur)){const st=Math.max(seg[0],Math.min(prefStart,seg[1]-dur));if(st+dur<=seg[1])candidates.push(st)}
    if(!candidates.length)return null;return candidates.sort((a,b)=>Math.abs(a-prefStart)-Math.abs(b-prefStart)||a-b)[0]
  }

  function preferredSideSlots(date,base){
    const slots=base.slice();if(discarded(date))return slots;
    const prefQs=quests().filter(q=>M.prefFor(q,date)&&!q.specialCommitment&&!q.disabled);
    const order={'personal-wake':1,'routine-water-am':2,'routine-hygiene-am':3,'personal-breakfast':4,'personal-gym':5,'personal-lunch':6,'routine-shower-post-gym':7,'personal-evening-activity':8,'routine-dinner':9,'routine-hygiene-night':10,'personal-sleep':11};
    prefQs.sort((a,b)=>(order[a.id]||50)-(order[b.id]||50));
    for(const q0 of prefQs){
      const q=clone(q0),pref=M.prefFor(q,date);if(!pref)continue;let active=false;try{active=scheduled(q,date)}catch{}if(!active)continue;
      const key=itemKey(q,date);if(skipped(date,key))continue;
      let start=Number(pref[0]),end=Number(pref[1]),dur=end-start;if(dur<=0)continue;
      if(q.id==='personal-gym'&&pref[2])q.title=`Academia — ${pref[2]}`;
      if(slots.some(x=>overlap(x,{start,end}))){const st=nearestFree(date,start,dur,slots,'Pessoal');if(st===null)continue;start=st;end=st+dur}
      slots.push({id:`preferred:${q.id}:${date}`,q,originDate:date,start,end,movable:true,sideQuest:true,reason:'horário preferencial da missão',completed:safeDone(q,date),workKey:key})
    }
    // Shower is always a Tuesday/Wednesday mission, but it is movable because the latest weekly template has no hard 30 min gap after training.
    const shower=quests().find(q=>q.id==='routine-shower-post-gym');
    if(shower&&[2,3].includes(dow(date))&&!slots.some(x=>x.q?.id==='routine-shower-post-gym')){
      let active=false;try{active=scheduled(shower,date)}catch{};const key=itemKey(shower,date);if(active&&!skipped(date,key)){
        const gym=slots.find(x=>x.q?.id==='personal-gym'),st=gym?nearestFree(date,gym.end,30,slots,'Pessoal'):null;if(st!==null)slots.push({id:`preferred:${shower.id}:${date}`,q:clone(shower),originDate:date,start:st,end:st+30,movable:true,sideQuest:true,reason:'banho reposicionado na primeira janela pessoal disponível',completed:safeDone(shower,date),workKey:key})
      }
    }
    return slots.sort((a,b)=>a.start-b.start||a.end-b.end)
  }

  function rawCapacity(item,from,to){
    let total=0;for(const date of dateRange(from,to)){
      if(date<item.earliest)continue;if(item.allowedWeekdays?.length&&!item.allowedWeekdays.includes(dow(date)))continue;
      for(const w of windowsFor(date,false))if(w.groups.includes(item.group))total+=w.end-w.start
    }return total
  }
  function emergency(item,date){if(!item.deadline)return false;if(date>item.deadline&&item.carryAfterDeadline)return true;const end=item.deadline<date?date:item.deadline,cap=rawCapacity(item,date,end);return cap<=0||item.remaining>cap*.8}
  function eligible(item,date,window,alreadyToday){
    if(item.remaining<=0||alreadyToday.has(item.key)||skipped(date,item.key))return false;
    if(date<item.earliest)return false;
    if(item.exactDate&&date!==item.exactDate)return false;
    if(item.allowedWeekdays?.length&&!item.allowedWeekdays.includes(dow(date)))return false;
    if(date>item.deadline&&!item.carryAfterDeadline)return false;
    if(!window.groups.includes(item.group)&&!emergency(item,date))return false;
    if(window.emergencyOnly&&!emergency(item,date))return false;
    return true
  }
  function score(item,date,campaignCount){
    const lv={critical:520,high:360,normal:210,low:80}[priorityLevel(item.q)]||210;
    const main=item.q.questType==='main'?300:0,daysLeft=item.deadline?days(date,item.deadline):30;
    const urgency=daysLeft<0?1800:Math.round(900/Math.max(1,daysLeft+1));
    const cap=item.deadline&&item.deadline>=date?rawCapacity(item,date,item.deadline):0,pressure=cap?Math.min(700,Math.round(item.remaining/cap*700)):(item.deadline?700:0);
    const campaignPriority=item.campaign?Math.max(0,500-Number(item.campaign.priority||5)*70):80;
    const fairness=(campaignCount[item.campaign?.id||`group:${item.group}`]||0)*220;
    const exact=item.exactDate?350:0;
    return lv+main+urgency+pressure+campaignPriority+exact-fairness
  }
  function choose(items,date,window,alreadyToday,campaignCount){return items.filter(i=>eligible(i,date,window,alreadyToday)).sort((a,b)=>score(b,date,campaignCount)-score(a,date,campaignCount)||String(a.deadline||'9999').localeCompare(String(b.deadline||'9999'))||a.key.localeCompare(b.key))[0]||null}

  function allocate(start,end,targetDate){
    const items=workItems(start,end),plans={},maxSession=Math.max(30,Number(cal().engine.maxSessionMin||120)),minSession=Math.max(15,Number(cal().engine.minSessionMin||30));
    for(const date of dateRange(start,end)){
      const base=preferredSideSlots(date,fixedSlots(date)),slots=base.slice(),alreadyToday=new Set(),campaignCount={};
      const wins=windowsFor(date,false);
      if(!discarded(date)){
        for(const window of wins){
          let guard=0;
          while(guard++<50){
            const segs=freeSegments(window.start,window.end,slots,15);if(!segs.length)break;
            const seg=segs.sort((a,b)=>(b[1]-b[0])-(a[1]-a[0])||a[0]-b[0])[0],available=seg[1]-seg[0];if(available<15)break;
            const item=choose(items,date,window,alreadyToday,campaignCount);if(!item)break;
            let session=Math.min(maxSession,item.remaining,available);if(session<minSession&&item.remaining>session&&available>=minSession)session=minSession;session=Math.max(15,Math.min(session,available));
            const q=clone(item.q),slot={id:`mission:${item.key}:${date}`,q,originDate:item.occurrence,start:seg[0],end:seg[0]+session,movable:true,mainQuest:q.questType==='main',campaignId:item.campaign?.id||'',campaignName:item.campaign?.name||'',group:item.group,workKey:item.key,sessionOnly:item.effort>session||item.remaining>session,finalization:item.finalization,deadline:item.deadline,reason:item.campaign?`Campanha ${item.campaign.name} · prioridade ${item.campaign.priority}`:'missão distribuída pelo prazo e prioridade'};
            slots.push(slot);item.remaining=Math.max(0,item.remaining-session);alreadyToday.add(item.key);const fairKey=item.campaign?.id||`group:${item.group}`;campaignCount[fairKey]=(campaignCount[fairKey]||0)+1
          }
        }
      }
      plans[date]={date,windows:wins,slots:slots.sort((a,b)=>a.start-b.start||a.end-b.end),discarded:discarded(date),risks:[],preempted:[]}
    }

    // Second pass: if a Main Quest cannot fit before its immutable deadline, it may preempt movable Side Quests.
    for(const item of items.filter(i=>i.remaining>0&&i.q.questType==='main'&&i.deadline&&i.deadline>=start)){
      if(!emergency(item,start))continue;
      const last=item.deadline<end?item.deadline:end;
      for(const date of dateRange(item.earliest>start?item.earliest:start,last)){
        if(item.remaining<=0)break;if(skipped(date,item.key)||discarded(date))continue;
        const p=plans[date];if(!p||p.slots.some(x=>x.workKey===item.key))continue;
        const victims=p.slots.filter(x=>x.sideQuest&&x.movable&&!x.fixed).sort((a,b)=>duration(b)-duration(a));
        for(const victim of victims){
          if(item.remaining<=0)break;const available=duration(victim);if(available<15)continue;
          p.slots=p.slots.filter(x=>x!==victim);p.preempted.push(Object.assign({},victim,{reason:`cedeu espaço à Main Quest ${item.q.title} por risco real de prazo`}));
          const session=Math.min(maxSession,item.remaining,available),q=clone(item.q);p.slots.push({id:`emergency:${item.key}:${date}`,q,originDate:item.occurrence,start:victim.start,end:victim.start+session,movable:true,mainQuest:true,campaignId:item.campaign?.id||'',campaignName:item.campaign?.name||'',group:item.group,workKey:item.key,sessionOnly:item.effort>session||item.remaining>session,deadline:item.deadline,emergency:true,reason:'Main Quest ocupou Side Quest porque a capacidade futura era insuficiente'});item.remaining-=session;break
        }
        p.slots.sort((a,b)=>a.start-b.start||a.end-b.end)
      }
      if(item.remaining>0){const d=item.deadline<targetDate?targetDate:item.deadline,plan=plans[d]||plans[targetDate];plan?.risks.push({missionId:item.q.id,title:item.q.title,remaining:item.remaining,deadline:item.deadline,campaign:item.campaign?.name||'',reason:'capacidade insuficiente antes do deadline; prazo não foi alterado'})}
    }
    return{start,end,plans,items}
  }

  function horizonFor(target=today()){
    const start=target<today()?target:today(),daysAhead=Math.max(14,Number(cal().engine.horizonDays||90)),end=add(start,daysAhead);
    return allocate(start,end,target)
  }
  function planDay(date=today()){
    const h=horizonFor(date),p=h.plans[date]||{date,windows:windowsFor(date,false),slots:fixedSlots(date),discarded:discarded(date),risks:[],preempted:[]};
    p.version=VERSION;p.engine='calendar-v3';p.capacity={groups:p.windows.reduce((o,w)=>{for(const g of w.groups)o[g]=(o[g]||0)+(w.end-w.start);return o},{}),used:p.slots.reduce((n,x)=>n+duration(x),0)};
    return p
  }
  function missionNow(date=today(),now=new Date()){
    const p=planDay(date),m=now.getHours()*60+now.getMinutes(),current=p.slots.find(x=>m>=x.start&&m<x.end),next=p.slots.find(x=>x.start>m);return{plan:p,current:current||null,next:next||null,minute:m}
  }
  function recordSession(slot,date=today()){
    if(!slot?.workKey)return false;const c=cal();if(c.sessionDone[slot.id])return false;c.sessionDone[slot.id]=new Date().toISOString();c.workLedger[slot.workKey]=Number(c.workLedger[slot.workKey]||0)+duration(slot);saveState();return true
  }
  function skipSlot(slot,date=today(),reason='não realizada no dia'){
    if(!slot||slot.fixed||slot.buffer)return false;const c=cal(),key=slot.workKey||itemKey(slot.q,date);c.skippedDates[date]=c.skippedDates[date]||{};c.skippedDates[date][key]={at:new Date().toISOString(),reason,missionId:slot.q?.id||''};saveState();return true
  }
  function discardDay(date=today()){
    const c=cal();if(c.discardedDays[date])return false;const p=planDay(date),completedIds=p.slots.filter(x=>x.q&&!x.buffer&&safeDone(x.q,x.originDate||date)).map(x=>x.q.id),pending=p.slots.filter(x=>!x.fixed&&!x.buffer&&!safeDone(x.q,x.originDate||date));
    c.discardedDays[date]={at:new Date().toISOString(),completedIds:[...new Set(completedIds)],pendingIds:[...new Set(pending.map(x=>x.q?.id).filter(Boolean))]};c.skippedDates[date]=c.skippedDates[date]||{};for(const x of pending){const key=x.workKey||itemKey(x.q,date);c.skippedDates[date][key]={at:new Date().toISOString(),reason:'dia descartado',missionId:x.q?.id||''}}
    saveState();window.dispatchEvent(new CustomEvent('my-performance-day-discarded',{detail:{date,pending:c.discardedDays[date].pendingIds}}));return true
  }
  function restoreDay(date=today()){const c=cal();delete c.discardedDays[date];delete c.skippedDates[date];saveState();return true}
  function emptyWindows(plan){
    const out=[];for(const w of plan.windows||[]){for(const [s,e] of freeSegments(w.start,w.end,plan.slots,15))out.push({windowId:w.id,label:w.label,groups:w.groups,start:s,end:e,minutes:e-s})}return out
  }
  function diagnostics(date=today()){
    const p=planDay(date),h=horizonFor(date),atRisk=[];for(const d of Object.keys(h.plans))for(const r of h.plans[d].risks||[])atRisk.push(r);
    return{date,plan:p,empty:emptyWindows(p),atRisk,discarded:p.discarded,campaigns:cal().campaigns.map(c=>({id:c.id,name:c.name,priority:c.priority,groupId:c.groupId,missionCount:(c.missionIds||[]).length}))}
  }

  window.MyPerformanceRoutine={planDay,missionNow,toMin,toTime,durationFor:missionEstimate};
  window.MyPerformancePlannerEngine={VERSION,planDay,missionNow,horizonFor,diagnostics,recordSession,skipSlot,discardDay,restoreDay,emptyWindows,workItems,emergency};
})();