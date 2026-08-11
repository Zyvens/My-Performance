"use strict";
/* Shared classic-script helpers used by the final calendar UI. */
var dow=function(date){return dfrom(date).getDay()};
if(typeof state!=='undefined'){
  if(state.filters?.domain==='Carreira')state.filters.domain='Todos';
  if(state.timelineDomain==='Carreira')state.timelineDomain='Todos';
}
(function(){
  const build=()=>String(document.documentElement.dataset.build||'').trim();
  function syncBuildLabel(){const v=build();if(!v)return;document.querySelectorAll('.planner-head .eyebrow').forEach(el=>{if(/CALENDÁRIO INTELIGENTE/i.test(el.textContent||''))el.textContent=`CALENDÁRIO INTELIGENTE · v${v}`})}
  window.addEventListener('my-performance-view-rendered',()=>requestAnimationFrame(syncBuildLabel));
  window.addEventListener('pageshow',syncBuildLabel);
})();
