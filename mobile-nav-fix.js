"use strict";
/* Mobile navigation guard — keeps selected tab in sync and makes “Hoje” always mean the real current day. */
(function(){
  const BASE_RENDER=render;
  const BASE_GO=go;

  function syncActive(view=state.view){
    document.querySelectorAll('[data-view]').forEach(b=>{
      const active=b.dataset.view===view;
      b.classList.toggle('active',active);
      b.setAttribute('aria-current',active?'page':'false');
    });
  }

  function centerActiveMobile(){
    if(!window.matchMedia('(max-width:850px)').matches)return;
    const active=document.querySelector('.bottom-nav [data-view].active');
    active?.scrollIntoView?.({behavior:'smooth',block:'nearest',inline:'center'});
  }

  go=function(view){
    if(view==='today')state.plannerDate=today();
    state.view=view;
    syncActive(view);
    saveState();
    try{render()}finally{
      syncActive(view);
      requestAnimationFrame(centerActiveMobile);
    }
    window.scrollTo({top:0,behavior:'smooth'});
  };

  render=function(){
    syncActive(state.view);
    try{return BASE_RENDER()}finally{
      syncActive(state.view);
      requestAnimationFrame(centerActiveMobile);
    }
  };

  document.addEventListener('click',event=>{
    const btn=event.target.closest('.bottom-nav [data-view], .nav [data-view]');
    if(!btn)return;
    syncActive(btn.dataset.view);
  },true);

  window.addEventListener('my-performance-view-rendered',e=>{
    syncActive(e.detail?.view||state.view);
    requestAnimationFrame(centerActiveMobile);
  });

  syncActive(state.view);
  requestAnimationFrame(centerActiveMobile);
  window.MyPerformanceNavigation={syncActive,goToday:()=>go('today')};
})();
