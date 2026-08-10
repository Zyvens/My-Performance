"use strict";
/* Routine OS — campaign priorities, 16h day planning and automatic rollover. */
(function(){
  const BASE_TODAY_QUESTS=todayQuests;
  const BASE_RENDER_CONFIG=renderConfig;
  const BASE_RENDER=render;
  const BUFFER=5;
  const MAX_AWAKE=16*60;
  const DAY_LIMIT=180;
  const DEFAULTS={
    wakeTime:'06:00',sleepTime:'22:00',gymStart:'06:25',gymDuration:90,
    domainPriority:['GSA','Estudos','Pessoal','Carreira'],muayFriday:false,
    autoRollover:true,rolloverDays:14
  };

  function ensure(){
    state.routineSettings=Object.assign({},DEFAULTS,state.routineSettings||{});
    if(!Array.isArray(state.routineSettings.domainPriority)||state.routineSettings.domainPriority.length!==4)state.routineSettings.domainPriority=[...DEFAULTS.domainPriority];
    state.routineSettings.domainPriority=[...new Set(state.routineSettings.domainPriority.concat(['GSA','Estudos','Pessoal','Carreira']))].slice(0,4);
  }
  ensure();
  const settings=()=>{ensure();return state.routineSettings};
  const toMin=t=>{if(!t||!/^[0-2]?\d:\d\d$/.test(t))return null;const[h,m]=t.split(':').map(Number);return h*60+m};
  const toTime=n=>{n=((Math.round(n)%1440)+1440)%1440;return`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`};
  const addM=(t,m)=>toTime((toMin(t)||0)+m);
  const domainRank=d=>{const i=settings().domainPriority.indexOf(d);return i<0?99:i};
  const dayLabel=d=>dfrom(d).toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'});

  function applySettings(){
    ensure();const s=settings();state.overrides=state.overrides||{};
    state.overrides['personal-wake']=Object.assign({},state.overrides['personal-wake']||{},{timeStart:s.wakeTime,timeEnd:addM(s.wakeTime,10),durationMin:10,fixedTime:true,essential:true});
    state.overrides['personal-sleep']=Object.assign({},state.overrides['personal-sleep']||{},{timeStart:s.sleepTime,timeEnd:addM(s.sleepTime,10),durationMin:10,fixedTime:true,essential:true});
    state.overrides['personal-gym']=Object.assign({},state.overrides['personal-gym']||{},{timeStart:s.gymStart,timeEnd:addM(s.gymStart,Number(s.gymDuration||90)),durationMin:Number(s.gymDuration||90)});
  }
  applySettings();

  todayQuests=function(date=today()){
    ensure();return BASE_TODAY_QUESTS(date).filter(q=>!(q.optionalRoutine==='muayFriday'&&!settings().muayFriday));
  };

  function duration(q){
    const custom=state.questPlans?.[q.id]?.durationMin;
    if(Number(custom)>0)return Number(custom);
    if(Number(q.durationMin)>0)return Number(q.durationMin);
    if(q.timeStart&&q.timeEnd){let a=toMin(q.timeStart),b=toMin(q.timeEnd);if(a!==null&&b!==null){if(b<a)b+=1440;return Math.max(5,b-a)}}
    if(q.id==='personal-gym')return Number(settings().gymDuration||90);
    if(q.domain==='GSA')return q.cadence==='daily'?15:q.cadence==='weekly'?30:45;
    if(q.domain==='Estudos')return q.questType==='main'?60:30;
    if(q.domain==='Carreira')return 30;
    return 15;
  }
  function fixed(q){return!!q.fixedTime||['personal-wake','personal-sleep','personal-breakfast','personal-lunch','routine-dinner','routine-hygiene-am','routine-tomorrow','routine-hygiene-night','routine-muay','routine-muay-commute','routine-muay-return'].includes(q.id)}
  function movable(q){return!fixed(q)&&!q.essential&&q.id!=='personal-gym'}
  function desired(q,wake){
    const t=toMin(q.timeStart);if(t!==null)return t;
    if(q.domain==='GSA')return Math.max(wake+150,9*60);
    if(q.domain==='Carreira')return 16*60+30;
    if(q.domain==='Estudos')return 18*60+30;
    return wake+120;
  }
  function urgency(q,date){
    let u=0;if(q.questType==='main')u+=1000;u+=Number(q.priority||0)*5;
    if(q.dueDate){const d=diffDays(date,q.dueDate);u+=d<0?1600:d===0?1300:d<=2?900:d<=7?500:d<=14?220:0}
    return u;
  }
  function sortScore(q,date){return domainRank(q.domain)*100000-urgency(q,date)*100+desired(q,toMin(settings().wakeTime)||360)}
  function overlap(a,b){return a.start<b.end&&a.end>b.start}
  function findSlot(q,dur,occupied,start,end,date){
    const pref=Math.max(start,Math.min(end-dur,desired(q,start))),latest=end-dur;
    const candidates=[];
    for(let t=pref;t<=latest;t+=5)candidates.push(t);
    for(let t=pref-5;t>=start;t-=5)candidates.push(t);
    for(const t of candidates){
      if(q.id==='personal-gym'&&t>7*60)continue;
      const x={start:t-BUFFER,end:t+dur+BUFFER};if(!occupied.some(o=>overlap(x,o)))return{start:t,end:t+dur};
    }
    return null;
  }
  function instance(q,originDate){return{q,originDate,key:`${q.id}|${originDate}`,carried:false}}

  function rawBase(date,windowStart,seen){
    const out=[];
    for(const q of quests()){
      if(q.optionalRoutine==='muayFriday'&&!settings().muayFriday)continue;
      if(done(q,date)&&q.cadence!=='daily')continue;
      let include=false;
      if(q.cadence==='once'){
        const origin=q.startDate||q.dueDate;
        if(!origin||hasEverDone(q.id))continue;
        if(origin===date)include=true;
        else if(origin<windowStart&&date===windowStart&&(!q.dueDate||q.dueDate>=windowStart))include=true;
      }else include=scheduled(q,date);
      if(!include)continue;
      const occ=q.cadence==='daily'?`${q.id}@${date}`:occurrenceKey(q,date);
      if(q.cadence!=='daily'&&seen.has(occ))continue;
      if(q.cadence!=='daily')seen.add(occ);
      out.push(instance(q,date));
    }
    return out;
  }

  function scheduleDate(date,instances){
    const s=settings(),wake=toMin(s.wakeTime)||360;let requestedSleep=toMin(s.sleepTime);if(requestedSleep===null)requestedSleep=wake+MAX_AWAKE;if(requestedSleep<=wake)requestedSleep+=1440;
    const end=Math.min(requestedSleep,wake+MAX_AWAKE),occupied=[],slots=[],critical=[],overflow=[];
    const fixedList=instances.filter(x=>fixed(x.q)).sort((a,b)=>desired(a.q,wake)-desired(b.q,wake));
    const flex=instances.filter(x=>!fixed(x.q)).sort((a,b)=>sortScore(a.q,date)-sortScore(b.q,date));
    for(const it of fixedList){
      const q=it.q,dur=duration(q),st=Math.max(wake,desired(q,wake)),en=st+dur;
      if(en>end){critical.push(Object.assign({},it,{reason:'âncora fora da janela de 16h'}));continue}
      const conflict=occupied.some(o=>overlap({start:st,end:en},o));
      if(conflict){critical.push(Object.assign({},it,{reason:'conflito entre horários fixos'}));continue}
      occupied.push({start:st,end:en});slots.push(Object.assign({},it,{start:st,end:en,reason:'horário protegido'}));
    }
    for(const it of flex){
      const q=it.q,dur=duration(q),slot=findSlot(q,dur,occupied,wake,end,date);
      if(slot){occupied.push(slot);slots.push(Object.assign({},it,slot,{reason:q.timeStart&&slot.start!==(toMin(q.timeStart)||slot.start)?`ajustado de ${q.timeStart}`:(q.timeStart?'horário preferido':'encaixe por prioridade')}))}
      else overflow.push(it);
    }
    slots.sort((a,b)=>a.start-b.start);
    return{date,wake,end,requestedSleep,slots,overflow,critical,capacity:end-wake,used:slots.reduce((n,x)=>n+x.end-x.start,0)};
  }

  function earliestWindowStart(target){
    let start=target<today()?target:today();
    const unfinished=quests().filter(q=>q.cadence==='once'&&!hasEverDone(q.id)&&q.startDate&&q.startDate<=target).map(q=>q.startDate).sort();
    if(unfinished.length&&unfinished[0]<start)start=unfinished[0];
    if(diffDays(start,target)>DAY_LIMIT)start=addDays(target,-DAY_LIMIT);
    return start;
  }

  function computeWindow(target,extra=7){
    ensure();const start=earliestWindowStart(target),last=addDays(target,Math.max(extra,settings().rolloverDays||7)),plans={},carry=[],seen=new Set(),finalDate={};let c=carry;
    for(let date=start;date<=last;date=addDays(date,1)){
      const base=rawBase(date,start,seen),instances=base.concat(c.map(x=>Object.assign({},x,{carried:true}))).filter(x=>!done(x.q,x.originDate));
      const p=scheduleDate(date,instances),next=[];
      p.overflow.forEach(it=>{if(settings().autoRollover&&movable(it.q))next.push(it);else p.critical.push(Object.assign({},it,{reason:'sem espaço e não replanejada'}))});
      p.moved=next.map(it=>({key:it.key,q:it.q,originDate:it.originDate,to:addDays(date,1)}));
      p.slots.forEach(it=>finalDate[it.key]=date);plans[date]=p;c=next;
    }
    c.forEach(it=>{finalDate[it.key]=null});
    return{start,last,plans,finalDate};
  }

  function planDay(date=today()){
    const w=computeWindow(date,Math.max(7,settings().rolloverDays||7)),p=w.plans[date]||scheduleDate(date,[]),baseKeys=new Set(rawBase(date,w.start,new Set()).map(x=>x.key));
    p.movedOut=[];
    baseKeys.forEach(key=>{const to=w.finalDate[key];if(to&&to!==date){const [qid,originDate]=key.split('|'),q=questById(qid);if(q)p.movedOut.push({key,q,originDate,to})}});
    p.future=w;return p;
  }

  function slotHtml(x,targetDate){
    const moved=x.originDate!==targetDate;return`<div class="routine-slot ${x.q.questType==='main'?'main':''} ${moved?'rolled':''}"><div class="routine-time"><b>${toTime(x.start)}</b><span>${toTime(x.end)}</span></div><div class="routine-quest">${moved?`<div class="rollover-note">↪ veio de ${fmt(x.originDate)} · replanejamento automático</div>`:''}${questCard(x.q,x.originDate,true)}<div class="routine-reason">${esc(x.reason)} · ${x.end-x.start} min · prioridade ${domainRank(x.q.domain)+1}</div></div></div>`
  }

  function routineRenderToday(){
    ensure();const date=state.plannerDate||today(),p=planDay(date),s=settings(),total=p.slots.length,movedIn=p.slots.filter(x=>x.originDate!==date).length;
    const awake=p.end-p.wake,sleepHours=Math.max(0,(1440-awake)/60),prio=s.domainPriority.join(' › ');
    document.getElementById('view').innerHTML=`
      <div class="section-title planner-head"><div><span class="eyebrow">AGENDA OPERACIONAL</span><h2>${date===today()?'Hoje':fmt(date,{weekday:'long',day:'2-digit',month:'long'})}</h2><p class="muted">O dia é montado por campanha, horário e deadline. O que não cabe é escalado para o próximo dia viável.</p></div><div class="day-nav"><button class="btn small" id="dayPrev">←</button><button class="btn small" id="dayNow">Hoje</button><button class="btn small" id="dayNext">→</button></div></div>
      <div class="planner-stats routine-stats"><div class="card mini-stat"><span>Acordar / dormir</span><b>${s.wakeTime} → ${toTime(p.end)}</b><small>${(awake/60).toFixed(1)}h acordado · ${sleepHours.toFixed(1)}h protegidas</small></div><div class="card mini-stat"><span>Prioridade</span><b>${esc(s.domainPriority[0])}</b><small>${esc(prio)}</small></div><div class="card mini-stat"><span>Missões encaixadas</span><b>${total}</b><small>${movedIn} vieram de dias anteriores</small></div><div class="card mini-stat ${p.critical.length?'danger':''}"><span>Capacidade</span><b>${p.critical.length?'Conflito crítico':'Sem overload'}</b><small>${Math.floor(p.used/60)}h ${p.used%60}min de missões</small></div></div>
      ${p.requestedSleep>p.wake+MAX_AWAKE?`<div class="callout planner-warning">Seu horário configurado de sono ultrapassa 16h acordado. O planejador encerrou o dia às <b>${toTime(p.end)}</b>.</div>`:''}
      <div class="day-timeline routine-timeline">${p.slots.map(x=>slotHtml(x,date)).join('')||'<div class="empty">Nenhuma missão programada.</div>'}</div>
      ${p.movedOut.length?`<div class="card rollover-card"><span class="eyebrow">REPLANEJAMENTO AUTOMÁTICO</span><h2>${p.movedOut.length} missões escaladas para outros dias</h2><p class="muted">As campanhas de menor prioridade cedem espaço antes das de maior prioridade. Nenhuma missão foi jogada para depois do horário de dormir.</p>${p.movedOut.map(x=>`<div class="rollover-row"><div><b>${esc(x.q.title)}</b><span>${esc(x.q.domain)} · originalmente ${fmt(x.originDate)}</span></div><strong>→ ${dayLabel(x.to)}</strong></div>`).join('')}</div>`:''}
      ${p.critical.length?`<div class="card danger"><span class="eyebrow">CONFLITO FIXO</span><h2>Há horários protegidos que colidem</h2>${p.critical.map(x=>`<div class="rollover-row"><div><b>${esc(x.q.title)}</b><span>${esc(x.reason)}</span></div><button class="mini-link" data-edit="${esc(x.q.id)}">Editar</button></div>`).join('')}</div>`:''}`;
    document.getElementById('dayPrev').onclick=()=>{state.plannerDate=addDays(date,-1);saveState();render()};
    document.getElementById('dayNow').onclick=()=>{state.plannerDate=today();saveState();render()};
    document.getElementById('dayNext').onclick=()=>{state.plannerDate=addDays(date,1);saveState();render()};
    bindQuestCards();
  }
  renderToday=routineRenderToday;

  function priorityRows(){return settings().domainPriority.map((d,i)=>`<div class="priority-row" data-domain="${d}"><span class="priority-number">${i+1}</span><div><b>${d}</b><small>${i===0?'vence primeiro em conflitos':i===3?'cede primeiro em overload':'prioridade intermediária'}</small></div><div class="priority-actions"><button class="mini-link" data-prio-up="${d}" ${i===0?'disabled':''}>↑</button><button class="mini-link" data-prio-down="${d}" ${i===3?'disabled':''}>↓</button></div></div>`).join('')}
  renderConfig=function(){
    ensure();BASE_RENDER_CONFIG();const s=settings(),host=document.getElementById('view');if(!host)return;
    host.insertAdjacentHTML('beforeend',`<div class="section-title"><div><span class="eyebrow">ROTINA & MOTOR DE PRIORIDADE</span><h2>Agenda automática</h2><p class="muted">Essas regras governam a criação da agenda e quem cede espaço quando o dia fica cheio.</p></div></div><div class="grid2"><div class="card"><h2>Janela do dia</h2><div class="form-row"><div class="field"><label>Acordar</label><input id="routineWake" type="time" value="${s.wakeTime}"></div><div class="field"><label>Dormir</label><input id="routineSleep" type="time" value="${s.sleepTime}"></div></div><div class="form-row"><div class="field"><label>Início do treino</label><input id="routineGymStart" type="time" value="${s.gymStart}"></div><div class="field"><label>Duração do treino (min)</label><input id="routineGymDuration" type="number" min="30" max="180" step="5" value="${Number(s.gymDuration||90)}"></div></div><label class="setting-toggle"><input id="routineMuayFriday" type="checkbox" ${s.muayFriday?'checked':''}><span><b>Muay Thai também na sexta às 10:00</b><small>Desligado por padrão para preservar uma manhã inteira da GSA.</small></span></label><label class="setting-toggle"><input id="routineRollover" type="checkbox" ${s.autoRollover?'checked':''}><span><b>Replanejar automaticamente quando não couber</b><small>Missões flexíveis migram para dias seguintes em vez de criar OVERLOAD.</small></span></label><div class="field"><label>Horizonte máximo do replanejamento (dias)</label><input id="routineRolloverDays" type="number" min="1" max="30" value="${Number(s.rolloverDays||14)}"></div><button class="btn primary" id="saveRoutine">Salvar rotina</button><p class="subtle" style="margin-top:10px">A agenda nunca usa mais de 16 horas entre acordar e encerrar o dia. Se você configurar uma janela maior, o sistema corta no limite de 16h.</p></div><div class="card"><h2>Prioridade das campanhas</h2><p class="muted">A ordem abaixo controla encaixe e replanejamento. Horários essenciais (sono, refeições, Muay Thai) continuam protegidos.</p><div id="priorityList">${priorityRows()}</div></div></div>`);
    const rebind=()=>{document.querySelectorAll('[data-prio-up]').forEach(b=>b.onclick=()=>movePriority(b.dataset.prioUp,-1));document.querySelectorAll('[data-prio-down]').forEach(b=>b.onclick=()=>movePriority(b.dataset.prioDown,1))};rebind();
    function movePriority(domain,dir){const a=settings().domainPriority,i=a.indexOf(domain),j=i+dir;if(i<0||j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];saveState();document.getElementById('priorityList').innerHTML=priorityRows();rebind();updateMissionDock()}
    document.getElementById('saveRoutine').onclick=()=>{s.wakeTime=document.getElementById('routineWake').value||'06:00';s.sleepTime=document.getElementById('routineSleep').value||'22:00';s.gymStart=document.getElementById('routineGymStart').value||'06:25';s.gymDuration=Math.max(30,Math.min(180,Number(document.getElementById('routineGymDuration').value||90)));s.muayFriday=document.getElementById('routineMuayFriday').checked;s.autoRollover=document.getElementById('routineRollover').checked;s.rolloverDays=Math.max(1,Math.min(30,Number(document.getElementById('routineRolloverDays').value||14)));applySettings();saveState();render();toast('Rotina e prioridades atualizadas')}
  };

  function missionNow(date=today(),now=new Date()){
    const p=planDay(date),minute=now.getHours()*60+now.getMinutes(),cur=p.slots.find(x=>minute>=x.start&&minute<x.end),next=p.slots.find(x=>x.start>minute&&!done(x.q,x.originDate));return{plan:p,current:cur||null,next:next||null,minute}
  }
  function ensureMissionDock(){let e=document.getElementById('missionNowDock');if(e)return e;const nav=document.querySelector('.nav');if(!nav)return null;e=document.createElement('section');e.id='missionNowDock';e.className='mission-now-dock';nav.insertAdjacentElement('afterend',e);return e}
  function updateMissionDock(){const e=ensureMissionDock();if(!e)return;const x=missionNow();if(x.current)e.innerHTML=`<button class="mission-now-card active" data-open-today><span class="mission-pulse"></span><div><small>MISSÃO ATUAL · ${toTime(x.current.start)}–${toTime(x.current.end)}</small><b>${esc(x.current.q.title)}</b><span>${esc(x.current.q.domain)} · ${esc(x.current.reason)}</span></div><strong>ABRIR →</strong></button>`;else if(x.next)e.innerHTML=`<button class="mission-now-card" data-open-today><span class="mission-pulse"></span><div><small>PRÓXIMA MISSÃO · ${toTime(x.next.start)}</small><b>${esc(x.next.q.title)}</b><span>${esc(x.next.q.domain)}</span></div><strong>ABRIR →</strong></button>`;else e.innerHTML=`<div class="mission-now-card free"><span class="mission-pulse"></span><div><small>JANELA LIVRE</small><b>Sem missão ativa agora</b><span>Use o tempo livre ou prepare a próxima campanha.</span></div></div>`;e.querySelector('[data-open-today]')?.addEventListener('click',()=>{state.plannerDate=today();go('today')})}

  render=function(){BASE_RENDER();ensureMissionDock();updateMissionDock()};
  const viewParam=new URLSearchParams(location.search).get('view');if(['today','timeline','dashboard'].includes(viewParam)){state.view=viewParam;state.plannerDate=today();saveState()}
  window.MyPerformanceRoutine={settings,planDay,missionNow,updateMissionDock,applySettings,toTime,toMin};
  setInterval(updateMissionDock,30000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateMissionDock()});
  window.addEventListener('focus',updateMissionDock);
  render();
})();
