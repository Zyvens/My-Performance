"use strict";
/* Opportunistic Side Quest policy adapter. It does not allocate time; Planner V5 remains the sole scheduler. */
(function(){
  const E=window.MyPerformancePlannerEngine,D=window.MyPerformanceCalendarDomain,SQ=window.MyPerformanceSideQuestQuality;
  if(!E||!D||!SQ)return;
  const rawPlanDay=E.planDay.bind(E),rawPlanWeek=E.planWeek.bind(E),rawDiagnostics=E.diagnostics.bind(E);
  function itemFromOutside(x){return{q:x.q||{},policy:D.missionPolicy(x.q||{})}}
  function filterPlan(plan){
    const visible=[],autoIgnored=[];
    for(const x of plan?.outsideCalendar||[]){
      if(x.kind==='side'&&SQ.isOpportunistic(itemFromOutside(x))){
        autoIgnored.push(Object.assign({},x,{autoIgnored:true,reason:x.daily?'Side Quest oportunística sem espaço; expira silenciosamente hoje':'Side Quest oportunística sem espaço hoje; permanece elegível no período'}));
      }else visible.push(x)
    }
    return Object.assign({},plan,{outsideCalendar:visible,autoIgnored});
  }
  E.planDay=(date)=>filterPlan(rawPlanDay(date));
  E.planWeek=(date)=>rawPlanWeek(date).map(filterPlan);
  E.diagnostics=(date)=>{const d=rawDiagnostics(date),p=E.planDay(date);return Object.assign({},d,{outside:p.outsideCalendar,autoIgnored:p.autoIgnored})};
  E.opportunisticSideQuests={isOpportunistic:SQ.isOpportunistic,filterPlan};
  if(window.MyPerformanceRoutine)window.MyPerformanceRoutine.planDay=E.planDay;

  function decorateToday(){
    if(typeof document==='undefined'||state?.view!=='today')return;
    const date=state.plannerDate||today(),p=E.planDay(date),omitted=p.autoIgnored||[];
    document.getElementById('opportunistic-summary-v5')?.remove();
    if(!omitted.length)return;
    const host=document.querySelector('.planner-stats');if(!host)return;
    const node=document.createElement('div');node.id='opportunistic-summary-v5';node.className='callout';
    const daily=omitted.filter(x=>x.daily).length,periodic=omitted.length-daily;
    node.innerHTML=`<b>◇ ${omitted.length} Side Quest${omitted.length===1?'':'s'} opcionais omitida${omitted.length===1?'':'s'} automaticamente</b><p>Não havia capacidade residual suficiente. Elas não entram no backlog nem deslocam trabalho prioritário.${daily?` ${daily} diária${daily===1?' expira':'s expiram'} hoje.`:''}${periodic?` ${periodic} semanal/mensal continua${periodic===1?'':'m'} elegível${periodic===1?'':'is'} nos próximos espaços livres.`:''}</p><details><summary>Ver opcionais omitidas</summary><div class="subtle">${omitted.map(x=>`◇ ${esc(x.q?.title||'Side Quest')}`).join('<br>')}</div></details>`;
    host.insertAdjacentElement('afterend',node)
  }
  window.addEventListener?.('my-performance-view-rendered',()=>setTimeout(decorateToday,0));
  setTimeout(decorateToday,0);
})();
