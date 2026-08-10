"use strict";
/* Late-wake canonical policy — missed secondary routines vanish; freed time is offered to Main Quests. */
(function(){
  if(!window.MyPerformanceRoutine)return;
  const BASE_PLAN=window.MyPerformanceRoutine.planDay;
  const OBJECTIVES=['gsa-main-hacktown-2026','gsa-main-eva-launch','gsa-main-editais'];
  const toMin=window.MyPerformanceRoutine.toMin;
  const toTime=window.MyPerformanceRoutine.toTime;
  const clone=x=>JSON.parse(JSON.stringify(x||{}));
  const duration=x=>Math.max(0,Number(x?.end||0)-Number(x?.start||0));
  const isGym=q=>q?.id==='personal-gym'||/academia|treino de academia/i.test(String(q?.title||''));
  const isAnchor=q=>!!q?.anchorBlock||/^(wake|breakfast|lunch|dinner|shower|rest)-/.test(String(q?.id||''));
  const isMain=q=>q?.questType==='main'||OBJECTIVES.includes(q?.id)||OBJECTIVES.includes(q?.parentId);
  const isFutureHard=x=>!!(x?.q?.fixedTime||x?.q?.commuteBlock)&&!isAnchor(x?.q);
  const originalMinute=q=>{const m=toMin?.(q?.timeStart||'');return Number.isFinite(m)?m:null};

  function dayContext(date){return state?.scheduler2?.dayContexts?.[date]||null}
  function shouldDrop(x,wake){
    const q=x?.q;if(!q||isAnchor(q)||isGym(q)||isMain(q)||isFutureHard(x))return false;
    if(String(x.reason||'').includes('recuperada após despertar tardio'))return true;
    const original=originalMinute(q);
    if(original!=null&&original<wake&&q.cadence!=='once')return true;
    if(q.dailyMinimum&&original!=null&&original<wake)return true;
    return false
  }
  function occupied(slots){return slots.map(x=>({start:Number(x.start),end:Number(x.end)})).sort((a,b)=>a.start-b.start)}
  function gaps(slots,start,end){
    const out=[],xs=occupied(slots).filter(x=>x.end>start&&x.start<end);let cur=start;
    for(const x of xs){if(x.start-cur>=30)out.push({start:cur,end:x.start});cur=Math.max(cur,x.end)}
    if(end-cur>=30)out.push({start:cur,end});return out
  }
  function urgency(q,date){
    const due=q?.dueDate||'9999-12-31';let days=999;
    try{days=Math.max(0,diffDays(date,due))}catch{}
    const p={critical:400,high:300,normal:200,low:100}[q?.priorityLevel]||200;
    return p+Math.max(0,240-days*12)
  }
  function canonicalCandidates(date){
    return OBJECTIVES.map(id=>{try{return questById(id)}catch{return null}}).filter(Boolean).filter(q=>!q.disabled).sort((a,b)=>urgency(b,date)-urgency(a,date))
  }
  function canonicalSlot(q,date,start,end,index){
    const dur=end-start;
    return{q:{id:`late-canonical-${q.id}-${date}-${index}`,title:`Main Quest · ${q.title}`,description:`Bloco priorizado porque o dia começou tarde. Rotinas secundárias perdidas não foram empurradas; este tempo vai para uma missão canônica.`,domain:q.domain||'GSA',category:q.category||'Main Quest',questType:'main',cadence:'once',durationMin:dur,xp:Math.max(8,Math.round(dur/3)),difficulty:q.difficulty||3,priorityLevel:q.priorityLevel||'high',parentId:q.id,capacityGsa:q.domain==='GSA',scheduler2Synthetic:true,lateWakeCanonical:true,source:'Contingenciamento · Main Quest'},originDate:date,start,end,key:`late-canonical-${q.id}|${date}|${index}`,reason:'priorizada após Acordei agora · rotina secundária anterior descartada',lateWakeCanonical:true}
  }
  function apply(date,p){
    const ctx=dayContext(date),wake=Number(ctx?.actualWakeMin);if(!Number.isFinite(wake))return p;
    const out=clone(p);const before=(out.slots||[]).length;
    out.slots=(out.slots||[]).filter(x=>Number(x.end)>wake).filter(x=>!shouldDrop(x,wake));
    const dropped=before-out.slots.length;
    if(!dropped){out.lateWakeCanonicalPolicy=true;return out}
    const mains=canonicalCandidates(date);if(!mains.length){out.lateWakeCanonicalPolicy=true;out.lateWakeDroppedSecondary=dropped;return out}
    let idx=0,mi=0;
    for(const gap of gaps(out.slots,wake,Number(out.end||wake))){
      let cur=gap.start;
      while(gap.end-cur>=30){
        const q=mains[mi++%mains.length],dur=Math.min(60,gap.end-cur);if(dur<30)break;
        out.slots.push(canonicalSlot(q,date,cur,cur+dur,idx++));cur+=dur
      }
    }
    out.slots.sort((a,b)=>a.start-b.start);out.used=out.slots.reduce((n,x)=>n+duration(x),0);
    out.lateWakeCanonicalPolicy=true;out.lateWakeDroppedSecondary=dropped;out.lateWakeCanonicalAdded=idx;
    return out
  }
  function plan(date=today()){return apply(date,BASE_PLAN(date))}
  window.MyPerformanceRoutine.planDay=plan;
  window.MyPerformanceLateWakePolicy={plan,shouldDrop};
  window.addEventListener('my-performance-scheduler-recalculated',e=>{if(e.detail?.reason==='late-wake'&&state?.view==='today')setTimeout(()=>render(),0)});
})();
