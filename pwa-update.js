"use strict";
/* PWA Update Manager — proactively checks for new service workers and offers one-tap activation/reload. */
(function(){
  if(!('serviceWorker' in navigator))return;
  let refreshing=false;

  function ensureBanner(){
    let box=document.getElementById('pwaUpdateBanner');
    if(box)return box;
    box=document.createElement('div');
    box.id='pwaUpdateBanner';
    box.style.cssText='position:fixed;left:12px;right:12px;bottom:calc(82px + env(safe-area-inset-bottom));z-index:500;display:none;background:#123125;border:1px solid #41d98c;border-radius:14px;padding:12px;box-shadow:0 16px 44px rgba(0,0,0,.38);color:#edf8f3';
    box.innerHTML='<div style="display:flex;gap:10px;align-items:center;justify-content:space-between"><div><b>Nova versão disponível</b><div style="font-size:12px;color:#b9d4c8;margin-top:2px">Atualize para carregar as funções mais recentes do My Performance.</div></div><button class="btn primary small" id="pwaUpdateNow">Atualizar agora</button></div>';
    document.body.appendChild(box);
    return box
  }

  function showUpdate(reg){
    const box=ensureBanner();box.style.display='block';
    const btn=document.getElementById('pwaUpdateNow');
    btn.onclick=()=>{
      const worker=reg.waiting;
      if(worker){btn.disabled=true;btn.textContent='Atualizando…';worker.postMessage({type:'SKIP_WAITING'})}
      else location.reload()
    }
  }

  async function check(){
    try{
      const reg=await navigator.serviceWorker.getRegistration();if(!reg)return;
      if(reg.waiting){showUpdate(reg);return}
      await reg.update();
      if(reg.waiting){showUpdate(reg);return}
      reg.addEventListener('updatefound',()=>{
        const worker=reg.installing;if(!worker)return;
        worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)showUpdate(reg)})
      },{once:true})
    }catch(e){console.warn('PWA update check failed',e)}
  }

  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(refreshing)return;refreshing=true;location.reload()
  });

  window.addEventListener('load',()=>setTimeout(check,700));
  window.addEventListener('focus',()=>setTimeout(check,250));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(check,250)});
  setInterval(check,15*60*1000);
  window.MyPerformancePWAUpdate={check};
})();
