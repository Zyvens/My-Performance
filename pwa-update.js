"use strict";
/* PWA Update Manager — updates are applied automatically and the page is reloaded when a new worker takes control. */
(function(){
  if(!('serviceWorker' in navigator))return;
  let refreshing=false,checking=false,updateInFlight=false,pendingVersion='';

  const clientBuild=()=>String(document.documentElement.dataset.build||window.MyPerformanceRuntimeHealth?.BUILD||'').trim();
  function ensureBanner(){
    let box=document.getElementById('pwaUpdateBanner');
    if(box)return box;
    box=document.createElement('div');box.id='pwaUpdateBanner';
    box.style.cssText='position:fixed;left:12px;right:12px;bottom:calc(82px + env(safe-area-inset-bottom));z-index:500;display:none;background:#123125;border:1px solid #41d98c;border-radius:14px;padding:12px;box-shadow:0 16px 44px rgba(0,0,0,.38);color:#edf8f3';
    box.innerHTML='<div style="display:flex;gap:10px;align-items:center;justify-content:space-between"><div><b>Atualizando My Performance…</b><div id="pwaUpdateDetail" style="font-size:12px;color:#b9d4c8;margin-top:2px">Carregando a versão mais recente automaticamente.</div></div><button class="btn primary small" id="pwaUpdateNow">Atualizar agora</button></div>';
    document.body.appendChild(box);return box
  }
  function hideBanner(){const b=document.getElementById('pwaUpdateBanner');if(b)b.style.display='none'}
  async function serverVersion(){try{const r=await fetch(`./version.json?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)return null;return await r.json()}catch{return null}}
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  function cacheBust(version){if(refreshing)return;refreshing=true;const u=new URL(location.href);u.searchParams.set('_mpv',version||Date.now().toString());u.searchParams.set('_mpr',Date.now().toString());location.replace(u.toString())}
  function showUpdate(remoteVersion,detail=''){
    const box=ensureBanner();box.style.display='block';const d=document.getElementById('pwaUpdateDetail');if(d&&detail)d.textContent=detail;
    const btn=document.getElementById('pwaUpdateNow');if(btn){btn.disabled=false;btn.textContent='Atualizar agora';btn.onclick=async()=>{const reg=await navigator.serviceWorker.getRegistration();if(reg)applyUpdate(reg,remoteVersion)}}
  }
  async function waitForController(before,timeout=10000){const start=Date.now();while(Date.now()-start<timeout){if(navigator.serviceWorker.controller&&navigator.serviceWorker.controller!==before)return true;await sleep(100)}return false}
  async function applyUpdate(reg,remoteVersion){
    if(updateInFlight)return;updateInFlight=true;pendingVersion=remoteVersion||pendingVersion||'latest';showUpdate(pendingVersion,`Aplicando v${pendingVersion} automaticamente…`);
    const btn=document.getElementById('pwaUpdateNow');if(btn){btn.disabled=true;btn.textContent='Atualizando…'}
    try{
      const before=navigator.serviceWorker.controller;
      await reg.update();
      if(reg.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'});
      const changed=await waitForController(before,10000);
      if(changed){cacheBust(pendingVersion);return}
      // A new worker may already have activated/claimed without exposing a waiting worker.
      // Force one cache-busted navigation so the document cannot continue running stale JS.
      cacheBust(pendingVersion)
    }catch(e){console.error('PWA automatic update failed',e);showUpdate(pendingVersion,'A atualização automática falhou. Toque para tentar novamente.');if(btn){btn.disabled=false;btn.textContent='Tentar novamente'}}finally{updateInFlight=false}
  }
  async function check(){
    if(checking||updateInFlight)return;checking=true;
    try{
      const reg=await navigator.serviceWorker.getRegistration();if(!reg)return;
      const remote=await serverVersion(),local=clientBuild();
      if(remote?.version&&local&&remote.version===local&&!reg.waiting){hideBanner();return}
      if(remote?.version&&(!local||remote.version!==local)){
        pendingVersion=remote.version;showUpdate(remote.version,`Servidor em v${remote.version}; este navegador está em ${local?`v${local}`:'uma versão anterior'}. Atualizando agora…`);
        await applyUpdate(reg,remote.version);return
      }
      await reg.update();
      if(reg.waiting){pendingVersion=remote?.version||'latest';await applyUpdate(reg,pendingVersion)}
    }catch(e){console.warn('PWA update check failed',e)}finally{checking=false}
  }

  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    // This is the missing step that previously left an already-open tab executing old JavaScript.
    cacheBust(pendingVersion||'controller')
  });
  window.addEventListener('load',()=>setTimeout(check,350));
  window.addEventListener('focus',()=>setTimeout(check,100));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(check,100)});
  setInterval(check,5*60*1000);
  window.MyPerformancePWAUpdate={check,serverVersion,clientBuild,applyUpdate};
})();
