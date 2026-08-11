"use strict";
/* Schedule Authority — final source of truth for the standard weekly calendar and Today timeline. */
(function(){
  if(!window.MyPerformanceCanonicalWeek||!window.MyPerformanceRoutine)return;

  const BASE_PLAN=window.MyPerformanceRoutine.planDay;
  const BASE_MISSION_NOW=window.MyPerformanceRoutine.missionNow;
  const BASE_RENDER_TODAY=renderToday;
  const S2=window.MyPerformanceScheduler2||null;
  const STUDY_MIN=180;
  const toTime=window.MyPerformanceRoutine.toTime||function(n){n=((Math.round(Number(n)||0)%1440)+1440)%1440;return`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`};
  const clone=x=>JSON.parse(JSON.stringify(x||{}));
  const dur=x=>Math.max(0,Number(x?.end||0)-Number(x?.start||0));
  const overlap=(a,b)=>Number(a.start)<Number(b.end)&&Number(a.end)>Number(b.start);
  const dow=date=>dfrom(date).getDay();

  const MANDATORY={
    2:[{id:'personal-therapy-weekly',title:'Terapia',domain:'Pessoal',category:'Saúde',start:480,end:510}],
    3:[{id:'gsa-bni-weekly',title:'BNI Fire — reunião semanal',domain:'GSA',category:'BNI',start:360,end:660}],
    4:[{id:'personal-zion-brave-weekly',title:'Célula Zion Brave',domain:'Pessoal',category:'Fé / Comunidade',start:1140,end:1380}]
  };

  function discarded(date){try{return!!window.MyPerformanceDiscardDay?.record?.(date)}catch{return false}}
  function lateWake(date){const n=Number(state?.scheduler2?.dayContexts?.[date]?.actualWakeMin);return Number.isFinite(n)}
  function realQuest(id,fallback){let q=null;try{q=questById(id)}catch{}return Object.assign({},fallback||{},clone(q||{}))}
  function mandatoryQuest(spec){return realQuest(spec.id,{id:spec.id,title:spec.title,description:'Compromisso fixo obrigatório do template semanal.',domain:spec.domain,category:spec.category,questType:'main',cadence:'weekly',xp:0,difficulty:1,priorityLevel:'critical',source:'Agenda canônica'} )}
  function isMandatory(q){return !!q&&Object.values(MANDATORY).flat().some(x=>x.id===q.id)}
  function mandatoryFor(date){return MANDATORY[dow(date)]||[]}

  function repairMandatory(p,date){
    p=clone(p);p.date=date;p.slots=Array.isArray(p.slots)?p.slots:[];p.capacityWarnings=p.capacityWarnings||[];p.critical=p.critical||[];
    for(const spec of mandatoryFor(date)){
      const previous=p.slots.filter(x=>x?.q?.id===spec.id);
      p.slots=p.slots.filter(x=>x?.q?.id!==spec.id);
      const blockers=p.slots.filter(x=>overlap(x,spec));
      for(const x of blockers){
        if(isMandatory(x.q))continue;
        p.slots=p.slots.filter(y=>y!==x);
        p.capacityDeferred=p.capacityDeferred||[];
        p.capacityDeferred.push(Object.assign({},x,{reason:`reorganizada porque ${spec.title} é compromisso obrigatório da agenda`}));
      }
      const q=Object.assign({},mandatoryQuest(spec),{id:spec.id,title:spec.title,domain:spec.domain,category:spec.category,fixedTime:true,essential:true,externalActivity:true,priorityLevel:'critical',canonicalMandatory:true});
      p.slots.push({q,originDate:date,start:spec.start,end:spec.end,key:`${spec.id}|${date}`,reason:'compromisso obrigatório da agenda canônica',canonicalMandatory:true});
      if(previous.length>1)p.capacityWarnings.push(`${spec.title}: ${previous.length} cópias antigas foram consolidadas em um único compromisso obrigatório.`)
    }
    p.slots.sort((a,b)=>a.start-b.start||a.end-b.end);
    p.used=p.slots.reduce((n,x)=>n+dur(x),0);
    return p
  }

  function validate(p,date){
    const issues=[];const xs=(p.slots||[]).slice().sort((a,b)=>a.start-b.start||a.end-b.end);
    for(let i=1;i<xs.length;i++)if(overlap(xs[i-1],xs[i]))issues.push(`Colisão: ${xs[i-1].q?.title||'?'} × ${xs[i].q?.title||'?'}`);
    for(const spec of mandatoryFor(date)){
      const hits=xs.filter(x=>x.q?.id===spec.id);
      if(hits.length!==1)issues.push(`${spec.title} deve aparecer exatamente uma vez`);
      else if(hits[0].start!==spec.start||hits[0].end!==spec.end)issues.push(`${spec.title} deve permanecer ${toTime(spec.start)}–${toTime(spec.end)}`)
    }
    const w=dow(date),study=xs.filter(x=>x.q?.domain==='Estudos').reduce((n,x)=>n+dur(x),0);
    if(w>=1&&w<=6&&study<STUDY_MIN)issues.push(`Estudo abaixo de 3h (${study} min)`);
    return{ok:issues.length===0,issues,study}
  }

  function standardPlan(date){
    let p;
    try{p=window.MyPerformanceCanonicalWeek.plan(date)}catch(e){console.error('Canonical week failed; using last routine plan',e);p=BASE_PLAN(date)}
    p=repairMandatory(p,date);
    const check=validate(p,date);p.scheduleAuthority={version:1,canonical:true,validated:check.ok,issues:check.issues,studyMinutes:check.study};
    p.capacity=p.capacity||{};p.capacity.studyProtectedMin=dow(date)===0?0:STUDY_MIN;p.capacity.scheduleAuthority=true;
    if(!check.ok)p.capacityWarnings=(p.capacityWarnings||[]).concat(check.issues.map(x=>`Autoridade da agenda: ${x}`));
    return p
  }

  function plan(date=today()){
    if(discarded(date))return BASE_PLAN(date);
    if(lateWake(date)&&date===today()){
      const p=repairMandatory(BASE_PLAN(date),date);p.scheduleAuthority={version:1,canonical:false,contingency:true,validated:validate(p,date).ok};return p
    }
    return standardPlan(date)
  }

  function missionNow(date=today(),now=new Date()){
    const p=plan(date),m=now.getHours()*60+now.getMinutes(),current=(p.slots||[]).find(x=>m>=x.start&&m<x.end),next=(p.slots||[]).find(x=>x.start>m);return{plan:p,current:current||null,next:next||null,minute:m}
  }

  function syntheticCard(q){
    const mandatory=isMandatory(q);return`<article class="quest ${mandatory?'main':''}"><div class="quest-head"><div class="synthetic-mark">${mandatory?'★':'◆'}</div><div><div class="quest-title">${esc(q.title||'Bloco')}</div><div class="quest-meta"><span class="tag ${esc(q.domain||'')}">${esc(q.domain||'Agenda')}</span>${q.category?`<span class="pill">${esc(q.category)}</span>`:''}${mandatory?'<span class="pill amber">OBRIGATÓRIA</span>':'<span class="pill">Agenda canônica</span>'}</div></div></div></article>`
  }
  function cardFor(q,date){let real=null;try{real=questById(q.id)}catch{};return real?questCard(Object.assign({},q,real,{canonicalMandatory:q.canonicalMandatory||isMandatory(q)}),date,true):syntheticCard(q)}
  function slotHtml(x,date,index){
    const q=x.q||{},mandatory=isMandatory(q)||x.canonicalMandatory,origin=x.originDate||date;
    const canTrack=!!S2?.startTracking&&!q.anchorBlock&&!q.dailyMinimum;
    const canRemove=!mandatory&&!q.fixedTime&&!q.essential&&!q.commuteBlock&&!q.canonicalWeek;
    return`<div class="routine-slot schedule-authority-slot ${mandatory?'mandatory-slot':''}" data-authority-slot="${index}"><div class="routine-time"><b>${toTime(x.start)}</b><span>${toTime(x.end)}</span></div><div class="routine-quest">${mandatory?'<div class="rollover-note">★ compromisso obrigatório · não pode ser deslocado por outras missões</div>':''}${cardFor(q,origin)}<div class="routine-reason">${esc(x.reason||'Agenda canônica')} · ${dur(x)} min</div><div class="scheduler-slot-actions">${canTrack?`<button class="btn small" data-authority-track="${index}">▶ Iniciar</button>`:''}${canRemove?`<button class="mini-link" data-authority-remove="${index}">⊘ Remover do dia</button>`:''}</div></div></div>`
  }

  function updateStats(p,date){
    const study=(p.slots||[]).filter(x=>x.q?.domain==='Estudos').reduce((n,x)=>n+dur(x),0),gsa=(p.slots||[]).filter(x=>x.q?.domain==='GSA'||x.q?.countsAsGsa).reduce((n,x)=>n+dur(x),0);
    document.querySelectorAll('.planner-stats .mini-stat').forEach(card=>{
      const label=(card.querySelector('span')?.textContent||'').trim(),b=card.querySelector('b'),small=card.querySelector('small');
      if(/Acordar|Dormir/i.test(label)&&b){b.textContent=`${toTime(p.wake)} → ${toTime(p.end)}`;if(small)small.textContent='template semanal canônico'}
      if(label==='Missões encaixadas'&&b){b.textContent=String((p.slots||[]).length);if(small)small.textContent='agenda validada sem sobreposição'}
      if(label==='Capacidade'&&b){card.classList.remove('danger');b.textContent=p.scheduleAuthority?.validated===false?'Revisar agenda':'Plano canônico';if(small)small.textContent=`Estudo ${(study/60).toFixed(1)}h · GSA ${(gsa/60).toFixed(1)}h`}
    })
  }

  function renderTodayAuthority(){
    let baseError=null;try{BASE_RENDER_TODAY()}catch(e){baseError=e;console.error('Previous Today renderer failed; schedule authority taking over',e)}
    const date=state.plannerDate||today();if(discarded(date))return;
    const p=plan(date),view=document.getElementById('view');if(!view)return;
    let tl=view.querySelector('.day-timeline');
    if(!tl){view.innerHTML=`<div class="planner-head"><div><span class="eyebrow">AGENDA CANÔNICA</span><h2>${esc(fmt(date,{weekday:'long',day:'2-digit',month:'long'}))}</h2></div></div><div class="day-timeline"></div>`;tl=view.querySelector('.day-timeline')}
    tl.innerHTML=(p.slots||[]).map((x,i)=>slotHtml(x,date,i)).join('')||'<div class="empty">Nenhum bloco previsto.</div>';
    view.querySelectorAll('.emergency-day').forEach(x=>{if(p.scheduleAuthority?.validated!==false)x.remove()});
    document.getElementById('scheduleAuthorityBanner')?.remove();
    const head=view.querySelector('.planner-head')||view.querySelector('.section-title');
    if(head){const issueText=p.scheduleAuthority?.issues?.length?` · ${p.scheduleAuthority.issues.length} inconsistência(s) detectada(s)`:'';head.insertAdjacentHTML('afterend',`<div class="callout" id="scheduleAuthorityBanner"><b>Agenda semanal aplicada</b> · compromissos obrigatórios preservados · mínimo de 3h de estudo${issueText}${baseError?' · render anterior apresentou erro e foi substituído':''}</div>`)}
    updateStats(p,date);bindQuestCards();
    document.querySelectorAll('[data-authority-track]').forEach(b=>b.onclick=()=>{const x=p.slots[Number(b.dataset.authorityTrack)];if(x)S2?.startTracking?.(x.q,date,x.originDate||date)});
    document.querySelectorAll('[data-authority-remove]').forEach(b=>b.onclick=()=>{const x=p.slots[Number(b.dataset.authorityRemove)];if(x)window.MyPerformanceDay?.skip?.(x.q,date)});
  }

  window.MyPerformanceRoutine.planDay=plan;window.MyPerformanceRoutine.missionNow=missionNow;
  if(S2){const BASE_SUMMARY=S2.summary;S2.plan=plan;S2.missionNow=missionNow;S2.summary=function(date=today()){const s=BASE_SUMMARY?BASE_SUMMARY(date):{date};s.plan=plan(date);s.scheduleAuthority=s.plan.scheduleAuthority;return s}}
  window.MyPerformanceScheduleAuthority={version:1,plan,missionNow,validate,repairMandatory,MANDATORY,STUDY_MIN};
  renderToday=renderTodayAuthority;
  window.addEventListener('my-performance-cloud-loaded',()=>setTimeout(()=>{if(state.view==='today')render()},80));
  window.addEventListener('my-performance-scheduler-recalculated',()=>setTimeout(()=>{if(state.view==='today')render()},20));
  setTimeout(()=>{if(state.view==='today')render()},0);
})();
