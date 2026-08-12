"use strict";
/* My Performance 2.6.0 — final-render boot gate. Prevents the legacy base renderer from flashing before Calendar V5 wrappers load. */
(function(){
  const VERSION=11;
  let finished=false;
  function finish(){if(finished)return;finished=true;try{if(typeof render==='function')render()}catch(e){console.error('My Performance final boot render',e)}requestAnimationFrame(()=>requestAnimationFrame(()=>{document.documentElement.classList.remove('mp-booting');document.documentElement.dataset.runtimeReady='1';window.dispatchEvent(new CustomEvent('my-performance-runtime-ready',{detail:{version:VERSION}}))}))}
  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',finish,{once:true});else queueMicrotask(finish);
  window.MyPerformanceBootReady={VERSION,finish};
})();
