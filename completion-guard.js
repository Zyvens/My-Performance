"use strict";
/* Completion Guard — quest completion survives every scheduler/timeline rerender. */
(function(){
  let busy=false;

  function completeToggle(btn,event){
    if(!btn||btn.disabled||busy)return;
    const id=btn.dataset.toggle,date=btn.dataset.date||today();
    if(!id)return;
    event?.preventDefault();
    event?.stopPropagation();
    event?.stopImmediatePropagation();
    busy=true;
    try{
      const q=questById(id);
      if(!q){toast('Não foi possível localizar esta missão. Recalcule o dia.');return}
      toggleQuest(id,date);
    }catch(err){
      console.error('Completion Guard failed',err);
      toast('Falha ao concluir missão. Tente novamente.')
    }finally{setTimeout(()=>{busy=false},0)}
  }

  function completeMinimum(btn,event){
    if(!btn||busy)return;
    const domain=btn.dataset.s2Min,date=state.plannerDate||today();
    if(!domain)return;
    event?.preventDefault();event?.stopPropagation();event?.stopImmediatePropagation();
    busy=true;
    try{
      state.dayPlanning=state.dayPlanning||{};
      state.dayPlanning.minimumDone=state.dayPlanning.minimumDone||{};
      state.dayPlanning.minimumDone[date]=state.dayPlanning.minimumDone[date]||{};
      state.dayPlanning.minimumDone[date][domain]=new Date().toISOString();
      saveState();render();toast(`${domain}: mínimo diário concluído`)
    }finally{setTimeout(()=>{busy=false},0)}
  }

  document.addEventListener('click',event=>{
    const toggle=event.target.closest?.('[data-toggle]');
    if(toggle){completeToggle(toggle,event);return}
    const minimum=event.target.closest?.('[data-s2-min]');
    if(minimum){completeMinimum(minimum,event);return}
  },true);

  // Keyboard/accessibility path for dynamically rendered controls.
  document.addEventListener('keydown',event=>{
    if(event.key!=='Enter'&&event.key!==' ')return;
    const btn=event.target.closest?.('[data-toggle],[data-s2-min]');
    if(!btn)return;
    if(btn.matches('[data-toggle]'))completeToggle(btn,event);else completeMinimum(btn,event)
  },true);

  window.MyPerformanceCompletionGuard={completeToggle,completeMinimum};
})();
