"use strict";
/* Funding post-pass — funding-strategy-2026 mutates deadlines after the adaptive engine starts, so rebuild once with final quest dates. */
(function(){
  function refresh(reason='funding-strategy-postpass'){
    if(!window.MyPerformanceAdaptive?.recalculate)return null;
    const result=window.MyPerformanceAdaptive.recalculate({reason});
    try{window.MyPerformanceAdaptiveFairness?.rebalance?.()}catch(e){console.error('Post-funding fairness rebalance failed',e)}
    try{render()}catch{}
    return result
  }
  refresh();
  window.addEventListener('my-performance-cloud-loaded',()=>setTimeout(()=>refresh('funding-strategy-cloud-postpass'),90));
  window.MyPerformanceFundingPostpass={refresh};
})();
