"use strict";
/* My Performance 2.9.8 — Groups are the single compatibility authority for Window capacity.
   Legacy allowSideQuests/sideQuestDedicated are normalized away and hidden from configuration. */
(function(){
  const D=window.MyPerformanceCalendarDomain,E=window.MyPerformancePlannerEngine;
  if(!D||!E)return;
  const VERSION=19;
  const normalize=w=>{
    if(!w||typeof w!=='object')return w;
    const x=JSON.parse(JSON.stringify(w));
    if((x.groups||[]).length&&!x.plannerPolicy){
      x.allowSideQuests=true;
      x.sideQuestDedicated=false;
    }
    return x;
  };

  const baseWeekday=typeof D.windowsForWeekday==='function'?D.windowsForWeekday.bind(D):null;
  if(baseWeekday&&!D.__groupOnlyCompatibilityV19){
    D.__groupOnlyCompatibilityV19=true;
    D.windowsForWeekday=day=>(baseWeekday(day)||[]).map(normalize);
  }
  const baseWindowForId=typeof D.windowForId==='function'?D.windowForId.bind(D):null;
  if(baseWindowForId)D.windowForId=id=>normalize(baseWindowForId(id));

  function simplifyWindowModal(){
    const allow=document.getElementById('wAllowSide'),ded=document.getElementById('wDedicated');
    if(!allow&&!ded)return;
    if(allow){allow.checked=true;const row=allow.closest('.setting-toggle');if(row)row.style.display='none'}
    if(ded){ded.checked=false;const row=ded.closest('.setting-toggle');if(row)row.style.display='none'}
    const preferred=document.getElementById('wPreferred')?.closest('.form-row');
    if(preferred&&!document.getElementById('groupAuthorityNoteV19')){
      const note=document.createElement('div');note.id='groupAuthorityNoteV19';note.className='callout';note.innerHTML='<b>Compatibilidade por Grupo</b><p>Qualquer Main Quest ou Side Quest pode usar esta Janela quando pertencer a um dos Grupos permitidos. Prioridade, prazo, energia e disponibilidade definem quem entra primeiro.</p>';
      preferred.after(note);
    }
  }

  function simplifyRenderedConfig(){
    if(state?.view!=='config')return;
    document.querySelectorAll('.window-row-v5 .pill').forEach(p=>{
      const t=(p.textContent||'').toLowerCase();
      if(t.includes('side quest dedicada')||t.includes('side quest autorizada')||t.includes('fillers autorizados'))p.remove();
    });
  }

  const observer=new MutationObserver(()=>{simplifyWindowModal();simplifyRenderedConfig()});
  try{observer.observe(document.body,{subtree:true,childList:true})}catch(_e){}
  window.addEventListener('my-performance-view-rendered',()=>requestAnimationFrame(simplifyRenderedConfig));

  try{E.invalidate?.()}catch(_e){}
  window.MyPerformanceGroupWindowAuthority={VERSION,normalize};
})();
