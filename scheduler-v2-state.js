"use strict";
(function(){
  if(!window.MyPerformanceSchedulerCore||!window.MyPerformanceRoutine)return;
  const C=window.MyPerformanceSchedulerCore,SYSTEM_START=C.SYSTEM_START;
  const GSA_TARGET=480,BNI_WEEKLY=120,WORKOUT_WEEKLY=5,BUFFER_MIN=45;
  const ACTIVE_MAIN=['gsa-main-hacktown-2026','gsa-main-eva-launch','gsa-main-editais'];
  const MAIN_ESTIMATES={'gsa-main-hacktown-2026':1800,'gsa-main-eva-launch':3600,'gsa-main-editais':1500};
  const REBUILT=new Set(['personal-wake','personal-sleep','personal-breakfast','personal-lunch','personal-gym','personal-leisure','routine-dinner','routine-shower-post-gym','routine-hygiene-am','routine-hygiene-night','routine-tomorrow','routine-water-am','routine-sun-mobility','routine-day-brief','routine-gsa-focus-am','routine-gsa-pre-muay','routine-gsa-post-muay','routine-gsa-focus-pm','routine-gsa-admin','routine-muay','routine-muay-commute','routine-muay-return','routine-muay-friday']);
  const LEGACY_QUESTS=quests;quests=function(){return LEGACY_QUESTS().filter(q=>!q.adaptiveSession)};
  const qclone=q=>JSON.parse(JSON.stringify(q));
  function addSeed(q){if(!QUEST_SEED.some(x=>x.id===q.id))QUEST_SEED.push(q)}
  function seedRules(){
    addSeed({id:'gsa-bni-weekly',title:'BNI Fire — reunião semanal',description:'Reunião semanal do BNI Fire. Networking, referências e desenvolvimento comercial da GSA. Conta como 5h das 8h de GSA da quarta-feira.',domain:'GSA',category:'BNI',questType:'main',cadence:'weekly',weekdays:[3],timeStart:'06:00',timeEnd:'11:00',durationMin:300,fixedTime:true,essential:true,externalActivity:true,countsAsGsa:true,xp:90,difficulty:3,priorityLevel:'critical',source:'Scheduler 2.0'});
    addSeed({id:'gsa-bni-organization',title:'Organização do BNI — quota semanal',description:'Preparar convidados, referências, esfera, follow-ups e pauta. Meta de pelo menos 2h por semana, distribuível em segunda, terça ou sexta.',domain:'GSA',category:'BNI Organização',questType:'main',cadence:'weekly',weekdays:[1,2,5],durationMin:120,countsAsGsa:true,xp:60,difficulty:2,priorityLevel:'high',source:'Scheduler 2.0'});
    addSeed({id:'gsa-main-hacktown-2026',title:'HackTown 2026 — presença estratégica da GSA',description:'Preparar narrativa, materiais, demonstração, agenda de networking, parceiros e objetivos comerciais para o HackTown no início de setembro.',domain:'GSA',category:'HackTown',questType:'main',cadence:'once',startDate:SYSTEM_START,dueDate:'2026-09-03',estimatedMinutes:1800,xp:220,difficulty:5,priorityLevel:'critical',autoPlan:false,source:'Campanha GSA'});
    addSeed({id:'gsa-main-eva-launch',title:'Lançamento da EVA — setembro',description:'Produto, demonstração, posicionamento, materiais, parceiros e preparação comercial do lançamento da EVA.',domain:'GSA',category:'EVA',questType:'main',cadence:'once',startDate:SYSTEM_START,dueDate:'2026-09-30',estimatedMinutes:3600,xp:260,difficulty:5,priorityLevel:'high',autoPlan:false,source:'Campanha GSA'});
    addSeed({id:'gsa-main-editais',title:'Editais — FAPERJ ou outra oportunidade',description:'Mapear, qualificar, preparar e submeter a GSA/EVA a editais aderentes. FAPERJ tem prioridade quando houver chamada aplicável.',domain:'GSA',category:'Editais',questType:'main',cadence:'weekly',weekdays:[1,2,5],durationMin:120,estimatedMinutes:1500,xp:65,difficulty:4,priorityLevel:'high',source:'Campanha GSA'});
    state.overrides=state.overrides||{};state.overrides['gsa-r-bni']=Object.assign({},state.overrides['gsa-r-bni']||{},{disabled:true});
    for(const id of ['gsa-main-hacktown-2026','gsa-main-eva-launch'])state.overrides[id]=Object.assign({},state.overrides[id]||{},{autoPlan:false,estimatedMinutes:MAIN_ESTIMATES[id]});
  }
  function ensure(){
    seedRules();const s=state.schedulerV2=state.schedulerV2||{};s.version=2;s.settings=Object.assign({reviewWindow:'morning',reviewMinutes:20,operationalBufferMin:BUFFER_MIN,energy:'normal',fifthWorkoutDay:6},s.settings||{});
    if(!['morning','night'].includes(s.settings.reviewWindow))s.settings.reviewWindow='morning';s.settings.reviewMinutes=Math.max(15,Math.min(30,Number(s.settings.reviewMinutes||20)));if(![0,6].includes(Number(s.settings.fifthWorkoutDay)))s.settings.fifthWorkoutDay=6;
    for(const k of ['decisions','blockCompletions','tracked','manualOffsets','weekendExtreme','sleepEmergency'])s[k]=s[k]||{};s.tracking=s.tracking||null;
    state.routineSettings=state.routineSettings||{};state.routineSettings.muayDays=(state.routineSettings.muayDays||[]).map(Number).filter(d=>[1,5].includes(d));
    Object.keys(s.decisions).forEach(d=>{if(d<today())delete s.decisions[d]});Object.keys(s.weekendExtreme).forEach(d=>{if(d<today())delete s.weekendExtreme[d]});return s
  }
  const S=()=>ensure(),decision=(date,type,id)=>!!S().decisions?.[date]?.[type]?.[id];
  function setDecision(date,type,q,on=true){const s=S();s.decisions[date]=s.decisions[date]||{deferred:{},excluded:{}};s.decisions[date][type]=s.decisions[date][type]||{};if(on)s.decisions[date][type][q.id]={title:q.title,domain:q.domain,parentId:q.parentId||'',at:new Date().toISOString()};else delete s.decisions[date][type][q.id]}
  function restoreDecision(date,type,id){if(S().decisions?.[date]?.[type])delete S().decisions[date][type][id]}
  function slotKey(q,date,suffix=''){return`${q.id}|${date}${suffix?`|${suffix}`:''}`}
  function offsetFor(date,key){return Number(S().manualOffsets?.[date]?.[key]||0)}
  function moveOffset(date,key,delta){S().manualOffsets[date]=S().manualOffsets[date]||{};S().manualOffsets[date][key]=Math.max(-240,Math.min(240,Number(S().manualOffsets[date][key]||0)+delta))}
  function completionRows(){return Object.values(S().blockCompletions||{})}
  function trackedForParent(id){return completionRows().filter(x=>x.parentId===id).reduce((n,x)=>n+Number(x.actualMinutes||0),0)}
  function currentWeekDates(date){const ws=C.weekStart(date);return Array.from({length:7},(_,i)=>addDays(ws,i))}
  function weeklyMetrics(date=today()){
    const ds=currentWeekDates(date),a=ds[0],b=ds[6],rows=completionRows().filter(x=>x.date>=a&&x.date<=b);const sum=f=>rows.filter(f).reduce((n,x)=>n+Number(x.actualMinutes||0),0);
    const objectives={};for(const id of ACTIVE_MAIN){const target=Number(state.overrides?.[id]?.estimatedMinutes||questById(id)?.estimatedMinutes||MAIN_ESTIMATES[id]),doneM=trackedForParent(id);objectives[id]={target,done:doneM,pct:Math.min(100,Math.round(doneM/Math.max(1,target)*100))}}
    return{start:a,end:b,gsa:sum(x=>x.domain==='GSA'||x.countsAsGsa),study:sum(x=>x.domain==='Estudos'),bni:sum(x=>x.category==='BNI Organização'),workouts:new Set(rows.filter(x=>x.sourceQuestId==='personal-gym').map(x=>x.date)).size,objectives}
  }
  function workoutsDoneBefore(date){const ws=C.weekStart(date);return new Set(completionRows().filter(x=>x.date>=ws&&x.date<date&&x.sourceQuestId==='personal-gym').map(x=>x.date)).size}
  function workoutNeeded(date){const w=C.dow(date),n=workoutsDoneBefore(date);if([1,2,3,4].includes(w))return true;if(w===5&&(state.routineSettings?.muayDays||[]).map(Number).includes(5))return true;if(w===6||w===0)return n<WORKOUT_WEEKLY;return false}
  function hard(q){return!!q.fixedTime||!!q.essential||q.id==='gsa-bni-weekly'||(q.externalActivity&&q.timeStart)}
  function duration(q){const n=Number(state.questPlans?.[q.id]?.durationMin||q.durationMin||0);if(n>0)return Math.max(10,n);if(q.timeStart&&q.timeEnd){const a=C.toMin(q.timeStart),b=C.toMin(q.timeEnd);if(a!=null&&b!=null)return Math.max(10,(b-a+1440)%1440)}return q.domain==='GSA'?30:q.domain==='Estudos'?45:30}
  function normalize(q){const z=qclone(q);if(z.adaptiveSession||/^Avançar\s*·/i.test(z.title||'')){z.title=String(z.title||'').replace(/^Avançar\s*·\s*/i,'Sessão · ');const p=questById(z.parentId);z.description=`Sessão automática para avançar ${p?.title||'a meta-mãe'} antes do prazo. ${p?.description||z.description||''}`.trim()}return z}
  function estimateParent(q){const n=Number(q.estimatedMinutes||state.questPlans?.[q.id]?.estimatedMinutes||0);if(n>0)return n;return Math.max(120,q.questType==='main'?240:120,Number(q.difficulty||2)*45)}
  function eligibleDays(q,date){let n=0;for(let d=date;d<=q.dueDate;d=addDays(d,1)){const w=C.dow(d);if(['GSA','Carreira'].includes(q.domain)){if(w>=1&&w<=5)n++}else if(q.domain==='Estudos'){if(w!==0)n++}else n++}return Math.max(1,n)}
  function makeQ(id,title,domain,category,description,extra={}){return Object.assign({id,title,description,domain,category,questType:'side',cadence:'once',xp:0,difficulty:1,synthetic:true},extra)}
  function deadlineSessions(date){const out=[];for(const p of quests().filter(q=>q.cadence==='once'&&q.dueDate&&q.dueDate>=date&&!hard(q)&&q.autoPlan!==false&&!hasEverDone(q.id)&&!ACTIVE_MAIN.includes(q.id))){if(date<(p.startDate||SYSTEM_START))continue;const remaining=Math.max(0,estimateParent(p)-trackedForParent(p.id));if(!remaining)continue;const max=S().settings.energy==='low'?45:S().settings.energy==='high'?120:60,mins=Math.max(30,Math.min(max,Math.ceil((remaining/eligibleDays(p,date))/15)*15)),start=p.startDate||SYSTEM_START,span=Math.max(1,Math.round((dfrom(p.dueDate)-dfrom(start))/864e5)),elapsed=Math.max(0,Math.round((dfrom(date)-dfrom(start))/864e5)),behind=Math.max(0,Math.round(estimateParent(p)*Math.min(1,elapsed/span)-trackedForParent(p.id)));out.push(makeQ(`deadline-${p.id}-${date}`,`Sessão · ${p.title}`,p.domain,p.category||'Plano adaptativo',`Sessão de ${mins} min para distribuir ${remaining} min restantes até ${fmt(p.dueDate)}.${behind>=30?` Cerca de ${behind} min estão abaixo do ritmo esperado e foram redistribuídos sem duplicar a meta.`:''} ${p.description||''}`.trim(),{parentId:p.id,deadlineSession:true,priorityLevel:p.priorityLevel||(p.questType==='main'?'high':'normal'),durationMin:mins,dueDate:date,source:'Scheduler 2.0'}))}return out}
  function candidates(date){const base=quests().filter(q=>!REBUILT.has(q.id)&&q.id!=='gsa-bni-organization'&&!ACTIVE_MAIN.includes(q.id)&&scheduled(q,date)&&!done(q,date)&&!(q.cadence==='once'&&q.dueDate&&q.autoPlan!==false&&!hard(q)));return base.concat(deadlineSessions(date)).map(normalize).filter(q=>!decision(date,'deferred',q.id)&&!decision(date,'excluded',q.id)).filter(q=>C.domainAllowed(q.domain,date,{weekendExtreme:!!S().weekendExtreme[date]}))}
  ensure();window.MPSV2={C,S,SYSTEM_START,GSA_TARGET,BNI_WEEKLY,WORKOUT_WEEKLY,ACTIVE_MAIN,MAIN_ESTIMATES,REBUILT,decision,setDecision,restoreDecision,slotKey,offsetFor,moveOffset,completionRows,trackedForParent,weeklyMetrics,workoutNeeded,hard,duration,makeQ,candidates,ensure};
})();
