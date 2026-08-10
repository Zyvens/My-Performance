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
  async function waitForWaiting(reg,timeout=8000){const start=Date.now();while(Date.now()-start<timeout){if(reg.waiting)return reg.waiting;await sleep(120);try{await reg.update()}catch{}}return reg.waiting||null}
  function cacheBust(version){const u=new URL(location.href);u.searchParams.set('_mpv',version||Date.now().toString());u.searchParams.set('_mpr',Date.now().toString());location.replace(u.toString())}

  async function applyUpdate(reg,remoteVersion){
    if(updateInFlight)return;updateInFlight=true;
    const btn=document.getElementById('pwaUpdateNow');if(btn){btn.disabled=true;btn.textContent='Atualizando…'}
    try{
      await reg.update();
      const worker=await waitForWaiting(reg,8000);
      if(worker){
        const changed=new Promise(resolve=>{const timer=setTimeout(resolve,5000);navigator.serviceWorker.addEventListener('controllerchange',()=>{clearTimeout(timer);resolve()},{once:true})});
        worker.postMessage({type:'SKIP_WAITING'});
        await changed;
      }
      // The new worker activation already deletes older my-performance caches.
      // Reload only after activation, using a cache-busting URL so the new shell cannot fall back to the previous document.
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
