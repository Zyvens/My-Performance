"use strict";
/* PWA Update Manager — checks both the service worker and a no-cache public version beacon. */
(function(){
  if(!('serviceWorker' in navigator))return;
  const LOCAL_BUILD='1.5.7';
  let refreshing=false,checking=false;

  function ensureBanner(){
    let box=document.getElementById('pwaUpdateBanner');
    if(box)return box;
    box=document.createElement('div');
    box.id='pwaUpdateBanner';
    box.style.cssText='position:fixed;left:12px;right:12px;bottom:calc(82px + env(safe-area-inset-bottom));z-index:500;display:none;background:#123125;border:1px solid #41d98c;border-radius:14px;padding:12px;box-shadow:0 16px 44px rgba(0,0,0,.38);color:#edf8f3';
    box.innerHTML='<div style="display:flex;gap:10px;align-items:center;justify-content:space-between"><div><b>Nova versão disponível</b><div id="pwaUpdateDetail" style="font-size:12px;color:#b9d4c8;margin-top:2px">Atualize para carregar as funções mais recentes do My Performance.</div></div><button class="btn primary small" id="pwaUpdateNow">Atualizar agora</button></div>';
    document.body.appendChild(box);
    return box
  }

  function showUpdate(reg,detail=''){const box=ensureBanner();box.style.display='block';const d=document.getElementById('pwaUpdateDetail');if(d&&detail)d.textContent=detail;const btn=document.getElementById('pwaUpdateNow');btn.disabled=false;btn.textContent='Atualizar agora';btn.onclick=async()=>{btn.disabled=true;btn.textContent='Atualizando…';try{await reg?.update?.()}catch{}const worker=reg?.waiting;if(worker)worker.postMessage({type:'SKIP_WAITING'});else location.reload()}}
  async function serverVersion(){
    try{const r=await fetch(`./version.json?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)return null;return await r.json()}catch{return null}
  }
  async function check(){
    if(checking)return;checking=true;
    try{
      const reg=await navigator.serviceWorker.getRegistration();if(!reg)return;
      const remote=await serverVersion();
      if(remote?.version&&remote.version!==LOCAL_BUILD){showUpdate(reg,`Servidor em v${remote.version}; este navegador está em v${LOCAL_BUILD}.`)}
      if(reg.waiting){showUpdate(reg,remote?.version?`Versão v${remote.version} pronta para ativar.`:'Nova versão pronta para ativar.');return}
      await reg.update();
      if(reg.waiting){showUpdate(reg,remote?.version?`Versão v${remote.version} pronta para ativar.`:'Nova versão pronta para ativar.');return}
      reg.addEventListener('updatefound',()=>{const worker=reg.installing;if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)showUpdate(reg)})},{once:true})
    }catch(e){console.warn('PWA update check failed',e)}finally{checking=false}
  }

  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(refreshing)return;refreshing=true;location.reload()});
  window.addEventListener('load',()=>setTimeout(check,500));
  window.addEventListener('focus',()=>setTimeout(check,150));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(check,150)});
  setInterval(check,10*60*1000);
  window.MyPerformancePWAUpdate={check,serverVersion,LOCAL_BUILD};
})();
