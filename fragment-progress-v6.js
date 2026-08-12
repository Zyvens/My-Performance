"use strict";
/* Fragment Progress V6 — truthful block totals for quantitative Main Quests. */
(function(){
  const E=window.MyPerformancePlannerEngine,D=window.MyPerformanceCalendarDomain,Q=window.MyPerformanceQuantitativeMainQuests;
  if(!E||!D||!Q)return;
  function ledger(key){return Number(state.calendarV3?.workLedger?.[key]||D.model()?.workLedger?.[key]||0)}
  function progress(slot){
    const rule=Q.rule(slot?.q?.id);if(!rule||!slot?.workKey)return null;
    const minutes=ledger(slot.workKey),completed=Math.min(rule.blocks,Math.floor(minutes/rule.blockMinutes)),current=Math.min(rule.blocks,completed+1),quantityDone=Math.min(rule.target,completed*rule.perBlock);
    return{current,total:rule.blocks,completed,quantityDone,target:rule.target,unit:rule.unit,perBlock:rule.perBlock,blockMinutes:rule.blockMinutes,totalMinutes:rule.totalMinutes}
  }
  function decorate(){
    if(state?.view!=='today')return;
    const date=state.plannerDate||today(),plan=E.planDay(date),map=new Map((plan.slots||[]).map(s=>[s.id,s]));
    document.querySelectorAll('.v5-slot[data-slot-id]').forEach(card=>{
      const slot=map.get(card.dataset.slotId),p=progress(slot);if(!p)return;
      let badge=card.querySelector('.mission-fragment-progress');
      if(!badge){badge=document.createElement('div');badge.className='mission-fragment-progress';const reason=card.querySelector('.v5-reason');reason?.insertAdjacentElement('beforebegin',badge)}
      badge.innerHTML=`Bloco <b>${p.current} / ${p.total}</b> · concluídos ${p.completed} / ${p.total} · ${p.quantityDone} / ${p.target} ${p.unit}`;
      const desc=card.querySelector('.mission-strategy-desc');if(desc&&!desc.querySelector('[data-quantity-plan]'))desc.insertAdjacentHTML('beforeend',`<span data-quantity-plan class="quantitative-plan"> Meta operacional: ${p.total} blocos de até ${p.perBlock} ${p.unit} · ${p.blockMinutes} min por bloco.</span>`)
    })
  }
  const after=()=>requestAnimationFrame(()=>requestAnimationFrame(decorate));window.addEventListener('my-performance-view-rendered',after);setTimeout(after,0);
  window.MyPerformanceFragmentProgress={VERSION:6,progress,decorate};
})();
