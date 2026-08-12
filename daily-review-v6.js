"use strict";
/* My Performance 2.8.0 — zero-history rollover.
   Past calendars do not exist operationally. Daily Side Quests expire; unfinished Main Quests are replanned from Today by the Planner itself. */
(function(){
  const Clock=window.MyPerformanceClock,E=window.MyPerformancePlannerEngine;
  if(!Clock||!E||typeof state==='undefined')return;
  const VERSION=13,STORE_KEY='my_performance_daily_review_v6',LAST_KEY='my_performance_last_live_date';
  const current=()=>Clock.today();
  function purgeLegacy(){delete state.dailyReviewV6;try{localStorage.removeItem(STORE_KEY)}catch{}}
  function rollover(reason='rollover'){
    const now=current(),last=localStorage.getItem(LAST_KEY)||'';state.plannerDate=now;
    if(last&&last!==now)try{E.invalidate?.(reason)}catch{}
    try{localStorage.setItem(LAST_KEY,now)}catch{}
    return last!==now
  }
  purgeLegacy();rollover('startup-rollover');
  window.addEventListener('pageshow',()=>rollover('pageshow-rollover'));
  window.addEventListener('my-performance-cloud-loaded',()=>rollover('cloud-rollover'));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){const changed=rollover('resume-rollover');if(changed&&state.view==='today')try{render()}catch{}}});
  window.MyPerformanceDailyReview={VERSION,reviewRequired:()=>false,pending:()=>[],finalize:()=>true,snapshotDay:()=>[],buildPending:()=>[],rollover,purgeLegacy};
})();
