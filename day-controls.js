"use strict";
/* Day Controls — reversible daily skips, GSA/Study minimums and opt-in 6h emergency mode. */
(function(){
  if(!window.MyPerformanceRoutine)return;
  const BASE_RENDER_TODAY=renderToday;
  const BASE_PLAN=window.MyPerformanceRoutine.planDay;
  const BASE_MISSION_NOW=window.MyPerformanceRoutine.missionNow;
  const SYSTEM_START=window.MyPerformanceAdaptive?.SYSTEM_START||'2026-08-10';
  const EXTRA_MIN=120;
  const MIN_SLEEP_HOURS=6;
  const MINIMUMS={
    GSA:{title:'GSA — avanço mínimo diário',duration:30,preferred:10*60,description:'Mesmo em um dia atípico, execute um próximo passo concreto da campanha GSA.'},
    Estudos:{title:'Estudos — sessão mínima diária',duration:45,preferred:19*60,description:'Preserve contato diário com os estudos, ainda que em uma sessão curta e objetiva.'}
  };

  function ensure(){
    state.dayPlanning=state.dayPlanning||{};
    state.dayPlanning.skipped=state.dayPlanning.skipped||{};
    state.dayPlanning.sleepExtension=state.dayPlanning.sleepExtension||{};
    state.dayPlanning.minimumDone=state.dayPlanning.minimumDone||{};
    const now=today();
    Object.keys(state.dayPlanning.skipped).forEach(d=>{if(d<now)delete state.dayPlanning.skipped[d]});
    Object.keys(state.dayPlanning.sleepExtension).forEach(d=>{if(d<now)delete state.dayPlanning.sleepExtension[d]});
  }
  ensure();

  const skipMap=date=>(ensure(),state.dayPlanning.skipped[date]||{});
  const skipped=(date,q)=>!!(skipMap(date)[q.id]||(q.parentId&&Object.values(skipMap(date)).some(x=>x?.parentId===q.parentId)));
  const extension=date=>Math.max(0,Math.min(EXTRA_MIN,Number(state.dayPlanning.sleepExtension[date]||0)));
  const minDone=(date,domain)=>!!state.dayPlanning.minimumDone?.[date]?.[domain];
  const time=window.MyPerformanceRoutine.toTime;

  function priorityLevel(q){return window.MyPerformanceAdaptive?.priority?.(q)||q.priorityLevel||(q.questType==='main'?'high':'normal')}
  function priorityScore(q,date){
    const p={critical:400,high:300,normal:180,low:80}[priorityLevel(q)]||180;
    const domains=state.routineSettings?.domainPriority||['GSA','Estudos','Pessoal','Carreira'],di=domains.indexOf(q.domain),domain=(di<0?0:(4-di)*35);
    const due=q.dueDate?Math.max(0,180-Math.max(0,diffDays(date,q.dueDate))*12):0;
    return p+domain+due+(q.questType==='main'?80:0)
  }
  function durationOf(q){
    const plan=state.questPlans?.[q.id];
    return Math.max(10,Number(plan?.durationMin||q.durationMin||(q.timeStart&&q.timeEnd?Math.max(10,(window.MyPerformanceRoutine.toMin(q.timeEnd)-window.MyPerformanceRoutine.toMin(q.timeStart)+1440)%1440):30)||30))
  }
  function flexible(q){return !q.fixedTime&&!q.essential&&!q.dailyMinimum}
  function copyPlan(p){return Object.assign({},p,{slots:(p.slots||[]).map(x=>Object.assign({},x)),movedOut:(p.movedOut||[]).map(x=>Object.assign({},x)),critical:(p.critical||[]).map(x=>Object.assign({},x))})}
  function gaps(slots,start,end,min=10){
    const xs=slots.slice().sort((a,b)=>a.start-b.start),out=[];let cur=start;
    for(const x of xs){if(x.start-cur>=min)out.push({start:cur,end:x.start});cur=Math.max(cur,x.end)}
    if(end-cur>=min)out.push({start:cur,end});return out
  }
  function placeInGap(slots,dur,start,end,preferred){
    const gs=gaps(slots,start,end,dur),after=gs.filter(g=>g.end-g.start>=dur&&g.end>preferred).sort((a,b)=>Math.abs(Math.max(a.start,preferred)-preferred)-Math.abs(Math.max(b.start,preferred)-preferred));
    const pool=after.length?after:gs.filter(g=>g.end-g.start>=dur);if(!pool.length)return null;const g=pool[0],s=Math.max(g.start,Math.min(preferred,g.end-dur));return{start:s,end:s+dur}
  }
  function fitCandidate(plan,c,date,reason){
    const q=c.q||c,originDate=c.originDate||date,dur=durationOf(q),slot=placeInGap(plan.slots,dur,plan.wake,plan.end,window.MyPerformanceRoutine.toMin(q.timeStart)||plan.wake);
    if(!slot)return false;plan.slots.push({q,originDate,start:slot.start,end:slot.end,key:`${q.id}|${originDate}`,carried:originDate!==date,reason});return true
  }
  function fillReleasedSpace(plan,date){
    const present=new Set(plan.slots.map(x=>x.q.id)),candidates=(plan.movedOut||[]).filter(x=>flexible(x.q)&&!present.has(x.q.id)&&!skipped(date,x.q)).sort((a,b)=>priorityScore(b.q,date)-priorityScore(a.q,date));
    for(const c of candidates){if(fitCandidate(plan,c,date,'recalculada para ocupar espaço liberado'))present.add(c.q.id)}
  }
  function minimumQuest(domain,date,duration){
    const m=MINIMUMS[domain];return{id:`day-min-${domain.toLowerCase()}-${date}`,title:m.title,description:m.description,domain,category:'Mínimo diário',questType:'side',cadence:'once',startDate:date,dueDate:date,durationMin:duration,priorityLevel:'high',dailyMinimum:true,source:'Regra diária'}
  }
  function ensureMinimum(plan,date,domain){
    if(minDone(date,domain)||plan.slots.some(x=>x.q.domain===domain))return;
    const m=MINIMUMS[domain];
    for(const dur of [m.duration,30,20,15]){
      const slot=placeInGap(plan.slots,dur,plan.wake,plan.end,m.preferred);if(!slot)continue;
      plan.slots.push({q:minimumQuest(domain,date,dur),originDate:date,start:slot.start,end:slot.end,key:`day-min-${domain}-${date}`,reason:'mínimo diário protegido'});return
    }
    const victims=plan.slots.filter(x=>flexible(x.q)&&!['GSA','Estudos'].includes(x.q.domain)&&(x.end-x.start)>=45).sort((a,b)=>priorityScore(a.q,date)-priorityScore(b.q,date));
    if(victims.length){const v=victims[0],dur=15,oldEnd=v.end;v.end-=dur;plan.slots.push({q:minimumQuest(domain,date,dur),originDate:date,start:oldEnd-dur,end:oldEnd,key:`day-min-${domain}-${date}`,reason:'mínimo diário protegido · 15 min reservados'})}
  }
  function criticalConflict(plan,date){return !!(plan.critical?.length||(plan.movedOut||[]).some(x=>['critical','high'].includes(priorityLevel(x.q))&&!skipped(date,x.q)))}
  function addEmergencyWindow(plan,date){
    const extra=extension(date);if(!extra)return;
    const baseEnd=plan.end,end=Math.min(plan.wake+(24-MIN_SLEEP_HOURS)*60,baseEnd+extra);if(end<=baseEnd)return;
    const present=new Set(plan.slots.map(x=>x.q.id)),pool=(plan.movedOut||[]).filter(x=>flexible(x.q)&&!present.has(x.q.id)&&!skipped(date,x.q)).sort((a,b)=>priorityScore(b.q,date)-priorityScore(a.q,date));let cursor=baseEnd;
    for(const c of pool){const dur=durationOf(c.q);if(dur>end-cursor)continue;plan.slots.push({q:c.q,originDate:c.originDate||date,start:cursor,end:cursor+dur,key:`${c.q.id}|${c.originDate||date}`,carried:(c.originDate||date)!==date,reason:'modo exceção · janela extra de 2h'});cursor+=dur;if(end-cursor<10)break}
    plan.baseEnd=baseEnd;plan.end=end;plan.emergency=true;plan.emergencyUsed=Math.max(0,cursor-baseEnd)
  }
  function adjustedPlan(date=today()){
    ensure();const p=copyPlan(BASE_PLAN(date));
    p.slots=p.slots.filter(x=>!skipped(date,x.q));
    fillReleasedSpace(p,date);
    if(date>=SYSTEM_START){ensureMinimum(p,date,'GSA');ensureMinimum(p,date,'Estudos')}
    p.slots.sort((a,b)=>a.start-b.start);
    addEmergencyWindow(p,date);
    p.slots.sort((a,b)=>a.start-b.start);p.used=p.slots.reduce((n,x)=>n+x.end-x.start,0);p.dayCritical=criticalConflict(p,date);return p
  }
  function adjustedMissionNow(date=today(),now=new Date()){
    const p=adjustedPlan(date),minute=now.getHours()*60+now.getMinutes(),cur=p.slots.find(x=>minute>=x.start&&minute<x.end&&!slotDone(x,date)),next=p.slots.find(x=>x.start>minute&&!slotDone(x,date));return{plan:p,current:cur||null,next:next||null,minute}
  }
  function slotDone(x,date){return x.q.dailyMinimum?minDone(date,x.q.domain):done(x.q,x.originDate)}

  function skipDay(q,date){
    if(!q||q.essential||q.fixedTime||q.dailyMinimum){toast('Esta é uma âncora protegida do dia');return}
    state.dayPlanning.skipped[date]=state.dayPlanning.skipped[date]||{};
    state.dayPlanning.skipped[date][q.id]={title:q.title,domain:q.domain,parentId:q.parentId||'',at:new Date().toISOString()};
    saveState();window.MyPerformanceAdaptive?.recalculate?.({reason:'day-skip'});window.MyPerformanceNarrator?.say?.(`Missão ${q.title} retirada apenas de hoje. Recalculei o espaço disponível.`,{force:false,interrupt:false});render();toast('Missão retirada apenas deste dia')
  }
  function restoreDay(id,date){
    const rec=state.dayPlanning.skipped?.[date]?.[id];if(!rec)return;delete state.dayPlanning.skipped[date][id];if(!Object.keys(state.dayPlanning.skipped[date]).length)delete state.dayPlanning.skipped[date];saveState();window.MyPerformanceAdaptive?.recalculate?.({reason:'day-restore'});render();toast('Missão restaurada no planejamento do dia')
  }
  function setEmergency(date,on){
    ensure();if(on)state.dayPlanning.sleepExtension[date]=EXTRA_MIN;else delete state.dayPlanning.sleepExtension[date];saveState();window.dispatchEvent(new CustomEvent('my-performance-day-mode',{detail:{date,emergency:on}}));render();toast(on?'Modo exceção: até 2h extras, 6h de sono protegidas':'Dia restaurado para a janela normal de sono')
  }
  function completeMinimum(date,domain){state.dayPlanning.minimumDone[date]=state.dayPlanning.minimumDone[date]||{};state.dayPlanning.minimumDone[date][domain]=new Date().toISOString();saveState();render();toast(`${domain}: mínimo diário concluído`)}

  function normalSlotHtml(x,date){
    const moved=x.originDate!==date,canSkip=!x.q.essential&&!x.q.fixedTime&&!x.q.dailyMinimum;
    return`<div class="routine-slot ${x.q.questType==='main'?'main':''} ${moved?'rolled':''}"><div class="routine-time"><b>${time(x.start)}</b><span>${time(x.end)}</span></div><div class="routine-quest">${moved?`<div class="rollover-note">↪ origem ${fmt(x.originDate)} · recalculada para hoje</div>`:''}${questCard(x.q,x.originDate,true)}<div class="routine-reason">${esc(x.reason||'planejamento do dia')} · ${x.end-x.start} min</div>${canSkip?`<button class="mini-link day-skip-btn" data-day-skip="${esc(x.q.id)}">⊘ Não concluir hoje</button>`:''}</div></div>`
  }
  function minimumSlotHtml(x,date){const q=x.q;return`<div class="routine-slot daily-minimum-slot"><div class="routine-time"><b>${time(x.start)}</b><span>${time(x.end)}</span></div><div class="routine-quest"><article class="quest"><div class="quest-head"><button class="check" data-min-complete="${q.domain}">✓</button><div><div class="quest-title">${esc(q.title)}</div><div class="quest-desc">${esc(q.description)}</div><div class="quest-meta"><span class="tag ${q.domain}">${esc(q.domain)}</span><span class="pill adaptive-priority high">◆ MÍNIMO DIÁRIO</span><span class="pill">${x.end-x.start} min</span></div></div></div></article><div class="routine-reason">${esc(x.reason)}</div></div></div>`}
  function skippedHtml(date){const entries=Object.entries(skipMap(date));if(!entries.length)return'';return`<div class="card day-skipped-card"><span class="eyebrow">FORA DO PLANO DE HOJE</span><h2>${entries.length} missão(ões) marcadas como “não concluir”</h2><p class="muted">Não contam como concluídas, não geram XP e não criam histórico de falha. Esta preferência é descartada após o dia.</p>${entries.map(([id,r])=>`<div class="rollover-row"><div><b>${esc(r.title||id)}</b><span>${esc(r.domain||'')} · removida apenas deste dia</span></div><button class="mini-link" data-day-restore="${esc(id)}">↩ Restaurar</button></div>`).join('')}</div>`}
  function emergencyHtml(p,date){
    const baseAwake=(p.baseEnd||p.end)-p.wake,baseSleep=24-baseAwake/60,can=p.dayCritical&&!p.emergency&&baseSleep>=8;
    if(p.emergency)return`<div class="card emergency-day active"><div><span class="eyebrow">MODO EXCEÇÃO DO DIA</span><h2>Janela ampliada em 2h · mínimo de 6h de sono</h2><p class="muted">Somente ${fmt(date)}. ${p.emergencyUsed||0} min de atividades foram puxados para a janela extra; amanhã volta automaticamente ao padrão.</p></div><button class="btn" id="restoreSleepDay">Restaurar 8h de sono</button></div>`;
    if(can)return`<div class="card emergency-day"><div><span class="eyebrow">CONFLITO CRÍTICO</span><h2>Usar 2h extras neste dia?</h2><p class="muted">Opção excepcional: recalcula somente este dia até 18h acordado, preservando no mínimo 6h de sono. Não altera sua rotina padrão.</p></div><button class="btn danger" id="extendSleepDay">Recalcular com +2h</button></div>`;return''
  }
  function refreshStats(p){const cards=document.querySelectorAll('.planner-stats .mini-stat');if(cards.length>=4){const awake=p.end-p.wake,sleep=Math.max(0,(1440-awake)/60);cards[0].querySelector('b').textContent=`${state.routineSettings?.wakeTime||'06:00'} → ${time(p.end)}`;cards[0].querySelector('small').textContent=`${(awake/60).toFixed(1)}h acordado · ${sleep.toFixed(1)}h protegidas`;cards[2].querySelector('b').textContent=String(p.slots.length);cards[2].querySelector('small').textContent=`${p.slots.filter(x=>x.originDate!==p.date).length} vieram de outros dias`;cards[3].querySelector('small').textContent=`${Math.floor(p.used/60)}h ${p.used%60}min de missões`}}

  renderToday=function(){
    BASE_RENDER_TODAY();const date=state.plannerDate||today(),p=adjustedPlan(date),view=document.getElementById('view');if(!view)return;
    const tl=view.querySelector('.day-timeline');if(tl)tl.innerHTML=p.slots.map(x=>x.q.dailyMinimum?minimumSlotHtml(x,date):normalSlotHtml(x,date)).join('')||'<div class="empty">Nenhuma missão programada.</div>';
    refreshStats(p);const head=view.querySelector('.planner-head')||view.querySelector('.section-title');if(head)head.insertAdjacentHTML('afterend',emergencyHtml(p,date));view.insertAdjacentHTML('beforeend',skippedHtml(date));
    bindQuestCards();document.querySelectorAll('[data-day-skip]').forEach(b=>b.onclick=()=>{const q=questById(b.dataset.daySkip)||p.slots.find(x=>x.q.id===b.dataset.daySkip)?.q;skipDay(q,date)});document.querySelectorAll('[data-day-restore]').forEach(b=>b.onclick=()=>restoreDay(b.dataset.dayRestore,date));document.querySelectorAll('[data-min-complete]').forEach(b=>b.onclick=()=>completeMinimum(date,b.dataset.minComplete));document.getElementById('extendSleepDay')?.addEventListener('click',()=>setEmergency(date,true));document.getElementById('restoreSleepDay')?.addEventListener('click',()=>setEmergency(date,false))
  };

  window.MyPerformanceRoutine.planDay=adjustedPlan;
  window.MyPerformanceRoutine.missionNow=adjustedMissionNow;
  window.MyPerformanceDay={plan:adjustedPlan,skip:skipDay,restore:restoreDay,setEmergency,status:date=>({skipped:skipMap(date||today()),extension:extension(date||today())})};
  window.addEventListener('my-performance-cloud-loaded',()=>{ensure();render()});
  render();
})();
