"use strict";
/* Weekly Schedule V2 — one authoritative weekly calendar. Legacy schedulers may calculate diagnostics,
   but they no longer decide fixed times or render the Today timeline. */
(function(){
  if(typeof state==='undefined'||typeof quests!=='function'||!window.MyPerformanceRoutine)return;

  const BUILD='1.5.21';
  const STUDY_MIN=180;
  const toTime=window.MyPerformanceRoutine.toTime||function(n){n=((Math.round(Number(n)||0)%1440)+1440)%1440;return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`};
  const clone=x=>JSON.parse(JSON.stringify(x||{}));
  const dur=x=>Math.max(0,Number(x?.end||0)-Number(x?.start||0));
  const dow=date=>dfrom(date).getDay();
  const overlap=(a,b)=>Number(a.start)<Number(b.end)&&Number(a.end)>Number(b.start);

  const FIXED_IDS=new Set([
    'personal-wake','personal-sleep','personal-gym','personal-breakfast','personal-lunch','personal-leisure',
    'routine-water-am','routine-hygiene-am','routine-shower-post-gym','routine-dinner','routine-water-close',
    'routine-tomorrow','routine-hygiene-night','routine-sun-mobility','routine-day-plan','routine-home-reset','routine-week-prep',
    'routine-gsa-focus-am','routine-gsa-pre-muay','routine-gsa-post-muay','routine-gsa-focus-pm','routine-gsa-admin',
    'routine-muay','routine-muay-commute','routine-muay-return','routine-muay-friday',
    'personal-therapy-weekly','personal-zion-brave-weekly','gsa-bni-weekly'
  ]);
  const MUAY_IDS=['routine-muay','routine-muay-commute','routine-muay-return','routine-muay-friday','routine-gsa-pre-muay','routine-gsa-post-muay'];

  function migrateLegacy(){
    const marker='1.5.21';
    state.routineSettings=state.routineSettings||{};
    delete state.routineSettings.gymStart;
    delete state.routineSettings.muayFriday;
    delete state.routineSettings.muayDays;
    if(state.capacityBudget?.settings)delete state.capacityBudget.settings.fifthWorkoutDay;
    state.overrides=state.overrides||{};
    const gym=state.overrides['personal-gym']||{};
    delete gym.timeStart;delete gym.timeEnd;delete gym.fixedTime;
    Object.assign(gym,{weekdays:[1,2,3,4,5,6],durationMin:90,essential:true});
    state.overrides['personal-gym']=gym;
    const shower=state.overrides['routine-shower-post-gym']||{};
    delete shower.timeStart;delete shower.timeEnd;delete shower.fixedTime;
    Object.assign(shower,{weekdays:[1,2,3,4,5,6],durationMin:30,essential:true});
    state.overrides['routine-shower-post-gym']=shower;
    for(const id of MUAY_IDS)state.overrides[id]=Object.assign({},state.overrides[id]||{},{disabled:true});
    if(state.weeklyScheduleV2Migration!==marker){
      // Old "Acordei agora" contexts were produced by the legacy fixed-time engine and can resurrect obsolete Tuesday slots.
      if(state.scheduler2?.dayContexts)state.scheduler2.dayContexts={};
      state.weeklyScheduleV2Migration=marker;
      try{localStorage.setItem('my_performance_v1',JSON.stringify(state))}catch{}
    }
  }
  migrateLegacy();

  function real(id,fallback={}){let q=null;try{q=questById(id)}catch{}return Object.assign({},fallback,clone(q||{}))}
  function baseQ(id,title,domain='Pessoal',category='Agenda',extra={}){return Object.assign({id,title,description:'',domain,category,questType:'side',cadence:'once',xp:0,difficulty:1,source:'Agenda semanal',canonicalV2:true},extra)}
  function timed(q,start,end,extra={}){return Object.assign({},q,extra,{timeStart:toTime(start),timeEnd:toTime(end),durationMin:end-start,canonicalV2:true})}
  function add(p,q,start,end,reason,extra={}){const slot=Object.assign({q:timed(q,start,end),originDate:p.date,start,end,key:`${q.id}|${p.date}`,reason},extra);p.slots.push(slot);return slot}
  function mandatory(q){q.fixedTime=true;q.essential=true;q.canonicalMandatory=true;return q}
  function personal(p,id,title,start,end,category='Rotina',extra={}){return add(p,baseQ(id,title,'Pessoal',category,extra),start,end,'bloco fixo do cronograma')}
  function realPersonal(p,id,title,start,end,category,extra={}){const q=real(id,baseQ(id,title,'Pessoal',category,extra));Object.assign(q,extra);return add(p,q,start,end,'bloco fixo do cronograma')}

  function morningStandard(p,gymLabel){
    realPersonal(p,'personal-wake','Acordar no horário planejado',360,370,'Rotina',{essential:true});
    realPersonal(p,'routine-water-am','Beber água ao acordar',370,375,'Rotina',{essential:true});
    realPersonal(p,'routine-hygiene-am','Higiene da manhã',375,390,'Rotina',{essential:true});
    const g=real('personal-gym',baseQ('personal-gym','Academia / treino do dia','Pessoal','Corpo',{questType:'main',xp:40}));g.title=`Academia — ${gymLabel}`;g.essential=true;g.fixedTime=false;add(p,g,390,480,'treino definido pelo dia da semana');
    const sh=real('routine-shower-post-gym',baseQ('routine-shower-post-gym','Banho e troca pós-treino','Pessoal','Higiene',{xp:10}));sh.essential=true;sh.fixedTime=false;add(p,sh,480,510,'pós-treino');
    realPersonal(p,'personal-breakfast','Tomar café da manhã',510,540,'Alimentação',{essential:true});
  }

  function monday(p){
    p.wake=360;p.end=1350;morningStandard(p,'Peito + Bíceps');
    p.gsaWindows=[[540,720,'primeiro bloco'],[780,1080,'segundo bloco']];
    personal(p,`meal-lunch-${p.date}`,'Almoço',720,780,'Alimentação',{essential:true});
    personal(p,`personal-evening-${p.date}`,'Atividade pessoal',1080,1110,'Equilíbrio');
    personal(p,`meal-dinner-${p.date}`,'Janta',1110,1140,'Alimentação',{essential:true});
    p.studyWindows=[[1140,1320,'estudo noturno']];
    personal(p,`sleep-hygiene-${p.date}`,'Higiene do sono',1320,1335,'Sono',{essential:true});
  }
  function tuesday(p){
    p.wake=360;p.end=1350;
    realPersonal(p,'personal-wake','Acordar no horário planejado',360,370,'Rotina',{essential:true});
    realPersonal(p,'routine-water-am','Beber água ao acordar',370,375,'Rotina',{essential:true});
    realPersonal(p,'routine-hygiene-am','Higiene da manhã',375,390,'Rotina',{essential:true});
    realPersonal(p,'personal-breakfast','Tomar café da manhã',390,410,'Alimentação',{essential:true});
    personal(p,`therapy-prep-${p.date}`,'Preparação / margem antes de sair',410,420,'Saúde');
    add(p,mandatory(baseQ(`therapy-out-${p.date}`,'Deslocamento → Terapia','Pessoal','Deslocamento',{commuteBlock:true})),420,480,'deslocamento protegido');
    const tq=mandatory(real('personal-therapy-weekly',baseQ('personal-therapy-weekly','Terapia','Pessoal','Saúde',{questType:'main',xp:20})));add(p,tq,480,510,'compromisso prioritário da manhã',{canonicalMandatory:true});
    add(p,mandatory(baseQ(`therapy-back-${p.date}`,'Retorno da terapia / margem de trânsito','Pessoal','Deslocamento',{commuteBlock:true})),510,540,'retorno protegido');
    p.gsaWindows=[[540,720,'primeiro bloco'],[870,1080,'segundo bloco']];
    const g=real('personal-gym',baseQ('personal-gym','Academia / treino do dia','Pessoal','Corpo',{questType:'main',xp:40}));g.title='Academia — Perna';g.essential=true;g.fixedTime=false;add(p,g,720,810,'treino de terça após o primeiro bloco da GSA');
    const sh=real('routine-shower-post-gym',baseQ('routine-shower-post-gym','Banho e troca pós-treino','Pessoal','Higiene',{xp:10}));sh.essential=true;sh.fixedTime=false;add(p,sh,810,840,'banho imediatamente após o treino');
    personal(p,`meal-lunch-${p.date}`,'Almoço',840,870,'Alimentação',{essential:true});
    personal(p,`personal-evening-${p.date}`,'Atividade pessoal',1080,1110,'Equilíbrio');
    personal(p,`meal-dinner-${p.date}`,'Janta',1110,1140,'Alimentação',{essential:true});
    p.studyWindows=[[1140,1320,'estudo noturno']];
    p.studyFlex=[[960,1080,'até 2h cedidas pela GSA quando necessário']];
    personal(p,`sleep-hygiene-${p.date}`,'Higiene do sono',1320,1335,'Sono',{essential:true});
  }
  function wednesday(p){
    p.wake=270;p.end=1350;
    realPersonal(p,'personal-wake','Acordar para o BNI',270,280,'Rotina',{essential:true});
    personal(p,`bni-ready-${p.date}`,'Se arrumar para o BNI',280,300,'Rotina',{essential:true});
    add(p,mandatory(baseQ(`bni-commute-${p.date}`,'Deslocamento → BNI','Pessoal','Deslocamento',{commuteBlock:true})),300,330,'30 min de deslocamento');
    personal(p,`bni-buffer-${p.date}`,'Chegada / margem antes do BNI',330,360,'Deslocamento',{essential:true});
    const bni=mandatory(real('gsa-bni-weekly',baseQ('gsa-bni-weekly','BNI Fire — reunião semanal','GSA','BNI',{questType:'main',xp:90,countsAsGsa:true})));bni.countsAsGsa=true;add(p,bni,360,660,'BNI compõe o primeiro bloco da GSA',{canonicalMandatory:true});
    personal(p,`free-plaza-${p.date}`,'Zona livre — rua / Plaza Shopping',660,720,'Lazer',{essential:true});
    const g=real('personal-gym',baseQ('personal-gym','Academia / treino do dia','Pessoal','Corpo',{questType:'main',xp:40}));g.title='Academia — Costas + Tríceps';g.essential=true;g.fixedTime=false;add(p,g,720,810,'treino de quarta');
    const sh=real('routine-shower-post-gym',baseQ('routine-shower-post-gym','Banho e troca pós-treino','Pessoal','Higiene',{xp:10}));sh.essential=true;sh.fixedTime=false;add(p,sh,810,840,'banho após o treino');
    personal(p,`meal-lunch-${p.date}`,'Almoço',840,870,'Alimentação',{essential:true});
    p.gsaWindows=[[870,1080,'segundo bloco']];
    personal(p,`personal-evening-${p.date}`,'Atividade pessoal',1080,1110,'Equilíbrio');
    personal(p,`meal-dinner-${p.date}`,'Janta',1110,1140,'Alimentação',{essential:true});
    p.studyWindows=[[1140,1320,'estudo noturno']];
    p.studyFlex=[[960,1080,'até 2h cedidas pela GSA quando necessário']];
    personal(p,`sleep-hygiene-${p.date}`,'Higiene do sono',1320,1335,'Sono',{essential:true});
  }
  function thursday(p){
    p.wake=360;p.end=1410;morningStandard(p,'Peito + Bíceps');
    p.gsaWindows=[[540,720,'primeiro bloco'],[780,900,'segundo bloco']];
    personal(p,`meal-lunch-${p.date}`,'Almoço',720,780,'Alimentação',{essential:true});
    p.studyWindows=[[900,1080,'3h cedidas da tarde para estudo']];
    personal(p,`personal-evening-${p.date}`,'Atividade pessoal',1080,1110,'Equilíbrio');
    personal(p,`meal-dinner-${p.date}`,'Janta',1110,1140,'Alimentação',{essential:true});
    const cell=mandatory(real('personal-zion-brave-weekly',baseQ('personal-zion-brave-weekly','Célula Zion Brave','Pessoal','Fé / Comunidade',{questType:'main',xp:70})));add(p,cell,1140,1380,'compromisso espiritual fixo',{canonicalMandatory:true});
    add(p,mandatory(baseQ(`zion-return-${p.date}`,'Deslocamento para casa','Pessoal','Deslocamento',{commuteBlock:true})),1380,1395,'retorno da célula');
    personal(p,`sleep-hygiene-${p.date}`,'Higiene do sono',1395,1410,'Sono',{essential:true});
  }
  function friday(p){
    p.wake=360;p.end=1200;morningStandard(p,'Perna');
    p.gsaWindows=[[540,720,'primeiro bloco'],[780,960,'segundo bloco']];
    personal(p,`meal-lunch-${p.date}`,'Almoço',720,780,'Alimentação',{essential:true});
    p.studyWindows=[[960,1140,'3h de estudo: 2h cedidas + 1h de extensão']];
    p.extension=[[1140,1200,'extensão excepcional até 20h']];
  }
  function saturday(p){
    p.wake=360;p.end=780;morningStandard(p,'Costas + Tríceps');
    p.studyWindows=[[540,720,'estudo de sábado']];
    personal(p,`meal-lunch-${p.date}`,'Almoço',720,780,'Alimentação',{essential:true});
    p.gsaWindows=[];
  }
  function sunday(p){
    p.wake=480;p.end=720;p.restDay=true;p.gsaWindows=[];p.studyWindows=[];
    p.capacityWarnings.push('Domingo protegido para descanso. Treino/estudo podem ser adicionados manualmente pela manhã apenas se necessário.');
  }

  function skipped(date,q){return !!state.dayPlanning?.skipped?.[date]?.[q?.id]}
  function candidateList(date){
    const out=[],seen=new Set(),adaptiveParent=new Set();
    for(const q of quests()){
      if(!q||q.disabled||FIXED_IDS.has(q.id)||q.id?.startsWith('canonical-')||q.capacityBlock&&!q.adaptiveSession||skipped(date,q))continue;
      let on=false;try{on=scheduled(q,date)}catch{}if(!on)continue;
      try{if(done(q,date))continue}catch{}
      if(q.adaptiveSession&&q.parentId){if(adaptiveParent.has(q.parentId))continue;adaptiveParent.add(q.parentId)}
      const k=q.cadence==='daily'?`${q.id}@${date}`:q.id;if(seen.has(k))continue;seen.add(k);out.push(clone(q));
    }
    const score=q=>{const lv={critical:500,high:380,normal:220,low:80}[q.priorityLevel||'normal']||220;let due=0;if(q.dueDate){try{due=Math.max(0,260-Math.max(0,diffDays(date,q.dueDate))*15)}catch{}}return lv+due+(q.questType==='main'?120:0)+(q.adaptiveSession?80:0)};
    return out.sort((a,b)=>score(b)-score(a)||String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999')))
  }
  function freeSegments(p,start,end){const xs=p.slots.filter(x=>overlap(x,{start,end})).sort((a,b)=>a.start-b.start),out=[];let cur=start;for(const x of xs){if(x.start>cur)out.push([cur,x.start]);cur=Math.max(cur,x.end)}if(cur<end)out.push([cur,end]);return out.filter(x=>x[1]-x[0]>=15)}
  function placeDomain(p,candidates,placed,domain,windows){
    let generic=0;
    for(const [ws,we,label] of windows||[]){
      for(const q0 of candidates.filter(q=>q.domain===domain&&!placed.has(q.id))){
        const seg=freeSegments(p,ws,we).find(s=>s[1]-s[0]>=15);if(!seg)break;
        const wanted=Math.max(15,Math.min(Number(q0.durationMin||60),seg[1]-seg[0],180));
        const q=clone(q0);add(p,q,seg[0],seg[0]+wanted,`${domain} · ${label}`,{canonicalPlaced:true});placed.add(q.id)
      }
      for(const seg of freeSegments(p,ws,we)){
        const title=domain==='GSA'?`GSA — ${label}`:'Estudar — bloco protegido';
        const q=baseQ(`weekly-v2-${domain.toLowerCase()}-${p.date}-${++generic}`,title,domain,domain==='GSA'?'Operação':'Transpetro',{capacityBlock:true,priorityLevel:domain==='Estudos'?'critical':'high'});
        add(p,q,seg[0],seg[1],domain==='GSA'?'janela fixa da GSA':'mínimo diário protegido de estudo',{capacityBlock:true})
      }
    }
  }
  function criticalStudyNeedsExtra(candidates){return candidates.some(q=>q.domain==='Estudos'&&((q.priorityLevel||'')==='critical'||q.questType==='main'&&q.dueDate))}
  function plan(date=today()){
    if(window.MyPerformanceDiscardDay?.record?.(date))return{date,wake:0,end:0,slots:[],used:0,discarded:true,capacityWarnings:[],critical:[],capacityDeferred:[],scheduleAuthority:{canonical:true,validated:true,version:2}};
    const p={date,wake:360,end:1350,slots:[],used:0,critical:[],capacityWarnings:[],capacityDeferred:[],gsaWindows:[],studyWindows:[],studyFlex:[]};
    const w=dow(date);({1:monday,2:tuesday,3:wednesday,4:thursday,5:friday,6:saturday,0:sunday}[w]||sunday)(p);
    const candidates=candidateList(date),placed=new Set();
    placeDomain(p,candidates,placed,'GSA',p.gsaWindows);
    placeDomain(p,candidates,placed,'Estudos',p.studyWindows);
    if(criticalStudyNeedsExtra(candidates)&&p.studyFlex?.length){
      for(const [s,e,label] of p.studyFlex){p.slots=p.slots.filter(x=>!(x.q?.capacityBlock&&x.q?.domain==='GSA'&&overlap(x,{start:s,end:e})));placeDomain(p,candidates,placed,'Estudos',[[s,e,label]])}
    }
    const leftovers=candidates.filter(q=>!placed.has(q.id)&&['GSA','Estudos','Carreira'].includes(q.domain));
    p.capacityDeferred=leftovers.map(q=>({q,originDate:date,reason:'sem janela compatível no cronograma canônico'}));
    p.slots.sort((a,b)=>a.start-b.start||a.end-b.end);
    const collisions=[];for(let i=1;i<p.slots.length;i++)if(overlap(p.slots[i-1],p.slots[i]))collisions.push([p.slots[i-1],p.slots[i]]);
    const study=p.slots.filter(x=>x.q?.domain==='Estudos').reduce((n,x)=>n+dur(x),0);
    if(w>=1&&w<=6&&study<STUDY_MIN)p.capacityWarnings.push(`Estudo abaixo do mínimo de 3h: ${study} min.`);
    if(collisions.length)p.capacityWarnings.push(...collisions.map(([a,b])=>`Colisão interna: ${a.q?.title} × ${b.q?.title}`));
    p.used=p.slots.reduce((n,x)=>n+dur(x),0);
    p.scheduleAuthority={canonical:true,validated:collisions.length===0&&(w===0||study>=STUDY_MIN),version:2,studyMinutes:study,build:BUILD};
    return p
  }

  function missionNow(date=today(),now=new Date()){const p=plan(date),m=now.getHours()*60+now.getMinutes();return{plan:p,current:p.slots.find(x=>m>=x.start&&m<x.end)||null,next:p.slots.find(x=>x.start>m)||null,minute:m}}
  function cardFor(q,date){let realQ=null;try{realQ=questById(q.id)}catch{};if(realQ){const merged=Object.assign({},realQ,q);return questCard(merged,date,true)}return `<article class="quest ${q.questType==='main'?'main':''}"><div class="quest-head"><div class="synthetic-mark">${q.canonicalMandatory?'★':'◆'}</div><div><div class="quest-title">${esc(q.title)}</div><div class="quest-meta"><span class="tag ${esc(q.domain||'Pessoal')}">${esc(q.domain||'Agenda')}</span>${q.canonicalMandatory?'<span class="pill amber">OBRIGATÓRIA</span>':'<span class="pill">Agenda semanal</span>'}</div></div></div></article>`}
  function slotHtml(x,date,index){const q=x.q||{},mandatory=!!q.canonicalMandatory,trackable=!q.capacityBlock&&!q.commuteBlock&&!q.id?.startsWith('meal-')&&!q.id?.startsWith('personal-evening-')&&!q.id?.startsWith('sleep-hygiene-');return `<div class="routine-slot weekly-v2-slot ${mandatory?'mandatory-slot':''}"><div class="routine-time"><b>${toTime(x.start)}</b><span>${toTime(x.end)}</span></div><div class="routine-quest">${mandatory?'<div class="rollover-note">★ compromisso obrigatório · todo o restante se reorganiza em função dele</div>':''}${cardFor(q,x.originDate||date)}<div class="routine-reason">${esc(x.reason||'cronograma canônico')} · ${dur(x)} min</div>${trackable&&window.MyPerformanceScheduler2?.startTracking?`<div class="scheduler-slot-actions"><button class="btn small" data-v2-track="${index}">▶ Iniciar</button></div>`:''}</div></div>`}

  function renderTodayV2(){
    const date=state.plannerDate||today(),p=plan(date),view=document.getElementById('view');if(!view)return;
    if(p.discarded){view.innerHTML=`<div class="section-title planner-head"><div><span class="eyebrow">DIA DESCARTADO</span><h2>${esc(fmt(date,{weekday:'long',day:'2-digit',month:'long'}))}</h2><p class="muted">O dia foi descartado. Conclusões já registradas foram preservadas e o trabalho relevante foi replanejado.</p></div><div class="day-nav"><button class="btn small" id="dayPrev">←</button><button class="btn small" id="dayNow">Hoje</button><button class="btn small" id="dayNext">→</button></div></div>`;bindDayNav(date);return}
    const study=p.slots.filter(x=>x.q?.domain==='Estudos').reduce((n,x)=>n+dur(x),0),gsa=p.slots.filter(x=>x.q?.domain==='GSA'||x.q?.countsAsGsa).reduce((n,x)=>n+dur(x),0);
    view.innerHTML=`<div class="section-title planner-head"><div><span class="eyebrow">CRONOGRAMA SEMANAL</span><h2>${date===today()?'Hoje':esc(fmt(date,{weekday:'long',day:'2-digit',month:'long'}))}</h2><p class="muted">Horários fixos vêm do dia da semana. Não existe horário global de academia nem motor de Muay Thai.</p></div><div class="day-nav"><button class="btn small" id="dayPrev">←</button><button class="btn small" id="dayNow">Hoje</button><button class="btn small" id="dayNext">→</button><button class="btn primary small" id="adaptiveRecalc">↻ Recalcular / Diagnóstico</button></div></div>
    <div class="planner-stats routine-stats"><div class="card mini-stat"><span>Acordar / encerrar</span><b>${toTime(p.wake)} → ${toTime(p.end)}</b><small>cronograma do dia da semana</small></div><div class="card mini-stat"><span>Estudo protegido</span><b>${(study/60).toFixed(1)}h</b><small>mínimo 3h de segunda a sábado</small></div><div class="card mini-stat"><span>GSA</span><b>${(gsa/60).toFixed(1)}h</b><small>inclui BNI quando aplicável</small></div><div class="card mini-stat"><span>Capacidade</span><b>${p.scheduleAuthority.validated?'Sem conflito':'Revisar'}</b><small>${p.slots.length} blocos · v${BUILD}</small></div></div>
    ${p.capacityWarnings.length?`<div class="callout planner-warning"><b>Atenção:</b> ${p.capacityWarnings.map(esc).join(' · ')}</div>`:''}
    <div class="day-timeline routine-timeline">${p.slots.map((x,i)=>slotHtml(x,date,i)).join('')||'<div class="empty">Nenhum bloco previsto.</div>'}</div>
    ${p.capacityDeferred.length?`<div class="card rollover-card"><span class="eyebrow">REPLANEJAR</span><h2>${p.capacityDeferred.length} missão(ões) sem janela hoje</h2><p class="muted">Elas não criam “Conflito fixo” nem atropelam Terapia, BNI, Célula, treino ou estudo.</p>${p.capacityDeferred.slice(0,12).map(x=>`<div class="rollover-row"><div><b>${esc(x.q.title)}</b><span>${esc(x.q.domain)} · ${esc(x.reason)}</span></div></div>`).join('')}</div>`:''}`;
    bindDayNav(date);bindQuestCards();
    document.querySelectorAll('[data-v2-track]').forEach(b=>b.onclick=()=>{const x=p.slots[Number(b.dataset.v2Track)];if(x)window.MyPerformanceScheduler2?.startTracking?.(x.q,date,x.originDate||date)});
    window.MyPerformanceRecalcCenterFix?.bind?.();
  }
  function bindDayNav(date){const prev=document.getElementById('dayPrev'),now=document.getElementById('dayNow'),next=document.getElementById('dayNext');if(prev)prev.onclick=()=>{state.plannerDate=addDays(date,-1);saveState();render()};if(now)now.onclick=()=>{state.plannerDate=today();saveState();render()};if(next)next.onclick=()=>{state.plannerDate=addDays(date,1);saveState();render()}}

  const PREV_RENDER_CONFIG=renderConfig;
  renderConfig=function(){
    PREV_RENDER_CONFIG();
    const gymStart=document.getElementById('routineGymStart');if(gymStart)gymStart.closest('.field')?.remove();
    const muayFriday=document.getElementById('routineMuayFriday');if(muayFriday)muayFriday.closest('.setting-toggle')?.remove();
    document.querySelectorAll('[data-muay-day]').forEach(x=>x.closest('.card')?.remove());
    document.querySelectorAll('.section-title').forEach(x=>{if(/MUAY THAI OPCIONAL/i.test(x.textContent||'')){const card=x.nextElementSibling;x.remove();if(card?.classList?.contains('card'))card.remove()}});
    const save=document.getElementById('saveRoutine');if(save){save.onclick=()=>{const s=state.routineSettings=state.routineSettings||{};const wake=document.getElementById('routineWake'),sleep=document.getElementById('routineSleep'),gd=document.getElementById('routineGymDuration'),roll=document.getElementById('routineRollover'),days=document.getElementById('routineRolloverDays');if(wake)s.wakeTime=wake.value||'06:00';if(sleep)s.sleepTime=sleep.value||'22:30';if(gd)s.gymDuration=Math.max(30,Math.min(180,Number(gd.value||90)));if(roll)s.autoRollover=roll.checked;if(days)s.rolloverDays=Math.max(1,Math.min(30,Number(days.value||14)));delete s.gymStart;delete s.muayFriday;delete s.muayDays;saveState();render();toast('Rotina atualizada — horários de treino vêm do cronograma semanal')}}
    const note=[...document.querySelectorAll('.subtle')].find(x=>/Essas regras governam|agenda nunca usa/i.test(x.textContent||''));if(note)note.textContent='Acordar, duração de treino e replanejamento podem ser ajustados aqui. O horário do treino é definido individualmente por cada dia da semana.';
  };

  window.MyPerformanceRoutine.planDay=plan;
  window.MyPerformanceRoutine.missionNow=missionNow;
  if(window.MyPerformanceScheduler2){window.MyPerformanceScheduler2.plan=plan;window.MyPerformanceScheduler2.missionNow=missionNow}
  window.MyPerformanceWeeklyScheduleV2={BUILD,STUDY_MIN,plan,missionNow,migrateLegacy};
  renderToday=renderTodayV2;
  setTimeout(()=>{if(state.view==='today')render()},0);
})();
