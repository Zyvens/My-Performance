"use strict";
/* Completion Guard — manual completion is authoritative and survives every rerender. */
(function(){
  let busy=false,scheduled=false;

  function planSlot(q,date){
    try{
      const p=window.MyPerformanceRoutine?.planDay?.(date);
      return (p?.slots||[]).find(x=>x?.q?.id===q.id)||null
    }catch{return null}
  }

  function markManual(id,date=today()){
    const q=questById(id);if(!q){toast('Não foi possível localizar esta missão.');return false}
    const key=occurrenceKey(q,date),was=!!state.completed[key];
    if(was){
      delete state.completed[key];delete state.xpLedger[key];delete state.bonusLedger[key];
      if(window.MyPerformanceTimeAware&&date===today()){
        try{const k=`${id}|${date}`;delete state.liveCapacity?.completedTimeline?.[date]?.[k];delete state.liveCapacity?.releases?.[date]?.[k]}catch{}
      }
      saveState();render();toast('Quest reaberta');return true
    }

    // Record real recovered capacity before the card disappears. Timing never blocks completion.
    if(window.MyPerformanceTimeAware&&date===today()){
      try{
        const slot=planSlot(q,date);
        if(slot)window.MyPerformanceTimeAware.recordCompletion(q,date,slot,window.MyPerformanceTimeAware.nowMinute?.(),new Date().toISOString())
      }catch(err){console.warn('Time-aware completion bookkeeping failed',err)}
    }

    state.completed[key]=new Date().toISOString();
    state.xpLedger[key]=Number(q.xp||20);addActivity(date);
    const corr=(q.correlations||[]).filter(cid=>hasEverDone(cid));
    if(corr.length)state.bonusLedger[key]=Math.max(5,Math.round((q.xp||20)*.1));
    const pending=dependencyStatus(q).missing||[];
    saveState();render();
    toast(pending.length?`Concluída manualmente · ${pending.length} dependência(s) ainda pendente(s)`:`Quest concluída! +${q.xp||20} XP`);
    return true
  }

  function completeToggle(btn,event){
    if(!btn||busy)return;
    const id=btn.dataset.toggle,date=btn.dataset.date||today();if(!id)return;
    event?.preventDefault();event?.stopPropagation();event?.stopImmediatePropagation();
    busy=true;try{markManual(id,date)}catch(err){console.error('Completion Guard failed',err);toast('Falha ao concluir missão. Tente novamente.')}finally{setTimeout(()=>{busy=false},0)}
  }

  function completeMinimum(btn,event){
    if(!btn||busy)return;const domain=btn.dataset.s2Min,date=state.plannerDate||today();if(!domain)return;
    event?.preventDefault();event?.stopPropagation();event?.stopImmediatePropagation();busy=true;
    try{state.dayPlanning=state.dayPlanning||{};state.dayPlanning.minimumDone=state.dayPlanning.minimumDone||{};state.dayPlanning.minimumDone[date]=state.dayPlanning.minimumDone[date]||{};state.dayPlanning.minimumDone[date][domain]=new Date().toISOString();saveState();render();toast(`${domain}: mínimo diário concluído`)}finally{setTimeout(()=>{busy=false},0)}
  }

  function unlockChecks(){
    document.querySelectorAll('[data-toggle][disabled]').forEach(btn=>{btn.disabled=false;btn.removeAttribute('disabled');btn.title='Você pode concluir manualmente a qualquer hora, mesmo com dependências pendentes.'});
    document.querySelectorAll('.quest.locked').forEach(card=>card.classList.add('dependency-advisory'))
  }
  function scheduleUnlock(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;unlockChecks()})}

  document.addEventListener('click',event=>{const toggle=event.target.closest?.('[data-toggle]');if(toggle){completeToggle(toggle,event);return}const minimum=event.target.closest?.('[data-s2-min]');if(minimum){completeMinimum(minimum,event);return}},true);
  document.addEventListener('keydown',event=>{if(event.key!=='Enter'&&event.key!==' ')return;const btn=event.target.closest?.('[data-toggle],[data-s2-min]');if(!btn)return;if(btn.matches('[data-toggle]'))completeToggle(btn,event);else completeMinimum(btn,event)},true);
  new MutationObserver(scheduleUnlock).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('my-performance-view-rendered',scheduleUnlock);
  setTimeout(scheduleUnlock,0);
  window.MyPerformanceCompletionGuard={completeToggle,completeMinimum,markManual,unlockChecks};
})();
