"use strict";
/* My Performance 2.9.7 — Calendar standalone view + group/window authority fixes.
   Group is the primary compatibility rule. Same-group Side Quests may use free group capacity unless a Window is plannerPolicy or explicitly sideQuestDenied. */
(function(){
  if(typeof state==='undefined')return;
  const Clock=window.MyPerformanceClock,D=window.MyPerformanceCalendarDomain,E=window.MyPerformancePlannerEngine,T=window.MyPerformanceTimelineDnD;
  if(!D||!E)return;
  const VERSION=18;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const groups=w=>w?.displayGroups?.length?w.displayGroups:(w?.groups||[]);
  const today=()=>Clock?.today?.()||new Date().toISOString().slice(0,10);
  const nextDate=d=>typeof addDays==='function'?addDays(d,1):(()=>{const x=new Date(d+'T12:00:00');x.setDate(x.getDate()+1);return x.toISOString().slice(0,10)})();

  /* Window policy normalization: a same-group Side Quest is valid capacity by default. */
  const baseWindows=typeof D.windowsForWeekday==='function'?D.windowsForWeekday.bind(D):null;
  if(baseWindows&&!D.__groupWindowAuthorityV18){
    D.__groupWindowAuthorityV18=true;
    D.windowsForWeekday=function(day){
      return (baseWindows(day)||[]).map(w=>{
        const x=JSON.parse(JSON.stringify(w));
        if(!x.plannerPolicy&&x.sideQuestDenied!==true&&groups(x).length)x.allowSideQuests=true;
        return x;
      });
    };
    try{E.invalidate?.()}catch(_e){}
  }

  function ensureNav(){
    if(!document.querySelector('#topNav [data-view="calendar"]')){
      const todayBtn=document.querySelector('#topNav [data-view="today"]');
      if(todayBtn){const b=document.createElement('button');b.dataset.view='calendar';b.textContent='Calendário';todayBtn.after(b)}
    }
    if(!document.querySelector('.bottom-nav [data-view="calendar"]')){
      const todayBtn=document.querySelector('.bottom-nav [data-view="today"]');
      if(todayBtn){const b=document.createElement('button');b.dataset.view='calendar';b.innerHTML='<b>▦</b>Calendário';todayBtn.after(b)}
    }
  }
  function activate(){document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='calendar'))}
  function persist(){try{const k='my_performance_v1',raw=JSON.parse(localStorage.getItem(k)||'{}');raw.view='calendar';raw.plannerDate=state.plannerDate||today();localStorage.setItem(k,JSON.stringify(raw))}catch(_e){}}
  function route(){try{const u=new URL(location.href);u.searchParams.set('view','calendar');history.replaceState(history.state,'',u)}catch(_e){}}
  function removeTimelineFromToday(){if(state.view!=='calendar')document.getElementById('realTimelineV11')?.remove()}
  const observer=new MutationObserver(removeTimelineFromToday);try{observer.observe(document.getElementById('view'),{subtree:true,childList:true})}catch(_e){}

  function renderCalendar(){
    ensureNav();activate();
    const host=document.getElementById('view');if(!host)return;
    const date=state.plannerDate||today();
    host.innerHTML=`<div class="section-title planner-head"><div><span class="eyebrow">CALENDÁRIO</span><h2>Linha do tempo do dia</h2><p class="muted">Escala real para visualizar e mover blocos dentro de Janelas compatíveis com o Grupo da Quest.</p></div><div class="day-nav"><button class="btn small" id="calendarBackToday">Hoje</button></div></div><div id="calendarStandaloneV18"><div class="window-stack" style="display:none"></div></div>`;
    document.getElementById('realTimelineV11')?.remove();
    if(T?.renderTimeline){const keep=state.view;state.view='today';try{T.renderTimeline()}finally{state.view=keep}}
    document.querySelector('#calendarStandaloneV18 .window-stack')?.remove();
    document.getElementById('calendarBackToday')?.addEventListener('click',()=>{state.plannerDate=today();renderCalendar()});
    window.dispatchEvent(new CustomEvent('my-performance-view-rendered',{detail:{view:'calendar',engine:'timeline-v11'}}));
  }

  const baseRender=typeof render==='function'?render:null;
  if(baseRender)render=function(){if(state.view==='calendar')return renderCalendar();const out=baseRender.apply(this,arguments);queueMicrotask(removeTimelineFromToday);return out};
  const baseGo=typeof go==='function'?go:null;
  if(baseGo)go=function(view){if(view==='calendar'){state.view='calendar';state.plannerDate=state.plannerDate||today();persist();route();renderCalendar();try{window.scrollTo(0,0)}catch(_e){};return}return baseGo(view)};

  /* Replacement must obey Group compatibility and may use compatible free capacity directly. */
  function openCompatibleSubstitute(key){
    const date=state.plannerDate||today(),plan=E.planDay(date),x=(plan.outsideCalendar||[]).find(y=>y.key===key);if(!x)return;
    const scheduled=(plan.slots||[]).filter(s=>s.workKey&&!s.fixed&&!s.eventSlot&&!s.eventTravel&&!s.executionHistory&&s.group===x.group);
    const gaps=(E.emptyWindows(plan)||[]).filter(g=>{const w=(plan.windows||[]).find(z=>z.id===g.windowId);return w&&!w.plannerPolicy&&w.sideQuestDenied!==true&&groups(w).includes(x.group)});
    const rows=[];
    for(const g of gaps){const len=Math.max(10,Math.min(Number(g.minutes||0),Number(x.remaining||30)));if(len<=g.minutes)rows.push(`<button class="v5-manager-row" data-compatible-gap="${g.start}" data-compatible-end="${g.start+len}"><span><b>${E.toTime(g.start)}–${E.toTime(g.start+len)} · Capacidade livre em ${esc((plan.windows||[]).find(w=>w.id===g.windowId)?.label||x.group)}</b><small class="subtle">${esc(x.group)} · alocar sem remover outra atividade</small></span><span>Alocar</span></button>`)}
    for(const s of scheduled)rows.push(`<button class="v5-manager-row" data-compatible-target="${esc(s.id)}"><span><b>${E.toTime(s.start)}–${E.toTime(s.end)} · ${esc(s.q?.title||'Atividade')}</b><small class="subtle">${s.mainQuest?'◆ Main Quest':'◇ Side Quest'} · ${esc(s.group||'')}</small></span><span>Trocar</span></button>`);
    const modal=document.getElementById('modal');modal.innerHTML=`<div class="modal-backdrop"><div class="modal-card calendar-modal"><button class="modal-close" id="closeCompatibleSubstitute">×</button><span class="eyebrow">SUBSTITUIR / ALOCAR</span><h2>${esc(x.q.title)}</h2><p class="muted">Somente capacidade do Grupo <b>${esc(x.group)}</b> é válida. Horários livres compatíveis aparecem antes de atividades que precisariam ser removidas.</p><div class="v5-manager">${rows.join('')||'<div class="empty">Nenhuma capacidade compatível restante hoje.</div>'}</div></div></div>`;
    document.getElementById('closeCompatibleSubstitute').onclick=()=>modal.innerHTML='';
    modal.querySelectorAll('[data-compatible-gap]').forEach(b=>b.onclick=()=>{const start=Number(b.dataset.compatibleGap),end=Number(b.dataset.compatibleEnd);if(E.fillGap(date,start,end,x.q.id)){modal.innerHTML='';toast(`Alocada em ${x.group}: ${E.toTime(start)}–${E.toTime(end)}.`);render()}else toast('Não foi possível alocar nessa capacidade.')});
    modal.querySelectorAll('[data-compatible-target]').forEach(b=>b.onclick=()=>{if(E.substitute(date,key,b.dataset.compatibleTarget)){modal.innerHTML='';toast('Substituição aplicada dentro do mesmo Grupo.');render()}else toast('Não foi possível aplicar a substituição.')});
  }

  function deferForward(key){
    const date=state.plannerDate||today(),plan=E.planDay(date),x=(plan.outsideCalendar||[]).find(y=>y.key===key);if(!x||x.daily)return false;
    const c=D.model();c.deferredUntil=c.deferredUntil||{};c.skippedDaily=c.skippedDaily||{};c.skippedDaily[date]=c.skippedDaily[date]||{};
    const dest=nextDate(date);c.deferredUntil[key]=dest;c.skippedDaily[date][key]=true;
    try{D.recordRevision?.(`Replanejar ${x.q.title} para frente`);D.log?.('defer-outside',`${x.q.title} saiu de ${date} e voltou ao Planner a partir de ${dest}`,{date,key,destination:dest});saveState()}catch(_e){}
    try{E.invalidate?.()}catch(_e){}
    toast(`Saiu de hoje. O Planner poderá alocar novamente a partir de ${dest.split('-').reverse().slice(0,2).join('/')}.`);
    render();return true;
  }

  document.addEventListener('click',e=>{
    const cal=e.target?.closest?.('[data-view="calendar"]');if(cal){e.preventDefault();e.stopImmediatePropagation();go('calendar');return}
    const replace=e.target?.closest?.('[data-outside-replace]');if(replace&&state.view==='today'){e.preventDefault();e.stopImmediatePropagation();openCompatibleSubstitute(replace.dataset.outsideReplace);return}
    const defer=e.target?.closest?.('[data-outside-defer]');if(defer&&state.view==='today'){
      const plan=E.planDay(state.plannerDate||today()),x=(plan.outsideCalendar||[]).find(y=>y.key===defer.dataset.outsideDefer);
      if(x&&!x.daily){e.preventDefault();e.stopImmediatePropagation();deferForward(defer.dataset.outsideDefer)}
    }
  },true);

  ensureNav();
  try{if(new URL(location.href).searchParams.get('view')==='calendar'){state.view='calendar';persist();setTimeout(renderCalendar,0)}}catch(_e){}
  window.addEventListener('my-performance-view-rendered',()=>requestAnimationFrame(()=>{ensureNav();removeTimelineFromToday()}));
  window.MyPerformanceCalendarViewV18={VERSION,renderCalendar,openCompatibleSubstitute,deferForward};
})();
