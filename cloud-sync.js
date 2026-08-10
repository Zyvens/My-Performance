const CLOUD_PROFILE_KEY='my_performance_cloud_profile';
const CLOUD_SYNC_KEY='my_performance_cloud_sync_key';
const CLOUD_ENABLED='my_performance_cloud_enabled';
const CLOUD_LAST_SYNC='my_performance_cloud_last_sync';
const CLOUD_LOCAL_UPDATED='my_performance_cloud_local_updated';
const CLOUD_STORAGE_KEY='my_performance_v1';

const cloud={
  enabled:localStorage.getItem(CLOUD_ENABLED)==='1',
  profile:localStorage.getItem(CLOUD_PROFILE_KEY)||'vitor',
  syncKey:localStorage.getItem(CLOUD_SYNC_KEY)||'',
  syncing:false,timer:null,lastSnapshot:localStorage.getItem(CLOUD_STORAGE_KEY)||''
};

function cloudStatus(msg,kind=''){
  const el=document.getElementById('cloudStatus');if(!el)return;el.textContent=msg;
  el.style.color=kind==='error'?'var(--red)':kind==='ok'?'var(--green)':'var(--muted2)'
}
function headers(){return {'content-type':'application/json','x-sync-key':cloud.syncKey}}
async function requestCloud(method,body){
  const p=encodeURIComponent(cloud.profile||'vitor');
  const r=await fetch(`/api/state?profile=${p}`,{method,headers:headers(),body:body?JSON.stringify(body):undefined,cache:'no-store'});
  const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||`HTTP ${r.status}`);return data
}
function markLocal(){localStorage.setItem(CLOUD_LOCAL_UPDATED,new Date().toISOString())}
async function pushCloud({force=false}={}){
  if(!cloud.enabled||!cloud.syncKey||cloud.syncing)return false;
  const raw=localStorage.getItem(CLOUD_STORAGE_KEY)||'';if(!raw)return false;
  if(!force&&raw===cloud.lastSnapshot)return false;
  cloud.syncing=true;cloudStatus('Salvando na nuvem…');
  try{
    const result=await requestCloud('PUT',{state:JSON.parse(raw)});
    cloud.lastSnapshot=raw;const stamp=result.updatedAt||new Date().toISOString();
    localStorage.setItem(CLOUD_LAST_SYNC,stamp);localStorage.setItem(CLOUD_LOCAL_UPDATED,stamp);
    cloudStatus(`Sincronizado · ${new Date(stamp).toLocaleString('pt-BR')}`,'ok');return true
  }catch(e){cloudStatus(`Offline/local · ${e.message}`,'error');return false}
  finally{cloud.syncing=false}
}
async function pullCloud({force=false}={}){
  if(!cloud.enabled||!cloud.syncKey||cloud.syncing)return false;
  cloud.syncing=true;cloudStatus('Consultando nuvem…');
  try{
    const result=await requestCloud('GET');
    if(!result.found){cloud.syncing=false;cloudStatus('Nuvem vazia — enviando este dispositivo…');return pushCloud({force:true})}
    const remote=JSON.stringify(result.state||{}),local=localStorage.getItem(CLOUD_STORAGE_KEY)||'{}';
    const remoteUpdated=result.updatedAt||'',localUpdated=localStorage.getItem(CLOUD_LOCAL_UPDATED)||'';
    if(!force&&localUpdated&&remoteUpdated&&localUpdated>remoteUpdated&&local!==remote){
      cloud.syncing=false;return pushCloud({force:true})
    }
    if(force||remote!==local){
      localStorage.setItem(CLOUD_STORAGE_KEY,remote);cloud.lastSnapshot=remote;
      localStorage.setItem(CLOUD_LAST_SYNC,remoteUpdated||new Date().toISOString());
      localStorage.setItem(CLOUD_LOCAL_UPDATED,remoteUpdated||new Date().toISOString());
      window.dispatchEvent(new CustomEvent('my-performance-cloud-loaded',{detail:result.state}))
    }
    cloudStatus(`PC/celular sincronizados · ${new Date(remoteUpdated||Date.now()).toLocaleString('pt-BR')}`,'ok');return true
  }catch(e){cloudStatus(`Offline/local · ${e.message}`,'error');return false}
  finally{cloud.syncing=false}
}
function schedulePush(){if(!cloud.enabled||!cloud.syncKey)return;clearTimeout(cloud.timer);cloud.timer=setTimeout(()=>pushCloud(),800)}

function initCloudUI(){
  const p=document.getElementById('cloudProfile'),k=document.getElementById('cloudKey'),e=document.getElementById('cloudEnabled');
  if(!p||!k||!e)return;p.value=cloud.profile;k.value=cloud.syncKey;e.checked=cloud.enabled;
  cloudStatus(cloud.enabled?'Sincronização pronta.':'Sincronização desativada.');
  document.getElementById('cloudSave').onclick=async()=>{
    cloud.profile=(p.value||'vitor').trim();cloud.syncKey=k.value;cloud.enabled=e.checked;
    localStorage.setItem(CLOUD_PROFILE_KEY,cloud.profile);localStorage.setItem(CLOUD_SYNC_KEY,cloud.syncKey);localStorage.setItem(CLOUD_ENABLED,cloud.enabled?'1':'0');
    if(!cloud.enabled){cloudStatus('Sincronização desativada.');return}
    if(!cloud.syncKey){cloudStatus('Informe a mesma SYNC_KEY configurada na Vercel.','error');return}
    const check=await requestCloud('GET').catch(()=>null);if(check?.found)await pullCloud();else await pushCloud({force:true})
  };
  document.getElementById('cloudPull').onclick=()=>pullCloud({force:true});
  document.getElementById('cloudPush').onclick=()=>{markLocal();pushCloud({force:true})};
  if(cloud.enabled&&cloud.syncKey)pullCloud()
}
window.addEventListener('my-performance-state-saved',()=>{markLocal();schedulePush()});
window.addEventListener('storage',e=>{if(e.key===CLOUD_STORAGE_KEY)schedulePush()});
window.MyPerformanceCloud={pull:pullCloud,push:pushCloud,status:()=>({...cloud,syncKey:cloud.syncKey?'***':''})};
initCloudUI();
