"use strict";
/* Balanced Capacity — GSA is a soft capacity target; study keeps a protected 3h floor from Monday through Saturday. */
(function(){
  if(!window.MyPerformanceRoutine)return;
  const BASE_PLAN=window.MyPerformanceRoutine.planDay;
  const BASE_MISSION_NOW=window.MyPerformanceRoutine.missionNow;
  const STUDY_MIN=180;
  const GSA_SOFT_TARGET=480;

  const dur=x=>Math.max(0,Number(x?.end||0)-Number(x?.start||0));
  const study=x=>x?.q?.domain==='Estudos';
  const syntheticGsa=x=>!!x?.q?.capacityGsa&&!!x?.q?.capacityBlock;
  const overlap=(a,b)=>Number(a.start)<Number(b.end)&&Number(a.end)>Number(b.start);
  const studyMinutes=p=>(p.slots||[]).filter(study).reduce((n,x)=>n+dur(x),0);
  const gsaMinutes=p=>(p.slots||[]).filter(x=>x?.q?.domain==='GSA'||x?.q?.countsAsGsa).reduce((n,x)=>n+dur(x),0);
  const studyFloorDay=date=>{const d=dfrom(date).getDay();return d>=1&&d<=6};
  function cloneQ(q){return JSON.parse(JSON.stringify(q||{}))}
  function preferredStudyQuest(){
    let q=null;try{q=questById('study-focus')}catch{}
    return Object.assign({id:'study-focus',title:'Sessão foco — específicos',description:'Bloco protegido da campanha Transpetro.',domain:'Estudos',category:'Transpetro',questType:'main',cadence:'daily',durationMin:180,xp:80,difficulty:3,priorityLevel:'critical',source:'Strategy'},cloneQ(q||{}),{capacityStudyProtected:true,priorityLevel:'critical'})
  }
  function free(p,start,end){return !(p.slots||[]).some(x=>overlap({start,end},x))}
  function removeSyntheticOverlap(p,start,end){
    const removed=[];p.slots=(p.slots||[]).filter(x=>{if(syntheticGsa(x)&&overlap({start,end},x)){removed.push(x);return false}return true});return removed
  }
  function restoreDeferredStudy(p,date){
    const deferred=(p.capacityDeferred||[]).filter(study).sort((a,b)=>(b.q?.questType==='main')-(a.q?.questType==='main')||dur(b)-dur(a));
    for(const x of deferred){
      const wanted=Math.min(STUDY_MIN,Math.max(30,dur(x)||Number(x.q?.durationMin||90))),start=Number(x.start),end=start+wanted;if(!Number.isFinite(start)||start<p.wake||end>p.end)continue;
      const blockers=(p.slots||[]).filter(y=>overlap({start,end},y)&&!syntheticGsa(y));if(blockers.length)continue;
      removeSyntheticOverlap(p,start,end);if(!free(p,start,end))continue;
      p.slots.push(Object.assign({},x,{start,end,q:Object.assign({},x.q,{priorityLevel:'critical',capacityStudyProtected:true}),reason:'estudo mínimo de 3h protegido antes da meta flexível de GSA'}));return wanted
    }
    return 0
  }
  function carveSyntheticGsa(p,date,need){
    let remaining=need,added=0;const candidates=(p.slots||[]).filter(syntheticGsa).sort((a,b)=>Math.abs(((a.start+a.end)/2)-(19*60))-Math.abs(((b.start+b.end)/2)-(19*60))||dur(b)-dur(a));
    for(const x of candidates){
      if(remaining<15)break;const available=dur(x);if(available<15)continue;const take=Math.min(remaining,available),start=x.end-take,end=x.end;
      if(take===available)p.slots=p.slots.filter(y=>y!==x);else x.end-=take;
      const q=preferredStudyQuest();q.id=`study-protected-${date}-${added+1}`;q.title=added?'Transpetro · estudo protegido (continuação)':'Transpetro · estudo protegido';q.cadence='once';q.startDate=date;q.dueDate=date;q.durationMin=take;q.xp=0;q.capacityBlock=true;
      p.slots.push({q,originDate:date,start,end,key:`${q.id}|${date}`,reason:'reserva diária protegida de 3h para concurso',capacityStudyProtected:true});remaining-=take;added+=take
    }
    return added
  }
  function protectStudy(p,date){
    if(!studyFloorDay(date))return p;let have=studyMinutes(p);if(have>=STUDY_MIN)return p;
    have+=restoreDeferredStudy(p,date);if(have<STUDY_MIN)have+=carveSyntheticGsa(p,date,STUDY_MIN-have);
    p.slots.sort((a,b)=>a.start-b.start||a.end-b.end);
    p.used=p.slots.reduce((n,x)=>n+dur(x),0);
    const gsa=gsaMinutes(p),studyTotal=studyMinutes(p);p.capacity=p.capacity||{};p.capacity.gsa=gsa;p.capacity.study=studyTotal;p.capacity.gsaSoftTarget=GSA_SOFT_TARGET;p.capacity.studyProtectedMin=STUDY_MIN;p.capacity.balancePolicy='GSA é meta flexível; estudo mínimo de 3h não pode ser expulso por filler sintético.';
    p.capacityWarnings=(p.capacityWarnings||[]).filter(x=>!/^GSA abaixo da meta:/.test(String(x)));if(gsa<GSA_SOFT_TARGET)p.capacityWarnings.push(`GSA abaixo da meta flexível por capacidade real do dia: ${Math.floor(gsa/60)}h${String(gsa%60).padStart(2,'0')}. Estudo protegido: ${studyTotal} min.`);
    return p
  }
  function balancedPlan(date=today()){const p=BASE_PLAN(date);return protectStudy(p,date)}
  function missionNow(date=today(),now=new Date()){const p=balancedPlan(date),m=now.getHours()*60+now.getMinutes(),current=(p.slots||[]).find(x=>m>=x.start&&m<x.end),next=(p.slots||[]).find(x=>x.start>m);return{plan:p,current:current||null,next:next||null,minute:m}}

  window.MyPerformanceRoutine.planDay=balancedPlan;
  window.MyPerformanceRoutine.missionNow=missionNow;
  window.MyPerformanceBalancedCapacity={plan:balancedPlan,protectStudy,STUDY_MIN,GSA_SOFT_TARGET};
})();
