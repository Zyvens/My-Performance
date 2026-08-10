"use strict";
/* Scheduler 2.0 — late-wake contingency, time tracking, weekly quotas, real dashboard, quick add and goal diagnostics. */
(function(){
  if(!window.MyPerformanceRoutine||!window.MyPerformanceSchedulerCore)return;
  const CORE=window.MyPerformanceSchedulerCore;
  const BASE_PLAN=window.MyPerformanceRoutine.planDay;
  const BASE_RENDER_TODAY=renderToday;
  const BASE_RENDER_DASHBOARD=renderDashboard;
  const BASE_RENDER_CONFIG=renderConfig;
  const BASE_MISSION_NOW=window.MyPerformanceRoutine.missionNow;
  const SYSTEM_START=window.MyPerformanceAdaptive?.SYSTEM_START||'2026-08-10';
  const OBJECTIVES=[
    {id:'gsa-main-hacktown-2026',short:'HackTown',title:'HackTown 2026'},
    {id:'gsa-main-eva-launch',short:'EVA',title:'Lançamento da EVA'},
    {id:'gsa-main-editais',short:'Editais',title:'Editais / FAPERJ'}
  ];
  const TRACK_MIN_FOR_WORKOUT=60;
  const BNI_ORG_TARGET=120;
  const BNI_MEETING_TARGET=300;
  let renderLock=false,currentPlanSlots=[];

  function ensure(){
    state.scheduler2=state.scheduler2||{};
    state.scheduler2.version=2;
    state.scheduler2.dayContexts=state.scheduler2.dayContexts||{};
    state.scheduler2.lastDiagnosis=state.scheduler2.lastDiagnosis||null;
    state.scheduler2.lastDayRecalcAt=state.scheduler2.lastDayRecalcAt||'';
    state.scheduler2.lastWeekRecalcAt=state.scheduler2.lastWeekRecalcAt||'';
    state.scheduler2.syntheticDone=state.scheduler2.syntheticDone||{};
    state.timeTracking=state.timeTracking||{};
    state.timeTracking.entries=Array.isArray(state.timeTracking.entries)?state.timeTracking.entries:[];
    state.timeTracking.activeId=state.timeTracking.activeId||'';
  }
  ensure();

  const toMin=window.MyPerformanceRoutine.toMin;
  const toTime=window.MyPerformanceRoutine.toTime;
  const clonePlan=p=>JSON.parse(JSON.stringify(p||{}));
  const nowMinute=()=>{const n=new Date();return n.getHours()*60+n.getMinutes()};
  const dow=d=>dfrom(d).getDay();
  const duration=x=>Math.max(0,Number(x?.end||0)-Number(x?.start||0));
  const entryElapsed=(e,at=Date.now())=>Math.max(0,Number(e?.accumulatedMs||0)+(e?.status==='running'&&e.lastResumedAt?Math.max(0,at-new Date(e.lastResumedAt).getTime()):0));
  const fmtDuration=ms=>{const sec=Math.floor(Math.max(0,ms)/1000),h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`};
  const level=q=>window.MyPerformanceAdaptive?.priority?.(q)||q?.priorityLevel||(q?.questType==='main'?'high':'normal');
  const score=(q,date=today())=>{
    const lv={critical:500,high:380,normal:220,low:80}[level(q)]||220;
    const domains=state.routineSettings?.domainPriority||['GSA','Estudos','Pessoal','Carreira'];
    const di=domains.indexOf(q?.domain),domain=(di<0?0:(4-di)*55),due=q?.dueDate?Math.max(0,260-Math.max(0,diffDays(date,q.dueDate))*18):0;
    return lv+domain+due+(q?.questType==='main'?120:0)+(q?.capacityGsa?90:0)+(q?.dailyMinimum?150:0)
  };
  const syntheticDoneKey=(q,date)=>`${q?.id||'unknown'}@${date}`;
  const isDoneSlot=(x,date)=>{
    if(x?.q?.dailyMinimum)return !!state.dayPlanning?.minimumDone?.[date]?.[x.q.domain];
    if(state.scheduler2?.syntheticDone?.[syntheticDoneKey(x?.q,x?.originDate||date)])return true;
    try{return done(x.q,x.originDate||date)}catch{return false}
  };
  const isGeneratedAnchor=q=>!!q&&(q.anchorBlock||/^(wake|breakfast|lunch|dinner|shower|rest)-/.test(q.id||''));
  const isMuay=q=>/^routine-muay/.test(q?.id||'')||/muay thai/i.test(q?.title||'');
  const isGym=q=>q?.id==='personal-gym'||/treino de academia/i.test(q?.title||'');
  const isHard=q=>!!q&&(q.fixedTime||q.essential||q.commuteBlock)&&!isGeneratedAnchor(q)&&!isGym(q);
  const workOrStudy=q=>['GSA','Carreira','Estudos'].includes(q?.domain)||String(q?.category||'').toLowerCase().includes('bni');
  const skipMap=date=>state.dayPlanning?.skipped?.[date]||{};
  const isSkipped=(date,q)=>!!(skipMap(date)[q?.id]||(q?.parentId&&Object.values(skipMap(date)).some(x=>x?.parentId===q.parentId)));

  function hardCutoffFor(date){
    const w=dow(date),extreme=!!state.weekendProtection?.extreme?.[date];
    if(extreme)return null;
    if(w===5)return 18*60;
    if(w===6)return 12*60;
    return null
  }
  function dayContext(date){ensure();return state.scheduler2.dayContexts[date]||null}
  function actualWake(date){return Number(dayContext(date)?.actualWakeMin??NaN)}
  function anchorQuest(id,title,category,description){return{id,title,description,domain:'Pessoal',category,questType:'side',cadence:'once',durationMin:0,xp:0,difficulty:1,essential:true,anchorBlock:true,scheduler2Synthetic:true}}
  function addOccupied(occupied,start,end){occupied.push({start,end});occupied.sort((a,b)=>a.start-b.start)}
  const overlap=(a,b)=>a.start<b.end&&a.end>b.start;
  function findGap(occupied,start,end,dur,pref=start){
    if(end-start<dur)return null;const xs=occupied.filter(x=>x.end>start&&x.start<end).slice().sort((a,b)=>a.start-b.start),gaps=[];let cur=start;
    for(const x of xs){if(x.start-cur>=dur)gaps.push({start:cur,end:x.start});cur=Math.max(cur,x.end)}if(end-cur>=dur)gaps.push({start:cur,end});
    if(!gaps.length)return null;return gaps.map(g=>({g,st:Math.max(g.start,Math.min(pref,g.end-dur))})).sort((a,b)=>Math.abs(a.st-pref)-Math.abs(b.st-pref)||a.st-b.st)[0].st
  }
  function put(slots,occupied,q,start,dur,date,reason,extra={}){const x=Object.assign({q,originDate:date,start,end:start+dur,key:`${q.id}|${date}`,reason},extra);slots.push(x);addOccupied(occupied,x.start,x.end);return x}
  function place(slots,occupied,q,dur,start,end,pref,date,reason,extra={}){const st=findGap(occupied,start,end,dur,pref);return st==null?null:put(slots,occupied,q,st,dur,date,reason,extra)}

  function baseCandidates(base,date){
    const list=[];const seen=new Set();
    const add=x=>{if(!x?.q||isGeneratedAnchor(x.q)||isDoneSlot(x,date)||isSkipped(date,x.q))return;const k=`${x.q.id}|${x.originDate||date}`;if(seen.has(k))return;seen.add(k);list.push(Object.assign({},x,{originDate:x.originDate||date}))};
    (base.slots||[]).forEach(add);(base.capacityDeferred||[]).forEach(add);(base.movedOut||[]).forEach(add);return list
  }
  function placeLateAnchors(p,date,slots,occupied,wake,end,candidates,warnings){
    put(slots,occupied,anchorQuest(`wake-${date}`,'Acordei agora','Rotina','Início real do dia registrado pelo Scheduler.'),wake,10,date,'horário real de despertar');
    const breakfast=anchorQuest(`breakfast-${date}`,'Café da manhã','Alimentação','20 min protegidos para café da manhã.');
    if(!place(slots,occupied,breakfast,20,wake,end,wake+10,date,'âncora refeita após despertar tardio'))warnings.push('Café da manhã não coube na janela contingenciada.');

    const gymItem=candidates.find(x=>isGym(x.q));
    if(gymItem){
      const muayUpcoming=candidates.filter(x=>isMuay(x.q)&&isHard(x.q)&&x.start>=wake).sort((a,b)=>a.start-b.start)[0];
      const gymPref=muayUpcoming?Math.max(wake+30,muayUpcoming.end+10):wake+35;
      const gym=place(slots,occupied,gymItem.q,90,wake,end,gymPref,date,'treino reposicionado pelo contingenciamento',{originDate:gymItem.originDate||date});
      if(gym){
        const shower=anchorQuest(`shower-${date}`,'Banho','Higiene','30 min protegidos para banho e transição.');
        if(!place(slots,occupied,shower,30,wake,end,gym.end,date,'pós-treino protegido'))warnings.push('Banho pós-treino precisou ficar sem bloco dedicado.');
      }else warnings.push('Treino de 1h30 não coube após o horário real de despertar; quota semanal ficará pendente.');
    }else{
      const shower=anchorQuest(`shower-${date}`,'Banho','Higiene','30 min protegidos para higiene.');
      place(slots,occupied,shower,30,wake,end,wake+90,date,'higiene protegida')
    }
    const mealGap=Math.max(180,Math.floor((end-wake)/3));
    const lunch=anchorQuest(`lunch-${date}`,'Almoço','Alimentação','1h protegida para almoço.');
    const dinner=anchorQuest(`dinner-${date}`,'Jantar','Alimentação','1h protegida para jantar.');
    if(!place(slots,occupied,lunch,60,wake,end,wake+mealGap,date,'refeição protegida'))warnings.push('Almoço não coube integralmente.');
    if(!place(slots,occupied,dinner,60,wake,end,Math.min(end-60,wake+mealGap*2),date,'refeição protegida'))warnings.push('Jantar não coube integralmente.');
    for(let i=0;i<2;i++){
      const rest=anchorQuest(`rest-${date}-${i+1}`,`Pausa de descanso ${i+1}/2`,'Lazer','15 min de lazer/descanso distribuídos no dia.');
      place(slots,occupied,rest,15,wake,end,wake+Math.round((end-wake)*(i?0.72:0.38)),date,'recuperação distribuída')
    }
  }
  function placeCandidate(p,date,x,slots,occupied,wake,end,warnings){
    const q=x.q,dur=Math.max(10,Number(q.durationMin||duration(x)||30));
    const pref=Math.max(wake,Number(x.start||toMin(q.timeStart)||wake));
    const st=findGap(occupied,wake,end,dur,pref);
    if(st!=null){put(slots,occupied,q,st,dur,date,x.start<wake?'recuperada após despertar tardio':'reencaixada pelo Scheduler 2.0',{originDate:x.originDate||date,carried:(x.originDate||date)!==date});return true}
    if((q.capacityBlock||q.adaptiveSession)&&dur>15){
      for(let part=Math.floor(Math.min(dur,60)/15)*15;part>=15;part-=15){const s=findGap(occupied,wake,end,part,pref);if(s!=null){put(slots,occupied,q,s,part,date,'bloco parcial reencaixado pelo Scheduler 2.0',{originDate:x.originDate||date,partial:true,originalDuration:dur});return true}}
    }
    return false
  }
  function applyLateWake(base,date){
    const ctx=dayContext(date),wake=Number(ctx?.actualWakeMin);if(!Number.isFinite(wake))return base;
    const hardCutoff=hardCutoffFor(date),standardEnd=Number(base.end||toMin(state.routineSettings?.sleepTime||'22:00')||22*60),windowInfo=CORE.computeLateWakeWindow({actualWake:wake,standardEnd,hardCutoff});
    const p=clonePlan(base);p.originalWake=base.wake;p.originalEnd=base.end;p.wake=windowInfo.wake;p.end=windowInfo.end;p.requestedSleep=windowInfo.end;p.lateWake=true;p.lateWakeContext=ctx;p.lateWarnings=[];p.lateDeferred=[];p.lateMissed=[];
    if(p.end<=p.wake){p.slots=[];p.used=0;p.lateWarnings.push('O horário real de despertar ficou após o limite protegido deste dia. Use uma exceção extrema apenas se realmente necessário.');return p}
    const candidates=baseCandidates(base,date);
    const slots=[],occupied=[];
    const bni=candidates.find(x=>x.q.id==='gsa-bni-weekly');
    const hard=candidates.filter(x=>isHard(x.q)&&!isGym(x.q));
    for(const x of hard.sort((a,b)=>a.start-b.start)){
      if(isMuay(x.q)&&dow(date)===3&&bni){p.lateMissed.push(Object.assign({},x,{reason:'Muay Thai bloqueado na quarta: BNI 06:00–11:00'}));continue}
      if(x.end<=wake){p.lateMissed.push(Object.assign({},x,{reason:'horário fixo já encerrado ao acordar'}));continue}
      let st=x.start,en=x.end;if(st<wake){st=wake;if(en-st<10){p.lateMissed.push(Object.assign({},x,{reason:'janela fixa restante insuficiente'}));continue}}
      if(en>p.end){p.lateMissed.push(Object.assign({},x,{reason:'horário fixo ficou fora da nova janela'}));continue}
      if(occupied.some(o=>overlap({start:st,end:en},o))){p.lateMissed.push(Object.assign({},x,{reason:'conflito fixo no contingenciamento'}));continue}
      slots.push(Object.assign({},x,{start:st,end:en,reason:st!==x.start?'atividade fixa já em andamento · entrada tardia':'horário fixo preservado'}));addOccupied(occupied,st,en)
    }
    placeLateAnchors(p,date,slots,occupied,wake,p.end,candidates,p.lateWarnings);
    const flex=candidates.filter(x=>!isHard(x.q)&&!isGym(x.q)).sort((a,b)=>score(b.q,date)-score(a.q,date)||String(a.q.dueDate||'9999').localeCompare(String(b.q.dueDate||'9999')));
    for(const x of flex)if(!placeCandidate(p,date,x,slots,occupied,wake,p.end,p.lateWarnings))p.lateDeferred.push(Object.assign({},x,{reason:'sem espaço após recalcular a partir do horário real'}));
    p.slots=slots.sort((a,b)=>a.start-b.start);p.used=p.slots.reduce((n,x)=>n+duration(x),0);
    p.movedOut=(base.movedOut||[]).concat(p.lateDeferred);
    if(windowInfo.lateAfterNoon)p.lateWarnings.push(`Despertar após 12:00: janela operacional estendida para pelo menos 12h, até ${toTime(p.end)}.`);
    return p
  }
  function schedulerPlan(date=today()){ensure();const p=applyLateWake(clonePlan(BASE_PLAN(date)),date);p.slots=(p.slots||[]).filter(x=>!isDoneSlot(x,date));p.used=p.slots.reduce((n,x)=>n+duration(x),0);return p}
  function schedulerMissionNow(date=today(),now=new Date()){
    const p=schedulerPlan(date),m=now.getHours()*60+now.getMinutes(),current=p.slots.find(x=>m>=x.start&&m<x.end&&!isDoneSlot(x,date)),next=p.slots.find(x=>x.start>m&&!isDoneSlot(x,date));return{plan:p,current:current||null,next:next||null,minute:m}
  }

  function objectiveIdFor(q){
    if(!q)return'';if(OBJECTIVES.some(o=>o.id===q.id))return q.id;if(OBJECTIVES.some(o=>o.id===q.parentId))return q.parentId;
    const text=`${q.category||''} ${q.title||''} ${q.description||''}`.toLowerCase();if(text.includes('hacktown'))return'gsa-main-hacktown-2026';if(/\beva\b/.test(text))return'gsa-main-eva-launch';if(text.includes('edital')||text.includes('faperj')||text.includes('lattes'))return'gsa-main-editais';return''
  }
  function activeEntry(){ensure();return state.timeTracking.entries.find(e=>e.id===state.timeTracking.activeId)||null}
  function findEntryFor(q,date){return state.timeTracking.entries.slice().reverse().find(e=>e.questId===q.id&&e.date===date&&e.status!=='done')||null}
  function trackingEvent(type,e){window.dispatchEvent(new CustomEvent('my-performance-tracking',{detail:{type,entry:Object.assign({},e),elapsedMs:entryElapsed(e)}}))}
  function pauseEntry(e,silent=false){if(!e||e.status!=='running')return e;if(e.lastResumedAt)e.accumulatedMs=Number(e.accumulatedMs||0)+Math.max(0,Date.now()-new Date(e.lastResumedAt).getTime());e.lastResumedAt='';e.status='paused';if(state.timeTracking.activeId===e.id)state.timeTracking.activeId='';if(!silent){saveState();trackingEvent('pause',e);render()}return e}
  function startTracking(q,date,originDate=date){
    ensure();if(!q||q.dailyMinimum)return;const current=activeEntry();if(current&&current.questId!==q.id)pauseEntry(current,true);
    let e=findEntryFor(q,date);if(!e){e={id:`tt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`,questId:q.id,parentId:q.parentId||'',objectiveId:objectiveIdFor(q),title:q.title,domain:q.domain||'',category:q.category||'',date,originDate,startedAt:new Date().toISOString(),lastResumedAt:'',accumulatedMs:0,status:'paused'};state.timeTracking.entries.push(e)}
    e.status='running';e.lastResumedAt=new Date().toISOString();e.objectiveId=e.objectiveId||objectiveIdFor(q);state.timeTracking.activeId=e.id;saveState();trackingEvent('start',e);render();toast(`Timer iniciado · ${q.title}`)
  }
  function pauseTracking(id){const e=state.timeTracking.entries.find(x=>x.id===id)||activeEntry();if(e)pauseEntry(e)}
  function completeTracking(id){
    ensure();const e=state.timeTracking.entries.find(x=>x.id===id)||activeEntry();if(!e)return;if(e.status==='running')pauseEntry(e,true);e.status='done';e.endedAt=new Date().toISOString();state.timeTracking.activeId='';saveState();trackingEvent('complete',e);
    const q=questById(e.questId);if(q&&!done(q,e.originDate||e.date))toggleQuest(q.id,e.originDate||e.date);else{if(!q)state.scheduler2.syntheticDone[syntheticDoneKey({id:e.questId},e.originDate||e.date)]=new Date().toISOString();saveState();render();toast(`Tempo registrado · ${fmtDuration(e.accumulatedMs)}`)}
  }
  function trackedMinutes(filter){return state.timeTracking.entries.filter(filter).reduce((n,e)=>n+entryElapsed(e),0)/60000}
  function objectiveMinutes(id){return trackedMinutes(e=>e.objectiveId===id)}
  function trackedDayMinutes(date,domain=''){return trackedMinutes(e=>e.date===date&&(!domain||e.domain===domain))}

  function weekDates(date=today()){const ws=weekStart(date);return Array.from({length:7},(_,i)=>addDays(ws,i))}
  function weeklyQuota(date=today()){
    const days=weekDates(date),ws=days[0],we=days[6],inWeek=e=>e.date>=ws&&e.date<=we;
    const trainingByDate={};for(const e of state.timeTracking.entries.filter(e=>inWeek(e)&&(e.questId==='personal-gym'||/treino|academia/i.test(`${e.category} ${e.title}`))))trainingByDate[e.date]=(trainingByDate[e.date]||0)+entryElapsed(e)/60000;
    for(const d of days){const q=questById('personal-gym');if(q&&done(q,d))trainingByDate[d]=Math.max(trainingByDate[d]||0,90)}
    const workouts=Object.values(trainingByDate).filter(m=>m>=TRACK_MIN_FOR_WORKOUT).length;
    const bniOrg=Math.round(trackedMinutes(e=>inWeek(e)&&(e.questId==='gsa-bni-organization'||/organizar bni/i.test(e.title||''))));
    const bniMeeting=Math.round(trackedMinutes(e=>inWeek(e)&&e.questId==='gsa-bni-weekly'));
    return{weekStart:ws,weekEnd:we,workouts:CORE.quotaStatus(workouts,5),bniOrg:CORE.quotaStatus(bniOrg,BNI_ORG_TARGET),bniMeeting:CORE.quotaStatus(bniMeeting,BNI_MEETING_TARGET),trainingByDate}
  }
  function objectiveDiagnosis(date=today()){
    const alerts=window.MyPerformanceAdaptive?.alerts?.()||[];
    const result=OBJECTIVES.map(o=>{
      const q=questById(o.id)||quests().find(x=>x.id===o.id);if(!q)return Object.assign({},o,{missing:true,status:'critical',label:'Ausente'});
      const actual=Math.round(objectiveMinutes(o.id));
      if(o.id==='gsa-main-editais'){
        const ws=weekStart(date),weekActual=Math.round(trackedMinutes(e=>e.date>=ws&&e.date<=addDays(ws,6)&&e.objectiveId===o.id));
        const target=Math.max(30,Number(q.durationMin||120));const qs=CORE.quotaStatus(weekActual,target);return Object.assign({},o,{q,actualMinutes:actual,estimatedMinutes:target,weeklyActual:weekActual,weeklyTarget:target,status:qs.status==='done'?'ok':qs.status==='attention'?'attention':'critical',label:qs.status==='done'?'No ritmo':qs.status==='attention'?'Atenção':'Crítica',daysLeft:6-diffDays(ws,date),actualPct:qs.pct,expectedPct:Math.min(100,Math.round(((diffDays(ws,date)+1)/7)*100)),remaining:qs.remaining})
      }
      const estimate=Math.max(30,Number(window.MyPerformanceAdaptive?.estimateMinutes?.(q)||q.estimatedMinutes||q.durationMin||240)),a=alerts.find(x=>x.parentId===o.id),health=CORE.goalHealth({actualMinutes:actual,estimatedMinutes:estimate,startDate:q.startDate||SYSTEM_START,dueDate:q.dueDate,todayDate:date,behindMinutes:a?.behindMin||0});
      return Object.assign({},o,{q,actualMinutes:actual,estimatedMinutes:estimate},health)
    });
    const critical=result.filter(x=>x.status==='critical').length,attention=result.filter(x=>x.status==='attention').length;return{date,items:result,critical,attention,generatedAt:new Date().toISOString()}
  }
  function plannedWeek(date=today()){
    const by={GSA:0,Estudos:0,Pessoal:0,Carreira:0},days=weekDates(date);for(const d of days){const p=schedulerPlan(d);for(const x of p.slots||[])by[x.q.domain]=(by[x.q.domain]||0)+duration(x)}return by
  }
  function actualWeek(date=today()){
    const by={GSA:0,Estudos:0,Pessoal:0,Carreira:0},days=weekDates(date),ws=days[0],we=days[6];for(const e of state.timeTracking.entries)if(e.date>=ws&&e.date<=we)by[e.domain]=(by[e.domain]||0)+entryElapsed(e)/60000;return by
  }
  function summary(date=today()){
    const p=schedulerPlan(date),q=weeklyQuota(date),diag=objectiveDiagnosis(date),active=activeEntry();return{date,plan:p,lateWake:dayContext(date),weekly:q,diagnosis:diag,activeTracking:active?Object.assign({},active,{elapsedMs:entryElapsed(active)}):null,trackedTodayMin:Math.round(trackedDayMinutes(date))}
  }

  function trackingButtons(x,date,index){
    if(x.q.dailyMinimum||isGeneratedAnchor(x.q))return'';const mine=state.timeTracking.entries.slice().reverse().find(e=>e.questId===x.q.id&&e.date===date&&e.status!=='done'),doneEntry=state.timeTracking.entries.slice().reverse().find(e=>e.questId===x.q.id&&e.date===date&&e.status==='done');
    if(mine?.status==='running')return`<div class="time-track active"><span class="track-clock" data-track-clock="${esc(mine.id)}">${fmtDuration(entryElapsed(mine))}</span><button class="btn small" data-track-pause="${esc(mine.id)}">Ⅱ Pausar</button><button class="btn small primary" data-track-complete="${esc(mine.id)}">✓ Concluir</button></div>`;
    if(mine?.status==='paused')return`<div class="time-track paused"><span class="track-clock">${fmtDuration(entryElapsed(mine))}</span><button class="btn small primary" data-track-start="${index}">▶ Retomar</button><button class="btn small" data-track-complete="${esc(mine.id)}">✓ Concluir</button></div>`;
    if(doneEntry)return`<div class="time-track done"><span>⏱ ${fmtDuration(entryElapsed(doneEntry))} reais</span></div>`;
    return`<div class="time-track"><button class="btn small" data-track-start="${index}">▶ Iniciar</button></div>`
  }
  function contextText(q){
    if(q.adaptiveSession||q.parentId){const p=questById(q.parentId);return`Este bloco foi criado pelo Scheduler para avançar ${p?.title||'a meta principal'} sem concentrar trabalho no prazo final. Remover daqui afeta somente hoje; a meta principal continua aberta.`}
    if(/zerar leads sem resposta/i.test(q.title||''))return'Só execute se houver leads realmente aguardando resposta. Se a fila estiver zerada, remova esta missão do dia: isso não conta como falha e libera o bloco para outra prioridade.';
    if(q.description)return q.description;return'O Scheduler colocou esta missão aqui pela combinação de prioridade, prazo e espaço disponível.'
  }
  function displayQuest(q){if(q.adaptiveSession||q.parentId){const p=questById(q.parentId);return Object.assign({},q,{title:`Progresso · ${p?.title||String(q.title||'').replace(/^Avançar\s*·\s*/,'')}`})}return q}
  function schedulerQuestCard(q,date){
    const real=questById(q.id);if(real||q.adaptiveSession)return questCard(q,date,true);
    const meta=[`<span class="tag ${esc(q.domain||'')}">${esc(q.domain||'')}</span>`,q.category?`<span class="pill">${esc(q.category)}</span>`:'',`<span class="pill">${Number(q.durationMin||30)} min</span>`].join('');
    return`<article class="quest ${q.questType==='main'?'main':''}"><div class="quest-head"><div class="synthetic-mark">◆</div><div><div class="quest-title">${esc(q.title)}</div><div class="quest-meta">${meta}</div></div><div class="quest-actions"><span class="pill">Scheduler</span></div></div></article>`
  }
  function slotHtml(x,date,index){
    const q=x.q,dq=displayQuest(q),canRemove=!q.fixedTime&&!q.essential&&!q.dailyMinimum&&!isGeneratedAnchor(q),moved=(x.originDate||date)!==date;
    if(isGeneratedAnchor(q))return`<div class="routine-slot scheduler-anchor"><div class="routine-time"><b>${toTime(x.start)}</b><span>${toTime(x.end)}</span></div><div class="routine-quest"><div class="scheduler-anchor-card"><b>${esc(q.title)}</b><span>${esc(q.description||x.reason||'Âncora protegida')}</span></div></div></div>`;
    if(q.dailyMinimum)return`<div class="routine-slot daily-minimum-slot"><div class="routine-time"><b>${toTime(x.start)}</b><span>${toTime(x.end)}</span></div><div class="routine-quest"><article class="quest"><div class="quest-head"><button class="check" data-s2-min="${esc(q.domain)}">✓</button><div><div class="quest-title">${esc(q.title)}</div><div class="quest-desc">${esc(q.description||'Mínimo diário protegido.')}</div><div class="quest-meta"><span class="tag ${esc(q.domain)}">${esc(q.domain)}</span><span class="pill adaptive-priority high">◆ MÍNIMO DIÁRIO</span></div></div></div></article></div></div>`;
    return`<div class="routine-slot scheduler2-slot ${q.questType==='main'?'main':''} ${moved?'rolled':''}"><div class="routine-time"><b>${toTime(x.start)}</b><span>${toTime(x.end)}</span></div><div class="routine-quest">${moved?'<div class="rollover-note">↪ reencaixada de outro dia</div>':''}${schedulerQuestCard(dq,x.originDate||date)}<div class="scheduler-context">${esc(contextText(q))}</div><div class="routine-reason">${esc(x.reason||'Scheduler 2.0')} · ${duration(x)} min</div><div class="scheduler-slot-actions">${trackingButtons(x,date,index)}${canRemove?`<button class="mini-link scheduler-remove" data-s2-remove="${index}">⊘ Remover do dia</button>`:''}</div></div></div>`
  }
  function lateBanner(p,date){if(!p.lateWake)return'';return`<div class="card late-wake-card"><div><span class="eyebrow">CONTINGENCIAMENTO ATIVO</span><h2>Rota recalculada a partir de ${toTime(p.wake)}</h2><p class="muted">${p.lateWakeContext?.afterNoon?'Como o despertar foi após 12:00, o dia ganhou uma janela operacional mínima de 12h. ':''}O horário padrão da rotina não foi alterado. ${p.lateDeferred?.length||0} bloco(s) ficaram para replanejamento.</p>${p.lateWarnings?.length?`<div class="late-warnings">${p.lateWarnings.map(x=>`<span>⚠ ${esc(x)}</span>`).join('')}</div>`:''}</div><button class="btn" id="s2RestoreWake">Voltar ao horário padrão</button></div>`}
  function activeTrackerDock(){
    let e=document.getElementById('schedulerTrackerDock');if(e)return e;const mission=document.getElementById('missionNowDock');if(!mission)return null;e=document.createElement('section');e.id='schedulerTrackerDock';e.className='scheduler-tracker-dock';mission.insertAdjacentElement('afterend',e);return e
  }
  function updateTrackerDock(){const host=activeTrackerDock();if(!host)return;const e=activeEntry();if(!e){host.innerHTML='';host.hidden=true;return}host.hidden=false;host.innerHTML=`<div class="card tracker-dock-card"><div><span class="eyebrow">TEMPO REAL EM CURSO</span><b>${esc(e.title)}</b><span>${esc(e.domain)}${e.objectiveId?' · ligado a '+esc(OBJECTIVES.find(o=>o.id===e.objectiveId)?.short||'Main Quest'):''}</span></div><strong data-track-clock="${esc(e.id)}">${fmtDuration(entryElapsed(e))}</strong><div><button class="btn small" data-track-pause="${esc(e.id)}">Ⅱ</button><button class="btn small primary" data-track-complete="${esc(e.id)}">✓</button></div></div>`;bindTrackingButtons()}
  function bindTrackingButtons(){
    document.querySelectorAll('[data-track-start]').forEach(b=>b.onclick=()=>{const x=currentPlanSlots[Number(b.dataset.trackStart)];if(x)startTracking(x.q,state.plannerDate||today(),x.originDate||state.plannerDate||today())});
    document.querySelectorAll('[data-track-pause]').forEach(b=>b.onclick=()=>pauseTracking(b.dataset.trackPause));
    document.querySelectorAll('[data-track-complete]').forEach(b=>b.onclick=()=>completeTracking(b.dataset.trackComplete));
  }
  function removalModal(x,date){
    const q=x.q,domainCount=currentPlanSlots.filter(s=>s.q.domain===q.domain&&!isDoneSlot(s,date)&&s!==x).length,rec=CORE.recommendRemoval(q,{daysToDue:q.dueDate?diffDays(date,q.dueDate):null,onlyDomainMission:domainCount===0});
    if(!rec.allowed){toast(rec.reason);return}
    const m=document.getElementById('modal');m.innerHTML=`<div class="modal-backdrop"><div class="modal-card scheduler-confirm"><button class="modal-close" id="s2CancelRemove">×</button><span class="eyebrow">REMOVER SOMENTE DE ${date===today()?'HOJE':fmt(date)}</span><h2>${esc(q.title)}</h2><div class="callout ${rec.tone==='warn'?'danger-lite':''}">${esc(rec.reason)}</div><p class="muted">Descrição/contexto: ${esc(contextText(q))}</p><div class="modal-actions"><button class="btn" id="s2KeepMission">Manter missão</button><button class="btn danger" id="s2ConfirmRemove">Remover do dia</button></div></div></div>`;
    const close=()=>m.innerHTML='';document.getElementById('s2CancelRemove').onclick=close;document.getElementById('s2KeepMission').onclick=close;document.getElementById('s2ConfirmRemove').onclick=()=>{close();window.MyPerformanceDay?.skip?.(q,date)}
  }
  function completeMinimum(date,domain){state.dayPlanning=state.dayPlanning||{};state.dayPlanning.minimumDone=state.dayPlanning.minimumDone||{};state.dayPlanning.minimumDone[date]=state.dayPlanning.minimumDone[date]||{};state.dayPlanning.minimumDone[date][domain]=new Date().toISOString();saveState();render();toast(`${domain}: mínimo diário concluído`)}

  function renderTodayS2(){
    BASE_RENDER_TODAY();const date=state.plannerDate||today(),p=schedulerPlan(date),view=document.getElementById('view');if(!view)return;currentPlanSlots=p.slots||[];
    const tl=view.querySelector('.day-timeline');if(tl)tl.innerHTML=currentPlanSlots.map((x,i)=>slotHtml(x,date,i)).join('')||'<div class="empty">Nenhuma missão programada nesta janela.</div>';
    const existing=view.querySelector('.late-wake-card');existing?.remove();const head=view.querySelector('.planner-head')||view.querySelector('.section-title');if(p.lateWake&&head)head.insertAdjacentHTML('afterend',lateBanner(p,date));
    const recalc=document.getElementById('adaptiveRecalc');if(recalc){recalc.textContent='↻ Recalcular / Diagnóstico';recalc.onclick=openRecalcCenter}
    document.querySelectorAll('[data-s2-remove]').forEach(b=>b.onclick=()=>{const x=currentPlanSlots[Number(b.dataset.s2Remove)];if(x)removalModal(x,date)});
    document.querySelectorAll('[data-s2-min]').forEach(b=>b.onclick=()=>completeMinimum(date,b.dataset.s2Min));
    document.getElementById('s2RestoreWake')?.addEventListener('click',()=>clearWake(date));
    bindQuestCards();bindTrackingButtons();updateTrackerDock();
    if(p.lateWake){const cards=document.querySelectorAll('.planner-stats .mini-stat');if(cards[0]){cards[0].querySelector('b').textContent=`${toTime(p.wake)} → ${toTime(p.end)}`;cards[0].querySelector('small').textContent=`rota real · ${((p.end-p.wake)/60).toFixed(1)}h de janela operacional`}}
  }

  function setWakeNow(){
    const date=today(),m=nowMinute();ensure();state.scheduler2.dayContexts[date]={actualWakeMin:m,recordedAt:new Date().toISOString(),afterNoon:m>12*60};state.plannerDate=date;state.scheduler2.lastDayRecalcAt=new Date().toISOString();saveState();window.MyPerformanceAdaptive?.recalculate?.({manual:true,reason:'woke-now'});window.dispatchEvent(new CustomEvent('my-performance-scheduler-recalculated',{detail:{scope:'day',reason:'woke-now',lateWake:true,wake:toTime(m)}}));closeModal();render();toast(`Rota refeita a partir de ${toTime(m)}`)
  }
  function clearWake(date=today()){ensure();delete state.scheduler2.dayContexts[date];saveState();window.dispatchEvent(new CustomEvent('my-performance-scheduler-recalculated',{detail:{scope:'day',reason:'restore-standard'}}));render();toast('Horário padrão restaurado para este dia')}
  function recalcDay(){ensure();state.scheduler2.lastDayRecalcAt=new Date().toISOString();saveState();window.MyPerformanceAdaptive?.recalculate?.({manual:true,reason:'scheduler2-day'});window.dispatchEvent(new CustomEvent('my-performance-scheduler-recalculated',{detail:{scope:'day',reason:'manual'}}));closeModal();render();toast('Dia recalculado com as mudanças atuais')}
  function recalcWeek(){ensure();state.scheduler2.lastWeekRecalcAt=new Date().toISOString();const d=objectiveDiagnosis();state.scheduler2.lastDiagnosis=d;saveState();window.MyPerformanceAdaptive?.recalculate?.({manual:true,reason:'scheduler2-week'});window.dispatchEvent(new CustomEvent('my-performance-scheduler-recalculated',{detail:{scope:'week',reason:'manual',diagnosis:d}}));closeModal();render();toast('Semana recalculada e metas reavaliadas')}
  function closeModal(){const m=document.getElementById('modal');if(m)m.innerHTML=''}
  function diagnosisHtml(d){return d.items.map(x=>{if(x.missing)return`<div class="goal-health critical"><b>${esc(x.title)}</b><span>Quest não encontrada no catálogo</span></div>`;const actual=(x.actualMinutes/60).toFixed(1),estimate=(x.estimatedMinutes/60).toFixed(1),extra=x.weeklyTarget?`${Math.round(x.weeklyActual)} / ${Math.round(x.weeklyTarget)} min nesta semana`:`${x.actualPct}% real vs ${x.expectedPct}% esperado · ${x.daysLeft} dia(s) até o prazo`;return`<div class="goal-health ${x.status}"><div><span class="pill adaptive-priority ${x.status==='critical'?'critical':x.status==='attention'?'high':'normal'}">${esc(x.label)}</span><b>${esc(x.title)}</b><span>${extra}</span></div><strong>${actual}h reais</strong><small>Estimativa atual do sistema: ${estimate}h${x.behindMinutes?` · ${Math.round(x.behindMinutes)} min atrás`:''}</small></div>`}).join('')}
  function openDiagnosis(){const d=objectiveDiagnosis();state.scheduler2.lastDiagnosis=d;saveState();const m=document.getElementById('modal');m.innerHTML=`<div class="modal-backdrop"><div class="modal-card scheduler-diagnosis"><button class="modal-close" id="s2CloseDiag">×</button><span class="eyebrow">DIAGNÓSTICO DAS GRANDES MISSÕES</span><h2>${d.critical?'Situação crítica em '+d.critical+' frente(s)':d.attention?'Há '+d.attention+' frente(s) pedindo atenção':'Grandes missões no ritmo esperado'}</h2><p class="muted">O diagnóstico cruza prazo, estimativa configurada no motor adaptativo, atraso acumulado e <b>horas reais registradas pelo timer</b>.</p><div class="goal-health-list">${diagnosisHtml(d)}</div><div class="callout">A estimativa de esforço pode ser ajustada ao editar cada Main Quest. O timer nunca inventa horas: só contabiliza tempo iniciado no aplicativo.</div></div></div>`;document.getElementById('s2CloseDiag').onclick=closeModal;window.dispatchEvent(new CustomEvent('my-performance-goal-diagnosis',{detail:d}))}
  function openRecalcCenter(){
    const m=document.getElementById('modal'),ctx=dayContext(today()),now=toTime(nowMinute());m.innerHTML=`<div class="modal-backdrop"><div class="modal-card scheduler-recalc"><button class="modal-close" id="s2CloseRecalc">×</button><span class="eyebrow">SCHEDULER 2.0</span><h2>Recalcular calendário</h2><p class="muted">Escolha o alcance. Nenhuma opção marca missão como concluída nem cria progresso fictício.</p><div class="recalc-grid"><button class="recalc-option primary" id="s2WokeNow"><b>☀ Acordei só agora</b><span>Registrar ${now} e refazer toda a rota restante de hoje.${nowMinute()>12*60?' Como passou de 12:00, criar no mínimo 12h de janela operacional.':''}</span></button><button class="recalc-option" id="s2Day"><b>↻ Recalcular dia</b><span>Usar prioridades, exclusões, timers, Muay/BNI e mudanças atuais sem alterar outros dias.</span></button><button class="recalc-option" id="s2Week"><b>▦ Recalcular semana</b><span>Redistribuir sessões adaptativas e reavaliar quotas de BNI, treino e metas estratégicas.</span></button><button class="recalc-option" id="s2Diag"><b>⚠ Diagnóstico de metas</b><span>Ver quão crítica está a situação de HackTown, EVA e Editais usando prazo + horas reais.</span></button></div>${ctx?`<button class="btn" id="s2ClearWake">Remover contingenciamento de ${toTime(ctx.actualWakeMin)}</button>`:''}</div></div>`;
    document.getElementById('s2CloseRecalc').onclick=closeModal;document.getElementById('s2WokeNow').onclick=setWakeNow;document.getElementById('s2Day').onclick=recalcDay;document.getElementById('s2Week').onclick=recalcWeek;document.getElementById('s2Diag').onclick=openDiagnosis;document.getElementById('s2ClearWake')?.addEventListener('click',()=>{closeModal();clearWake(today())})
  }

  function weeklyDashboardHtml(date=today()){
    const quota=weeklyQuota(date),planned=plannedWeek(date),actual=actualWeek(date),diag=objectiveDiagnosis(date),totalActual=Object.values(actual).reduce((a,b)=>a+b,0);
    const domainRows=['GSA','Estudos','Pessoal','Carreira'].map(d=>`<div class="week-domain-row"><b>${d}</b><span>${(Number(actual[d]||0)/60).toFixed(1)}h reais</span><small>${(Number(planned[d]||0)/60).toFixed(1)}h planejadas</small><div class="progress"><i style="width:${Math.min(100,Math.round((actual[d]||0)/Math.max(1,planned[d]||1)*100))}%"></i></div></div>`).join('');
    const quotaCard=(title,q,unit='')=>`<div class="quota-item ${q.status}"><div><b>${title}</b><span>${Math.round(q.actual)}${unit} / ${Math.round(q.target)}${unit}</span></div><strong>${q.pct}%</strong><div class="progress"><i style="width:${q.pct}%"></i></div></div>`;
    return`<section class="scheduler-week"><div class="section-title"><div><span class="eyebrow">DASHBOARD SEMANAL REAL</span><h2>${fmt(quota.weekStart)} → ${fmt(quota.weekEnd)}</h2><p class="muted">Planejado vem do Scheduler; realizado vem do timer e das conclusões. Sem horas presumidas.</p></div><button class="btn small" id="s2DashboardDiag">Diagnóstico</button></div><div class="grid4 scheduler-week-kpis"><div class="card mini-stat"><span>Tempo real registrado</span><b>${(totalActual/60).toFixed(1)}h</b><small>semana atual</small></div><div class="card mini-stat"><span>Treinos</span><b>${Math.round(quota.workouts.actual)}/5</b><small>sessões ≥ ${TRACK_MIN_FOR_WORKOUT} min ou concluídas</small></div><div class="card mini-stat"><span>BNI organização</span><b>${Math.round(quota.bniOrg.actual)} min</b><small>meta 120 min/semana</small></div><div class="card mini-stat ${diag.critical?'danger':''}"><span>Main Quests críticas</span><b>${diag.critical}</b><small>${diag.attention} em atenção</small></div></div><div class="grid2"><div class="card"><span class="eyebrow">HORAS POR CAMPANHA</span><h2>Real × planejado</h2>${domainRows}</div><div class="card"><span class="eyebrow">QUOTAS SEMANAIS</span><h2>BNI e treino</h2>${quotaCard('Treino · 5x',quota.workouts,'x')}${quotaCard('Organização BNI · 2h',quota.bniOrg,' min')}${quotaCard('Reunião BNI · 5h',quota.bniMeeting,' min')}</div></div><div class="card"><span class="eyebrow">HORAS REAIS NAS MAIN QUESTS GSA</span><h2>HackTown · EVA · Editais</h2><div class="goal-health-list compact">${diagnosisHtml(diag)}</div></div></section>`
  }
  function renderDashboardS2(){BASE_RENDER_DASHBOARD();const v=document.getElementById('view');if(!v)return;v.insertAdjacentHTML('afterbegin',weeklyDashboardHtml());document.getElementById('s2DashboardDiag')?.addEventListener('click',openDiagnosis);updateTrackerDock()}

  function openQuickAdd(){
    const m=document.getElementById('modal');m.innerHTML=`<div class="modal-backdrop"><div class="modal-card quick-add-s2"><button class="modal-close" id="s2QuickClose">×</button><span class="eyebrow">QUICK ADD</span><h2>Nova missão em poucos campos</h2><div class="field"><label>O que precisa ser feito?</label><input id="s2QuickTitle" autofocus placeholder="Ex.: Revisar pitch da EVA"></div><div class="form-row"><div class="field"><label>Campanha</label><select id="s2QuickDomain"><option>GSA</option><option>Estudos</option><option>Pessoal</option><option>Carreira</option></select></div><div class="field"><label>Duração</label><select id="s2QuickDuration"><option value="15">15 min</option><option value="30" selected>30 min</option><option value="45">45 min</option><option value="60">60 min</option><option value="90">1h30</option></select></div></div><div class="form-row"><div class="field"><label>Prioridade</label><select id="s2QuickPriority"><option value="normal">Normal</option><option value="high">Alta</option><option value="critical">Crítica</option><option value="low">Baixa</option></select></div><div class="field"><label>Prazo (opcional)</label><input id="s2QuickDue" type="date" min="${today()}" value="${today()}"></div></div><div class="field"><label>Contexto (opcional)</label><input id="s2QuickDescription" placeholder="O suficiente para você entender a missão depois"></div><div class="modal-actions"><button class="btn" id="s2QuickFull">Editor completo</button><button class="btn primary" id="s2QuickSave">Adicionar e recalcular</button></div></div></div>`;
    document.getElementById('s2QuickClose').onclick=closeModal;document.getElementById('s2QuickFull').onclick=()=>{closeModal();openQuestModal()};document.getElementById('s2QuickSave').onclick=saveQuickAdd
  }
  function saveQuickAdd(){
    const title=document.getElementById('s2QuickTitle').value.trim();if(!title){toast('Dê um nome para a missão');return}
    const domain=document.getElementById('s2QuickDomain').value,dur=Number(document.getElementById('s2QuickDuration').value||30),priority=document.getElementById('s2QuickPriority').value,due=document.getElementById('s2QuickDue').value||today(),description=document.getElementById('s2QuickDescription').value.trim();
    const q={id:`custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`,title,description:description||`Missão criada pelo Quick Add em ${fmt(today())}.`,domain,category:'Quick Add',questType:priority==='critical'||priority==='high'?'main':'side',cadence:'once',startDate:today(),dueDate:due,durationMin:dur,estimatedMinutes:dur,autoPlan:due>today(),priorityLevel:priority,xp:Math.max(8,Math.round(dur/2)),difficulty:priority==='critical'?4:priority==='high'?3:2,source:'Quick Add'};
    state.customQuests.push(q);saveState();window.MyPerformanceAdaptive?.recalculate?.({reason:'quick-add'});closeModal();state.plannerDate=today();go('today');toast('Missão adicionada e agenda recalculada')
  }
  function bindQuickAdd(){const b=document.getElementById('quickAdd');if(b){b.textContent='+ Missão';b.onclick=openQuickAdd}}

  renderConfig=function(){BASE_RENDER_CONFIG();const v=document.getElementById('view');if(!v)return;const q=weeklyQuota(),ctx=dayContext(today());v.insertAdjacentHTML('beforeend',`<div class="section-title"><div><span class="eyebrow">SCHEDULER 2.0</span><h2>Estado do motor operacional</h2><p class="muted">Time tracking, contingenciamento, quotas e diagnóstico usam o mesmo plano final mostrado em Hoje.</p></div></div><div class="grid2"><div class="card"><h2>Contingenciamento</h2><div class="statline"><span>Hoje</span><b>${ctx?`Acordou ${toTime(ctx.actualWakeMin)}`:'Rotina padrão'}</b></div><div class="statline"><span>Após 12:00</span><b>mín. 12h de janela</b></div><button class="btn" id="s2ConfigRecalc">Abrir central de recálculo</button></div><div class="card"><h2>Quotas atuais</h2><div class="statline"><span>Treino</span><b>${Math.round(q.workouts.actual)}/5</b></div><div class="statline"><span>BNI organização</span><b>${Math.round(q.bniOrg.actual)}/120 min</b></div><div class="statline"><span>BNI reunião</span><b>${Math.round(q.bniMeeting.actual)}/300 min</b></div><button class="btn" id="s2ConfigDiag">Diagnóstico de Main Quests</button></div></div>`);document.getElementById('s2ConfigRecalc').onclick=openRecalcCenter;document.getElementById('s2ConfigDiag').onclick=openDiagnosis}

  function schedulerBriefingText(){
    const s=summary(),p=s.plan,open=(p.slots||[]).filter(x=>!isDoneSlot(x,s.date)),first=open[0],quota=s.weekly,diag=s.diagnosis;
    let text=`Scheduler dois ponto zero. Hoje há ${open.length} blocos abertos e ${Math.round(s.trackedTodayMin)} minutos reais já registrados.`;
    if(s.lateWake)text+=` O contingenciamento está ativo desde ${toTime(s.lateWake.actualWakeMin)}.`;
    if(first)text+=` A próxima missão é ${first.q.title}, às ${toTime(first.start)}.`;
    text+=` Na semana, treino está em ${Math.round(quota.workouts.actual)} de 5 e organização do BNI em ${Math.round(quota.bniOrg.actual)} de 120 minutos.`;
    if(diag.critical)text+=` Existem ${diag.critical} grandes missões em situação crítica.`;else if(diag.attention)text+=` Existem ${diag.attention} grandes missões pedindo atenção.`;else text+=' As grandes missões estão no ritmo esperado.';return text
  }
  function hookNarrator(){
    const n=window.MyPerformanceNarrator;if(!n)return;n.schedulerBriefing=()=>n.say(schedulerBriefingText(),{force:true});
    const b=document.getElementById('narratorQuick');if(b)b.onclick=()=>n.schedulerBriefing();
  }

  window.MyPerformanceRoutine.planDay=schedulerPlan;
  window.MyPerformanceRoutine.missionNow=schedulerMissionNow;
  window.MyPerformanceScheduler2={plan:schedulerPlan,missionNow:schedulerMissionNow,summary,weeklyQuota,objectiveDiagnosis,objectiveMinutes,trackedDayMinutes,startTracking,pauseTracking,completeTracking,setWakeNow,clearWake,recalcDay,recalcWeek,openRecalcCenter,openDiagnosis,schedulerBriefingText};
  window.addEventListener('my-performance-cloud-loaded',()=>setTimeout(()=>{ensure();render();bindQuickAdd();hookNarrator()},50));
  window.addEventListener('my-performance-view-rendered',()=>{bindQuickAdd();hookNarrator();updateTrackerDock()});
  setInterval(()=>{document.querySelectorAll('[data-track-clock]').forEach(el=>{const e=state.timeTracking?.entries?.find(x=>x.id===el.dataset.trackClock);if(e)el.textContent=fmtDuration(entryElapsed(e))});updateTrackerDock()},1000);
  const BASE_RENDER=render;render=function(){if(renderLock)return;renderLock=true;try{BASE_RENDER();bindQuickAdd();hookNarrator();updateTrackerDock()}finally{renderLock=false}};
  renderToday=renderTodayS2;renderDashboard=renderDashboardS2;
  bindQuickAdd();hookNarrator();setTimeout(()=>render(),0);
})();
