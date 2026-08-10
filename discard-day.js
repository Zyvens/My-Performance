"use strict";
/* Discard Day — abandon a broken schedule without inventing completion; preserve done work and push relevant unfinished work forward. */
(function(){
  if(!window.MyPerformanceScheduler2||!window.MyPerformanceRoutine)return;
  const S2=window.MyPerformanceScheduler2;
  const BASE_PLAN=window.MyPerformanceRoutine.planDay;
  const BASE_MISSION_NOW=window.MyPerformanceRoutine.missionNow;
  const BASE_SUMMARY=S2.summary;
  const BASE_OPEN_RECALC=S2.openRecalcCenter;
  const BASE_SCHEDULED=scheduled;
  const VERSION=1;
  let injecting=false;

  function ensure(){
    state.scheduler2=state.scheduler2||{};
    state.scheduler2.discardDayVersion=VERSION;
    state.scheduler2.discardedDays=state.scheduler2.discardedDays||{};
  }
  ensure();

  const clone=x=>JSON.parse(JSON.stringify(x||{}));
  const discarded=date=>(ensure(),state.scheduler2.discardedDays[date]||null);
  const localDate=stamp=>{try{return iso(new Date(stamp))}catch{return''}};
  const workDomain=q=>['GSA','Estudos','Carreira'].includes(q?.domain);
  const occurrenceDone=(q,date)=>{try{return done(q,date)}catch{return false}};
  const slotDone=(x,date)=>{
    const q=x?.q;if(!q)return false;
    if(q.dailyMinimum)return !!state.dayPlanning?.minimumDone?.[date]?.[q.domain];
    if(state.scheduler2?.syntheticDone?.[`${q.id}@${x.originDate||date}`])return true;
    return occurrenceDone(q,x.originDate||date)
  };
  function isRelevant(q){
    if(!q)return false;
    if(q.adaptiveSession)return true;
    if(q.anchorBlock||q.dailyMinimum||q.capacityBlock||q.capacityGsa||q.liveFill||q.lateWakeCanonical||q.scheduler2Synthetic)return false;
    if(q.fixedTime||q.essential||q.commuteBlock||q.externalActivity)return false;
    if(/^routine-/.test(String(q.id||'')))return false;
    if(q.domain==='Pessoal'&&q.cadence==='daily')return false;
    return workDomain(q)||q.questType==='main'||q.cadence!=='daily'
  }
  function completedToday(date){
    const ids=[];
    for(const [key,stamp] of Object.entries(state.completed||{})){
      if(!stamp||localDate(stamp)!==date)continue;
      const id=String(key).split('@')[0];if(!ids.includes(id))ids.push(id)
    }
    return ids
  }
  function planSnapshot(date){
    try{return clone(BASE_PLAN(date))}catch(e){console.error('Discard day plan snapshot failed',e);return{date,slots:[]}}
  }
  function pendingRelevant(date){
    const p=planSnapshot(date),seen=new Set(),items=[];
    for(const x of p.slots||[]){
      const q=x?.q,origin=x?.originDate||date,key=`${q?.id||''}|${origin}`;
      if(!q||seen.has(key)||slotDone(x,date)||!isRelevant(q))continue;
      seen.add(key);items.push({slot:x,q,originDate:origin})
    }
    return{plan:p,items}
  }
  function nextSameOccurrence(q,originDate,date){
    if(!['weekly','monthly'].includes(q?.cadence))return'';
    let key='';try{key=occurrenceKey(q,originDate)}catch{return''}
    const max=q.cadence==='weekly'?7:35;
    for(let i=1;i<=max;i++){
      const d=addDays(date,i);let same=false;try{same=occurrenceKey(q,d)===key}catch{}
      if(!same)break;
      try{if(BASE_SCHEDULED(q,d))return d}catch{}
    }
    return''
  }
  function deferOnce(q,date,target){
    if(q.adaptiveSession||q.adaptiveParent||(q.autoPlan!==false&&q.dueDate))return{kind:'adaptive-parent',id:q.id,target};
    const start=q.startDate&&q.startDate>target?q.startDate:target;
    const custom=(state.customQuests||[]).find(x=>x.id===q.id);
    const patch={startDate:start,discardDeferredFrom:date};
    if(custom)Object.assign(custom,patch);
    else{state.overrides=state.overrides||{};state.overrides[q.id]=Object.assign({},state.overrides[q.id]||{},patch)}
    return{kind:'shifted-once',id:q.id,target:start}
  }
  function carryId(q,date,originDate){return`discard-${date}-${String(q.id||'quest').replace(/[^a-zA-Z0-9_-]/g,'-')}-${String(originDate||date).replace(/[^0-9]/g,'')}`}
  function makeCarry(q,date,target,originDate,slot){
    const id=carryId(q,date,originDate);if((state.customQuests||[]).some(x=>x.id===id))return{kind:'existing-copy',id,target};
    const dur=Math.max(10,Number(q.durationMin||((slot?.end||0)-(slot?.start||0))||30));
    const copy={
      id,title:q.title,description:`Reprogramada de ${fmt(date)} porque o dia foi descartado. ${q.description||''}`.trim(),
      domain:q.domain||'Pessoal',category:q.category||'Reprogramada',questType:q.questType==='main'?'main':'side',cadence:'once',weekdays:[],
      startDate:target,dueDate:target,timeStart:q.timeStart||'',timeEnd:'',durationMin:dur,estimatedMinutes:dur,autoPlan:false,
      xp:Math.max(1,Number(q.xp||20)),difficulty:Math.max(1,Number(q.difficulty||2)),owner:q.owner||'Vitor',
      dependencies:Array.isArray(q.dependencies)?q.dependencies.slice():[],correlations:Array.isArray(q.correlations)?q.correlations.slice():[],
      priorityLevel:q.priorityLevel||(q.questType==='main'?'high':'normal'),source:`Reprogramada · ${q.source||'My Performance'}`,
      rescheduledFromDiscard:date,sourceQuestId:q.id,sourceOccurrence:originDate||date
    };
    state.customQuests=state.customQuests||[];state.customQuests.push(copy);return{kind:'makeup-copy',id,target}
  }
  function deferAdaptive(date,target){
    const schedule=state.adaptive?.schedule;if(!Array.isArray(schedule))return 0;let n=0;
    for(const s of schedule){
      if(s?.date!==date||state.completed?.[s.questId])continue;
      s.date=target;s.rescheduledFromDiscard=date;n++
    }
    return n
  }
  function pauseActiveTimer(date){
    const id=state.timeTracking?.activeId;if(!id)return false;const e=(state.timeTracking?.entries||[]).find(x=>x.id===id);if(!e||e.date!==date||e.status!=='running')return false;
    try{S2.pauseTracking(id);return true}catch{return false}
  }
  function reprogram(date,items,target){
    const moved=[],natural=[],adaptive=[];
    for(const item of items){
      const q=item.q,origin=item.originDate||date;
      if(q.adaptiveSession){adaptive.push(q.id);continue}
      if(q.cadence==='once'){moved.push(deferOnce(q,date,target));continue}
      const next=nextSameOccurrence(q,origin,date);
      if(next){natural.push({kind:'natural-recurrence',id:q.id,target:next});continue}
      moved.push(makeCarry(q,date,target,origin,item.slot))
    }
    return{moved,natural,adaptive}
  }
  function discardDay(date=today()){
    ensure();if(discarded(date)){toast('Este dia já foi descartado');return false}
    pauseActiveTimer(date);
    const target=addDays(date,1),snap=pendingRelevant(date),completed=completedToday(date),replanned=reprogram(date,snap.items,target);
    const record={discardedAt:new Date().toISOString(),targetDate:target,completedQuestIds:completed,relevantCount:snap.items.length,moved:replanned.moved,natural:replanned.natural,adaptiveQuestIds:replanned.adaptive,adaptiveMoved:0};
    state.scheduler2.discardedDays[date]=record;
    if(state.scheduler2.dayContexts)delete state.scheduler2.dayContexts[date];
    if(state.dayPlanning?.sleepExtension)delete state.dayPlanning.sleepExtension[date];
    if(state.liveCapacity?.releases)delete state.liveCapacity.releases[date];
    saveState();
    try{window.MyPerformanceAdaptive?.recalculate?.({reason:'discard-day'})}catch(e){console.warn('Discard day adaptive recalc failed',e)}
    record.adaptiveMoved=deferAdaptive(date,target);saveState();
    window.dispatchEvent(new CustomEvent('my-performance-day-discarded',{detail:{date,...record}}));
    render();toast(`Dia descartado · ${record.relevantCount} item(ns) relevante(s) empurrados para frente`);return true
  }
  function confirmDiscard(date=today()){
    ensure();if(discarded(date)){toast('Este dia já foi descartado');return}
    const snap=pendingRelevant(date),completed=completedToday(date).length,total=(snap.plan.slots||[]).filter(x=>!slotDone(x,date)).length,ignored=Math.max(0,total-snap.items.length),m=document.getElementById('modal');
    if(!m)return;
    m.innerHTML=`<div class="modal-backdrop"><div class="modal-card scheduler-confirm discard-day-confirm"><button class="modal-close" id="discardDayClose">×</button><span class="eyebrow">DESCARTAR ${date===today()?'HOJE':fmt(date)}</span><h2>O cronograma do dia não valeu</h2><p class="muted">Use quando o dia desandou e você não quer fingir que o planejamento aconteceu. O sistema preserva conclusões reais e empurra o trabalho relevante para frente.</p><div class="callout danger-lite"><b>${snap.items.length} item(ns) relevante(s)</b> serão reprogramados. ${ignored} rotina(s), âncora(s) ou bloco(s) genérico(s) não serão carregados. <b>${completed} conclusão(ões)</b> já registradas permanecem intactas.</div><p class="muted">Isso não gera XP, não marca falha e não conclui nenhuma missão pendente.</p><div class="modal-actions"><button class="btn" id="discardDayCancel">Cancelar</button><button class="btn danger" id="discardDayConfirm">Descartar dia</button></div></div></div>`;
    const close=()=>{m.innerHTML=''};document.getElementById('discardDayClose').onclick=close;document.getElementById('discardDayCancel').onclick=close;document.getElementById('discardDayConfirm').onclick=()=>{close();discardDay(date)}
  }
  function injectDiscardButton(){
    if(injecting)return;const card=document.querySelector('.scheduler-recalc');if(!card)return;injecting=true;try{
      const grid=card.querySelector('.recalc-grid');if(!grid||document.getElementById('s2DiscardDay'))return;
      const date=today(),rec=discarded(date),b=document.createElement('button');b.className='recalc-option discard-day-option';b.id='s2DiscardDay';b.disabled=!!rec;b.innerHTML=rec?'<b>✓ Dia descartado</b><span>As conclusões foram preservadas e o trabalho relevante já foi empurrado para frente.</span>':'<b>✕ Descartar dia</b><span>O dia desandou: preservar o que já foi concluído e jogar o restante relevante para frente.</span>';b.onclick=()=>confirmDiscard(date);grid.appendChild(b)
    }finally{injecting=false}
  }
  function openRecalcCenter(){BASE_OPEN_RECALC();injectDiscardButton()}
  function applyDiscardedUi(){
    if(state.view!=='today')return;const date=state.plannerDate||today(),rec=discarded(date);if(!rec)return;const view=document.getElementById('view');if(!view)return;
    document.getElementById('discardDayBanner')?.remove();view.querySelectorAll('.late-wake-card,.emergency-day,.rollover-card,#liveCapacityNotice').forEach(e=>e.remove());
    const head=view.querySelector('.planner-head')||view.querySelector('.section-title');if(head)head.insertAdjacentHTML('afterend',`<div class="card discard-day-banner" id="discardDayBanner"><span class="eyebrow">DIA DESCARTADO</span><h2>Agenda encerrada sem progresso fictício</h2><p class="muted">${rec.relevantCount||0} item(ns) relevante(s) foram empurrados para frente. ${(rec.completedQuestIds||[]).length} conclusão(ões) reais foram preservadas. Rotinas e âncoras perdidas não viraram backlog artificial.</p></div>`);
    const tl=view.querySelector('.day-timeline');if(tl)tl.innerHTML='<div class="empty">Nenhuma missão pendente permanece neste dia. O trabalho relevante foi reprogramado para frente.</div>';
    const badge=document.querySelector('.hero .pill.amber');if(badge)badge.textContent='DIA DESCARTADO';
    document.querySelectorAll('.planner-stats .mini-stat').forEach(card=>{const label=(card.querySelector('span')?.textContent||'').trim();if(label==='Capacidade'){card.classList.remove('danger');const b=card.querySelector('b'),s=card.querySelector('small');if(b)b.textContent='Dia descartado';if(s)s.textContent='sem overload ou falha fictícia'}})
  }
  function plan(date=today()){
    const p=clone(BASE_PLAN(date));if(!discarded(date))return p;p.discardedDay=true;p.discardRecord=discarded(date);p.slots=[];p.liveFill=[];p.movedOut=[];p.critical=[];p.used=0;return p
  }
  function missionNow(date=today(),now=new Date()){
    if(discarded(date))return{plan:plan(date),current:null,next:null,minute:now.getHours()*60+now.getMinutes()};
    return BASE_MISSION_NOW?BASE_MISSION_NOW(date,now):{plan:plan(date),current:null,next:null,minute:now.getHours()*60+now.getMinutes()}
  }
  function summary(date=today()){
    const s=BASE_SUMMARY?BASE_SUMMARY(date):{date,plan:plan(date)};if(discarded(date)){s.plan=plan(date);s.discardedDay=true;s.discardRecord=discarded(date)}return s
  }

  scheduled=function(q,date=today()){if(discarded(date)&&!occurrenceDone(q,date))return false;return BASE_SCHEDULED(q,date)};
  window.MyPerformanceRoutine.planDay=plan;window.MyPerformanceRoutine.missionNow=missionNow;
  S2.plan=plan;S2.missionNow=missionNow;S2.summary=summary;S2.openRecalcCenter=openRecalcCenter;S2.discardDay=discardDay;S2.confirmDiscardDay=confirmDiscard;
  window.MyPerformanceDiscardDay={VERSION,discardDay,confirmDiscard,isRelevant,record:discarded};

  const observer=new MutationObserver(ms=>{if(ms.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.scheduler-recalc')||n.querySelector?.('.scheduler-recalc')))))requestAnimationFrame(injectDiscardButton)});
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('my-performance-view-rendered',()=>{injectDiscardButton();applyDiscardedUi()});
  window.addEventListener('my-performance-cloud-loaded',()=>setTimeout(()=>{ensure();applyDiscardedUi()},60));
  setTimeout(()=>{injectDiscardButton();applyDiscardedUi()},80);

  if(!document.getElementById('discardDayStyle')){const s=document.createElement('style');s.id='discardDayStyle';s.textContent='.discard-day-option{border-color:rgba(255,107,107,.62)!important;background:rgba(255,107,107,.08)!important}.discard-day-option b{color:#ffc2c2}.discard-day-option:disabled{opacity:.7}.discard-day-banner{margin:0 0 12px;border-color:rgba(255,184,77,.38);border-style:dashed}.discard-day-banner h2{margin:4px 0 6px}';document.head.appendChild(s)}
})();
