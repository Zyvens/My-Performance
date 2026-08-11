"use strict";
/* Canonical Week Template — the user's standard week is the source of truth. Flexible quests are placed inside these windows, never on top of health/fixed commitments. */
(function(){
  if(!window.MyPerformanceRoutine)return;
  const BASE_PLAN=window.MyPerformanceRoutine.planDay;
  const BASE_MISSION_NOW=window.MyPerformanceRoutine.missionNow;
  const STUDY_MIN=180;
  const TUESDAY=2;
  const DAY_NAMES=['domingo','segunda','terça','quarta','quinta','sexta','sábado'];

  const TEMPLATE={
    1:{wake:360,end:1350,gym:[390,480,'Peito + Bíceps'],meals:[[720,780,'Almoço'],[1110,1140,'Janta']],personal:[[1080,1110,'Atividade pessoal']],gsa:[[540,720,'primeiro bloco'],[780,1080,'segundo bloco']],study:[[1140,1320]],sleepHygiene:[1320,1335]},
    2:{wake:360,end:1350,therapy:true,gym:[720,810,'Perna'],meals:[[810,840,'Almoço'],[1110,1140,'Janta']],personal:[[1080,1110,'Atividade pessoal']],gsa:[[540,720,'primeiro bloco'],[840,1080,'segundo bloco']],study:[[1140,1320]],studyFlex:[[960,1080]],sleepHygiene:[1320,1335]},
    3:{wake:270,end:1350,bni:true,gym:[720,810,'Costas + Tríceps'],meals:[[810,870,'Almoço'],[1110,1140,'Janta']],personal:[[660,720,'Zona livre — rua / Plaza Shopping'],[1080,1110,'Atividade pessoal']],gsa:[[870,1080,'segundo bloco']],study:[[1140,1320]],studyFlex:[[960,1080]],sleepHygiene:[1320,1335]},
    4:{wake:360,end:1410,gym:[390,480,'Peito + Bíceps'],meals:[[720,780,'Almoço'],[1110,1140,'Janta']],personal:[[1080,1110,'Atividade pessoal']],gsa:[[540,720,'primeiro bloco'],[780,900,'segundo bloco']],study:[[900,1080]],cell:true,sleepHygiene:[1395,1410]},
    5:{wake:360,end:1200,gym:[390,480,'Perna'],meals:[[720,780,'Almoço']],personal:[],gsa:[[540,720,'primeiro bloco'],[780,960,'segundo bloco']],study:[[960,1140]],extension:[[1140,1200]],sleepHygiene:null},
    6:{wake:360,end:780,gym:[390,480,'Costas + Tríceps'],meals:[[720,780,'Almoço']],personal:[],gsa:[],study:[[540,720]],sleepHygiene:null}
  };

  const clone=o=>JSON.parse(JSON.stringify(o||{}));
  const dow=date=>dfrom(date).getDay();
  const dur=x=>Math.max(0,Number(x?.end||0)-Number(x?.start||0));
  const overlap=(a,b)=>Number(a.start)<Number(b.end)&&Number(a.end)>Number(b.start);
  const key=x=>`${x?.q?.id||''}|${x?.originDate||''}`;
  const isDone=(q,date)=>{try{return done(q,date)}catch{return false}};
  const priority=q=>window.MyPerformanceAdaptive?.priority?.(q)||q?.priorityLevel||(q?.questType==='main'?'high':'normal');
  const priorityScore=q=>({critical:500,high:380,normal:220,low:80}[priority(q)]||220)+(q?.questType==='main'?100:0)+(q?.adaptiveSession?80:0);
  const dueScore=(q,date)=>{if(!q?.dueDate)return 0;try{return Math.max(0,180-Math.max(0,diffDays(date,q.dueDate))*15)}catch{return q.dueDate<=date?180:0}};
  const score=(q,date)=>priorityScore(q)+dueScore(q,date);

  function qBy(id,fallback){let q=null;try{q=questById(id)}catch{}return Object.assign({},fallback||{},clone(q||{}))}
  function baseQ(id,title,domain,category,extra={}){return Object.assign({id,title,description:'',domain,category,questType:'side',cadence:'once',xp:0,difficulty:1,source:'Template semanal',canonicalWeek:true},extra)}
  function add(p,q,start,end,reason,extra={}){const x=Object.assign({q,originDate:p.date,start,end,key:`${q.id}|${p.date}`,reason},extra);p.slots.push(x);return x}
  function freeSegments(p,start,end,min=10){const xs=(p.slots||[]).filter(x=>overlap(x,{start,end})).slice().sort((a,b)=>a.start-b.start||a.end-b.end),out=[];let cur=start;for(const x of xs){if(x.start-cur>=min)out.push([cur,x.start]);cur=Math.max(cur,x.end)}if(end-cur>=min)out.push([cur,end]);return out}
  function collides(p,start,end){return(p.slots||[]).some(x=>overlap(x,{start,end}))}

  const REPLACED_IDS=new Set(['personal-wake','personal-breakfast','personal-lunch','personal-leisure','personal-sleep','personal-gym','routine-shower-post-gym','routine-dinner','personal-therapy-weekly','personal-zion-brave-weekly','gsa-bni-weekly']);
  function generated(q){return!!q&&(q.capacityBlock||q.anchorBlock||q.scheduler2Synthetic||q.liveFill||q.lateWakeCanonical||q.dailyMinimum||/^canonical-/.test(String(q.id||''))||/^(wake|breakfast|lunch|dinner|shower|rest)-/.test(String(q.id||'')))}
  function replaced(q){return!q||REPLACED_IDS.has(q.id)||generated(q)||String(q.id||'').includes('personal-therapy-weekly')&&String(q.id||'').startsWith('commute-')}
  function actionableCandidates(base,date){
    const seen=new Set(),out=[];
    const ingest=x=>{if(!x?.q||replaced(x.q)||isDone(x.q,x.originDate||date))return;const k=key(x)||`${x.q.id}|${date}`;if(seen.has(k))return;seen.add(k);out.push(Object.assign({},x,{originDate:x.originDate||date}))};
    (base?.slots||[]).forEach(ingest);(base?.capacityDeferred||[]).forEach(ingest);(base?.movedOut||[]).forEach(ingest);
    return out.sort((a,b)=>score(b.q,date)-score(a.q,date)||String(a.q?.dueDate||'9999').localeCompare(String(b.q?.dueDate||'9999')))
  }
  function realFixedCandidates(base,date){
    const seen=new Set(),out=[];for(const x of base?.slots||[]){const q=x?.q;if(!q||replaced(q)||!(q.fixedTime||q.externalActivity)||isDone(q,x.originDate||date))continue;const k=key(x);if(seen.has(k))continue;seen.add(k);out.push(Object.assign({},x,{originDate:x.originDate||date}))}return out
  }

  function addWakeAndHealth(p,w,t){
    add(p,qBy('personal-wake',baseQ('personal-wake','Acordar no horário planejado','Pessoal','Rotina',{essential:true,fixedTime:true})),t.wake,t.wake+10,'início canônico do dia');
    if(w===3){
      add(p,baseQ(`canonical-ready-${p.date}`,'Se arrumar para o BNI','Pessoal','Rotina',{essential:true}),280,300,'preparação fixa de quarta');
      add(p,baseQ(`canonical-bni-commute-${p.date}`,'Deslocamento → BNI','Pessoal','Deslocamento',{essential:true,fixedTime:true,commuteBlock:true}),300,330,'30 min de deslocamento para o BNI');
      add(p,baseQ(`canonical-bni-buffer-${p.date}`,'Chegada / margem antes do BNI','Pessoal','Deslocamento',{essential:true}),330,360,'margem operacional antes da reunião');
      return
    }
    if(w===2){
      add(p,baseQ(`canonical-morning-care-${p.date}`,'Higiene + café da manhã','Pessoal','Saúde',{essential:true}),370,420,'bloco de saúde antes da terapia');
      add(p,baseQ(`canonical-therapy-out-${p.date}`,'Deslocamento → Terapia','Pessoal','Deslocamento',{essential:true,fixedTime:true,commuteBlock:true}),420,480,'margem ampla de ida por trânsito');
      const tq=qBy('personal-therapy-weekly',baseQ('personal-therapy-weekly','Terapia','Pessoal','Saúde',{fixedTime:true,essential:true,externalActivity:true,priorityLevel:'critical'}));
      add(p,Object.assign(tq,{fixedTime:true,essential:true,externalActivity:true}),480,510,'compromisso fixo prioritário da manhã');
      add(p,baseQ(`canonical-therapy-back-${p.date}`,'Retorno da terapia / margem de trânsito','Pessoal','Deslocamento',{essential:true,fixedTime:true,commuteBlock:true}),510,540,'retorno protegido até o início da GSA');
      return
    }
    add(p,baseQ(`canonical-hydration-${p.date}`,'Água + higiene da manhã','Pessoal','Saúde',{essential:true}),370,390,'rotina curta de saúde');
    const gym=qBy('personal-gym',baseQ('personal-gym','Academia / treino do dia','Pessoal','Corpo',{questType:'main'}));
    gym.title=`Academia — ${t.gym[2]}`;gym.durationMin=90;gym.fixedTime=false;gym.essential=true;
    add(p,gym,t.gym[0],t.gym[1],'treino canônico do dia');
    add(p,baseQ(`canonical-shower-${p.date}`,'Banho e troca pós-treino','Pessoal','Higiene',{essential:true}),480,510,'pós-treino protegido');
    add(p,baseQ(`canonical-breakfast-${p.date}`,'Café da manhã','Pessoal','Alimentação',{essential:true}),510,540,'fechamento do bloco de saúde da manhã');
  }

  function addSpecialFixed(p,w,t){
    if(t.bni){
      const q=qBy('gsa-bni-weekly',baseQ('gsa-bni-weekly','BNI Fire — reunião semanal','GSA','BNI',{questType:'main',fixedTime:true,essential:true,countsAsGsa:true,externalActivity:true,priorityLevel:'critical'}));
      Object.assign(q,{fixedTime:true,essential:true,countsAsGsa:true,externalActivity:true});add(p,q,360,660,'BNI compõe o primeiro bloco da GSA')
    }
    if(t.cell){
      const q=qBy('personal-zion-brave-weekly',baseQ('personal-zion-brave-weekly','Célula Zion Brave','Pessoal','Fé / Comunidade',{questType:'main',fixedTime:true,essential:true,externalActivity:true,priorityLevel:'critical'}));
      Object.assign(q,{fixedTime:true,essential:true,externalActivity:true});add(p,q,1140,1380,'compromisso espiritual fixo de quinta');
      add(p,baseQ(`canonical-zion-return-${p.date}`,'Deslocamento para casa','Pessoal','Deslocamento',{fixedTime:true,essential:true,commuteBlock:true}),1380,1395,'retorno da célula')
    }
  }

  function addGymOutsideMorning(p,w,t){
    if(![2,3].includes(w))return;const gym=qBy('personal-gym',baseQ('personal-gym','Academia / treino do dia','Pessoal','Corpo',{questType:'main'}));gym.title=`Academia — ${t.gym[2]}`;gym.durationMin=90;gym.essential=true;gym.fixedTime=false;add(p,gym,t.gym[0],t.gym[1],w===2?'treino de perna após o primeiro bloco da GSA':'treino após a zona livre de quarta')
  }
  function addMealsAndPersonal(p,t){
    for(const [s,e,title] of t.personal||[])add(p,baseQ(`canonical-personal-${p.date}-${s}`,title,'Pessoal',title.startsWith('Zona livre')?'Lazer':'Equilíbrio',{essential:title.startsWith('Zona livre')}),s,e,'janela pessoal protegida');
    for(const [s,e,title] of t.meals||[])add(p,baseQ(`canonical-meal-${p.date}-${s}`,title,'Pessoal','Alimentação',{essential:true}),s,e,'refeição protegida');
    if(t.sleepHygiene)add(p,baseQ(`canonical-sleep-hygiene-${p.date}`,'Higiene do sono','Pessoal','Sono',{essential:true}),t.sleepHygiene[0],t.sleepHygiene[1],'ritual de encerramento do dia')
  }

  function placeRealFixed(p,base,date){
    for(const x of realFixedCandidates(base,date)){
      if(collides(p,x.start,x.end)){p.capacityWarnings.push(`Compromisso fixo externo em conflito com o template: ${x.q.title} (${toTime?toTime(x.start):x.start}).`);p.critical.push(x);continue}
      p.slots.push(Object.assign({},x,{reason:'compromisso fixo externo preservado pelo template semanal'}))
    }
  }

  function placeDomain(p,candidates,placed,domain,windows,date,label){
    let n=0;
    const matching=candidates.filter(x=>x.q?.domain===domain&&!placed.has(key(x)));
    for(const [ws,we,wlabel] of windows||[]){
      let segments=freeSegments(p,ws,we,15);
      for(const x of matching){
        const k=key(x);if(placed.has(k))continue;const wanted=Math.max(15,Math.min(180,Number(x.q?.durationMin||dur(x)||45)));
        const fit=segments.find(seg=>seg[1]-seg[0]>=wanted);if(!fit)continue;
        const q=clone(x.q);add(p,q,fit[0],fit[0]+wanted,`${label} · ${wlabel||''}`.trim(),{originDate:x.originDate||date,canonicalPlaced:true});placed.add(k);segments=freeSegments(p,ws,we,15)
      }
      segments=freeSegments(p,ws,we,15);for(const seg of segments){if(seg[1]-seg[0]<15)continue;const id=`canonical-${domain.toLowerCase()}-${date}-${++n}`;const title=domain==='GSA'?`GSA — ${wlabel||'foco operacional'}`:'Estudar — bloco protegido';const q=baseQ(id,title,domain,domain==='GSA'?'Operação':'Transpetro',{capacityBlock:true,priorityLevel:domain==='Estudos'?'critical':'high',durationMin:seg[1]-seg[0]});if(domain==='GSA')q.capacityGsa=true;else q.capacityStudy=true;add(p,q,seg[0],seg[1],domain==='GSA'?'janela canônica da GSA':'mínimo diário protegido de estudo',{capacityBlock:true})}
    }
  }

  function urgentStudy(candidates,date){return candidates.some(x=>x.q?.domain==='Estudos'&&(x.q?.fairnessLate||priority(x.q)==='critical'&&(!x.q.dueDate||x.q.dueDate<=addDays(date,3))))}
  function addOptionalFlex(p,candidates,placed,w,t,date){
    if((w===2||w===3)&&urgentStudy(candidates,date))placeDomain(p,candidates,placed,'Estudos',(t.studyFlex||[]).map(x=>[x[0],x[1],'flex cedido pela GSA']),date,'estudo crítico');
    if(w===5&&urgentStudy(candidates,date))placeDomain(p,candidates,placed,'Estudos',(t.extension||[]).map(x=>[x[0],x[1],'extensão excepcional']),date,'extensão de sexta')
  }

  function sundayPlan(base,date){
    const p=clone(base);p.date=date;p.wake=480;p.end=720;p.requestedSleep=720;p.slots=[];p.capacityDeferred=[];p.capacityWarnings=[];p.critical=[];p.templateCanonical=true;p.canonicalWeekVersion=1;p.sundayRest=true;
    const candidates=actionableCandidates(base,date);const extreme=!!state?.weekendProtection?.extreme?.[date]||candidates.some(x=>priority(x.q)==='critical'&&x.q?.dueDate&&x.q.dueDate<=date);
    if(!extreme){p.capacityDeferred=candidates.map(x=>Object.assign({},x,{reason:'domingo protegido para descanso'}));p.used=0;p.capacity={gsa:0,study:0,gym:0,studyProtectedMin:0,canonical:true};return p}
    const placed=new Set();const gymCandidate=candidates.find(x=>x.q?.id==='personal-gym');if(gymCandidate){const q=clone(gymCandidate.q);q.title='Academia — emergência de domingo';add(p,q,480,570,'domingo usado excepcionalmente para treino',{canonicalPlaced:true});placed.add(key(gymCandidate))}
    placeDomain(p,candidates,placed,'Estudos',[[570,720,'janela excepcional de domingo']],date,'domingo excepcional');p.capacityDeferred=candidates.filter(x=>!placed.has(key(x))&&x.q.domain!=='Estudos').map(x=>Object.assign({},x,{reason:'não coube na exceção de domingo'}));finalize(p,0);return p
  }

  function finalize(p,w){
    p.slots.sort((a,b)=>a.start-b.start||a.end-b.end);p.used=p.slots.reduce((n,x)=>n+dur(x),0);
    const collisions=[];for(let i=1;i<p.slots.length;i++)if(overlap(p.slots[i-1],p.slots[i]))collisions.push([p.slots[i-1],p.slots[i]]);p.critical=(p.critical||[]).concat(collisions.flat());
    const sum=domain=>p.slots.filter(x=>x.q?.domain===domain).reduce((n,x)=>n+dur(x),0);const gym=p.slots.filter(x=>x.q?.id==='personal-gym').reduce((n,x)=>n+dur(x),0);
    p.capacity=Object.assign({},p.capacity||{},{gsa:sum('GSA'),study:sum('Estudos'),gym,studyProtectedMin:w===0?0:STUDY_MIN,canonical:true,weeklyTemplate:true});
    p.capacityWarnings=(p.capacityWarnings||[]).filter(x=>!/GSA abaixo da meta|Conflito crítico|overload/i.test(String(x)));
    if(w>=1&&w<=6&&p.capacity.study<STUDY_MIN)p.capacityWarnings.push(`Estudo abaixo do mínimo canônico de 3h: ${p.capacity.study} min.`);
    p.templateCanonical=true;p.canonicalWeekVersion=1;return p
  }

  function canonicalPlan(date=today()){
    const base=BASE_PLAN(date),w=dow(date);if(w===0)return sundayPlan(base,date);const t=TEMPLATE[w];if(!t)return base;
    const p=clone(base);p.date=date;p.wake=t.wake;p.end=t.end;p.requestedSleep=t.end;p.slots=[];p.capacityDeferred=[];p.capacityWarnings=[];p.critical=[];
    const candidates=actionableCandidates(base,date),placed=new Set();
    addWakeAndHealth(p,w,t);addSpecialFixed(p,w,t);addGymOutsideMorning(p,w,t);addMealsAndPersonal(p,t);placeRealFixed(p,base,date);
    placeDomain(p,candidates,placed,'GSA',(t.gsa||[]).map((x,i)=>[x[0],x[1],x[2]||`${i+1}º bloco`]),date,'GSA');
    placeDomain(p,candidates,placed,'Estudos',(t.study||[]).map(x=>[x[0],x[1],'bloco mínimo de 3h']),date,'Estudos');
    addOptionalFlex(p,candidates,placed,w,t,date);
    p.capacityDeferred=candidates.filter(x=>!placed.has(key(x))&&!['GSA','Estudos'].includes(x.q?.domain)).concat(candidates.filter(x=>!placed.has(key(x))&&['GSA','Estudos'].includes(x.q?.domain))).map(x=>Object.assign({},x,{reason:'não coube no template canônico deste dia'}));
    return finalize(p,w)
  }
  function missionNow(date=today(),now=new Date()){const p=canonicalPlan(date),m=now.getHours()*60+now.getMinutes(),current=p.slots.find(x=>m>=x.start&&m<x.end),next=p.slots.find(x=>x.start>m);return{plan:p,current:current||null,next:next||null,minute:m}}

  window.MyPerformanceRoutine.planDay=canonicalPlan;
  window.MyPerformanceRoutine.missionNow=missionNow;
  window.MyPerformanceCanonicalWeek={plan:canonicalPlan,TEMPLATE,STUDY_MIN};
})();
