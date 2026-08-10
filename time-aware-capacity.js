"use strict";
/* Time-aware capacity guard — only refills time actually recovered by early completion or explicit removal from today. */
(function(){
  if(!window.MyPerformanceRoutine||!window.MyPerformanceScheduler2||!window.MyPerformanceTimeCore)return;
  const CORE=window.MyPerformanceTimeCore;
  const BASE_PLAN=window.MyPerformanceRoutine.planDay;
  const BASE_RENDER_TODAY=renderToday;
  const MIN_GAP=15;
  let saving=false,lastPlanSnapshot=null,knownSkips=new Set();

  const clone=x=>JSON.parse(JSON.stringify(x||{}));
  const nowMin=()=>{const n=new Date();return n.getHours()*60+n.getMinutes()};
  const toTime=window.MyPerformanceRoutine.toTime;
  const toMin=window.MyPerformanceRoutine.toMin;
  const releaseKey=(id,origin)=>`${id||'unknown'}|${origin||today()}`;
  const minuteFromIso=iso=>{const d=new Date(iso||Date.now());return d.getHours()*60+d.getMinutes()};

  function ensure(){
    state.liveCapacity=state.liveCapacity||{};
    state.liveCapacity.timeAwareVersion=2;
    state.liveCapacity.releases=state.liveCapacity.releases||{};
    state.liveCapacity.completedTimeline=state.liveCapacity.completedTimeline||{};
    const cutoff=addDays(today(),-14);
    Object.keys(state.liveCapacity.releases).forEach(d=>{if(d<today())delete state.liveCapacity.releases[d]});
    Object.keys(state.liveCapacity.completedTimeline).forEach(d=>{if(d<cutoff)delete state.liveCapacity.completedTimeline[d]});
  }
  ensure();

  function dayReleases(date){ensure();return state.liveCapacity.releases[date]||(state.liveCapacity.releases[date]={})}
  function dayCompleted(date){ensure();return state.liveCapacity.completedTimeline[date]||(state.liveCapacity.completedTimeline[date]={})}
  function currentSkips(date=today()){return state.dayPlanning?.skipped?.[date]||{}}
  function skipSet(date=today()){return new Set(Object.keys(currentSkips(date)))}
  function slotForQuest(id,date=today(),originDate=date,plan=lastPlanSnapshot){
    const slots=plan?.slots||[];
    return slots.find(x=>x?.q?.id===id&&(x.originDate||date)===(originDate||date))||slots.find(x=>x?.q?.id===id)||null
  }
  function capturePlan(date=today()){
    try{lastPlanSnapshot=clone(BASE_PLAN(date))}catch{lastPlanSnapshot=null}
    knownSkips=skipSet(date)
  }

  function persistQuietly(){
    if(saving)return;saving=true;try{saveState()}finally{saving=false}
  }
  function clearRecord(id,date,originDate=date){
    const key=releaseKey(id,originDate);delete dayReleases(date)[key];delete dayCompleted(date)[key]
  }
  function recordCompletion(q,date,slot,completedMinute=nowMin(),completedAt=new Date().toISOString()){
    if(!q||!slot||date!==today())return null;
    const origin=slot.originDate||date,key=releaseKey(q.id,origin),policy=CORE.completionRelease({now:completedMinute,start:slot.start,end:slot.end,minGap:MIN_GAP});
    dayCompleted(date)[key]={questId:q.id,title:q.title||slot.q?.title||q.id,domain:q.domain||slot.q?.domain||'',originDate:origin,plannedStart:Number(slot.start),plannedEnd:Number(slot.end),completedMin:Number(completedMinute),completedAt,early:policy.early,recoveredMin:policy.release?policy.recoveredMin:0};
    if(policy.release)dayReleases(date)[key]={questId:q.id,originDate:origin,start:policy.release.start,end:policy.release.end,type:'early-completion',createdAt:completedAt,recoveredMin:policy.recoveredMin};
    else delete dayReleases(date)[key];
    return policy
  }
  function recordRemoval(id,date,slot){
    if(!id||!slot||date!==today())return false;
    const m=nowMin(),origin=slot.originDate||date,key=releaseKey(id,origin),policy=CORE.shouldCreateRelease({kind:'removed-today',now:m,start:slot.start,end:slot.end,minGap:MIN_GAP});
    if(policy.release){dayReleases(date)[key]={questId:id,originDate:origin,start:policy.release.start,end:policy.release.end,type:'removed-today',createdAt:new Date().toISOString(),recoveredMin:policy.recoveredMin};return true}
    delete dayReleases(date)[key];return false
  }

  const BASE_TOGGLE=toggleQuest;
  toggleQuest=function(id,date=today()){
    const q=questById(id),was=q?done(q,date):false,origin=date;
    if(was){clearRecord(id,date,origin);return BASE_TOGGLE(id,date)}
    if(q&&date===today()){
      const ds=dependencyStatus(q);if(!ds.locked){const slot=slotForQuest(id,date,origin,lastPlanSnapshot||BASE_PLAN(date));if(slot)recordCompletion(q,date,slot,nowMin(),new Date().toISOString())}
    }
    return BASE_TOGGLE(id,date)
  };

  window.addEventListener('my-performance-tracking',e=>{
    if(e.detail?.type!=='complete')return;const entry=e.detail.entry||{},date=entry.date||today();if(date!==today())return;
    const slot=slotForQuest(entry.questId,date,entry.originDate||date,lastPlanSnapshot||BASE_PLAN(date));if(!slot)return;
    const q=questById(entry.questId)||{id:entry.questId,title:entry.title,domain:entry.domain};
    recordCompletion(q,date,slot,minuteFromIso(entry.endedAt||new Date().toISOString()),entry.endedAt||new Date().toISOString())
  });

  window.addEventListener('my-performance-state-saved',()=>{
    if(saving)return;const date=today(),now=skipSet(date),before=knownSkips;let changed=false;
    for(const id of now){if(before.has(id))continue;const rec=currentSkips(date)[id]||{},slot=slotForQuest(id,date,date,lastPlanSnapshot)||((lastPlanSnapshot?.slots||[]).find(x=>x?.q?.parentId&&x.q.parentId===rec.parentId));if(slot)changed=recordRemoval(id,date,slot)||changed}
    for(const [key,r] of Object.entries(dayReleases(date))){if(r?.type==='removed-today'&&!now.has(r.questId)){delete dayReleases(date)[key];changed=true}}
    knownSkips=now;if(changed)persistQuietly()
  });

  function activeWindows(date,minute=nowMin()){
    return Object.values(dayReleases(date)).filter(w=>Number(w.end)>minute&&Number(w.end)>Number(w.start)).sort((a,b)=>a.start-b.start)
  }
  function filteredPlan(date=today()){
    const p=clone(BASE_PLAN(date));if(date!==today()){p.liveFill=[];p.slots=(p.slots||[]).filter(x=>!x.liveFill);return p}
    const minute=nowMin(),windows=activeWindows(date,minute),allowed=[];
    const normal=(p.slots||[]).filter(x=>!x.liveFill);
    for(const x of (p.liveFill||[])){
      const auth=CORE.authorizeFill(x,windows,minute,MIN_GAP);if(!auth)continue;
      const y=Object.assign({},x,{start:auth.start,end:auth.end,timeAware:true,releaseType:auth.window.type,reason:auth.window.type==='early-completion'?'tempo realmente recuperado por conclusão antecipada':'tempo liberado porque a missão foi removida de hoje'});allowed.push(y)
    }
    p.liveFill=allowed;p.slots=normal.concat(allowed).sort((a,b)=>a.start-b.start);p.used=p.slots.reduce((n,x)=>n+Math.max(0,x.end-x.start),0);p.timeAware=true;p.recoveredWindows=windows;return p
  }
  function missionNow(date=today(),now=new Date()){
    const p=filteredPlan(date),m=now.getHours()*60+now.getMinutes(),current=p.slots.find(x=>m>=x.start&&m<x.end),next=p.slots.find(x=>x.start>m);return{plan:p,current:current||null,next:next||null,minute:m}
  }

  function completedHtml(r){
    const late=Number(r.completedMin)>=Number(r.plannedEnd),early=Number(r.recoveredMin)>=MIN_GAP;
    return`<div class="routine-slot time-aware-completed" data-time-completed="${esc(releaseKey(r.questId,r.originDate))}"><div class="routine-time"><b>${toTime(r.plannedStart)}</b><span>${toTime(r.plannedEnd)}</span></div><div class="routine-quest"><article class="quest done"><div class="quest-head"><div class="time-aware-check">✓</div><div><div class="quest-title">${esc(r.title)}</div><div class="quest-desc">Concluída às ${toTime(r.completedMin)}${late?' · depois do fim previsto':''}.</div><div class="quest-meta"><span class="tag ${esc(r.domain||'')}">${esc(r.domain||'')}</span><span class="pill green">CONCLUÍDA</span>${early?`<span class="pill">${r.recoveredMin} min realmente liberados</span>`:'<span class="pill">sem reposição automática</span>'}</div></div></div></article></div></div>`
  }
  function injectCompleted(date){
    const tl=document.querySelector('.day-timeline');if(!tl)return;tl.querySelectorAll('[data-time-completed]').forEach(x=>x.remove());
    const rows=Object.values(dayCompleted(date)).sort((a,b)=>a.plannedStart-b.plannedStart);
    for(const r of rows){const wrap=document.createElement('div');wrap.innerHTML=completedHtml(r);const node=wrap.firstElementChild,children=[...tl.children];const before=children.find(el=>{const m=toMin(el.querySelector('.routine-time b')?.textContent||'');return m!=null&&m>r.plannedStart});if(before)tl.insertBefore(node,before);else tl.appendChild(node)}
  }
  function fillerHtml(x,index){
    const q=x.q,kind=x.releaseType==='early-completion'?'CONCLUSÃO ANTECIPADA':'REMOVIDA DE HOJE';
    return`<div class="routine-slot live-fill-slot time-aware-fill" data-live-fill-start="${x.start}"><div class="routine-time"><b>${toTime(x.start)}</b><span>${toTime(x.end)}</span></div><div class="routine-quest"><article class="quest"><div class="quest-head"><div class="synthetic-mark">↯</div><div><div class="quest-title">${esc(q.title)}</div><div class="quest-desc">${esc(q.description||'Missão puxada apenas porque existe tempo realmente livre.')}</div><div class="quest-meta"><span class="tag ${esc(q.domain||'')}">${esc(q.domain||'')}</span><span class="pill green">${kind}</span><span class="pill">${x.end-x.start} min</span></div></div></div></article><div class="routine-reason">${esc(x.reason)}</div><div class="scheduler-slot-actions"><button class="btn small" data-time-start="${index}">▶ Iniciar</button></div></div></div>`
  }
  function injectAllowedFillers(p,date){
    const tl=document.querySelector('.day-timeline');if(!tl)return;tl.querySelectorAll('.live-fill-slot').forEach(x=>x.remove());
    const fills=p.liveFill||[];for(let i=0;i<fills.length;i++){const x=fills[i],wrap=document.createElement('div');wrap.innerHTML=fillerHtml(x,i);const node=wrap.firstElementChild,children=[...tl.children];const before=children.find(el=>{const m=toMin(el.querySelector('.routine-time b')?.textContent||'');return m!=null&&m>x.start});if(before)tl.insertBefore(node,before);else tl.appendChild(node)}
    document.querySelectorAll('[data-time-start]').forEach(b=>b.onclick=()=>{const x=fills[Number(b.dataset.timeStart)];if(x)window.MyPerformanceScheduler2.startTracking(x.q,date,x.originDate||date)});
    const old=document.getElementById('liveCapacityNotice');if(old&&!fills.length)old.remove();else if(old&&fills.length)old.innerHTML=`<b>Tempo realmente recuperado:</b> ${fills.length} missão(ões) ocupam somente janelas liberadas por conclusão antecipada ou remoção explícita.`
  }
  function injectClock(){
    const head=document.querySelector('.planner-head');if(!head)return;let c=document.getElementById('plannerRealClock');if(!c){c=document.createElement('span');c.id='plannerRealClock';c.className='pill time-aware-clock';c.title='Hora local deste aparelho usada pelo Scheduler';head.appendChild(c)}const n=new Date();c.textContent=`Agora ${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`
  }
  function injectStyle(){if(document.getElementById('timeAwareStyle'))return;const s=document.createElement('style');s.id='timeAwareStyle';s.textContent=`.time-aware-completed{opacity:.48;filter:saturate(.35)}.time-aware-completed .quest{border-style:dashed}.time-aware-check{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:var(--green);color:#04130d;font-weight:900}.time-aware-clock{white-space:nowrap}.time-aware-fill{outline:1px solid rgba(75,220,156,.22)}@media(max-width:720px){.time-aware-clock{width:max-content}}`;document.head.appendChild(s)}

  function renderTodayTimeAware(){
    BASE_RENDER_TODAY();const date=state.plannerDate||today(),p=filteredPlan(date);injectStyle();injectAllowedFillers(p,date);injectCompleted(date);injectClock();capturePlan(date)
  }

  window.MyPerformanceRoutine.planDay=filteredPlan;
  window.MyPerformanceRoutine.missionNow=missionNow;
  if(window.MyPerformanceLiveCapacity){window.MyPerformanceLiveCapacity.plan=filteredPlan;window.MyPerformanceLiveCapacity.refresh=()=>{if(state.view==='today')render()}}
  renderToday=renderTodayTimeAware;
  window.MyPerformanceTimeAware={plan:filteredPlan,windows:activeWindows,recordCompletion,nowMinute:nowMin};
  capturePlan();injectStyle();
  setInterval(()=>{if(state.view==='today')injectClock()},30000);
  window.addEventListener('pageshow',()=>{if(state.view==='today'){capturePlan();injectClock()}});
})();
