"use strict";
/* Adaptive Life Engine — priority, progressive deadline planning, procrastination recovery and Day Zero migration. */
(function(){
  const SYSTEM_START='2026-08-10';
  const BASE_QUESTS=quests;
  const BASE_QUEST_CARD=questCard;
  const BASE_OPEN_QUEST=openQuestModal;
  const BASE_SAVE_QUEST=saveQuestFromModal;
  const BASE_RENDER_TODAY=renderToday;
  const BASE_RENDER_CONFIG=renderConfig;
  const PRIORITIES={
    critical:{label:'Crítica',score:300,cls:'critical'},
    high:{label:'Alta',score:240,cls:'high'},
    normal:{label:'Normal',score:120,cls:'normal'},
    low:{label:'Baixa',score:40,cls:'low'}
  };
  const DEFAULT_SETTINGS={autoRecalc:true,dailyBufferMin:90,maxAdaptiveMinPerDay:240,maxSessionMin:60,minSessionMin:30,deadlineBufferDays:2};
  let recalcLock=false,reconcileTimer=null;

  function ensure(){
    state.adaptive=state.adaptive||{};
    state.adaptive.settings=Object.assign({},DEFAULT_SETTINGS,state.adaptive.settings||{});
    state.adaptive.schedule=Array.isArray(state.adaptive.schedule)?state.adaptive.schedule:[];
    state.adaptive.history=Array.isArray(state.adaptive.history)?state.adaptive.history:[];
    state.adaptive.alerts=Array.isArray(state.adaptive.alerts)?state.adaptive.alerts:[];
    state.adaptive.startDate=SYSTEM_START;
  }
  function level(q){
    if(q?.priorityLevel&&PRIORITIES[q.priorityLevel])return q.priorityLevel;
    if(q?.essential||q?.fixedTime)return'critical';
    if(q?.questType==='main')return'high';
    return'normal';
  }
  const pmeta=q=>PRIORITIES[level(q)]||PRIORITIES.normal;
  function dayOf(date){return dfrom(date).getDay()}
  function workdayFor(q,date){const wd=dayOf(date);if(q.domain==='GSA'||q.domain==='Carreira')return wd>=1&&wd<=5;if(q.domain==='Estudos')return wd!==0;return true}
  function clampDate(date){return!date||date<SYSTEM_START?SYSTEM_START:date}
  function keyDate(key,value){const m=String(key).match(/@(\d{4}-\d{2}-\d{2})/);if(m)return m[1];if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(value))return value.slice(0,10);return''}

  function migrateDayZero(){
    ensure();if(Number(state.adaptiveVersion||0)>=1)return false;let changed=false;
    const removed=new Set();
    Object.entries(state.completed||{}).forEach(([k,v])=>{const d=keyDate(k,v);if(d&&d<SYSTEM_START){delete state.completed[k];removed.add(k);changed=true}});
    [state.xpLedger||{},state.bonusLedger||{}].forEach(ledger=>Object.keys(ledger).forEach(k=>{const d=keyDate(k,state.completed?.[k]);if(removed.has(k)||(d&&d<SYSTEM_START)){delete ledger[k];changed=true}}));
    state.activityDates=(state.activityDates||[]).filter(d=>d>=SYSTEM_START);
    state.plannerDate=clampDate(state.plannerDate||SYSTEM_START);
    (state.customQuests||[]).forEach(q=>{
      if(q.dueDate&&q.dueDate<SYSTEM_START){q.disabled=true;changed=true;return}
      if(q.startDate&&q.startDate<SYSTEM_START){q.startDate=SYSTEM_START;changed=true}
    });
    QUEST_SEED.forEach(q=>{
      if(q.dueDate&&q.dueDate<SYSTEM_START){state.overrides[q.id]=Object.assign({},state.overrides[q.id]||{},{disabled:true});changed=true;return}
      if(q.startDate&&q.startDate<SYSTEM_START&&(q.dueDate||'')>=SYSTEM_START){state.overrides[q.id]=Object.assign({},state.overrides[q.id]||{},{startDate:SYSTEM_START});changed=true}
    });
    Object.keys(state.questProgress||{}).forEach(k=>{const m=k.match(/@(\d{4}-\d{2}-\d{2})/);if(m&&m[1]<SYSTEM_START){delete state.questProgress[k];changed=true}});
    state.adaptiveVersion=1;changed=true;return changed
  }

  function estimateMinutes(q){
    const explicit=Number(q.estimatedMinutes||state.questPlans?.[q.id]?.estimatedMinutes||0);if(explicit>0)return Math.max(30,explicit);
    const plan=state.questPlans?.[q.id]||{},subtasks=Array.isArray(plan.subtasks)?plan.subtasks.length:0,base=Math.max(30,Number(plan.durationMin||q.durationMin||45));
    if(subtasks)return Math.max(base,subtasks*Math.max(30,Math.round(base/2)));
    return Math.max(base,q.questType==='main'?240:120,Number(q.difficulty||2)*45)
  }
  function sessionSize(q){const s=state.adaptive.settings,remaining=estimateMinutes(q),pref=level(q)==='critical'||level(q)==='high'?60:45;return Math.max(s.minSessionMin,Math.min(s.maxSessionMin,pref,remaining))}
  function parentCandidates(){return BASE_QUESTS().filter(q=>!q.adaptiveSession&&!q.disabled&&!q.fixedTime&&!q.essential&&q.cadence==='once'&&q.dueDate&&q.dueDate>=SYSTEM_START&&!hasEverDone(q.id)&&q.autoPlan!==false)}
  function historyHas(id){return state.adaptive.history.some(x=>x.questId===id)}
  function archiveOldSchedule(now=today()){
    for(const s of state.adaptive.schedule){
      if(historyHas(s.questId))continue;
      if(state.completed?.[s.questId])state.adaptive.history.push(Object.assign({},s,{status:'done',archivedAt:new Date().toISOString()}));
      else if(s.date<now)state.adaptive.history.push(Object.assign({},s,{status:'missed',archivedAt:new Date().toISOString()}));
    }
  }
  function completedMinutes(parentId){const seen=new Set(),all=state.adaptive.history.concat(state.adaptive.schedule);let n=0;for(const s of all){if(s.parentId!==parentId||seen.has(s.questId)||!state.completed?.[s.questId])continue;seen.add(s.questId);n+=Number(s.minutes||0)}return n}
  function doneToday(parentId,date=today()){return state.adaptive.history.concat(state.adaptive.schedule).some(s=>s.parentId===parentId&&s.date===date&&state.completed?.[s.questId])}
  function dateRange(from,to,q){const out=[];for(let d=from;d<=to;d=addDays(d,1))if(workdayFor(q,d))out.push(d);return out}
  function safeEnd(q,from){const days=Math.max(0,diffDays(from,q.dueDate)),buffer=Math.min(Number(state.adaptive.settings.deadlineBufferDays||2),Math.max(0,Math.floor(days/4)));const end=addDays(q.dueDate,-buffer);return end<from?q.dueDate:end}
  function expectedProgress(q,date=today()){const start=clampDate(q.startDate||SYSTEM_START),span=Math.max(1,diffDays(start,q.dueDate)),elapsed=Math.max(0,Math.min(span,diffDays(start,date))),expected=estimateMinutes(q)*(elapsed/span),actual=completedMinutes(q.id),behind=Math.max(0,Math.round(expected-actual));return{expected,actual,behind,pct:Math.round(actual/Math.max(1,estimateMinutes(q))*100)}}
  function oldMatch(parentId,date,minutes,index){return state.adaptive.schedule.find(s=>s.parentId===parentId&&s.date===date&&s.minutes===minutes&&!state.completed?.[s.questId]&&Number(s.index||0)===index)}
  function makeSession(q,date,minutes,index){const old=oldMatch(q.id,date,minutes,index),token=old?.token||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;return{token,questId:`adaptive-${q.id}-${token}`,parentId:q.id,date,minutes,index,createdAt:new Date().toISOString(),priorityLevel:level(q)}}

  function distribute(q,remaining,dateLoad,now=today()){
    if(remaining<=0)return[];const s=state.adaptive.settings,from=[SYSTEM_START,clampDate(q.startDate||SYSTEM_START),now].sort().pop(),end=safeEnd(q,from);let days=dateRange(from,end,q);if(!days.length)days=[q.dueDate];
    if(doneToday(q.id,now)&&q.dueDate>now)days=days.filter(d=>d!==now).concat(days.includes(now)?[now]:[]);
    const size=sessionSize(q),count=Math.max(1,Math.ceil(remaining/size)),picked=[],loadLocal={};
    const high=level(q)==='critical'||level(q)==='high';
    for(let i=0;i<count;i++){
      let targetIndex=count===1?0:Math.round(i*(days.length-1)/(count-1));if(high&&i===0&&days.includes(now)&&!doneToday(q.id,now))targetIndex=days.indexOf(now);
      let chosen=null;for(let step=0;step<days.length;step++){
        const d=days[Math.min(days.length-1,targetIndex+step)],used=(dateLoad[d]||0)+(loadLocal[d]||0),perParent=loadLocal[d]||0,maxDay=Math.max(60,Number(s.maxAdaptiveMinPerDay||240)-Number(s.dailyBufferMin||90));
        if(used+Math.min(size,remaining)>maxDay)continue;
        if(perParent>=size&&(days.length>1||!high))continue;
        chosen=d;break
      }
      if(!chosen){chosen=days[Math.min(days.length-1,targetIndex)]||q.dueDate}
      const minutes=Math.min(size,remaining-picked.reduce((n,x)=>n+x.minutes,0));if(minutes<=0)break;
      loadLocal[chosen]=(loadLocal[chosen]||0)+minutes;picked.push(makeSession(q,chosen,minutes,i));
    }
    Object.entries(loadLocal).forEach(([d,n])=>dateLoad[d]=(dateLoad[d]||0)+n);return picked
  }

  function buildAlerts(parents,now=today()){
    const alerts=[];for(const q of parents){const e=expectedProgress(q,now),missed=state.adaptive.history.filter(x=>x.parentId===q.id&&x.status==='missed').length,threshold=Math.max(30,sessionSize(q));if(e.behind>=threshold||missed){alerts.push({parentId:q.id,title:q.title,domain:q.domain,behindMin:e.behind,missed,days:Math.max(0,diffDays(now,q.dueDate)),priorityLevel:level(q)})}}
    return alerts.sort((a,b)=>(PRIORITIES[b.priorityLevel].score-PRIORITIES[a.priorityLevel].score)||(b.behindMin-a.behindMin)||(a.days-b.days))
  }
  function schedulesEqual(a,b){return JSON.stringify((a||[]).map(x=>[x.questId,x.parentId,x.date,x.minutes]))===JSON.stringify((b||[]).map(x=>[x.questId,x.parentId,x.date,x.minutes]))}
  function recalculate({manual=false,reason='auto'}={}){
    ensure();if(recalcLock)return null;recalcLock=true;try{
      archiveOldSchedule();const parents=parentCandidates().sort((a,b)=>pmeta(b).score-pmeta(a).score||String(a.dueDate).localeCompare(String(b.dueDate))),dateLoad={},next=[];
      for(const q of parents){const remaining=Math.max(0,estimateMinutes(q)-completedMinutes(q.id));next.push(...distribute(q,remaining,dateLoad))}
      const alerts=buildAlerts(parents),changed=!schedulesEqual(state.adaptive.schedule,next)||JSON.stringify(state.adaptive.alerts)!==JSON.stringify(alerts);
      state.adaptive.schedule=next;state.adaptive.alerts=alerts;state.adaptive.lastRecalc=new Date().toISOString();state.adaptive.lastReason=reason;
      if(changed||manual){saveState();window.dispatchEvent(new CustomEvent('my-performance-plan-recalculated',{detail:{reason,manual,sessions:next.length,alerts:alerts.length}}));if(alerts.length)window.dispatchEvent(new CustomEvent('my-performance-procrastination',{detail:alerts[0]}))}
      if(manual)toast(`Calendário recalculado · ${next.length} sessões distribuídas`);return{sessions:next.length,alerts}
    }finally{recalcLock=false}
  }

  quests=function(){
    ensure();const base=BASE_QUESTS().map(q=>{
      if(q.adaptiveSession)return q;const candidate=q.cadence==='once'&&q.dueDate&&q.dueDate>=SYSTEM_START&&q.autoPlan!==false&&!q.fixedTime&&!q.essential&&!hasEverDone(q.id);
      return candidate?Object.assign({},q,{startDate:q.dueDate,durationMin:Math.min(15,Number(q.durationMin||15)),adaptiveParent:true}):q
    });
    const byId=new Map(base.map(q=>[q.id,q])),sessions=state.adaptive.schedule.filter(s=>s.date>=SYSTEM_START&&!state.completed?.[s.questId]).map(s=>{
      const p=byId.get(s.parentId);if(!p)return null;const pm=pmeta(p),pref=p.domain==='GSA'?'09:15':p.domain==='Carreira'?'16:30':p.domain==='Estudos'?'18:30':'10:00';return{id:s.questId,title:`Avançar · ${p.title}`,description:`Sessão automática de ${s.minutes} min para distribuir o trabalho até ${fmt(p.dueDate)} sem concentrar tudo no fim.`,domain:p.domain,category:p.category||'Plano adaptativo',questType:p.questType==='main'?'main':'side',cadence:'once',startDate:s.date,dueDate:s.date,timeStart:pref,durationMin:s.minutes,xp:Math.max(8,Math.round(s.minutes/3)),difficulty:p.difficulty||2,owner:p.owner||'Vitor',source:'Plano adaptativo',priorityLevel:s.priorityLevel,priority:pm.score,adaptiveSession:true,parentId:p.id,tags:['planejamento adaptativo',pm.label]}
    }).filter(Boolean);return base.concat(sessions)
  };

  questCard=function(q,date=today(),compact=false){const html=BASE_QUEST_CARD(q,date,compact),m=pmeta(q),tag=`<span class="pill adaptive-priority ${m.cls}">◆ ${m.label.toUpperCase()}</span>`;return html.replace('<div class="quest-meta">',`<div class="quest-meta">${tag}`)};

  openQuestModal=function(id=''){
    BASE_OPEN_QUEST(id);const q=id?questById(id):null,start=document.getElementById('qStart');if(start&&!start.value)start.value=today()<SYSTEM_START?SYSTEM_START:today();
    const cadenceRow=document.getElementById('qCadence')?.closest('.form-row');if(!cadenceRow)return;const pri=level(q),hours=q?.estimatedMinutes?Number(q.estimatedMinutes)/60:'';
    cadenceRow.insertAdjacentHTML('beforebegin',`<div class="form-row adaptive-fields"><div class="field"><label>Prioridade</label><select id="qPriority">${Object.entries(PRIORITIES).map(([k,v])=>`<option value="${k}" ${pri===k?'selected':''}>${v.label}</option>`).join('')}</select><small class="subtle">Alta/Crítica entra no cronograma imediatamente e desloca tarefas menos importantes.</small></div><div class="field"><label>Esforço total estimado (h)</label><input id="qEstimatedHours" type="number" min="0.5" max="200" step="0.5" value="${hours}"><small class="subtle">Opcional. Em branco, o motor estima pela dificuldade e pelas etapas.</small></div></div><label class="setting-toggle adaptive-autoplan"><input id="qAutoPlan" type="checkbox" ${q?.autoPlan===false?'':'checked'}><span><b>Distribuir automaticamente até o prazo</b><small>Cria sessões progressivas e preserva margem antes do deadline.</small></span></label>`)
  };
  saveQuestFromModal=function(id){
    const priority=document.getElementById('qPriority')?.value||'normal',hours=Number(document.getElementById('qEstimatedHours')?.value||0),autoPlan=document.getElementById('qAutoPlan')?.checked!==false;BASE_SAVE_QUEST(id);
    let target=id?((state.customQuests||[]).find(x=>x.id===id)||null):(state.customQuests||[])[state.customQuests.length-1];
    if(target){target.priorityLevel=priority;target.autoPlan=autoPlan;if(hours>0)target.estimatedMinutes=Math.round(hours*60);else delete target.estimatedMinutes;target.startDate=clampDate(target.startDate||today());}
    else if(id){state.overrides[id]=Object.assign({},state.overrides[id]||{},{priorityLevel:priority,autoPlan,estimatedMinutes:hours>0?Math.round(hours*60):undefined,startDate:clampDate(state.overrides[id]?.startDate||today())})}
    saveState();if(state.adaptive.settings.autoRecalc||priority==='high'||priority==='critical')recalculate({reason:priority==='high'||priority==='critical'?'high-priority-save':'quest-save'});render();toast(priority==='high'||priority==='critical'?'Quest salva e cronograma reajustado':'Quest salva')
  };

  function alertHtml(){const a=state.adaptive.alerts||[];if(!a.length)return'';const top=a[0],mins=top.behindMin?`${top.behindMin} min de avanço abaixo do esperado`:`${top.missed} sessão(ões) protelada(s)`;return`<div class="card adaptive-alert"><div><span class="eyebrow">ANTI-PROCRASTINAÇÃO</span><h3>${esc(top.title)}</h3><p>${esc(mins)}. O motor redistribuiu a carga futura de forma acumulada, sem duplicar a tarefa.</p></div><span class="pill adaptive-priority ${PRIORITIES[top.priorityLevel].cls}">${PRIORITIES[top.priorityLevel].label}</span></div>`}
  renderToday=function(){BASE_RENDER_TODAY();const view=document.getElementById('view');if(!view)return;const head=view.querySelector('.planner-head')||view.querySelector('.section-title');if(head){let box=head.querySelector('.adaptive-recalc-actions');if(!box){box=document.createElement('div');box.className='adaptive-recalc-actions';box.innerHTML='<button class="btn primary" id="adaptiveRecalc">↻ Recalcular calendário</button>';head.appendChild(box)}box.querySelector('#adaptiveRecalc').onclick=()=>{recalculate({manual:true,reason:'manual'});render()}}const alert=alertHtml();if(alert)view.insertAdjacentHTML('afterbegin',alert)};

  renderConfig=function(){
    BASE_RENDER_CONFIG();ensure();const host=document.getElementById('view'),s=state.adaptive.settings;if(!host)return;host.insertAdjacentHTML('beforeend',`<div class="section-title"><div><span class="eyebrow">MOTOR ADAPTATIVO</span><h2>Planejamento automático da vida</h2><p class="muted">Dia 0: 10/08/2026. Prazos são distribuídos no tempo; atrasos viram carga agregada e não pilhas de tarefas repetidas.</p></div></div><div class="grid2"><div class="card"><h2>Recalcular e proteger capacidade</h2><label class="setting-toggle"><input id="adaptiveAuto" type="checkbox" ${s.autoRecalc?'checked':''}><span><b>Recalcular automaticamente</b><small>Novas prioridades, progresso e atrasos reorganizam o futuro.</small></span></label><div class="form-row"><div class="field"><label>Folga operacional diária (min)</label><input id="adaptiveBuffer" type="number" min="30" max="240" step="15" value="${Number(s.dailyBufferMin||90)}"></div><div class="field"><label>Máx. de trabalho adaptativo/dia (min)</label><input id="adaptiveMaxDay" type="number" min="60" max="360" step="30" value="${Number(s.maxAdaptiveMinPerDay||240)}"></div></div><div class="form-row"><div class="field"><label>Sessão máxima (min)</label><input id="adaptiveSession" type="number" min="30" max="120" step="15" value="${Number(s.maxSessionMin||60)}"></div><div class="field"><label>Margem antes do deadline (dias)</label><input id="adaptiveDeadlineBuffer" type="number" min="0" max="7" value="${Number(s.deadlineBufferDays||2)}"></div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" id="adaptiveSave">Salvar motor</button><button class="btn" id="adaptiveRecalcConfig">↻ Recalcular agora</button></div></div><div class="card"><span class="eyebrow">REGRAS DE PROTEÇÃO</span><h2>Produtividade sustentável</h2><div class="statline"><span>Início oficial do programa</span><b>10/08/2026</b></div><div class="statline"><span>Registros anteriores</span><b>Ignorados</b></div><div class="statline"><span>Último recálculo</span><b>${state.adaptive.lastRecalc?new Date(state.adaptive.lastRecalc).toLocaleString('pt-BR'):'Ainda não'}</b></div><p class="muted">Sono, treino, refeições e demais âncoras essenciais continuam protegidos pelo planejador de 16h. O motor adaptativo atua no espaço restante e respeita a ordem das campanhas.</p>${(state.adaptive.alerts||[]).length?`<div class="callout">⚠ ${(state.adaptive.alerts||[]).length} meta(s) pedindo recuperação progressiva.</div>`:'<div class="callout">✓ Nenhuma dívida de progresso relevante detectada.</div>'}</div></div>`);
    document.getElementById('adaptiveSave').onclick=()=>{s.autoRecalc=document.getElementById('adaptiveAuto').checked;s.dailyBufferMin=Math.max(30,Math.min(240,Number(document.getElementById('adaptiveBuffer').value||90)));s.maxAdaptiveMinPerDay=Math.max(60,Math.min(360,Number(document.getElementById('adaptiveMaxDay').value||240)));s.maxSessionMin=Math.max(30,Math.min(120,Number(document.getElementById('adaptiveSession').value||60)));s.deadlineBufferDays=Math.max(0,Math.min(7,Number(document.getElementById('adaptiveDeadlineBuffer').value||2)));saveState();recalculate({reason:'settings'});render();toast('Motor adaptativo atualizado')};document.getElementById('adaptiveRecalcConfig').onclick=()=>{recalculate({manual:true,reason:'manual'});render()}
  };

  function scheduleRecalc(reason){ensure();if(!state.adaptive.settings.autoRecalc||recalcLock)return;clearTimeout(reconcileTimer);reconcileTimer=setTimeout(()=>recalculate({reason}),500)}
  const migrated=migrateDayZero();if(migrated)saveState();ensure();recalculate({reason:'startup'});
  window.addEventListener('my-performance-state-saved',()=>scheduleRecalc('state-change'));
  window.addEventListener('my-performance-cloud-loaded',()=>setTimeout(()=>{ensure();migrateDayZero();recalculate({reason:'cloud-sync'});render()},50));
  window.MyPerformanceAdaptive={SYSTEM_START,settings:()=>state.adaptive.settings,recalculate,estimateMinutes,alerts:()=>state.adaptive.alerts||[],priority:level};
})();
