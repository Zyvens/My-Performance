"use strict";
/* My Performance Planner Engine V4
   Calendar-first, bounded-memory, cached planning authority.
   The same projection is reused by Dashboard, Today, Week and Notifications. */
(function(){
  const M=window.MyPerformanceCalendarModel;
  if(!M||typeof state==='undefined'||typeof quests!=='function')return;
  const VERSION=4, RANGE_CACHE_LIMIT=2;
  let generation=1;
  const rangeCache=new Map(),capacityCache=new Map();
  const clone=x=>JSON.parse(JSON.stringify(x||{}));
  const toMin=t=>{if(typeof t==='number')return t;const m=String(t||'').match(/^(\d{1,2}):(\d{2})$/);if(!m)return null;return Number(m[1])*60+Number(m[2])};
  const toTime=n=>{n=((Math.round(Number(n)||0)%1440)+1440)%1440;return`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`};
  const duration=x=>Math.max(0,Number(x?.end||0)-Number(x?.start||0));
  const dow=s=>dfrom(s).getDay();
  const add=(s,n)=>addDays(s,n);
  const days=(a,b)=>diffDays(a,b);
  const overlap=(a,b)=>Number(a.start)<Number(b.end)&&Number(a.end)>Number(b.start);
  const itemKey=(q,occ)=>`${q.id}@${occ}`;
  const cal=()=>M.model();
  const safeDone=(q,d)=>{try{return done(q,d)}catch{return false}};
  const skipped=(date,key)=>!!cal().skippedDates?.[date]?.[key];
  const discarded=date=>!!cal().discardedDays?.[date];

  function invalidate(){generation++;rangeCache.clear();capacityCache.clear()}
  window.addEventListener?.('my-performance-state-saved',invalidate);
  window.addEventListener?.('my-performance-cloud-loaded',invalidate);

  function eachDate(start,end,fn){for(let d=start,guard=0;d<=end&&guard++<370;d=add(d,1))fn(d)}
  function windowsFor(date,includeEmergency=false){return(cal().windows||[]).filter(w=>Number(w.weekday)===dow(date)&&(!w.emergencyOnly||includeEmergency)).slice().sort((a,b)=>a.start-b.start)}
  function groupOf(q){return M.groupForQuest(q)}
  function campaignOf(q){return M.campaignForQuest(q)}
  function priorityLevel(q){return q?.priorityLevel||(q?.questType==='main'?'high':'normal')}
  function missionEstimate(q){const p=Number(state.questPlans?.[q.id]?.durationMin||0);if(p>0)return p;const d=Number(q?.durationMin||0);if(d>0)return d;const a=toMin(q?.timeStart),b=toMin(q?.timeEnd);if(a!==null&&b!==null&&b>a)return b-a;return q?.questType==='main'?(q?.difficulty>=4?90:60):(q?.domain==='GSA'||q?.domain==='Estudos'?45:30)}

  function capacityBetween(group,from,to){
    if(!group||!from||!to||to<from)return 0;
    const key=`${generation}|${group}|${from}|${to}`;if(capacityCache.has(key))return capacityCache.get(key);
    let total=0;eachDate(from,to,date=>{for(const w of windowsFor(date,false))if((w.groups||[]).includes(group))total+=Number(w.end)-Number(w.start)});
    capacityCache.set(key,total);if(capacityCache.size>500)capacityCache.clear();return total
  }
  function monthEnd(date){const d=dfrom(date.slice(0,7)+'-01');d.setMonth(d.getMonth()+1);d.setDate(0);return iso(d)}
  function monthKeys(start,end){const out=[];let cur=start.slice(0,7)+'-01',guard=0;while(cur<=end&&guard++<24){out.push(cur.slice(0,7));const d=dfrom(cur);d.setMonth(d.getMonth()+1);cur=iso(d)}return out}

  function workItems(start,end){
    const items=[];
    for(const src of quests()){
      const q=clone(src);if(!q||q.disabled||q.specialCommitment||q.calendarBuffer||q.campaignContainer)continue;
      if(/^routine-(gsa|muay)/.test(q.id||''))continue;
      const group=groupOf(q),campaign=campaignOf(q),estimate=missionEstimate(q),cadence=q.cadence||'once';
      if(cadence==='daily'){
        eachDate(start,end,date=>{if(q.startDate&&date<q.startDate)return;if(q.dueDate&&date>q.dueDate)return;const allowed=q.weekdays||[];if(allowed.length&&!allowed.includes(dow(date)))return;if(safeDone(q,date))return;items.push({key:itemKey(q,date),q,group,campaign,occurrence:date,earliest:date,deadline:date,exactDate:date,remaining:estimate,effort:estimate,recurring:true})});
      }else if(cadence==='weekly'){
        const seen=new Set();eachDate(start,end,date=>{const ws=weekStart(date);if(seen.has(ws))return;seen.add(ws);const we=add(ws,6),earliest=q.startDate&&q.startDate>ws?q.startDate:ws,deadline=q.dueDate&&q.dueDate<we?q.dueDate:we;if(deadline<start||earliest>end||safeDone(q,ws))return;items.push({key:itemKey(q,ws),q,group,campaign,occurrence:ws,earliest,deadline,allowedWeekdays:(q.weekdays||[]),remaining:estimate,effort:estimate,recurring:true})});
      }else if(cadence==='monthly'){
        for(const ym of monthKeys(start,end)){const ms=`${ym}-01`,me=monthEnd(ms),target=q.dueDate&&q.dueDate.startsWith(ym)?q.dueDate:(q.monthDay?`${ym}-${String(q.monthDay).padStart(2,'0')}`:me),earliest=q.startDate&&q.startDate>ms?q.startDate:ms,deadline=target<me?target:me;if(deadline<start||earliest>end||safeDone(q,ms))continue;const key=itemKey(q,ms),ledger=Number(cal().workLedger?.[key]||0);items.push({key,q,group,campaign,occurrence:ms,earliest,deadline,allowedWeekdays:(q.weekdays||[]),remaining:Math.max(15,estimate-ledger),effort:estimate,recurring:true,carryAfterDeadline:q.questType==='main'})}
      }else{
        const earliest=q.startDate||start,deadline=q.dueDate||add(earliest,Math.min(30,Number(cal().engine?.horizonDays||90)));if(deadline<start&&q.questType!=='main')continue;if(safeDone(q,deadline))continue;const key=itemKey(q,q.id),ledger=Number(cal().workLedger?.[key]||0);items.push({key,q,group,campaign,occurrence:q.id,earliest,deadline,allowedWeekdays:(q.weekdays||[]),remaining:Math.max(15,estimate-ledger),effort:estimate,recurring:false,carryAfterDeadline:true})
      }
    }
    return items
  }

  function fixedSlots(date){
    const out=[];for(const src of M.fixedMissions()){
      const q=clone(src);let active=false;try{active=scheduled(q,date)}catch{}if(!active)continue;const start=toMin(q.timeStart),end=toMin(q.timeEnd);if(start===null||end===null||end<=start)continue;const before=Math.max(0,Number(q.bufferBeforeMin||0)),after=Math.max(0,Number(q.bufferAfterMin||0));
      if(before)out.push({id:`buffer-before:${q.id}:${date}`,q:{id:`buffer-before-${q.id}`,title:q.id==='gsa-bni-weekly'?'Preparação + deslocamento → BNI':`Deslocamento / preparação → ${q.title}`,domain:'Pessoal',questType:'side',calendarBuffer:true,xp:0},originDate:date,start:start-before,end:start,fixed:true,buffer:true,reason:'buffer logístico'});
      out.push({id:`fixed:${q.id}:${date}`,q,originDate:date,start,end,fixed:true,immovable:true,group:groupOf(q),reason:'compromisso semanal fixo',completed:safeDone(q,date)});
      if(after)out.push({id:`buffer-after:${q.id}:${date}`,q:{id:`buffer-after-${q.id}`,title:q.id==='personal-zion-brave-weekly'?'Deslocamento para casa':`Retorno / margem · ${q.title}`,domain:'Pessoal',questType:'side',calendarBuffer:true,xp:0},originDate:date,start:end,end:end+after,fixed:true,buffer:true,reason:'buffer logístico'})
    }return out.sort((a,b)=>a.start-b.start)
  }
  function freeSegments(start,end,slots,min=10){const xs=slots.filter(x=>overlap(x,{start,end})).slice().sort((a,b)=>a.start-b.start),out=[];let cur=start;for(const x of xs){if(x.start>cur&&x.start-cur>=min)out.push([cur,Math.min(x.start,end)]);cur=Math.max(cur,x.end);if(cur>=end)break}if(end-cur>=min)out.push([cur,end]);return out}
  function nearestFree(date,pref,dur,slots,group='Pessoal'){let best=null,bestDist=Infinity;for(const w of windowsFor(date,false)){if(!(w.groups||[]).includes(group))continue;for(const [s,e] of freeSegments(w.start,w.end,slots,dur)){const st=Math.max(s,Math.min(pref,e-dur)),dist=Math.abs(st-pref);if(st+dur<=e&&(dist<bestDist||(dist===bestDist&&st<best))){best=st;bestDist=dist}}}return best}
  function preferredSideSlots(date,base){
    const slots=base.slice();if(discarded(date))return slots;
    const order={'personal-wake':1,'routine-water-am':2,'routine-hygiene-am':3,'personal-breakfast':4,'personal-gym':5,'personal-lunch':6,'routine-shower-post-gym':7,'personal-evening-activity':8,'routine-dinner':9,'routine-hygiene-night':10,'personal-sleep':11};
    const list=quests().filter(q=>M.prefFor(q,date)&&!q.specialCommitment&&!q.disabled).sort((a,b)=>(order[a.id]||50)-(order[b.id]||50));
    for(const src of list){const q=clone(src),pref=M.prefFor(q,date);let active=false;try{active=scheduled(q,date)}catch{}if(!active)continue;const key=itemKey(q,date);if(skipped(date,key))continue;let start=Number(pref[0]),end=Number(pref[1]),dur=end-start;if(dur<=0)continue;if(q.id==='personal-gym'&&pref[2])q.title=`Academia — ${pref[2]}`;if(slots.some(x=>overlap(x,{start,end}))){const st=nearestFree(date,start,dur,slots,'Pessoal');if(st===null)continue;start=st;end=st+dur}slots.push({id:`preferred:${q.id}:${date}`,q,originDate:date,start,end,movable:true,sideQuest:true,group:'Pessoal',reason:'horário preferencial',completed:safeDone(q,date),workKey:key})}
    return slots.sort((a,b)=>a.start-b.start||a.end-b.end)
  }

  function urgent(item,date){if(!item.deadline)return false;const left=days(date,item.deadline),cap=capacityBetween(item.group,date,item.deadline);return left<0||cap<=0||item.remaining>cap*.75||left<=1}
  function eligible(item,date,window,already){if(item.remaining<=0||already.has(item.key)||skipped(date,item.key)||date<item.earliest)return false;if(item.exactDate&&date!==item.exactDate)return false;if(item.allowedWeekdays?.length&&!item.allowedWeekdays.includes(dow(date)))return false;if(date>item.deadline&&!item.carryAfterDeadline)return false;if(!(window.groups||[]).includes(item.group)&&!urgent(item,date))return false;if(window.emergencyOnly&&!urgent(item,date))return false;return true}
  function score(item,date,campaignUse){const lv={critical:520,high:360,normal:210,low:80}[priorityLevel(item.q)]||210,main=item.q.questType==='main'?280:0,left=item.deadline?days(date,item.deadline):30,urg=left<0?1400:Math.round(800/Math.max(1,left+1)),cap=item.deadline&&item.deadline>=date?capacityBetween(item.group,date,item.deadline):0,pressure=cap?Math.min(650,Math.round(item.remaining/cap*650)):(item.deadline?650:0),cp=item.campaign?Math.max(0,450-Number(item.campaign.priority||5)*60):50,fair=(campaignUse[item.campaign?.id||`group:${item.group}`]||0)*180;return lv+main+urg+pressure+cp-fair}
  function choose(items,date,window,already,campaignUse){let best=null,bestScore=-Infinity;for(const item of items){if(!eligible(item,date,window,already))continue;const s=score(item,date,campaignUse);if(s>bestScore||(s===bestScore&&String(item.deadline||'9999')<String(best?.deadline||'9999'))){best=item;bestScore=s}}return best}

  function allocate(start,end){
    const items=workItems(start,end),plans={},maxSession=Math.max(30,Number(cal().engine?.maxSessionMin||120)),minSession=Math.max(15,Number(cal().engine?.minSessionMin||30));
    eachDate(start,end,date=>{
      const windows=windowsFor(date,false),slots=preferredSideSlots(date,fixedSlots(date)),already=new Set(),campaignUse={},preempted=[];
      if(!discarded(date))for(const window of windows){let guard=0;while(guard++<12){const segs=freeSegments(window.start,window.end,slots,15);if(!segs.length)break;let seg=segs[0];for(const s of segs)if(s[1]-s[0]>seg[1]-seg[0])seg=s;const available=seg[1]-seg[0];if(available<15)break;const item=choose(items,date,window,already,campaignUse);if(!item)break;let len=Math.min(maxSession,item.remaining,available);if(len<minSession&&item.remaining>available)break;if(len<15)break;const q=clone(item.q),camp=item.campaign;slots.push({id:`work:${item.key}:${date}:${seg[0]}`,q,originDate:item.occurrence,start:seg[0],end:seg[0]+len,movable:true,mainQuest:q.questType==='main',sessionOnly:q.questType==='main',group:item.group,campaignId:camp?.id||'',campaignName:camp?.name||'',deadline:item.deadline,workKey:item.key,reason:q.questType==='main'?'sessão estratégica da Main Quest':'missão distribuída pelo calendário',emergency:urgent(item,date)});item.remaining=Math.max(0,item.remaining-len);already.add(item.key);const ck=camp?.id||`group:${item.group}`;campaignUse[ck]=(campaignUse[ck]||0)+1;slots.sort((a,b)=>a.start-b.start||a.end-b.end)}};
      plans[date]={date,windows:clone(windows),slots:slots.sort((a,b)=>a.start-b.start||a.end-b.end),discarded:discarded(date),preempted,risks:[]}
    });
    const risks=[];for(const item of items)if(item.remaining>0&&item.deadline<=end){const capacity=item.deadline>=start?capacityBetween(item.group,Math.max?start:start,item.deadline):0;if(item.deadline<start||capacity<item.remaining||item.deadline<=today())risks.push({missionId:item.q.id,title:item.q.title,deadline:item.deadline,remaining:item.remaining,group:item.group,campaignName:item.campaign?.name||''})}
    for(const p of Object.values(plans))p.risks=risks.filter(r=>r.deadline<=p.date||days(p.date,r.deadline)<=7);
    return{start,end,plans,risks,generatedAt:Date.now(),generation}
  }

  function cacheRange(start,end){const key=`${generation}|${start}|${end}|${Number(cal().engine?.horizonDays||90)}|${Number(cal().engine?.minSessionMin||30)}|${Number(cal().engine?.maxSessionMin||120)}`;if(rangeCache.has(key))return rangeCache.get(key);const result=allocate(start,end);rangeCache.set(key,result);while(rangeCache.size>RANGE_CACHE_LIMIT)rangeCache.delete(rangeCache.keys().next().value);return result}
  function horizonFor(target=today()){const base=today(),start=target<base?target:base,horizon=Math.max(14,Math.min(180,Number(cal().engine?.horizonDays||90))),nominal=add(start,horizon),end=target>nominal?add(target,7):nominal;return cacheRange(start,end)}
  function planDay(date=today()){const h=horizonFor(date),p=clone(h.plans[date]||{date,windows:windowsFor(date,false),slots:fixedSlots(date),discarded:discarded(date),risks:[],preempted:[]});p.version=VERSION;p.engine='calendar-v4';p.capacity={groups:(p.windows||[]).reduce((o,w)=>{for(const g of w.groups||[])o[g]=(o[g]||0)+(w.end-w.start);return o},{}),used:(p.slots||[]).reduce((n,x)=>n+duration(x),0)};return p}
  function planWeek(start=weekStart(today())){const h=horizonFor(start),out=[];for(let i=0;i<7;i++){const d=add(start,i),p=clone(h.plans[d]||{date:d,windows:windowsFor(d,false),slots:fixedSlots(d),discarded:discarded(d),risks:[],preempted:[]});p.version=VERSION;p.engine='calendar-v4';out.push(p)}return out}
  function missionNow(date=today(),now=new Date()){const p=planDay(date),minute=now.getHours()*60+now.getMinutes(),slots=(p.slots||[]).filter(x=>!x.buffer),current=slots.find(x=>x.start<=minute&&x.end>minute)||null,next=slots.find(x=>x.start>minute)||null;return{date,minute,current,next,plan:p}}
  function emptyWindows(plan){const out=[];for(const w of plan.windows||[])for(const [s,e] of freeSegments(w.start,w.end,plan.slots||[],15))out.push({windowId:w.id,label:w.label,groups:w.groups,start:s,end:e,minutes:e-s});return out}
  function diagnostics(date=today()){const h=horizonFor(date),p=planDay(date);return{date,plan:p,empty:emptyWindows(p),atRisk:clone(h.risks||[]),discarded:p.discarded,campaigns:(cal().campaigns||[]).map(c=>({id:c.id,name:c.name,priority:c.priority,groupId:c.groupId,missionCount:(c.missionIds||[]).length}))}}
  function skipSlot(slot,date=today()){if(!slot||slot.fixed||slot.buffer)return false;const c=cal(),key=slot.workKey||itemKey(slot.q,date);c.skippedDates[date]=c.skippedDates[date]||{};c.skippedDates[date][key]=new Date().toISOString();saveState();return true}
  function discardDay(date=today()){const c=cal();if(c.discardedDays[date])return false;c.discardedDays[date]={at:new Date().toISOString()};c.skippedDates[date]=c.skippedDates[date]||{};saveState();window.dispatchEvent?.(new CustomEvent('my-performance-day-discarded',{detail:{date}}));return true}
  function restoreDay(date=today()){const c=cal();delete c.discardedDays[date];delete c.skippedDates[date];saveState();return true}
  function recordSession(slot,date=today()){if(!slot?.workKey||slot.fixed||slot.buffer)return false;const c=cal(),m=Math.max(0,duration(slot));c.workLedger=c.workLedger||{};c.workLedger[slot.workKey]=Number(c.workLedger[slot.workKey]||0)+m;saveState();return true}
  function metrics(){return{version:VERSION,generation,rangeCacheEntries:rangeCache.size,capacityCacheEntries:capacityCache.size}}

  const api={VERSION,planDay,planWeek,missionNow,diagnostics,emptyWindows,skipSlot,discardDay,restoreDay,recordSession,toMin,toTime,missionEstimate,invalidate,metrics};
  window.MyPerformancePlannerEngine=api;
  window.MyPerformanceRoutine={planDay,missionNow,toMin,toTime,durationFor:missionEstimate};
})();