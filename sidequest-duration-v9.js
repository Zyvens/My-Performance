"use strict";
/* My Performance 2.4.4 — Side Quest duration semantics/UI.
   Fixed = one block exactly equal to durationMin per occurrence.
   Flexible = total effort remains durationMin; each fragment uses flexMinMin..flexMaxMin. */
(function(){
  const D=window.MyPerformanceCalendarDomain,E=window.MyPerformancePlannerEngine;
  if(!D||typeof state==='undefined')return;
  const qById=id=>{try{return questById(id)}catch{return(typeof quests==='function'?quests():[]).find(q=>q.id===id)||null}};
  function formValues(){
    const root=document.getElementById('modal');if(!root?.querySelector('#sqDurationMode'))return null;
    return{mode:root.querySelector('#sqDurationMode').value,total:Math.max(5,Number(root.querySelector('#sqDur')?.value||30)),min:Math.max(5,Number(root.querySelector('#sqFlexMin')?.value||10)),max:Math.max(5,Number(root.querySelector('#sqFlexMax')?.value||30))};
  }
  function setQuestDuration(id,total){
    const custom=(state.customQuests||[]).find(q=>q.id===id);
    if(custom)custom.durationMin=total;
    else state.overrides[id]=Object.assign({},state.overrides[id]||{},{durationMin:total});
  }
  function normalize(id,v){
    if(!id||!v)return;
    const m=D.sideMeta?.(id);if(!m)return;
    const total=Math.max(5,Number(v.total||30));setQuestDuration(id,total);
    if(v.mode==='fixed'){
      m.durationMode='fixed';m.minSessionMin=total;m.idealSessionMin=total;
      delete m.flexMinMin;delete m.flexMaxMin;
    }else{
      const min=Math.min(total,Math.max(5,Number(v.min||10))),max=Math.max(min,Number(v.max||total));
      m.durationMode='flexible';m.flexMinMin=min;m.flexMaxMin=max;m.minSessionMin=min;m.idealSessionMin=max;
    }
    try{E?.invalidate?.()}catch{};try{saveState()}catch{}
  }
  const baseAdd=D.addSideQuest.bind(D),baseUpdate=D.updateSideQuest.bind(D);
  D.addSideQuest=function(packId,data){const v=formValues(),q=baseAdd(packId,data);if(v&&q?.id)normalize(q.id,v);return q};
  D.updateSideQuest=function(id,patch={},metaPatch={}){const v=formValues(),out=baseUpdate(id,patch,metaPatch);if(out&&v)normalize(id,v);return out};

  function enhance(){
    const root=document.getElementById('modal'),mode=root?.querySelector('#sqDurationMode'),dur=root?.querySelector('#sqDur');
    if(!mode||!dur||mode.dataset.durationV9)return;mode.dataset.durationV9='1';
    const oldMin=root.querySelector('#sqMin'),oldIdeal=root.querySelector('#sqIdeal'),legacyRow=oldMin?.closest('.form-row');if(legacyRow)legacyRow.hidden=true;
    const min=root.querySelector('#sqFlexMin'),max=root.querySelector('#sqFlexMax'),minField=min?.closest('.field'),maxField=max?.closest('.field'),durField=dur.closest('.field'),durLabel=durField?.querySelector('label');
    let help=durField?.querySelector('.duration-help-v9');if(!help&&durField){help=document.createElement('small');help.className='subtle duration-help-v9';durField.appendChild(help)}
    const sync=()=>{
      const fixed=mode.value==='fixed',total=Math.max(5,Number(dur.value||30));
      if(minField)minField.hidden=fixed;if(maxField)maxField.hidden=fixed;
      if(durLabel)durLabel.textContent=fixed?'Duração fixa (min)':'Esforço total no período (min)';
      if(help)help.textContent=fixed?'Um único bloco por ocorrência, exatamente com esta duração.':'O esforço total pode ser dividido em blocos entre o mínimo e o máximo flexível.';
      if(fixed){if(oldMin)oldMin.value=String(total);if(oldIdeal)oldIdeal.value=String(total)}
      else{if(oldMin&&min)oldMin.value=min.value;if(oldIdeal&&max)oldIdeal.value=max.value}
    };
    mode.onchange=sync;dur.addEventListener('input',sync);min?.addEventListener('input',sync);max?.addEventListener('input',sync);sync();
  }
  const mo=new MutationObserver(()=>enhance());const modal=document.getElementById('modal');if(modal)mo.observe(modal,{childList:true,subtree:true});
  window.addEventListener?.('my-performance-view-rendered',()=>requestAnimationFrame(enhance));setTimeout(enhance,0);
  window.MyPerformanceSideQuestDuration={VERSION:9,normalize};
})();
