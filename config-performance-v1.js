"use strict";
/* My Performance 2.9.0 — browser-native lazy rendering for heavy Config panels. */
(function(){
  const VERSION=1;
  function apply(){const host=document.getElementById('view');if(!host)return;host.classList.toggle('mp-config-lazy',typeof state!=='undefined'&&state.view==='config')}
  window.addEventListener?.('my-performance-view-rendered',()=>queueMicrotask(apply));
  window.addEventListener?.('my-performance-cloud-loaded',()=>queueMicrotask(apply));
  document.addEventListener('DOMContentLoaded',apply,{once:true});
  window.MyPerformanceConfigPerformance={VERSION,apply};
})();
