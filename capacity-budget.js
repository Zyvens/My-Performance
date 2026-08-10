"use strict";
/* Capacity Budget — 16h day economics, GSA minimum, Transpetro remainder, BNI and external commute costs. */
(function(){
  if(!window.MyPerformanceRoutine)return;
  const SYSTEM_START=window.MyPerformanceAdaptive?.SYSTEM_START||'2026-08-10';
  const BASE_PLAN=window.MyPerformanceRoutine.planDay;
  const BASE_RENDER_TODAY=renderToday;
  const BASE_RENDER_CONFIG=renderConfig;
  const BASE_OPEN_QUEST=openQuestModal;
  const BASE_SAVE_QUEST=saveQuestFromModal;
  const toMin=window.MyPerformanceRoutine.toMin,toTime=window.MyPerformanceRoutine.toTime;
  const GSA_TARGET=480,WORKOUT_MIN=90,WORKOUT_TARGET=5;
  const GENERIC_GSA=new Set(['routine-gsa-focus-am','routine-gsa-pre-muay','routine-gsa-post-muay','routine-gsa-focus-pm','routine-gsa-admin']);
  const REBUILT=new Set(['personal-wake','personal-sleep','personal-breakfast','personal-lunch','routine-dinner','routine-shower-post-gym','personal-leisure','personal-gym']);
  const PRIORITY={critical:4,high:3,normal:2,low:1};

  function ensureState(){
    state.capacityBudget=state.capacityBudget||{};
    state.capacityBudget.settings=Object.assign({fifthWorkoutDay:6},state.capacityBudget.settings||{});
    if(![0,6].includes(Number(state.capacityBudget.settings.fifthWorkoutDay)))state.capacityBudget.settings.fifthWorkoutDay=6;
  }
  function seed(id,patch){const q=QUEST_SEED.find(x=>x.id===id);if(q)Object.assign(q,patch)}
  function addSeed(q){if(!QUEST_SEED.some(x=>x.id===q.id))QUEST_SEED.push(q)}
  function mergeOverride(id,patch){state.overrides=state.overrides||{};state.overrides[id]=Object.assign({},state.overrides[id]||{},patch)}
  function workoutDays(){ensureState();return[1,2,3,4,Number(state.capacityBudget.settings.fifthWorkoutDay)]}
  function applyRules(){
    ensureState();const days=workoutDays();
    seed('personal-gym',{weekdays:days,timeStart:'06:30',timeEnd:'08:00',durationMin:WORKOUT_MIN,priority:98,tags:['treino','5x semana','saúde']});
    seed('personal-breakfast',{timeStart:'08:30',timeEnd:'08:50',durationMin:20,fixedTime:true,essential:true});
    seed('personal-lunch',{timeStart:'12:30',timeEnd:'13:30',durationMin:60,fixedTime:true,essential:true});
    seed('personal-leisure',{durationMin:30});
    seed('routine-shower-post-gym',{weekdays:days,timeStart:'08:00',timeEnd:'08:30',durationMin:30,fixedTime:true,essential:true});
    seed('routine-dinner',{timeStart:'18:00',timeEnd:'19:00',durationMin:60,fixedTime:true,essential:true});
    mergeOverride('personal-gym',{weekdays:days,durationMin:WORKOUT_MIN});
    mergeOverride('routine-shower-post-gym',{weekdays:days,durationMin:30});
    if(window.MyPerformanceMuay?.applyMuay)window.MyPerformanceMuay.applyMuay();
  }

  addSeed({id:'gsa-bni-weekly',title:'BNI Fire — reunião semanal',description:'Reunião semanal do BNI. Conta como desenvolvimento comercial e relacionamento da GSA.',domain:'GSA',category:'BNI',questType:'main',cadence:'weekly',weekdays:[3],timeStart:'06:00',timeEnd:'11:00',durationMin:300,fixedTime:true,essential:true,externalActivity:true,commuteOutMin:0,commuteReturnMin:0,countsAsGsa:true,xp:90,difficulty:3,priorityLevel:'critical',source:'Rotina BNI',tags:['BNI','networking','GSA']});
  addSeed({id:'gsa-bni-organization',title:'Organizar BNI — 2h semanais',description:'Preparar convidados, esfera, referências, follow-ups, pauta e ações do BNI. Deve acontecer em segunda, terça ou sexta.',domain:'GSA',category:'BNI',questType:'main',cadence:'weekly',weekdays:[1,2,5],durationMin:120,countsAsGsa:true,xp:60,difficulty:2,priorityLevel:'high',source:'Rotina BNI',tags:['BNI','organização','2h semanais']});
  addSeed({id:'gsa-main-hacktown-2026',title:'HackTown 2026 — preparar presença da GSA',description:'Main Quest estratégica para chegar ao HackTown, de 3 a 7 de setembro de 2026, com narrativa, materiais, networking e objetivos comerciais definidos.',domain:'GSA',category:'HackTown',questType:'main',cadence:'once',startDate:SYSTEM_START,dueDate:'2026-09-03',xp:220,difficulty:5,priorityLevel:'critical',source:'Campanha GSA',tags:['HackTown','setembro','evento']});
  addSeed({id:'gsa-main-eva-launch',title:'Lançamento da EVA — setembro',description:'Main Quest do lançamento da EVA: produto, posicionamento, demonstração, materiais, parceiros e preparação comercial.',domain:'GSA',category:'EVA',questType:'main',cadence:'once',startDate:SYSTEM_START,dueDate:'2026-09-30',xp:260,difficulty:5,priorityLevel:'high',source:'Campanha GSA',tags:['EVA','lançamento','setembro']});
  addSeed({id:'gsa-main-editais',title:'Editais — FAPERJ ou outra oportunidade',description:'Main Quest recorrente para mapear, qualificar, preparar e submeter a GSA/EVA a editais aderentes, com prioridade para FAPERJ quando houver oportunidade adequada.',domain:'GSA',category:'Editais',questType:'main',cadence:'weekly',weekdays:[1,2,5],durationMin:120,xp:65,difficulty:4,priorityLevel:'high',source:'Campanha GSA',tags:['FAPERJ','editais','captação']});
  applyRules();

  function clonePlan(p){return JSON.parse(JSON.stringify(p))}
  function dow(d){return dfrom(d).getDay()}
  function pLevel(q){return window.MyPerformanceAdaptive?.priority?.(q)||q.priorityLevel||(q.questType==='main'?'high':'normal')}
  function pScore(q){return(PRIORITY[pLevel(q)]||2)*100+(q.questType==='main'?40:0)+(q.domain==='GSA'?30:q.domain==='Estudos'?20:0)}
  function isGsa(q){return q?.domain==='GSA'||q?.countsAsGsa}
  function isStudy(q){return q?.domain==='Estudos'}
  function hard(q){return!!q?.fixedTime||!!q?.essential||q?.id==='gsa-bni-weekly'||q?.category==='BNI'&&q?.id==='gsa-bni-weekly'}
  function overlap(a,b){return a.start<b.end&&a.end>b.start}
  function freeGaps(slots,start,end,min=10){const xs=slots.filter(x=>x.end>start&&x.start<end).slice().sort((a,b)=>a.start-b.start),out=[];let cur=start;for(const x of xs){if(x.start-cur>=min)out.push({start:cur,end:x.start});cur=Math.max(cur,x.end)}if(end-cur>=min)out.push({start:cur,end});return out}
  function removeConflicts(p,start,end,keepHard=true){const removed=[];p.slots=p.slots.filter(x=>{if(!overlap({start,end},x))return true;if(keepHard&&hard(x.q))return true;removed.push(x);return false});p.capacityDeferred=(p.capacityDeferred||[]).concat(removed);return removed}
  function addSlot(p,q,start,end,reason,extra={}){const x=Object.assign({q,originDate:p.date||today(),start,end,reason,key:`${q.id}|${p.date||today()}`},extra);p.slots.push(x);return x}
  function simpleQ(id,title,domain,category,description=''){return{id,title,domain,category,description,questType:'side',cadence:'daily',xp:0,difficulty:1,capacityBlock:true}}
  function placeNear(p,q,dur,pref,start=p.wake,end=p.end,reason='reserva de capacidade',evict=false){
    let gs=freeGaps(p.slots,start,end,dur);if(!gs.length&&evict){const candidates=p.slots.filter(x=>!hard(x.q)&&x.start<end&&x.end>start).sort((a,b)=>pScore(a.q)-pScore(b.q));for(const c of candidates){p.slots=p.slots.filter(x=>x!==c);p.capacityDeferred=(p.capacityDeferred||[]).concat(c);gs=freeGaps(p.slots,start,end,dur);if(gs.length)break}}
    if(!gs.length)return null;const g=gs.sort((a,b)=>Math.abs(Math.max(a.start,Math.min(pref,a.end-dur))-pref)-Math.abs(Math.max(b.start,Math.min(pref,b.end-dur))-pref))[0],st=Math.max(g.start,Math.min(pref,g.end-dur));return addSlot(p,q,st,st+dur,reason)
  }
  function anchor(p,id,title,dur,pref,category,opts={}){const q=simpleQ(id,title,'Pessoal',category,opts.description||'');q.anchorBlock=true;q.essential=true;return placeNear(p,q,dur,pref,opts.start??p.wake,opts.end??p.end,opts.reason||'âncora de saúde e rotina',true)}
  function gymRequired(d){return workoutDays().includes(dow(d))}
  function gymQuest(){return Object.assign({},questById('personal-gym')||{id:'personal-gym',title:'Treino de academia',domain:'Pessoal',category:'Treino',questType:'main',cadence:'daily',xp:45,difficulty:2},{durationMin:90})}
  function normalizeBase(p,date){
    p.date=date;p.capacityDeferred=[];p.capacityWarnings=[];
    if(dow(date)===3){p.wake=5*60;p.end=21*60;p.requestedSleep=21*60}
    p.slots=(p.slots||[]).filter(x=>!REBUILT.has(x.q.id)&&!GENERIC_GSA.has(x.q.id)&&x.start>=p.wake&&x.end<=p.end);
    return p
  }
  function externalCommutes(p,date){
    const externals=p.slots.filter(x=>x.q?.externalActivity&&(Number(x.q.commuteOutMin||0)>0||Number(x.q.commuteReturnMin||0)>0));
    for(const x of externals){const out=Math.max(0,Number(x.q.commuteOutMin||0)),back=Math.max(0,Number(x.q.commuteReturnMin||0));if(out){const st=x.start-out;if(st<p.wake){p.capacityWarnings.push(`${x.q.title}: deslocamento de ida começa antes da janela do dia`)}else addSlot(p,Object.assign(simpleQ(`commute-out-${x.q.id}-${date}`,`Deslocamento → ${x.q.title}`,'Pessoal','Deslocamento'),{commuteBlock:true,essential:true}),st,x.start,'deslocamento de atividade externa',{commuteBlock:true})}if(back){const en=x.end+back;if(en>p.end){p.capacityWarnings.push(`${x.q.title}: deslocamento de volta ultrapassa a janela do dia`)}else addSlot(p,Object.assign(simpleQ(`commute-back-${x.q.id}-${date}`,`Volta · ${x.q.title}`,'Pessoal','Deslocamento'),{commuteBlock:true,essential:true}),x.end,en,'deslocamento de atividade externa',{commuteBlock:true})}}
  }
  function addAnchors(p,date){
    const w=dow(date),wed=w===3,fri=w===5,sat=w===6;
    anchor(p,`wake-${date}`,wed?'Acordar — quarta BNI':'Acordar',10,p.wake,'Rotina',{start:p.wake,end:Math.min(p.end,p.wake+40)});
    const breakfastPref=wed?5*60+20:8*60+30;anchor(p,`breakfast-${date}`,'Café da manhã',20,breakfastPref,'Alimentação',{description:'20 min reservados para café da manhã.'});
    if(gymRequired(date)){
      const pref=wed?15*60+30:(w===0?8*60:6*60+30),q=gymQuest();const g=placeNear(p,q,WORKOUT_MIN,pref,p.wake,p.end,'treino obrigatório da semana',true);if(!g)p.capacityWarnings.push('Treino de 1h30 não coube no dia');else anchor(p,`shower-${date}`,'Banho',30,g.end,'Higiene',{start:g.end,end:Math.min(p.end,g.end+120),description:'30 min reservados para banho e transição pós-treino.'})
    }else anchor(p,`shower-${date}`,'Banho',30,7*60+30,'Higiene',{description:'30 min reservados para banho.'});
    if(w!==6){const lunchPref=wed?11*60:12*60+30;anchor(p,`lunch-${date}`,'Almoço',60,lunchPref,'Alimentação',{description:'1h protegida para almoço.'})}
    if(w!==6){const dinnerPref=fri?17*60:18*60;anchor(p,`dinner-${date}`,'Jantar',60,dinnerPref,'Alimentação',{description:'1h protegida para jantar.'})}
    const restPrefs=sat?[9*60+30,11*60+15]:fri?[11*60+30,16*60+15]:[11*60+30,16*60+30];for(let i=0;i<2;i++)anchor(p,`rest-${date}-${i+1}`,`Pausa de descanso ${i+1}/2`,15,restPrefs[i],'Lazer',{description:'15 min de lazer/descanso distribuídos no dia.',reason:'recuperação distribuída'})
  }
  function activeObjectives(date){
    const out=[];if(date<='2026-09-03')out.push({id:'gsa-main-hacktown-2026',title:'HackTown 2026',category:'HackTown'});if(date<='2026-09-30')out.push({id:'gsa-main-eva-launch',title:'Lançamento da EVA',category:'EVA'});out.push({id:'gsa-main-editais',title:'Editais / FAPERJ',category:'Editais'});return out
  }
  function objectiveSequence(date){const o=activeObjectives(date);if(o[0]?.id==='gsa-main-hacktown-2026')return[o[0],o[0],o[1]||o[0],o[2]||o[0]];if(o.length>=2)return[o[0],o[0],o[1]];return o}
  function minutes(p,pred){return p.slots.filter(x=>pred(x.q)).reduce((n,x)=>n+Math.max(0,x.end-x.start),0)}
  function fillGsa(p,date){
    if(![1,2,3,4,5].includes(dow(date)))return;
    let have=minutes(p,isGsa),need=Math.max(0,GSA_TARGET-have),seq=objectiveSequence(date),i=0;
    while(need>=15){let gs=freeGaps(p.slots,p.wake,p.end,15);if(!gs.length){const victim=p.slots.filter(x=>!hard(x.q)&&(isStudy(x.q)||x.q.domain==='Carreira'||x.q.capacityStudy)).sort((a,b)=>pScore(a.q)-pScore(b.q))[0];if(!victim)break;p.slots=p.slots.filter(x=>x!==victim);p.capacityDeferred.push(victim);continue}const g=gs.sort((a,b)=>(b.end-b.start)-(a.end-a.start))[0],dur=Math.min(120,need,g.end-g.start);if(dur<15)break;const obj=seq.length?seq[i++%seq.length]:{title:'GSA',category:'Foco'},q=Object.assign(simpleQ(`capacity-gsa-${date}-${i}`,`GSA · ${obj.title}`,'GSA',obj.category,`Bloco protegido para avançar a Main Quest ${obj.title}.`),{capacityGsa:true,priorityLevel:'high'});addSlot(p,q,g.start,g.start+dur,'orçamento mínimo de 8h da GSA',{capacityBlock:true});need-=dur}
    have=minutes(p,isGsa);if(have<GSA_TARGET)p.capacityWarnings.push(`GSA abaixo da meta: ${Math.floor(have/60)}h${String(have%60).padStart(2,'0')} de 8h`)
  }
  function fillStudy(p,date){
    if(![1,2,3,4,5].includes(dow(date)))return;let i=0;
    while(true){const gs=freeGaps(p.slots,p.wake,p.end,20).sort((a,b)=>a.start-b.start);if(!gs.length)break;const g=gs[0],dur=Math.min(90,g.end-g.start);if(dur<20)break;const q=Object.assign(simpleQ(`capacity-study-${date}-${++i}`,'Transpetro · bloco de estudo','Estudos','Transpetro','O restante útil do dia é convertido em estudo da campanha Transpetro.'),{capacityStudy:true,priorityLevel:'high'});addSlot(p,q,g.start,g.start+dur,'saldo do dia destinado a Estudos',{capacityBlock:true})}
  }
  function finalize(p,date){p.slots.sort((a,b)=>a.start-b.start);p.used=p.slots.reduce((n,x)=>n+x.end-x.start,0);const commute=minutes(p,q=>q?.commuteBlock),gsa=minutes(p,isGsa),study=minutes(p,isStudy),gym=minutes(p,q=>q?.id==='personal-gym'),meals=minutes(p,q=>q?.category==='Alimentação'),rest=minutes(p,q=>q?.category==='Lazer'),shower=minutes(p,q=>q?.id===`shower-${date}`||q?.category==='Higiene'&&q?.anchorBlock);p.capacity={gsa,study,gym,meals,rest,shower,commute,deferred:p.capacityDeferred.length,warnings:p.capacityWarnings.slice(),workoutTarget:WORKOUT_TARGET,workoutPlanned:workoutDays().length};return p}
  function capacityPlan(date=today()){
    applyRules();const p=normalizeBase(clonePlan(BASE_PLAN(date)),date);externalCommutes(p,date);addAnchors(p,date);fillGsa(p,date);fillStudy(p,date);return finalize(p,date)
  }
  function missionNow(date=today(),now=new Date()){const p=capacityPlan(date),m=now.getHours()*60+now.getMinutes(),cur=p.slots.find(x=>m>=x.start&&m<x.end),next=p.slots.find(x=>x.start>m);return{plan:p,current:cur||null,next:next||null,minute:m}}

  function budgetSlotHtml(x,date){
    const q=x.q,moved=x.originDate&&x.originDate!==date;if(q.capacityBlock||q.anchorBlock||q.commuteBlock){return`<div class="routine-slot capacity-slot ${q.capacityGsa?'gsa-budget':q.capacityStudy?'study-budget':''}"><div class="routine-time"><b>${toTime(x.start)}</b><span>${toTime(x.end)}</span></div><div class="routine-quest"><article class="quest ${q.capacityGsa?'main':''}"><div class="quest-head"><div class="capacity-dot">${q.capacityGsa?'G':q.capacityStudy?'T':q.commuteBlock?'→':'•'}</div><div><div class="quest-title">${esc(q.title)}</div><div class="quest-desc">${esc(q.description||'')}</div><div class="quest-meta"><span class="tag ${q.domain}">${esc(q.domain)}</span><span class="pill">${x.end-x.start} min</span>${q.capacityGsa?'<span class="pill green">ORÇAMENTO GSA</span>':q.capacityStudy?'<span class="pill blue">SALDO → ESTUDO</span>':''}</div></div></div></article><div class="routine-reason">${esc(x.reason||'planejamento por capacidade')}</div></div></div>`}
    const canSkip=!q.fixedTime&&!q.essential&&!q.dailyMinimum;return`<div class="routine-slot ${moved?'rolled':''}"><div class="routine-time"><b>${toTime(x.start)}</b><span>${toTime(x.end)}</span></div><div class="routine-quest">${moved?'<div class="rollover-note">↪ replanejada para hoje</div>':''}${questCard(q,x.originDate||date,true)}<div class="routine-reason">${esc(x.reason||'planejamento')} · ${x.end-x.start} min</div>${canSkip?`<button class="mini-link day-skip-btn" data-cap-skip="${esc(q.id)}">⊘ Não concluir hoje</button>`:''}</div></div>`
  }
  function hm(n){return`${Math.floor(n/60)}h${String(n%60).padStart(2,'0')}`}
  function budgetCard(p,date){const c=p.capacity,w=dow(date),weekday=[1,2,3,4,5].includes(w);return`<div class="card capacity-summary"><div class="capacity-summary-head"><div><span class="eyebrow">ORÇAMENTO DO DIA</span><h2>${w===3?'Quarta BNI · janela 05:00–21:00':'Capacidade real de '+hm(p.end-p.wake)}</h2><p class="muted">Âncoras de saúde entram primeiro; GSA recebe ${weekday?'no mínimo 8h':'apenas a janela permitida'} e o saldo útil vira estudo da Transpetro.</p></div><span class="pill ${c.warnings.length?'red':'green'}">${c.warnings.length?'AJUSTE NECESSÁRIO':'DIA EQUILIBRADO'}</span></div><div class="capacity-kpis"><div><span>GSA + BNI</span><b>${hm(c.gsa)}${weekday?' / 8h':''}</b></div><div><span>Transpetro</span><b>${hm(c.study)}</b></div><div><span>Treino</span><b>${hm(c.gym)}</b><small>${c.workoutPlanned}/${c.workoutTarget} dias/semana</small></div><div><span>Deslocamentos</span><b>${hm(c.commute)}</b></div><div><span>Refeições</span><b>${hm(c.meals)}</b></div><div><span>Banho + descanso</span><b>${hm(c.shower+c.rest)}</b></div></div>${w===3?'<div class="callout"><b>BNI 06:00–11:00 conta como 5h das 8h de GSA.</b> O motor completa as 3h restantes com as Main Quests estratégicas.</div>':''}${c.deferred?`<div class="callout">↪ ${c.deferred} atividade(s) de menor prioridade cederam espaço ao orçamento principal do dia.</div>`:''}${c.warnings.length?`<div class="capacity-warnings">${c.warnings.map(x=>`<div>⚠ ${esc(x)}</div>`).join('')}</div>`:''}</div>`}

  renderToday=function(){
    BASE_RENDER_TODAY();const date=state.plannerDate||today(),p=capacityPlan(date),view=document.getElementById('view');if(!view)return;const tl=view.querySelector('.day-timeline');if(tl)tl.innerHTML=p.slots.map(x=>budgetSlotHtml(x,date)).join('')||'<div class="empty">Nenhuma atividade planejada nesta janela.</div>';const head=view.querySelector('.planner-head')||view.querySelector('.section-title');head?.insertAdjacentHTML('afterend',budgetCard(p,date));bindQuestCards();document.querySelectorAll('[data-cap-skip]').forEach(b=>b.onclick=()=>{const q=p.slots.find(x=>x.q.id===b.dataset.capSkip)?.q||questById(b.dataset.capSkip);window.MyPerformanceDay?.skip?.(q,date)})
  };

  openQuestModal=function(id=''){
    BASE_OPEN_QUEST(id);const q=id?questById(id):null,modal=document.querySelector('.modal-card');if(!modal)return;const weekdays=document.getElementById('qWeekdays')?.closest('.field');if(!weekdays)return;weekdays.insertAdjacentHTML('beforebegin',`<div class="card external-activity-box"><label class="setting-toggle"><input id="qExternal" type="checkbox" ${q?.externalActivity?'checked':''}><span><b>Atividade externa</b><small>Reserve deslocamento real antes e depois da atividade.</small></span></label><div class="form-row"><div class="field"><label>Deslocamento ida (min)</label><input id="qCommuteOut" type="number" min="0" max="240" step="5" value="${Number(q?.commuteOutMin||0)}"></div><div class="field"><label>Deslocamento volta (min)</label><input id="qCommuteBack" type="number" min="0" max="240" step="5" value="${Number(q?.commuteReturnMin||0)}"></div></div></div>`)
  };
  saveQuestFromModal=function(id){const external=document.getElementById('qExternal')?.checked||false,out=Math.max(0,Number(document.getElementById('qCommuteOut')?.value||0)),back=Math.max(0,Number(document.getElementById('qCommuteBack')?.value||0));BASE_SAVE_QUEST(id);const target=id?(state.customQuests||[]).find(x=>x.id===id):state.customQuests?.[state.customQuests.length-1];if(target){target.externalActivity=external;target.commuteOutMin=external?out:0;target.commuteReturnMin=external?back:0}else if(id)state.overrides[id]=Object.assign({},state.overrides[id]||{},{externalActivity:external,commuteOutMin:external?out:0,commuteReturnMin:external?back:0});saveState();window.MyPerformanceAdaptive?.recalculate?.({reason:'capacity-quest-save'});render()};

  renderConfig=function(){
    BASE_RENDER_CONFIG();ensureState();const host=document.getElementById('view');if(!host)return;host.insertAdjacentHTML('beforeend',`<div class="section-title"><div><span class="eyebrow">ORÇAMENTO DE CAPACIDADE</span><h2>Como as 16h do dia são distribuídas</h2><p class="muted">O motor protege saúde e recuperação antes de preencher o restante com GSA e Transpetro.</p></div></div><div class="grid2"><div class="card"><h2>Regras fixas</h2><div class="statline"><span>GSA + BNI · seg–sex</span><b>mín. 8h/dia</b></div><div class="statline"><span>Almoço</span><b>1h</b></div><div class="statline"><span>Jantar</span><b>1h</b></div><div class="statline"><span>Café da manhã</span><b>20 min</b></div><div class="statline"><span>Banho</span><b>30 min</b></div><div class="statline"><span>Lazer / descanso</span><b>30 min distribuídos</b></div><div class="statline"><span>Treino</span><b>1h30 · mín. 5x/sem</b></div><p class="muted">Deslocamentos só entram quando a quest é marcada como atividade externa e têm ida/volta configuradas.</p></div><div class="card"><h2>Treino e BNI</h2><div class="field"><label>5º treino da semana</label><select id="capacityFifthWorkout"><option value="6" ${Number(state.capacityBudget.settings.fifthWorkoutDay)===6?'selected':''}>Sábado</option><option value="0" ${Number(state.capacityBudget.settings.fifthWorkoutDay)===0?'selected':''}>Domingo</option></select></div><div class="callout"><b>Quarta-feira:</b> acordar 05:00 · BNI 06:00–11:00 · dormir 21:00. O BNI vale como 5h de GSA.</div><div class="callout"><b>Organização BNI:</b> 2h por semana em segunda, terça ou sexta; também conta como tempo GSA.</div><button class="btn primary" id="saveCapacityBudget">Salvar orçamento</button></div></div><div class="card"><span class="eyebrow">MAIN QUESTS GSA</span><h2>Foco estratégico atual</h2><div class="capacity-objectives"><div><b>1. HackTown 2026</b><span>preparar a GSA para 03/09</span></div><div><b>2. Lançamento da EVA</b><span>setembro de 2026</span></div><div><b>3. Editais / FAPERJ</b><span>prospecção e submissão recorrentes</span></div></div></div>`);document.getElementById('saveCapacityBudget').onclick=()=>{state.capacityBudget.settings.fifthWorkoutDay=Number(document.getElementById('capacityFifthWorkout').value);applyRules();saveState();window.MyPerformanceAdaptive?.recalculate?.({reason:'capacity-settings'});render();toast('Orçamento de capacidade atualizado')}
  };

  window.MyPerformanceRoutine.planDay=capacityPlan;window.MyPerformanceRoutine.missionNow=missionNow;window.MyPerformanceCapacity={plan:capacityPlan,workoutDays,applyRules,GSA_TARGET};
  window.addEventListener('my-performance-cloud-loaded',()=>setTimeout(()=>{applyRules();window.MyPerformanceAdaptive?.recalculate?.({reason:'capacity-cloud'});render()},100));
  window.MyPerformanceAdaptive?.recalculate?.({reason:'capacity-startup'});
  setTimeout(()=>{if(state.view==='today')render()},250);
})();