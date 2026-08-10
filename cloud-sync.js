"use strict";

const NEON_AUTH_URL='https://ep-fancy-wave-a6thlzk9.neonauth.us-west-2.aws.neon.tech/neondb/auth';
const NEON_DATA_API_URL='https://ep-fancy-wave-a6thlzk9.apirest.us-west-2.aws.neon.tech/neondb/rest/v1';
const NEON_SDK_URLS=[
  'https://cdn.jsdelivr.net/npm/@neondatabase/neon-js@0.6.3-beta/+esm',
  'https://esm.sh/@neondatabase/neon-js@0.6.3-beta?bundle'
];
const N_EMAIL='my_performance_neon_email';
const N_ENABLED='my_performance_neon_enabled';
const N_LAST_SYNC='my_performance_neon_last_sync';
const N_LOCAL_UPDATED='my_performance_local_updated';
const N_BASE_SNAPSHOT='my_performance_neon_base_snapshot';
const N_STATE_KEY='my_performance_v1';

localStorage.removeItem('my_performance_neon_sync_key');
localStorage.removeItem('my_performance_neon_endpoint');
localStorage.removeItem('my_performance_neon_profile');

const neonSync={
  email:localStorage.getItem(N_EMAIL)||'',
  enabled:localStorage.getItem(N_ENABLED)==='1',
  syncing:false,
  applyingRemote:false,
  timer:null,
  lastSnapshot:localStorage.getItem(N_STATE_KEY)||'',
  baseSnapshot:localStorage.getItem(N_BASE_SNAPSHOT)||'',
  clientPromise:null,
  sdkSource:'',
  sdkErrors:[],
  conflict:null
};

function status(msg,kind=''){
  const e=document.getElementById('cloudStatus');if(!e)return;e.textContent=msg;e.style.color=kind==='ok'?'var(--green)':kind==='error'?'var(--red)':'var(--muted2)'
}
function errText(e){return String(e?.message||e||'erro desconhecido')}
function isModuleImportError(e){return /importing a module script failed|failed to fetch dynamically imported module|module script|dynamic import|mime type|load module/i.test(errText(e))}
async function loadSdk(){
  const failures=[];
  for(const url of NEON_SDK_URLS){
    try{
      const mod=await import(url);
      if(typeof mod?.createClient!=='function')throw new Error('createClient não encontrado no módulo Neon JS');
      neonSync.sdkSource=url;neonSync.sdkErrors=failures;return mod
    }catch(e){failures.push({url,error:errText(e)})}
  }
  neonSync.sdkErrors=failures;
  const detail=failures.map((x,i)=>`${i+1}. ${x.error}`).join(' | ');
  throw new Error(`Não foi possível carregar o Neon JS no navegador. ${detail}`)
}
async function getClient(){
  if(!neonSync.clientPromise){
    neonSync.clientPromise=loadSdk().then(({createClient})=>createClient({auth:{url:NEON_AUTH_URL},dataApi:{url:NEON_DATA_API_URL}})).catch(e=>{neonSync.clientPromise=null;throw e})
  }
  return neonSync.clientPromise
}
function cloudError(prefix,e){
  const text=errText(e);
  if(isModuleImportError(e)||/Não foi possível carregar o Neon JS/i.test(text))return `${prefix} · SDK Neon não carregou no iPhone/PWA. Feche e abra o app para atualizar; se persistir, tente novamente com internet ativa.`;
  return `${prefix} · ${text}`
}
function unwrapAuth(result){if(result?.error)throw new Error(result.error.message||result.error.statusText||'Falha de autenticação.');return result?.data??result}
function unpack(x){return Array.isArray(x)?x[0]:x}
function markLocal(){localStorage.setItem(N_LOCAL_UPDATED,new Date().toISOString())}
function meaningful(obj={}){return !!(Object.keys(obj.completed||{}).length||Object.keys(obj.xpLedger||{}).length||(obj.customQuests||[]).length||(obj.timeTracking?.entries||[]).length||(obj.rewardLog||[]).length)}
function setBase(raw,stamp=''){neonSync.baseSnapshot=raw||'';neonSync.lastSnapshot=raw||'';localStorage.setItem(N_BASE_SNAPSHOT,raw||'');if(stamp)localStorage.setItem(N_LAST_SYNC,stamp)}
function conflictState(localRaw,remoteRaw){
  if(localRaw===remoteRaw)return{conflict:false,localChanged:false,remoteChanged:false};
  const base=neonSync.baseSnapshot||'',localChanged=!base||localRaw!==base,remoteChanged=!base||remoteRaw!==base;
  return{conflict:base?localChanged&&remoteChanged:true,localChanged,remoteChanged}
}
async function session(){try{const client=await getClient(),raw=await client.auth.getSession(),data=unwrapAuth(raw);return data?.session||data?.user?data:null}catch{return null}}
async function rpc(name,args={}){const client=await getClient(),result=await client.rpc(name,args);if(result?.error)throw new Error(result.error.message||`Falha em ${name}`);return result?.data}
async function readRemote(){return unpack(await rpc('my_performance_pull'))}
function clearConflict(){neonSync.conflict=null;document.getElementById('cloudConflictCard')?.remove()}
function exposeConflict(localRaw,remoteRaw,remoteUpdated=''){
  let localObj={},remoteObj={};try{localObj=JSON.parse(localRaw||'{}')}catch{}try{remoteObj=JSON.parse(remoteRaw||'{}')}catch{}
  neonSync.conflict={localRaw,remoteRaw,localObj,remoteObj,remoteUpdated,localUpdated:localStorage.getItem(N_LOCAL_UPDATED)||''};
  status('Conflito detectado: este aparelho e a nuvem mudaram desde a última base comum.','error');
  window.dispatchEvent(new CustomEvent('my-performance-sync-conflict',{detail:{remoteUpdated,localUpdated:neonSync.conflict.localUpdated}}));bindUI();return false
}
function applyRemoteObj(remoteObj,remoteUpdated=''){
  const remote=JSON.stringify(remoteObj||{}),stamp=remoteUpdated||new Date().toISOString();neonSync.applyingRemote=true;localStorage.setItem(N_STATE_KEY,remote);setBase(remote,stamp);localStorage.setItem(N_LOCAL_UPDATED,stamp);clearConflict();
  window.dispatchEvent(new CustomEvent('my-performance-cloud-loaded',{detail:remoteObj||{}}));
  setTimeout(()=>{neonSync.applyingRemote=false;const current=localStorage.getItem(N_STATE_KEY)||remote;setBase(current,stamp)},100);return true
}

async function push({force=false,skipRemoteCheck=false}={}){
  if(!neonSync.enabled||neonSync.syncing)return false;const auth=await session();if(!auth){status('Entre na sua conta Neon para sincronizar.','error');return false}
  const raw=localStorage.getItem(N_STATE_KEY)||'';if(!raw)return false;if(!force&&raw===neonSync.lastSnapshot&&neonSync.baseSnapshot===raw)return false;
  neonSync.syncing=true;status(force?'Enviando este aparelho ao Neon…':'Verificando conflito antes de salvar…');
  try{
    if(!force&&!skipRemoteCheck){
      const remoteOut=await readRemote();if(remoteOut?.found){const remoteObj=remoteOut.state||{},remoteRaw=JSON.stringify(remoteObj),c=conflictState(raw,remoteRaw);
        if(raw!==remoteRaw){
          if(!meaningful(JSON.parse(raw||'{}'))&&meaningful(remoteObj)){applyRemoteObj(remoteObj,remoteOut.updated_at||remoteOut.updatedAt||'');return true}
          if(c.conflict)return exposeConflict(raw,remoteRaw,remoteOut.updated_at||remoteOut.updatedAt||'');
          if(c.remoteChanged&&!c.localChanged){applyRemoteObj(remoteObj,remoteOut.updated_at||remoteOut.updatedAt||'');return true}
        }
      }
    }
    const out=unpack(await rpc('my_performance_push',{p_state:JSON.parse(raw)})),stamp=out?.updated_at||out?.updatedAt||new Date().toISOString();setBase(raw,stamp);localStorage.setItem(N_LOCAL_UPDATED,stamp);clearConflict();status(`Neon sincronizado · ${new Date(stamp).toLocaleString('pt-BR')}`,'ok');return true
  }catch(e){status(cloudError('Cloud indisponível',e),'error');return false}finally{neonSync.syncing=false}
}

async function pull({force=false}={}){
  if(!neonSync.enabled||neonSync.syncing)return false;const auth=await session();if(!auth){status('Entre na sua conta Neon para sincronizar.','error');return false}
  neonSync.syncing=true;status(force?'Baixando a nuvem explicitamente…':'Comparando aparelho e nuvem…');
  try{
    const out=await readRemote(),localRaw=localStorage.getItem(N_STATE_KEY)||'{}';
    if(!out?.found){neonSync.syncing=false;status('Primeiro acesso — criando seu save na nuvem…');return push({force:true,skipRemoteCheck:true})}
    const remoteObj=out.state||{},remoteRaw=JSON.stringify(remoteObj),remoteUpdated=out.updated_at||out.updatedAt||'';
    if(Object.keys(remoteObj).length===0&&meaningful(JSON.parse(localRaw||'{}'))){neonSync.syncing=false;status('Cloud vazia — enviando este dispositivo…');return push({force:true,skipRemoteCheck:true})}
    if(force){applyRemoteObj(remoteObj,remoteUpdated);status(`Nuvem aplicada · ${new Date(remoteUpdated||Date.now()).toLocaleString('pt-BR')}`,'ok');return true}
    if(remoteRaw===localRaw){setBase(remoteRaw,remoteUpdated);clearConflict();status(`PC/celular sincronizados · ${new Date(remoteUpdated||Date.now()).toLocaleString('pt-BR')}`,'ok');return true}
    const localObj=JSON.parse(localRaw||'{}');if(!meaningful(localObj)&&meaningful(remoteObj)){applyRemoteObj(remoteObj,remoteUpdated);status('Este aparelho estava vazio; save da nuvem carregado.','ok');return true}
    if(meaningful(localObj)&&!meaningful(remoteObj)){neonSync.syncing=false;return push({force:true,skipRemoteCheck:true})}
    const c=conflictState(localRaw,remoteRaw);if(c.conflict)return exposeConflict(localRaw,remoteRaw,remoteUpdated);
    if(c.remoteChanged&&!c.localChanged){applyRemoteObj(remoteObj,remoteUpdated);status('Alterações da nuvem aplicadas.','ok');return true}
    if(c.localChanged&&!c.remoteChanged){neonSync.syncing=false;return push({force:true,skipRemoteCheck:true})}
    return exposeConflict(localRaw,remoteRaw,remoteUpdated)
  }catch(e){status(cloudError('Cloud indisponível',e),'error');return false}finally{neonSync.syncing=false}
}

function schedulePush(){if(!neonSync.enabled||neonSync.applyingRemote||neonSync.conflict)return;clearTimeout(neonSync.timer);neonSync.timer=setTimeout(()=>push(),900)}
async function signIn(email,password){
  if(!email||!password){status('Informe e-mail e senha.','error');return false}
  status('Carregando Neon Auth…');
  try{
    const client=await getClient();status('Entrando no Neon Auth…');unwrapAuth(await client.auth.signIn.email({email,password}));neonSync.email=email;neonSync.enabled=true;localStorage.setItem(N_EMAIL,email);localStorage.setItem(N_ENABLED,'1');status('Login realizado. Comparando saves…','ok');await pull();bindUI();return true
  }catch(e){status(cloudError('Login falhou',e),'error');return false}
}
async function signUp(email,password){
  if(!email||!password){status('Informe e-mail e senha.','error');return false}
  if(password.length<8){status('Use uma senha com pelo menos 8 caracteres.','error');return false}
  status('Carregando Neon Auth…');
  try{
    const client=await getClient();status('Criando sua conta Neon Auth…');unwrapAuth(await client.auth.signUp.email({email,password,name:'Vitor'}));neonSync.email=email;neonSync.enabled=true;localStorage.setItem(N_EMAIL,email);localStorage.setItem(N_ENABLED,'1');const logged=await session();if(!logged)unwrapAuth(await client.auth.signIn.email({email,password}));status('Conta criada. Inicializando save na nuvem…','ok');await pull();bindUI();return true
  }catch(e){status(cloudError('Cadastro falhou',e),'error');return false}
}
async function signOut(){try{const client=await getClient();await client.auth.signOut()}catch{}neonSync.enabled=false;localStorage.setItem(N_ENABLED,'0');clearConflict();status('Sessão encerrada. Seus dados locais continuam neste dispositivo.');bindUI()}

async function resolveConflict(strategy){
  const c=neonSync.conflict;if(!c)return false;
  if(strategy==='remote'){
    if(!confirm('Usar a versão da nuvem neste aparelho? Alterações locais divergentes serão substituídas.'))return false;applyRemoteObj(c.remoteObj,c.remoteUpdated);status('Conflito resolvido usando a nuvem.','ok');bindUI();return true
  }
  if(strategy==='local'){
    if(!confirm('Usar a versão deste aparelho como fonte de verdade? A versão divergente da nuvem será substituída.'))return false;setBase(c.remoteRaw,c.remoteUpdated);clearConflict();const ok=await push({force:true,skipRemoteCheck:true});bindUI();return ok
  }
  if(strategy==='merge'){
    const merge=window.MyPerformanceSchedulerCore?.smartMerge;if(!merge){status('Motor de mesclagem não carregado.','error');return false}
    const merged=merge(c.localObj,c.remoteObj);neonSync.applyingRemote=true;window.dispatchEvent(new CustomEvent('my-performance-cloud-loaded',{detail:merged}));neonSync.applyingRemote=false;setBase(c.remoteRaw,c.remoteUpdated);clearConflict();localStorage.setItem(N_LOCAL_UPDATED,new Date().toISOString());const ok=await push({force:true,skipRemoteCheck:true});bindUI();if(ok)status('Conflito mesclado e salvo no Neon.','ok');return ok
  }
  return false
}
function renderConflict(actions){
  document.getElementById('cloudConflictCard')?.remove();if(!neonSync.conflict||!actions)return;const c=neonSync.conflict,box=document.createElement('div');box.id='cloudConflictCard';box.className='callout cloud-conflict';box.innerHTML=`<b>⚠ Conflito de sincronização</b><p>Este aparelho e a nuvem mudaram desde a última versão comum. Nada foi sobrescrito automaticamente.</p><small>Local: ${c.localUpdated?new Date(c.localUpdated).toLocaleString('pt-BR'):'sem data'} · Nuvem: ${c.remoteUpdated?new Date(c.remoteUpdated).toLocaleString('pt-BR'):'sem data'}</small><div class="notification-actions"><button class="btn primary" id="cloudMerge">Mesclar inteligente</button><button class="btn" id="cloudUseLocal">Usar este aparelho</button><button class="btn" id="cloudUseRemote">Usar nuvem</button></div>`;actions.insertAdjacentElement('afterend',box);document.getElementById('cloudMerge').onclick=()=>resolveConflict('merge');document.getElementById('cloudUseLocal').onclick=()=>resolveConflict('local');document.getElementById('cloudUseRemote').onclick=()=>resolveConflict('remote')
}

async function bindUI(){
  const ep=document.getElementById('cloudEndpoint'),email=document.getElementById('cloudProfile'),pw=document.getElementById('cloudKey'),en=document.getElementById('cloudEnabled');if(!ep||!email||!pw||!en)return;
  ep.value=NEON_DATA_API_URL;ep.readOnly=true;const epLabel=ep.closest('.field')?.querySelector('label');if(epLabel)epLabel.textContent='Neon Data API (configurada)';const emailLabel=email.closest('.field')?.querySelector('label');if(emailLabel)emailLabel.textContent='E-mail da conta';const pwLabel=pw.closest('.field')?.querySelector('label');if(pwLabel)pwLabel.textContent='Senha Neon Auth';email.type='email';email.placeholder='seu@email.com';email.value=neonSync.email;pw.value='';pw.placeholder='não é salva neste navegador';en.checked=neonSync.enabled;
  const login=document.getElementById('cloudSave');login.textContent='Entrar e sincronizar';const actions=login.parentElement;let signup=document.getElementById('cloudSignup');if(!signup){signup=document.createElement('button');signup.id='cloudSignup';signup.className='btn';signup.textContent='Criar conta';actions.insertBefore(signup,document.getElementById('cloudPull'))}let logout=document.getElementById('cloudLogout');if(!logout){logout=document.createElement('button');logout.id='cloudLogout';logout.className='btn';logout.textContent='Sair';actions.appendChild(logout)}
  const pullBtn=document.getElementById('cloudPull'),pushBtn=document.getElementById('cloudPush');if(pullBtn)pullBtn.textContent='Usar nuvem…';if(pushBtn)pushBtn.textContent='Usar este aparelho…';
  const auth=await session();if(auth){const user=auth.user||auth.session?.user,currentEmail=user?.email||neonSync.email;if(currentEmail){neonSync.email=currentEmail;email.value=currentEmail;localStorage.setItem(N_EMAIL,currentEmail)}status(neonSync.conflict?'Conectado, mas há conflito aguardando resolução.':`Conectado${currentEmail?' como '+currentEmail:''}. Cloud Sync ${neonSync.enabled?'ativa':'pausada'}.${neonSync.sdkSource?' SDK carregado.':''}`,neonSync.conflict?'error':'ok')}else if(neonSync.sdkErrors.length===NEON_SDK_URLS.length)status('SDK Neon ainda não carregou neste navegador. Toque em Entrar e sincronizar para tentar novamente.','error');else status('Sem login. Crie uma conta ou entre para ativar o save em nuvem.');
  login.onclick=()=>{neonSync.enabled=true;en.checked=true;signIn(email.value.trim(),pw.value)};signup.onclick=()=>{neonSync.enabled=true;en.checked=true;signUp(email.value.trim(),pw.value)};logout.onclick=signOut;en.onchange=()=>{neonSync.enabled=en.checked;localStorage.setItem(N_ENABLED,en.checked?'1':'0');status(en.checked?'Cloud Sync ativada. Faça login se necessário.':'Cloud Sync pausada.');if(en.checked)pull()};
  if(pullBtn)pullBtn.onclick=()=>{if(confirm('Aplicar explicitamente a versão da nuvem? Se houver divergência, ela substituirá a versão local.'))pull({force:true})};
  if(pushBtn)pushBtn.onclick=()=>{if(confirm('Enviar explicitamente a versão deste aparelho? Se houver divergência, ela substituirá a versão da nuvem.')){markLocal();push({force:true,skipRemoteCheck:true})}};
  renderConflict(actions)
}

window.addEventListener('my-performance-state-saved',()=>{if(!neonSync.applyingRemote){markLocal();schedulePush()}});
window.addEventListener('my-performance-view-rendered',e=>{if(e.detail?.view==='config')bindUI()});
window.MyPerformanceCloud={bindUI,pull,push,signIn,signUp,signOut,resolveConflict,status:()=>({email:neonSync.email,enabled:neonSync.enabled,lastSync:localStorage.getItem(N_LAST_SYNC),conflict:!!neonSync.conflict,sdkSource:neonSync.sdkSource,sdkErrors:neonSync.sdkErrors.slice()})};
if(neonSync.enabled)session().then(s=>{if(s)pull()});
