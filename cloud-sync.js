"use strict";

const NEON_AUTH_URL='https://ep-fancy-wave-a6thlzk9.neonauth.us-west-2.aws.neon.tech/neondb/auth';
const NEON_DATA_API_URL='https://ep-fancy-wave-a6thlzk9.apirest.us-west-2.aws.neon.tech/neondb/rest/v1';
const NEON_SDK_URL='https://esm.sh/@neondatabase/neon-js@0.6.3-beta?bundle';
const N_EMAIL='my_performance_neon_email';
const N_ENABLED='my_performance_neon_enabled';
const N_LAST_SYNC='my_performance_neon_last_sync';
const N_LOCAL_UPDATED='my_performance_local_updated';
const N_STATE_KEY='my_performance_v1';

// Remove legacy credentials from the previous sync-key implementation.
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
  clientPromise:null
};

function status(msg,kind=''){
  const e=document.getElementById('cloudStatus');
  if(!e)return;
  e.textContent=msg;
  e.style.color=kind==='ok'?'var(--green)':kind==='error'?'var(--red)':'var(--muted2)';
}

async function getClient(){
  if(!neonSync.clientPromise){
    neonSync.clientPromise=import(NEON_SDK_URL).then(({createClient})=>createClient({
      auth:{url:NEON_AUTH_URL},
      dataApi:{url:NEON_DATA_API_URL}
    }));
  }
  return neonSync.clientPromise;
}

function unwrapAuth(result){
  if(result?.error)throw new Error(result.error.message||result.error.statusText||'Falha de autenticação.');
  return result?.data??result;
}
function unpack(x){return Array.isArray(x)?x[0]:x}
function markLocal(){localStorage.setItem(N_LOCAL_UPDATED,new Date().toISOString())}
function isLater(a,b){if(!a)return false;if(!b)return true;return new Date(a).getTime()>new Date(b).getTime()}

async function session(){
  try{
    const client=await getClient();
    const raw=await client.auth.getSession();
    const data=unwrapAuth(raw);
    return data?.session||data?.user?data:null;
  }catch{return null}
}

async function rpc(name,args={}){
  const client=await getClient();
  const result=await client.rpc(name,args);
  if(result?.error)throw new Error(result.error.message||`Falha em ${name}`);
  return result?.data;
}

async function push({force=false}={}){
  if(!neonSync.enabled||neonSync.syncing)return false;
  const auth=await session();
  if(!auth){status('Entre na sua conta Neon para sincronizar.','error');return false}
  const raw=localStorage.getItem(N_STATE_KEY)||'';
  if(!raw)return false;
  if(!force&&raw===neonSync.lastSnapshot)return false;
  neonSync.syncing=true;
  status('Salvando no Neon…');
  try{
    const out=unpack(await rpc('my_performance_push',{p_state:JSON.parse(raw)}));
    const stamp=out?.updated_at||out?.updatedAt||new Date().toISOString();
    neonSync.lastSnapshot=raw;
    localStorage.setItem(N_LAST_SYNC,stamp);
    localStorage.setItem(N_LOCAL_UPDATED,stamp);
    status(`Neon sincronizado · ${new Date(stamp).toLocaleString('pt-BR')}`,'ok');
    return true;
  }catch(e){
    status(`Cloud indisponível · ${e.message}`,'error');
    return false;
  }finally{neonSync.syncing=false}
}

async function pull({force=false}={}){
  if(!neonSync.enabled||neonSync.syncing)return false;
  const auth=await session();
  if(!auth){status('Entre na sua conta Neon para sincronizar.','error');return false}
  neonSync.syncing=true;
  status('Baixando do Neon…');
  try{
    const out=unpack(await rpc('my_performance_pull'));
    const local=localStorage.getItem(N_STATE_KEY)||'{}';
    if(!out?.found){
      neonSync.syncing=false;
      status('Primeiro acesso — criando seu save na nuvem…');
      return push({force:true});
    }
    const remoteObj=out.state||{},remote=JSON.stringify(remoteObj),remoteUpdated=out.updated_at||out.updatedAt||'',localUpdated=localStorage.getItem(N_LOCAL_UPDATED)||'';
    if(Object.keys(remoteObj).length===0&&local!=='{}'){
      neonSync.syncing=false;
      status('Cloud vazia — enviando este dispositivo…');
      return push({force:true});
    }
    if(!force&&isLater(localUpdated,remoteUpdated)&&local!==remote){
      neonSync.syncing=false;
      return push({force:true});
    }
    if(force||remote!==local){
      neonSync.applyingRemote=true;
      localStorage.setItem(N_STATE_KEY,remote);
      neonSync.lastSnapshot=remote;
      const stamp=remoteUpdated||new Date().toISOString();
      localStorage.setItem(N_LAST_SYNC,stamp);
      localStorage.setItem(N_LOCAL_UPDATED,stamp);
      window.dispatchEvent(new CustomEvent('my-performance-cloud-loaded',{detail:remoteObj}));
      setTimeout(()=>neonSync.applyingRemote=false,350);
    }
    status(`PC/celular sincronizados · ${new Date(remoteUpdated||Date.now()).toLocaleString('pt-BR')}`,'ok');
    return true;
  }catch(e){
    status(`Cloud indisponível · ${e.message}`,'error');
    return false;
  }finally{neonSync.syncing=false}
}

function schedulePush(){
  if(!neonSync.enabled||neonSync.applyingRemote)return;
  clearTimeout(neonSync.timer);
  neonSync.timer=setTimeout(()=>push(),900);
}

async function signIn(email,password){
  if(!email||!password){status('Informe e-mail e senha.','error');return false}
  status('Entrando no Neon Auth…');
  try{
    const client=await getClient();
    unwrapAuth(await client.auth.signIn.email({email,password}));
    neonSync.email=email;
    neonSync.enabled=true;
    localStorage.setItem(N_EMAIL,email);
    localStorage.setItem(N_ENABLED,'1');
    status('Login realizado. Sincronizando…','ok');
    await pull();
    bindUI();
    return true;
  }catch(e){status(`Login falhou · ${e.message}`,'error');return false}
}

async function signUp(email,password){
  if(!email||!password){status('Informe e-mail e senha.','error');return false}
  if(password.length<8){status('Use uma senha com pelo menos 8 caracteres.','error');return false}
  status('Criando sua conta Neon Auth…');
  try{
    const client=await getClient();
    unwrapAuth(await client.auth.signUp.email({email,password,name:'Vitor'}));
    neonSync.email=email;
    neonSync.enabled=true;
    localStorage.setItem(N_EMAIL,email);
    localStorage.setItem(N_ENABLED,'1');
    const logged=await session();
    if(!logged)unwrapAuth(await client.auth.signIn.email({email,password}));
    status('Conta criada. Criando seu save na nuvem…','ok');
    await pull();
    bindUI();
    return true;
  }catch(e){status(`Cadastro falhou · ${e.message}`,'error');return false}
}

async function signOut(){
  try{const client=await getClient();await client.auth.signOut()}catch{}
  neonSync.enabled=false;
  localStorage.setItem(N_ENABLED,'0');
  status('Sessão encerrada. Seus dados locais continuam neste dispositivo.');
  bindUI();
}

async function bindUI(){
  const ep=document.getElementById('cloudEndpoint'),email=document.getElementById('cloudProfile'),pw=document.getElementById('cloudKey'),en=document.getElementById('cloudEnabled');
  if(!ep||!email||!pw||!en)return;

  ep.value=NEON_DATA_API_URL;
  ep.readOnly=true;
  const epLabel=ep.closest('.field')?.querySelector('label');if(epLabel)epLabel.textContent='Neon Data API (configurada)';
  const emailLabel=email.closest('.field')?.querySelector('label');if(emailLabel)emailLabel.textContent='E-mail da conta';
  const pwLabel=pw.closest('.field')?.querySelector('label');if(pwLabel)pwLabel.textContent='Senha Neon Auth';
  email.type='email';email.placeholder='seu@email.com';email.value=neonSync.email;
  pw.value='';pw.placeholder='não é salva neste navegador';
  en.checked=neonSync.enabled;

  const login=document.getElementById('cloudSave');
  login.textContent='Entrar e sincronizar';
  const actions=login.parentElement;
  let signup=document.getElementById('cloudSignup');
  if(!signup){signup=document.createElement('button');signup.id='cloudSignup';signup.className='btn';signup.textContent='Criar conta';actions.insertBefore(signup,document.getElementById('cloudPull'))}
  let logout=document.getElementById('cloudLogout');
  if(!logout){logout=document.createElement('button');logout.id='cloudLogout';logout.className='btn';logout.textContent='Sair';actions.appendChild(logout)}

  const auth=await session();
  if(auth){
    const user=auth.user||auth.session?.user;
    const currentEmail=user?.email||neonSync.email;
    if(currentEmail){neonSync.email=currentEmail;email.value=currentEmail;localStorage.setItem(N_EMAIL,currentEmail)}
    status(`Conectado${currentEmail?' como '+currentEmail:''}. Cloud Sync ${neonSync.enabled?'ativa':'pausada'}.`,'ok');
  }else status('Sem login. Crie uma conta ou entre para ativar o save em nuvem.');

  login.onclick=()=>{neonSync.enabled=en.checked||true;en.checked=true;signIn(email.value.trim(),pw.value)};
  signup.onclick=()=>{neonSync.enabled=true;en.checked=true;signUp(email.value.trim(),pw.value)};
  logout.onclick=signOut;
  en.onchange=()=>{neonSync.enabled=en.checked;localStorage.setItem(N_ENABLED,en.checked?'1':'0');status(en.checked?'Cloud Sync ativada. Faça login se necessário.':'Cloud Sync pausada.');if(en.checked)pull()};
  document.getElementById('cloudPull').onclick=()=>pull({force:true});
  document.getElementById('cloudPush').onclick=()=>{markLocal();push({force:true})};
}

window.addEventListener('my-performance-state-saved',()=>{if(!neonSync.applyingRemote){markLocal();schedulePush()}});
window.addEventListener('my-performance-view-rendered',e=>{if(e.detail?.view==='config')bindUI()});
window.MyPerformanceCloud={bindUI,pull,push,signIn,signUp,signOut,status:()=>({email:neonSync.email,enabled:neonSync.enabled,lastSync:localStorage.getItem(N_LAST_SYNC)})};

if(neonSync.enabled)session().then(s=>{if(s)pull()});
