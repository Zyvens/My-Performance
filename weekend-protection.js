"use strict";
(function(){
  if(!window.MyPerformanceRoutine||!window.MyPerformanceDay)return;
  const BASE_RENDER=renderToday,BASE_PLAN=window.MyPerformanceRoutine.planDay,MIN=120;
  const toTime=window.MyPerformanceRoutine.toTime,toMin=window.MyPerformanceRoutine.toMin;
  const dow=d=>dfrom(d).getDay();
  const level=q=>window.MyPerformanceAdaptive?.priority?.(q)||q.priorityLevel||(q.questType==='main'?'high':'normal');
  const score=q=>({critical:4,high:3,normal:2,low:1}[level(q)]||2)+(q.questType==='main'?1:0);
  const workOrStudy=q=>['GSA','Carreira','Estudos'].includes(q?.domain)||String(q?.category||'').toLowerCase().includes('bni');
  function ensure(){state.weekendProtection=state.weekendProtection||{extreme:{}};state.weekendProtection.extreme=state.weekendProtection.extreme||{};Object.keys(state.weekendProtection.extreme).forEach(d=>{if(d<today())delete state.weekendProtection.extreme[d]})}
  function extreme(d){ensure();return!!state.weekendProtection.extreme[d]}
  function bounds(d,p){
    const w=dow(d),x=extreme(d);
    if(w===5)return{on:true,mode:'cap',start:p.wake,end:Math.min(p.end,18*60+(x?MIN:0)),label:x?'Sexta excepcional até 20:00':'Sexta encerra às 18:00'};
    if(w===6)return{on:true,mode:'cap',start:p.wake,end:Math.min(p.end,12*60+(x?MIN:0)),label:x?'Sábado excepcional até 14:00':'Sábado encerra às 12:00'};
    if(w===0)return{on:true,mode:'sunday',start:p.wake,end:p.end,workStart:10*60,workEnd:12*60,label:x?'Domingo: pessoal livre + 2h excepcionais de trabalho/estudo':'Domingo pessoal: trabalho e estudo bloqueados'};
    return{on:false,mode:'normal',start:p.wake,end:p.end,label:''}
  }
  const transfer=x=>x.q&&!x.q.fixedTime&&!x.q.essential&&!x.q.dailyMinimum&&x.q.cadence!=='daily';
  function rangeFor(q,d,b){if(b.mode==='sunday'&&workOrStudy(q))return extreme(d)?{start:b.workStart,end:b.workEnd}:null;return{start:b.start,end:b.end}}
  function allowed(x,d,b){const r=rangeFor(x.q,d,b);return!!r&&x.start>=r.start&&x.end<=r.end}
  function gaps(slots,a,b,d){const xs=slots.filter(x=>x.end>a&&x.start<b).slice().sort((x,y)=>x.start-y.start),g=[];let c=a;for(const x of xs){if(x.start-c>=d)g.push([c,x.start]);c=Math.max(c,x.end)}if(b-c>=d)g.push([c,b]);return g}
  function duration(q){return Math.max(15,Number(state.questPlans?.[q.id]?.durationMin||q.durationMin||30))}
  function place(p,c,d,b){const q=c.q,r=rangeFor(q,d,b);if(!r)return false;const du=duration(q),gs=gaps(p.slots,r.start,r.end,du);if(!gs.length)return false;const pref=toMin(q.timeStart)||r.start,box=gs.sort((x,y)=>Math.abs(x[0]-pref)-Math.abs(y[0]-pref))[0],st=Math.max(box[0],Math.min(pref,box[1]-du));p.slots.push(Object.assign({},c,{start:st,end:st+du,originDate:c.originDate||d,reason:'movida para a próxima janela útil'}));return true}
  function compactMinimum(p,d,b,domain){if(dow(d)===0||state.dayPlanning?.minimumDone?.[d]?.[domain]||p.slots.some(x=>x.q.domain===domain))return;for(const du of domain==='GSA'?[30,20,15]:[45,30,20,15]){const r=rangeFor({domain},d,b);if(!r)continue;const gs=gaps(p.slots,r.start,r.end,du);if(!gs.length)continue;const st=gs[0][0],q={id:`week-min-${domain}-${d}`,title:`${domain} — mínimo diário`,description:'Sessão mínima dentro da janela útil.',domain,category:'Mínimo diário',questType:'side',cadence:'once',startDate:d,dueDate:d,durationMin:du,dailyMinimum:true,priorityLevel:'high'};p.slots.push({q,originDate:d,start:st,end:st+du,reason:'mínimo diário protegido'});break}}
  function plan(target=today()){
    ensure();let carry=[],out=null;
    for(let d=addDays(target,-14);d<=target;d=addDays(d,1)){
      const p=JSON.parse(JSON.stringify(BASE_PLAN(d))),b=bounds(d,p),removed=[];
      p.slots=(p.slots||[]).filter(x=>{const ok=allowed(x,d,b);if(!ok)removed.push(x);return ok});
      compactMinimum(p,d,b,'GSA');compactMinimum(p,d,b,'Estudos');
      const ids=new Set(p.slots.map(x=>`${x.q.id}|${x.originDate}`)),incoming=carry.filter(x=>!ids.has(`${x.q.id}|${x.originDate}`)).sort((a,z)=>score(z.q)-score(a.q));carry=[];
      for(const c of incoming){if(!place(p,c,d,b)||d<today())carry.push(c)}
      const same=removed.filter(transfer).sort((a,z)=>score(z.q)-score(a.q));for(const c of same){if(extreme(d)&&place(p,c,d,b))continue;carry.push(c)}
      p.weekendBounds=b;p.weekendProtected=b.on;p.weekendCarry=carry.slice();p.weekendRemoved=removed;p.weekendExtreme=extreme(d);
      p.weekendExtremeEligible=b.on&&!extreme(d)&&(removed.some(x=>workOrStudy(x.q)&&score(x.q)>=3)||carry.some(x=>workOrStudy(x.q)&&score(x.q)>=3)||(p.critical||[]).some(x=>workOrStudy(x.q)));
      p.slots.sort((a,z)=>a.start-z.start);if(b.mode==='cap')p.end=b.end;p.used=p.slots.reduce((n,x)=>n+x.end-x.start,0);if(d===target)out=p
    }
    return out||BASE_PLAN(target)
  }
  function missionNow(d=today(),now=new Date()){const p=plan(d),m=now.getHours()*60+now.getMinutes(),cur=p.slots.find(x=>m>=x.start&&m<x.end),next=p.slots.find(x=>x.start>m);return{plan:p,current:cur||null,next:next||null,minute:m}}
  function setExtreme(d,on){ensure();if(on)state.weekendProtection.extreme[d]=true;else delete state.weekendProtection.extreme[d];saveState();render();toast(on?'Exceção liberada somente neste dia':'Proteção semanal restaurada')}
  function minDone(d,domain){state.dayPlanning=state.dayPlanning||{};state.dayPlanning.minimumDone=state.dayPlanning.minimumDone||{};state.dayPlanning.minimumDone[d]=state.dayPlanning.minimumDone[d]||{};state.dayPlanning.minimumDone[d][domain]=new Date().toISOString();saveState();render()}
  function slotHtml(x,d){if(x.q.dailyMinimum)return`<div class="routine-slot daily-minimum-slot"><div class="routine-time"><b>${toTime(x.start)}</b><span>${toTime(x.end)}</span></div><div class="routine-quest"><article class="quest"><div class="quest-head"><button class="check" data-week-min="${x.q.domain}">✓</button><div><div class="quest-title">${esc(x.q.title)}</div><div class="quest-desc">${esc(x.q.description||'')}</div><div class="quest-meta"><span class="tag ${x.q.domain}">${esc(x.q.domain)}</span><span class="pill adaptive-priority high">◆ MÍNIMO DIÁRIO</span></div></div></div></article></div></div>`;const moved=x.originDate!==d,skip=!x.q.fixedTime&&!x.q.essential;return`<div class="routine-slot ${moved?'rolled':''}"><div class="routine-time"><b>${toTime(x.start)}</b><span>${toTime(x.end)}</span></div><div class="routine-quest">${moved?`<div class="rollover-note">↪ movida para esta janela útil</div>`:''}${questCard(x.q,x.originDate,true)}<div class="routine-reason">${esc(x.reason||'planejamento')} · ${x.end-x.start} min</div>${skip?`<button class="mini-link day-skip-btn" data-week-skip="${esc(x.q.id)}">⊘ Não concluir hoje</button>`:''}</div></div>`}
  function banner(p,d){if(!p.weekendProtected)return'';if(p.weekendExtreme)return`<div class="card emergency-day active"><div><span class="eyebrow">EXCEÇÃO EXTREMA</span><h2>${p.weekendBounds.label}</h2><p class="muted">Somente ${fmt(d)}. Depois a proteção semanal volta ao normal.</p></div><button class="btn" id="weekRestore">Restaurar proteção</button></div>`;const sunday=dow(d)===0;return`<div class="card"><span class="eyebrow">TEMPO PESSOAL PROTEGIDO</span><h2>${p.weekendBounds.label}</h2><p class="muted">${sunday?'Academia, lazer, igreja e demais atividades pessoais continuam permitidas. GSA, BNI, Carreira e Transpetro/Estudos ficam fora do domingo.':'O que não cabe nesta janela é empurrado para a próxima janela útil.'}</p>${p.weekendExtremeEligible?'<button class="btn danger" id="weekExtreme">Liberar 2h em caso extremo</button>':''}</div>`}
  renderToday=function(){BASE_RENDER();const d=state.plannerDate||today(),p=plan(d),v=document.getElementById('view');if(!v)return;const tl=v.querySelector('.day-timeline');if(tl)tl.innerHTML=p.slots.map(x=>slotHtml(x,d)).join('')||`<div class="empty">${dow(d)===0&&!extreme(d)?'Domingo livre para atividades pessoais.':'Nenhuma missão dentro da janela útil.'}</div>`;if(p.weekendProtected){v.querySelectorAll('.emergency-day,.rollover-card').forEach(e=>e.remove());const h=v.querySelector('.planner-head')||v.querySelector('.section-title');h?.insertAdjacentHTML('afterend',banner(p,d))}bindQuestCards();document.querySelectorAll('[data-week-skip]').forEach(b=>b.onclick=()=>{const q=p.slots.find(x=>x.q.id===b.dataset.weekSkip)?.q||questById(b.dataset.weekSkip);window.MyPerformanceDay.skip(q,d)});document.querySelectorAll('[data-week-min]').forEach(b=>b.onclick=()=>minDone(d,b.dataset.weekMin));document.getElementById('weekExtreme')?.addEventListener('click',()=>setExtreme(d,true));document.getElementById('weekRestore')?.addEventListener('click',()=>setExtreme(d,false))};
  window.MyPerformanceRoutine.planDay=plan;window.MyPerformanceRoutine.missionNow=missionNow;window.MyPerformanceWeekend={plan,setExtreme,status:d=>{const p=plan(d||today());return{protected:p.weekendProtected,extreme:p.weekendExtreme,bounds:p.weekendBounds,carry:p.weekendCarry}}};window.addEventListener('my-performance-cloud-loaded',()=>{ensure();render()});setTimeout(()=>{if(state.view==='today')render()},200);
})();