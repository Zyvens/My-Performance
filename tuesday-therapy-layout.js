"use strict";
/* Tuesday Therapy Layout — therapy is the sovereign Tuesday-morning anchor; all generated routine/work blocks route around it. */
(function(){
  if(!window.MyPerformanceRoutine)return;
  const BASE_PLAN=window.MyPerformanceRoutine.planDay;
  const BASE_MISSION_NOW=window.MyPerformanceRoutine.missionNow;
  const TUESDAY=2;
  const WINDOW={start:6*60+20,end:11*60+30};
  const SLOTS={breakfast:[6*60+30,6*60+50],out:[7*60,8*60],therapy:[8*60,8*60+30],back:[8*60+30,9*60+30],gym:[9*60+30,11*60],shower:[11*60,11*60+30]};

  const dow=date=>dfrom(date).getDay();
  const overlap=(a,b)=>Number(a.start)<Number(b.end)&&Number(a.end)>Number(b.start);
  const dur=x=>Math.max(0,Number(x?.end||0)-Number(x?.start||0));
  const clone=x=>JSON.parse(JSON.stringify(x||{}));
  const isTherapy=q=>q?.id==='personal-therapy-weekly';
  const isTherapyCommute=q=>String(q?.id||'').includes('personal-therapy-weekly')&&String(q?.id||'').startsWith('commute-');
  const isGym=q=>q?.id==='personal-gym'||/academia|treino de academia/i.test(String(q?.title||''));
  const isBreakfast=q=>/^breakfast-/.test(String(q?.id||''))||q?.id==='personal-breakfast';
  const isShower=q=>/^shower-/.test(String(q?.id||''))||q?.id==='routine-shower-post-gym'||/\bbanho\b/i.test(String(q?.title||''));
  const generated=q=>!!q&&(q.capacityBlock||q.anchorBlock||q.adaptiveSession||q.scheduler2Synthetic||q.liveFill||q.lateWakeCanonical);
  const morningManaged=q=>isTherapy(q)||isTherapyCommute(q)||isGym(q)||isBreakfast(q)||isShower(q);

  function fallbackQuest(id,title,category,extra={}){return Object.assign({id,title,description:'',domain:'Pessoal',category,questType:'side',cadence:'once',xp:0,difficulty:1,essential:true,fixedTime:true},extra)}
  function therapyQuest(){let q=null;try{q=questById('personal-therapy-weekly')}catch{}return Object.assign(fallbackQuest('personal-therapy-weekly','Terapia','Saúde'),clone(q||{}),{id:'personal-therapy-weekly',title:'Terapia',domain:'Pessoal',category:'Saúde',fixedTime:true,essential:true,externalActivity:true,durationMin:30,timeStart:'08:00',timeEnd:'08:30',priorityLevel:'critical'})}
  function gymQuest(){let q=null;try{q=questById('personal-gym')}catch{}return Object.assign(fallbackQuest('personal-gym','Academia / treino do dia','Corpo'),clone(q||{}),{id:'personal-gym',durationMin:90,fixedTime:false,essential:false})}
  function add(p,q,start,end,reason,extra={}){const x=Object.assign({q,originDate:p.date||today(),start,end,key:`${q.id}|${p.date||today()}`,reason},extra);p.slots.push(x);return x}
  function commuteQ(id,title){return fallbackQuest(id,title,'Deslocamento',{commuteBlock:true,essential:true,fixedTime:true,durationMin:60})}
  function anchorQ(id,title,category,duration){return fallbackQuest(id,title,category,{anchorBlock:true,essential:true,fixedTime:true,durationMin:duration})}

  function removeTuesdayMorningConflicts(p,date){
    const displaced=[];
    p.slots=(p.slots||[]).filter(x=>{
      const q=x?.q;if(!q)return false;
      if(morningManaged(q)){displaced.push(x);return false}
      if(!overlap(x,{start:WINDOW.start,end:WINDOW.end}))return true;
      /* Therapy wins over generated/flexible morning work. Preserve the item as deferred context, not as an overlapping slot. */
      if(generated(q)||!(q.fixedTime||q.essential||q.externalActivity)){displaced.push(Object.assign({},x,{therapyDeferred:true,reason:'reorganizada pela terapia fixa de terça'}));return false}
      /* An unrelated real fixed commitment is kept and surfaced as a warning instead of silently deleted. */
      return true
    });
    p.capacityDeferred=(p.capacityDeferred||[]).concat(displaced.filter(x=>!morningManaged(x.q)));
    return displaced
  }

  function addProtectedSequence(p,date){
    const tq=therapyQuest();
    add(p,anchorQ(`breakfast-${date}`,'Café da manhã','Alimentação',20),...SLOTS.breakfast,'café antecipado para proteger terapia');
    add(p,commuteQ(`commute-out-personal-therapy-weekly-${date}`,'Deslocamento → Terapia'),...SLOTS.out,'deslocamento protegido por trânsito intenso',{commuteBlock:true});
    add(p,tq,...SLOTS.therapy,'compromisso fixo soberano da manhã de terça');
    add(p,commuteQ(`commute-back-personal-therapy-weekly-${date}`,'Volta · Terapia'),...SLOTS.back,'retorno protegido por trânsito intenso',{commuteBlock:true});
    add(p,gymQuest(),...SLOTS.gym,'primeiro bloco após retornar da terapia');
    add(p,anchorQ(`shower-${date}`,'Banho','Higiene',30),...SLOTS.shower,'banho imediatamente após o treino');
  }

  function collisionPairs(slots){const xs=(slots||[]).slice().sort((a,b)=>a.start-b.start||a.end-b.end),out=[];for(let i=1;i<xs.length;i++)if(overlap(xs[i-1],xs[i]))out.push([xs[i-1],xs[i]]);return out}
  function recalcCapacity(p){
    p.slots.sort((a,b)=>a.start-b.start||a.end-b.end);p.used=p.slots.reduce((n,x)=>n+dur(x),0);p.capacity=p.capacity||{};
    p.capacity.gym=p.slots.filter(x=>isGym(x.q)).reduce((n,x)=>n+dur(x),0);
    p.capacity.commute=p.slots.filter(x=>x.q?.commuteBlock).reduce((n,x)=>n+dur(x),0);
    p.capacity.meals=p.slots.filter(x=>x.q?.category==='Alimentação').reduce((n,x)=>n+dur(x),0);
    p.capacity.shower=p.slots.filter(x=>isShower(x.q)).reduce((n,x)=>n+dur(x),0);
    p.capacity.tuesdayTherapyProtected=true;
  }

  function therapyFirstPlan(date=today()){
    const p=BASE_PLAN(date);if(dow(date)!==TUESDAY)return p;
    p.date=date;p.capacityWarnings=p.capacityWarnings||[];
    removeTuesdayMorningConflicts(p,date);addProtectedSequence(p,date);recalcCapacity(p);
    const collisions=collisionPairs(p.slots).filter(([a,b])=>overlap(a,{start:WINDOW.start,end:WINDOW.end})||overlap(b,{start:WINDOW.start,end:WINDOW.end}));
    if(collisions.length)p.capacityWarnings.push('Terça: existe outro compromisso fixo real colidindo com a janela protegida da terapia; revise manualmente esse compromisso.');
    p.tuesdayTherapy={protected:true,therapyStart:SLOTS.therapy[0],therapyEnd:SLOTS.therapy[1],commuteOut:SLOTS.out,commuteBack:SLOTS.back,gym:SLOTS.gym,shower:SLOTS.shower};
    return p
  }
  function missionNow(date=today(),now=new Date()){const p=therapyFirstPlan(date),m=now.getHours()*60+now.getMinutes(),current=(p.slots||[]).find(x=>m>=x.start&&m<x.end),next=(p.slots||[]).find(x=>x.start>m);return{plan:p,current:current||null,next:next||null,minute:m}}

  window.MyPerformanceRoutine.planDay=therapyFirstPlan;
  window.MyPerformanceRoutine.missionNow=missionNow;
  window.MyPerformanceTuesdayTherapy={plan:therapyFirstPlan,SLOTS,WINDOW};
})();
