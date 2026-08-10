"use strict";
/* Live Capacity — reuses time freed by early completions and treats sleep as a boundary, never a competing quest. */
(function(){
  if(!window.MyPerformanceRoutine||!window.MyPerformanceScheduler2)return;
  const BASE_PLAN=window.MyPerformanceRoutine.planDay;
  const BASE_MISSION_NOW=window.MyPerformanceRoutine.missionNow;
  const BASE_RENDER_TODAY=renderToday;
  const toTime=window.MyPerformanceRoutine.toTime;
  const toMin=window.MyPerformanceRoutine.toMin;
  const MIN_GAP=15;
  const GSA_TARGET=480;
  const MAX_PULL_DAYS=5;
  let rendering=false;

  function ensure(){
    state.liveCapacity=state.liveCapacity||{};
    state.liveCapacity.version=1;
    state.liveCapacity.autoFill=state.liveCapacity.autoFill!==false;
    state.overrides=state.overrides||{};
    const sleep=state.routineSettings?.sleepTime||'22:00';
    const cur=state.overrides['personal-sleep']||{};
    const next=Object.assign({},cur,{disabled:true,boundaryOnly:true,timeStart:sleep,timeEnd:sleep,durationMin:0,fixedTime:false,essential:false});
    const changed=JSON.stringify(cur)!==JSON.stringify(next);
    state.overrides['personal-sleep']=next;
    return changed
  }
  const initialChanged=ensure();

  const clone=p=>JSON.parse(JSON.stringify(p||{}));
  const dow=d=>dfrom(d).getDay();
  const nowMin=()=>{const n=new Date();return n.getHours()*60+n.getMinutes()};
  const duration=x=>Math.max(0,Number(x?.end||0)-Number(x?.start||0));
  const level=q=>window.MyPerformanceAdaptive?.priority?.(q)||q?.priorityLevel||(q?.questType==='main'?'high':'normal');
  const score=(q,date)=>{
    const p={critical:600,high:450,normal:260,low:90}[level(q)]||260;
    const domains=state.routineSettings?.domainPriority||['GSA','Estudos','Pessoal','Carreira'];
    const di=domains.indexOf(q?.domain),domain=(di<0?0:(4-di)*60);
    const due=q?.dueDate?Math.max(0,260-Math.max(0,diffDays(date,q.dueDate))*20):0;
    return p+domain+due+(q?.questType==='main'?120:0)
  };
  const isSleep=x=>x?.q?.id==='personal-sleep'||/^(dormir|sono)$/i.test(String(x?.q?.title||'').trim());
  const protectedTask=q=>!!q&&(q.fixedTime||q.essential||q.dailyMinimum||q.commuteBlock||q.anchorBlock);
  const workOrStudy=q=>['GSA','Estudos','Carreira'].includes(q?.domain)||String(q?.category||'').toLowerCase().includes('bni');
  const canPull=q=>!!q&&!protectedTask(q)&&!isSleep({q})&&q.cadence!=='daily';
  const keyOf=x=>`${x?.q?.id||''}|${x?.originDate||''}`;

  function cleanCritical(p){
    p.critical=(p.critical||[]).filter(x=>!isSleep(x));
    if(Array.isArray(p.capacityWarnings))p.capacityWarnings=p.capacityWarnings.filter(x=>!/dorm|sono|22:00/i.test(String(x))||!/conflit|janela/i.test(String(x)));
    return p
  }
  function gaps(slots,start,end){
    const xs=(slots||[]).filter(x=>x.end>start&&x.start<end).slice().sort((a,b)=>a.start-b.start),out=[];let cur=start;
    for(const x of xs){if(x.start-cur>=MIN_GAP)out.push({start:cur,end:x.start});cur=Math.max(cur,x.end)}
    if(end-cur>=MIN_GAP)out.push({start:cur,end});return out
  }
  function presentKeys(p){return new Set((p.slots||[]).map(keyOf))}
  function candidatePool(p,date){
    const present=presentKeys(p),pool=[],seen=new Set();
    const add=x=>{
      if(!x?.q||!canPull(x.q))return;const k=keyOf(x);if(present.has(k)||seen.has(k))return;
      try{if(done(x.q,x.originDate||date))return}catch{}
      if(state.dayPlanning?.skipped?.[date]?.[x.q.id])return;
      seen.add(k);pool.push(Object.assign({},x))
    };
    (p.movedOut||[]).forEach(add);(p.capacityDeferred||[]).forEach(add);(p.lateDeferred||[]).forEach(add);(p.overflow||[]).forEach(add);
    for(let i=1;i<=MAX_PULL_DAYS;i++){
      const d=addDays(date,i);let fp;try{fp=BASE_PLAN(d)}catch{continue}
      for(const x of fp?.slots||[]){
        if(!canPull(x.q))continue;
        if(x.q.startDate&&x.q.startDate>d)continue;
        add(Object.assign({},x,{pulledFrom:d,originDate:x.originDate||d}))
      }
    }
    return pool.sort((a,b)=>score(b.q,date)-score(a.q,date)||String(a.q.dueDate||'9999').localeCompare(String(b.q.dueDate||'9999')))
  }
  function gsaMinutes(p){return(p.slots||[]).filter(x=>x.q?.domain==='GSA'||x.q?.countsAsGsa).reduce((n,x)=>n+duration(x),0)}
  function activeObjective(date){
    const diag=window.MyPerformanceScheduler2?.objectiveDiagnosis?.(date)?.items||[];
    const ordered=diag.filter(x=>!x.missing).sort((a,b)=>({critical:3,attention:2,ok:1}[b.status]||0)-({critical:3,attention:2,ok:1}[a.status]||0));
    const x=ordered[0];return x?{id:x.id,title:x.title}:{id:'gsa-main-editais',title:'Editais / FAPERJ'}
  }
  function syntheticForGap(p,date,gap,index){
    const w=dow(date),len=gap.end-gap.start;
    if(len<MIN_GAP)return null;
    if(w===0)return null;
    if([1,2,3,4,5].includes(w)&&gsaMinutes(p)<GSA_TARGET){
      const o=activeObjective(date),dur=Math.min(60,len);
      return{q:{id:`live-gsa-${date}-${index}`,title:`Sprint extra · ${o.title}`,description:`Espaço liberado no dia reaproveitado para avançar ${o.title}.`,domain:'GSA',category:'Capacidade livre',questType:'side',cadence:'once',durationMin:dur,xp:0,difficulty:2,capacityGsa:true,scheduler2Synthetic:true,parentId:o.id,priorityLevel:'high'},originDate:date,start:gap.start,end:gap.start+dur,reason:'espaço liberado por conclusão antecipada',liveFill:true}
    }
    if([1,2,3,4,5,6].includes(w)){
      const dur=Math.min(45,len);
      return{q:{id:`live-study-${date}-${index}`,title:'Transpetro · sessão adicional',description:'Sessão criada para aproveitar capacidade liberada sem invadir refeições, treino ou sono.',domain:'Estudos',category:'Transpetro',questType:'side',cadence:'once',durationMin:dur,xp:0,difficulty:2,scheduler2Synthetic:true,priorityLevel:'normal'},originDate:date,start:gap.start,end:gap.start+dur,reason:'saldo livre convertido em estudo',liveFill:true}
    }
    return null
  }
  function fitCandidate(c,g,date){
    const planned=Math.max(MIN_GAP,Number(c.q?.durationMin||duration(c)||30));if(planned>g.end-g.start)return null;
    return{q:c.q,originDate:c.originDate||date,start:g.start,end:g.start+planned,key:`${c.q.id}|${c.originDate||date}`,carried:true,reason:c.pulledFrom?`antecipada de ${fmt(c.pulledFrom)} para ocupar tempo liberado`:'puxada para ocupar tempo liberado',liveFill:true,pulledFrom:c.pulledFrom||''}
  }
  function fillPlan(date=today()){
    ensure();const p=cleanCritical(clone(BASE_PLAN(date)));if(!state.liveCapacity.autoFill)return p;
    if(date!==today())return p;
    const floor=Math.max(p.wake||0,nowMin()),end=p.end||floor;if(end-floor<MIN_GAP)return p;
    const pool=candidatePool(p,date);let poolIndex=0,added=[];
    let gs=gaps(p.slots,floor,end);
    for(let gi=0;gi<gs.length;gi++){
      let g=gs[gi];if(g.end-g.start<MIN_GAP)continue;let x=null;
      while(poolIndex<pool.length&&!x){x=fitCandidate(pool[poolIndex++],g,date)}
      if(!x)x=syntheticForGap(p,date,g,gi);
      if(!x)continue;p.slots.push(x);added.push(x);p.slots.sort((a,b)=>a.start-b.start)
    }
    p.liveFill=added;p.used=(p.slots||[]).reduce((n,x)=>n+duration(x),0);return p
  }
  function missionNow(date=today(),now=new Date()){
    const p=fillPlan(date),m=now.getHours()*60+now.getMinutes(),current=p.slots.find(x=>m>=x.start&&m<x.end),next=p.slots.find(x=>x.start>m);return{plan:p,current:current||null,next:next||null,minute:m}
  }

  function fillerHtml(x,date,index){
    const q=x.q,context=x.pulledFrom?`Antecipada de ${fmt(x.pulledFrom)} porque surgiu espaço livre.`:'Criada pelo Scheduler para aproveitar o tempo que ficou livre.';
    return`<div class="routine-slot live-fill-slot" data-live-fill-start="${x.start}"><div class="routine-time"><b>${toTime(x.start)}</b><span>${toTime(x.end)}</span></div><div class="routine-quest"><article class="quest"><div class="quest-head"><div class="synthetic-mark">↯</div><div><div class="quest-title">${esc(q.title)}</div><div class="quest-desc">${esc(q.description||context)}</div><div class="quest-meta"><span class="tag ${esc(q.domain||'')}">${esc(q.domain||'')}</span><span class="pill green">CAPACIDADE RECUPERADA</span><span class="pill">${duration(x)} min</span></div></div></div></article><div class="scheduler-context">${esc(context)}</div><div class="routine-reason">${esc(x.reason)}</div><div class="scheduler-slot-actions"><button class="btn small" data-live-start="${index}">▶ Iniciar</button></div></div></div>`
  }
  function injectFillers(p,date){
    const tl=document.querySelector('.day-timeline');if(!tl)return;
    tl.querySelectorAll('[data-live-fill-start]').forEach(e=>e.remove());
    const fills=p.liveFill||[];
    for(let i=0;i<fills.length;i++){
      const x=fills[i],wrap=document.createElement('div');wrap.innerHTML=fillerHtml(x,date,i);const node=wrap.firstElementChild;
      const children=[...tl.children];const before=children.find(el=>{const b=el.querySelector('.routine-time b')?.textContent;const m=toMin(b);return m!==null&&m>x.start});
      if(before)tl.insertBefore(node,before);else tl.appendChild(node)
    }
    document.querySelectorAll('[data-live-start]').forEach(b=>b.onclick=()=>{const x=fills[Number(b.dataset.liveStart)];if(x)window.MyPerformanceScheduler2.startTracking(x.q,date,x.originDate||date)})
  }
  function cleanConflictDom(p){
    if((p.critical||[]).length)return;
    document.querySelectorAll('#view .card.danger').forEach(card=>{const h=card.querySelector('h2')?.textContent||'';if(/horários protegidos.*colid|conflito fixo/i.test(h))card.remove()});
    document.querySelectorAll('.planner-stats .mini-stat').forEach(card=>{const label=card.querySelector('span')?.textContent||'';if(label==='Capacidade'&&/Conflito crítico/i.test(card.querySelector('b')?.textContent||'')){card.classList.remove('danger');card.querySelector('b').textContent='Sem overload'}})
  }
  function renderTodayLive(){
    BASE_RENDER_TODAY();const date=state.plannerDate||today(),p=fillPlan(date);injectFillers(p,date);cleanConflictDom(p);
    if((p.liveFill||[]).length){const head=document.querySelector('.planner-head');if(head&&!document.getElementById('liveCapacityNotice'))head.insertAdjacentHTML('afterend',`<div class="callout" id="liveCapacityNotice"><b>Capacidade reaproveitada:</b> ${p.liveFill.length} missão(ões) foram puxadas/criadas para ocupar espaços livres do restante do dia.</div>`)}
  }

  window.MyPerformanceRoutine.planDay=fillPlan;
  window.MyPerformanceRoutine.missionNow=missionNow;
  window.MyPerformanceLiveCapacity={plan:fillPlan,refresh:()=>{if(state.view==='today')render()},enabled:()=>state.liveCapacity.autoFill};
  renderToday=renderTodayLive;
  window.addEventListener('my-performance-tracking',e=>{if(e.detail?.type==='complete')setTimeout(()=>{if(state.view==='today')render()},0)});
  window.addEventListener('my-performance-cloud-loaded',()=>setTimeout(()=>{const changed=ensure();if(changed)saveState();if(state.view==='today')render()},80));
  if(initialChanged)saveState();
  setTimeout(()=>{if(state.view==='today')render()},120);
})();
