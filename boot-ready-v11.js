"use strict";
/* My Performance 2.6.1 — fail-open boot gate. The shell is revealed before the final render so a slow/broken Planner can never trap the app on the loading screen. */
(function(){
  const VERSION=12;
  const WATCHDOG_MS=1800;
  let released=false;
  let renderStarted=false;

  function dispatch(status){
    try{window.dispatchEvent(new CustomEvent('my-performance-runtime-ready',{detail:{version:VERSION,status}}))}catch(_e){}
  }

  function reveal(status='ready'){
    if(!released){
      released=true;
      document.documentElement.classList.remove('mp-booting');
      document.documentElement.classList.add('mp-runtime-revealed');
      document.documentElement.dataset.runtimeReady='1';
    }
    document.documentElement.dataset.bootStatus=status;
    dispatch(status);
  }

  function finalRender(){
    if(renderStarted)return;
    renderStarted=true;
    /* Critical invariant: reveal BEFORE calling render(). A synchronous render must never own the boot overlay. */
    reveal('rendering');
    setTimeout(()=>{
      try{
        if(typeof render==='function')render();
        document.documentElement.dataset.bootStatus='ready';
      }catch(e){
        console.error('My Performance final boot render',e);
        document.documentElement.dataset.bootStatus='degraded';
        try{window.dispatchEvent(new CustomEvent('my-performance-boot-error',{detail:{message:String(e?.message||e)}}))}catch(_e){}
      }
    },0);
  }

  const watchdog=setTimeout(()=>reveal('watchdog'),WATCHDOG_MS);
  function finish(){
    clearTimeout(watchdog);
    /* Give the buffering frame one paint, then reveal and render asynchronously. */
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(finalRender);
    else setTimeout(finalRender,0);
  }

  /* Any early runtime error must fail open rather than strand the user behind the loader. */
  window.addEventListener('error',()=>reveal('degraded'),{once:true});
  window.addEventListener('unhandledrejection',()=>reveal('degraded'),{once:true});

  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',finish,{once:true});
  else queueMicrotask(finish);

  window.MyPerformanceBootReady={VERSION,finish,reveal,finalRender};
})();
