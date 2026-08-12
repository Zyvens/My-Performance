"use strict";
/* My Performance 2.8.0 — Side Quest lane authority.
   A dedicated/preferred Window is a lane, not just spare capacity. Explicit window assignment and Filler order win before generic fillers. */
(function(){
  const B=window.MyPerformanceCalendarModel,D=window.MyPerformanceCalendarDomain,E=window.MyPerformancePlannerEngine,P=window.MyPerformanceSideQuestPriority;
  if(!B||!D||!E||typeof state==='undefined')return;
  const VERSION=13,basePlan=E.planDay.bind(E);
  const clone=x=>JSON.parse(JSON.stringify(x||{}));
  const all=()=>typeof quests==='function'?quests():[];
  const dow=d=>dfrom(d).getDay();
  const dur=s=>Math.max(0,Number(s?.end||0)-Number(s?.start||0));
  const overlap=(a,b)=>Number(a.start)<Number(b.end)&&Number(a.end)>Number(b.start);
  const doneSafe=(q,date)=>{try{return done(q,date)}catch{return false}};
  const activeMeta=q=>D.sideMeta?.(q.id)||{};
  function filler(q){const m=activeMeta(q);return m.packId?D.pack(m.packId):null}
  function rank(q){const p=filler(q),i=(p?.missionIds||[]).indexOf(q.id);return i<0?999:i}
  function explicitFor(q,w){const m=activeMeta(q),ids=m.windowIds||[];return ids.includes(w.id)}
  function pref(q,date){try{return B.prefFor?.(q,date)||null}catch{return null}}
  function preferredFor(q,w,date){const p=pref(q,date);return !!(p&&Number(p[0])<Number(w.end)&&Number(p[1])>Number(w.start))}
  function maxRepeats(q){try{return Math.max(1,Number(P?.maxRepeats?.({kind:'side',q})||activeMeta(q).maxRepeatsPerDay||1))}catch{return Math.max(1,Number(activeMeta(q).maxRepeatsPerDay||1))}}
  function eligible(q,w,date){
    if(!q||q.disabled||q.questType==='main'||q.specialCommitment)return false;
    const m=activeMeta(q);if(m.active===false)return false;
    if(q.startDate&&date<q.startDate||q.dueDate&&date>q.dueDate)return false;
    if((q.weekdays||[]).length&&!(q.weekdays||[]).includes(dow(date)))return false;
    if(doneSafe(q,date))return false;
    const group=B.groupForQuest?.(q)||q.domain||'Pessoal';if(!(w.groups||[]).includes(group))return false;
    const ids=m.windowIds||[];
    if(m.windowMode==='exclusive'&&ids.length&&!ids.includes(w.id))return false;
    return explicitFor(q,w)||preferredFor(q,w,date)||m.rigidity==='preferred';
  }
  function score(q,w,date){const m=activeMeta(q);let s=0;if(explicitFor(q,w))s+=100000;if(m.windowMode==='exclusive')s+=30000;if(preferredFor(q,w,date))s+=20000;if(m.rigidity==='preferred')s+=10000;s+=Math.max(0,5000-rank(q)*100);const p=filler(q);if(p?.active===false)s-=1e9;return s}
  function targetMinutes(q,w,date){const m=activeMeta(q),p=pref(q,date),fixed=m.durationMode==='fixed';let n=fixed?Number(q.durationMin||m.idealSessionMin||30):Number(m.idealSessionMin||q.durationMin||30);n=Math.max(Number(m.minSessionMin||m.flexMinMin||5),n);n=Math.min(Number(m.flexMaxMin||n),n);if(p)n=Math.min(n,Math.max(5,Number(p[1])-Number(p[0])));return Math.max(5,Math.min(n,Number(w.end)-Number(w.start)))}
  function occupied(plan,w){return(plan.slots||[]).filter(s=>overlap(s,w)).sort((a,b)=>a.start-b.start)}
  function freeAt(plan,w,wantStart,len){const xs=occupied(plan,w),starts=[];if(Number.isFinite(wantStart))starts.push(Math.max(w.start,Math.min(w.end-len,wantStart)));starts.push(w.start);for(const x of xs)starts.push(Math.max(w.start,x.end));for(const start of [...new Set(starts)]){const end=start+len;if(end>w.end)continue;if(!xs.some(x=>overlap(x,{start,end})))return[start,end]}return null}
  function replaceable(plan,w,len,q){return(plan.slots||[]).filter(s=>s.sideQuest&&s.q?.id!==q.id&&!s.fixed&&!s.pinned&&!s.eventSlot&&!s.eventTravel&&!s.laneAuthorityV13&&overlap(s,w)&&dur(s)>=len).sort((a,b)=>{const ae=explicitFor(a.q,w)?1:0,be=explicitFor(b.q,w)?1:0;return ae-be||rank(b.q)-rank(a.q)})[0]||null}
  function makeSlot(q,w,date,start,end,reason){const m=activeMeta(q),p=filler(q);return{id:`lane-v13:${q.id}:${date}:${w.id}`,workKey:`${q.id}@${q.cadence==='daily'?date:q.id}`,q:clone(q),originDate:date,start,end,fixed:false,immovable:false,sideQuest:true,mainQuest:false,group:B.groupForQuest?.(q)||q.domain||'Pessoal',packId:p?.id||m.packId||'',reason,explanation:'Prioridade explícita da Janela/Filler aplicada antes de fillers genéricos.',laneAuthorityV13:true}}
  function relocateExisting(plan,q,w){const existing=(plan.slots||[]).filter(s=>s.sideQuest&&s.q?.id===q.id);if(existing.some(s=>overlap(s,w)))return true;if(!existing.length||maxRepeats(q)>1)return false;plan.slots=plan.slots.filter(s=>!(s.sideQuest&&s.q?.id===q.id&&!s.fixed&&!s.pinned&&!s.eventSlot&&!s.eventTravel));return false}
  function placeCandidate(plan,w,date,q){if(relocateExisting(plan,q,w))return true;const len=targetMinutes(q,w,date),p=pref(q,date),want=p?Number(p[0]):w.start;let spot=freeAt(plan,w,want,len);if(!spot){const removed=replaceable(plan,w,len,q);if(removed){plan.slots=plan.slots.filter(s=>s!==removed);spot=freeAt(plan,w,want,len)}}if(!spot)return false;plan.slots.push(makeSlot(q,w,date,spot[0],spot[1],explicitFor(q,w)?'Side Quest prioritária desta Janela':'Side Quest preferencial desta Janela'));return true}
  function ensureWindow(plan,w,date,used){
    if(!w.sideQuestDedicated&&!w.allowSideQuests)return;
    const candidates=all().filter(q=>eligible(q,w,date)&&!used.has(q.id)).sort((a,b)=>score(b,w,date)-score(a,w,date));
    for(const q of candidates){if(!explicitFor(q,w)&&!preferredFor(q,w,date)&&rank(q)>5)continue;if(placeCandidate(plan,w,date,q))used.add(q.id)}
  }
  function normalize(plan,date){if(!plan||plan.pastGone||plan.discarded)return plan;const used=new Set();for(const w of plan.windows||[])ensureWindow(plan,w,date,used);plan.slots=(plan.slots||[]).sort((a,b)=>Number(a.start||0)-Number(b.start||0)||Number(a.end||0)-Number(b.end||0));return plan}
  E.planDay=function(date){return normalize(basePlan(date),date)};
  if(window.MyPerformanceRoutine)window.MyPerformanceRoutine.planDay=E.planDay;
  window.MyPerformanceSideQuestLaneAuthority={VERSION,normalize,eligible,score,rank,placeCandidate,maxRepeats};
})();
