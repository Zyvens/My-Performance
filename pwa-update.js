"use strict";
/* PWA Update Manager — single client build source + atomic worker activation. */
(function(){
  if(!('serviceWorker' in navigator))return;
  let refreshing=false,checking=false,updateInFlight=false;

  const clientBuild=()=>String(document.documentElement.dataset.build||window.MyPerformanceRuntimeHealth?.BUILD||'').trim();

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
  function hideBanner(){const b=document.getElementById('pwaUpdateBanner');if(b)b.style.display='none'}
  async function serverVersion(){try{const r=await fetch(`./version.json?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)return null;return await r.json()}catch{return null}}
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  function controllerChange(timeout=8000){return new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(timer);navigator.serviceWorker.removeEventListener('controllerchange',finish);resolve(true)};const timer=setTimeout(()=>{if(done)return;done=true;navigator.serviceWorker.removeEventListener('controllerchange',finish);resolve(false)},timeout);navigator.serviceWorker.addEventListener('controllerchange',finish)})}
  async function waitForWaitingOrController(reg,before,timeout=8000){const start=Date.now();while(Date.now()-start<timeout){if(reg.waiting)return{waiting:reg.waiting,changed:false};if(navigator.serviceWorker.controller&&navigator.serviceWorker.controller!==before)return{waiting:null,changed:true};await sleep(100)}return{waiting:reg.waiting||null,changed:!!(navigator.serviceWorker.controller&&navigator.serviceWorker.controller!==before)}}
  function cacheBust(version){const u=new URL(location.href);u.searchParams.set('_mpv',version||Date.now().toString());u.searchParams.set('_mpr',Date.now().toString());location.replace(u.toString())}

  async function applyUpdate(reg,remoteVersion){
    if(updateInFlight)return;updateInFlight=true;
    const btn=document.getElementById('pwaUpdateNow');if(btn){btn.disabled=true;btn.textContent='Atualizando…'}
    try{
      const before=navigator.serviceWorker.controller,changedPromise=controllerChange(9000);
      await reg.update();
      const status=await waitForWaitingOrController(reg,before,8000);
      if(status.waiting){status.waiting.postMessage({type:'SKIP_WAITING'});await changedPromise}
      else if(!status.changed&&navigator.serviceWorker.controller===before)await changedPromise;
      // Activation deletes old my-performance caches. Reload only after the controller transition,
      // with a cache-busting URL so an older document cannot be revived.
      cacheBust(remoteVersion||'latest');
    }catch(e){console.error('PWA atomic update failed',e);if(btn){btn.disabled=false;btn.textContent='Tentar novamente'}}finally{updateInFlight=false}
  }

  function showUpdate(reg,remoteVersion,detail=''){
    const box=ensureBanner();box.style.display='block';
    const d=document.getElementById('pwaUpdateDetail');if(d&&detail)d.textContent=detail;
    const btn=document.getElementById('pwaUpdateNow');if(btn){btn.disabled=false;btn.textContent='Atualizar agora';btn.onclick=()=>applyUpdate(reg,remoteVersion)}
  }

  async function check(){
    if(checking||updateInFlight)return;checking=true;
    try{
      const reg=await navigator.serviceWorker.getRegistration();if(!reg)return;
      const remote=await serverVersion(),local=clientBuild();
      if(remote?.version&&local&&remote.version===local&&!reg.waiting){hideBanner();return}
      if(remote?.version&&(!local||remote.version!==local))showUpdate(reg,remote.version,`Servidor em v${remote.version}; este navegador está em ${local?`v${local}`:'uma versão anterior'}.`);
      await reg.update();
      if(reg.waiting)showUpdate(reg,remote?.version,remote?.version?`Versão v${remote.version} pronta para ativar.`:'Nova versão pronta para ativar.');
    }catch(e){console.warn('PWA update check failed',e)}finally{checking=false}
  }

  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(updateInFlight)return;if(refreshing)return;refreshing=true;setTimeout(()=>{refreshing=false},1500)});
  window.addEventListener('load',()=>setTimeout(check,650));
  window.addEventListener('focus',()=>setTimeout(check,200));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(check,200)});
  setInterval(check,10*60*1000);
  window.MyPerformancePWAUpdate={check,serverVersion,clientBuild,applyUpdate};
})();
