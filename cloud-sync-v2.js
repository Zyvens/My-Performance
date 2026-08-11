"use strict";
/* Neon Cloud Sync V2 — uses the currently published neon-js browser SDK and reports auth/sync states precisely. */
(function(){
  const SDK_VERSION='0.6.2-beta';
  const AUTH_URL='https://ep-fancy-wave-a6thlzk9.neonauth.us-west-2.aws.neon.tech/neondb/auth';
  const DATA_URL='https://ep-fancy-wave-a6thlzk9.apirest.us-west-2.aws.neon.tech/neondb/rest/v1';
  const SDK_URLS=[
    `https://cdn.jsdelivr.net/npm/@neondatabase/neon-js@${SDK_VERSION}/+esm`,
    `https://esm.sh/@neondatabase/neon-js@${SDK_VERSION}?bundle`,
    `https://unpkg.com/@neondatabase/neon-js@${SDK_VERSION}/dist/index.js?module`
  ];
  const STATE_KEY='my_performance_v1',EMAIL_KEY='my_performance_neon_email',ENABLED_KEY='my_performance_neon_enabled',BASE_KEY='my_performance_neon_base_snapshot',LAST_KEY='my_performance_neon_last_sync';
  const sync={email:localStorage.getItem(EMAIL_KEY)||'',enabled:localStorage.getItem(ENABLED_KEY)==='1',clientPromise:null,sdkSource:'',sdkErrors:[],busy:false,timer:null,applying:false,conflict:null};

  const text=e=>String(e?.message||e?.error?.message||e||'erro desconhecido');
  const status=(msg,kind='')=>{const el=document.getElementById('cloudStatus');if(el){el.textContent=msg;el.style.color=kind==='ok'?'var(--green)':kind==='error'?'var(--red)':'var(--muted2)'}sync.lastStatus=msg};
  function unwrap(r){if(r?.error)throw new Error(r.error.message||r.error.statusText||'Falha Neon');return r?.data??r}
  function meaningful(o={}){return !!(Object.keys(o.completed||{}).length||Object.keys(o.xpLedger||{}).length||(o.customQuests||[]).length||(o.timeTracking?.entries||[]).length)}
  function rawLocal(){return localStorage.getItem(STATE_KEY)||JSON.stringify(state||{})}
  function setBase(raw,stamp=''){localStorage.setItem(BASE_KEY,raw||'');if(stamp)localStorage.setItem(LAST_KEY,stamp)}

  async function loadSdk(){
    const errors=[];
    for(const url of SDK_URLS){
      try{const mod=await import(url);if(typeof mod?.createClient!=='function')throw new Error('createClient ausente no módulo');sync.sdkSource=url;sync.sdkErrors=errors;return mod}catch(e){errors.push(`${url} → ${text(e)}`)}
    }
    sync.sdkErrors=errors;throw new Error(`SDK Neon ${SDK_VERSION} não carregou. ${errors.join(' | ')}`)
  }
  async function client(){if(!sync.clientPromise)sync.clientPromise=loadSdk().then(m=>m.createClient({auth:{url:AUTH_URL},dataApi:{url:DATA_URL}})).catch(e=>{sync.clientPromise=null;throw e});return sync.clientPromise}
  async function session(){const c=await client();const r=unwrap(await c.auth.getSession());return r?.session||r?.user?r:null}
  async function rpc(name,args={}){const c=await client(),r=await c.rpc(name,args);return unwrap(r)}
  const first=x=>Array.isArray(x)?x[0]:x;

  function replaceState(obj,stamp=''){
    sync.applying=true;
    const next=JSON.parse(JSON.stringify(obj||{}));
    for(const k of Object.keys(state))delete state[k];Object.assign(state,next);
    const raw=JSON.stringify(state);localStorage.setItem(STATE_KEY,raw);setBase(raw,stamp||new Date().toISOString());
    window.dispatchEvent(new CustomEvent('my-performance-cloud-loaded',{detail:state}));
    try{render()}catch{}
    setTimeout(()=>{sync.applying=false},50)
  }
  function conflict(localObj,remoteObj,remoteUpdated=''){
    sync.conflict={localObj,remoteObj,remoteUpdated};status('Conflito de sincronização: escolha Mesclar, este aparelho ou nuvem.','error');renderConflict();return false
  }
  function renderConflict(){
    document.getElementById('cloudConflictCardV2')?.remove();if(!sync.conflict)return;const anchor=document.getElementById('cloudStatus');if(!anchor)return;
    const box=document.createElement('div');box.id='cloudConflictCardV2';box.className='callout cloud-conflict';box.innerHTML='<b>⚠ Conflito de sincronização</b><p>Há mudanças diferentes neste aparelho e na nuvem.</p><div class="notification-actions"><button class="btn primary" id="cloudMergeV2">Mesclar inteligente</button><button class="btn" id="cloudLocalV2">Usar este aparelho</button><button class="btn" id="cloudRemoteV2">Usar nuvem</button></div>';anchor.insertAdjacentElement('afterend',box);
    document.getElementById('cloudMergeV2').onclick=()=>resolve('merge');document.getElementById('cloudLocalV2').onclick=()=>resolve('local');document.getElementById('cloudRemoteV2').onclick=()=>resolve('remote')
  }
  async function resolve(mode){const c=sync.conflict;if(!c)return false;if(mode==='remote'){replaceState(c.remoteObj,c.remoteUpdated);sync.conflict=null;status('Nuvem aplicada neste aparelho.','ok');return true}if(mode==='local'){sync.conflict=null;return push(true)}const merge=window.MyPerformanceSchedulerCore?.smartMerge;if(!merge){status('Motor de mesclagem não disponível.','error');return false}const merged=merge(c.localObj,c.remoteObj);replaceState(merged,c.remoteUpdated);sync.conflict=null;return push(true)}

  async function pull(force=false){
    if(sync.busy)return false;sync.busy=true;status('Consultando Neon…');
    try{
      const auth=await session();if(!auth){status('Sem sessão Neon — entre ou crie uma conta.');return false}
      const out=first(await rpc('my_performance_pull'))||{};const localRaw=rawLocal(),localObj=JSON.parse(localRaw||'{}');
      if(!out.found){status('Primeiro acesso — criando seu save na nuvem…');sync.busy=false;return push(true)}
      const remoteObj=out.state||{},remoteRaw=JSON.stringify(remoteObj),stamp=out.updated_at||out.updatedAt||new Date().toISOString();
      if(force||!meaningful(localObj)&&meaningful(remoteObj)){replaceState(remoteObj,stamp);status('Save da nuvem carregado.','ok');return true}
      if(meaningful(localObj)&&!meaningful(remoteObj)){sync.busy=false;return push(true)}
      if(localRaw===remoteRaw){setBase(localRaw,stamp);status(`Neon sincronizado · ${new Date(stamp).toLocaleString('pt-BR')}`,'ok');return true}
      const base=localStorage.getItem(BASE_KEY)||'';
      if(base&&localRaw===base){replaceState(remoteObj,stamp);status('Alterações da nuvem aplicadas.','ok');return true}
      if(base&&remoteRaw===base){sync.busy=false;return push(true)}
      return conflict(localObj,remoteObj,stamp)
    }catch(e){status(`Neon indisponível no navegador · ${text(e)}`,'error');return false}finally{sync.busy=false}
  }
  async function push(force=false){
    if(sync.busy)return false;sync.busy=true;status('Enviando save ao Neon…');
    try{
      const auth=await session();if(!auth){status('Sem sessão Neon — entre ou crie uma conta.');return false}
      const raw=rawLocal(),obj=JSON.parse(raw||'{}');
      if(!force){const out=first(await rpc('my_performance_pull'))||{};if(out.found){const remoteRaw=JSON.stringify(out.state||{}),base=localStorage.getItem(BASE_KEY)||'';if(remoteRaw!==raw&&base&&remoteRaw!==base&&raw!==base)return conflict(obj,out.state||{},out.updated_at||'')}}
      const out=first(await rpc('my_performance_push',{p_state:obj}))||{},stamp=out.updated_at||out.updatedAt||new Date().toISOString();setBase(raw,stamp);sync.conflict=null;document.getElementById('cloudConflictCardV2')?.remove();status(`Neon sincronizado · ${new Date(stamp).toLocaleString('pt-BR')}`,'ok');return true
    }catch(e){status(`Falha ao salvar no Neon · ${text(e)}`,'error');return false}finally{sync.busy=false}
  }
  function schedulePush(){if(!sync.enabled||sync.applying||sync.conflict)return;clearTimeout(sync.timer);sync.timer=setTimeout(()=>push(false),1000)}

  async function signIn(email,password){if(!email||!password){status('Informe e-mail e senha.','error');return false}status('Entrando no Neon Auth…');try{const c=await client();unwrap(await c.auth.signIn.email({email,password}));sync.email=email;sync.enabled=true;localStorage.setItem(EMAIL_KEY,email);localStorage.setItem(ENABLED_KEY,'1');status('Login realizado. Sincronizando…','ok');await pull();await bindUI();return true}catch(e){status(`Login Neon falhou · ${text(e)}`,'error');return false}}
  async function signUp(email,password){if(!email||!password){status('Informe e-mail e senha.','error');return false}if(password.length<8){status('Use uma senha com pelo menos 8 caracteres.','error');return false}status('Criando conta no Neon Auth…');try{const c=await client();unwrap(await c.auth.signUp.email({email,password,name:state?.name||'Vitor'}));sync.email=email;sync.enabled=true;localStorage.setItem(EMAIL_KEY,email);localStorage.setItem(ENABLED_KEY,'1');let s=null;try{s=await session()}catch{}if(!s)unwrap(await c.auth.signIn.email({email,password}));status('Conta Neon criada. Enviando save local…','ok');await push(true);await bindUI();return true}catch(e){status(`Cadastro Neon falhou · ${text(e)}`,'error');return false}}
  async function signOut(){try{const c=await client();await c.auth.signOut()}catch{}sync.enabled=false;localStorage.setItem(ENABLED_KEY,'0');status('Sessão Neon encerrada. Os dados locais foram mantidos.');await bindUI()}

  async function bindUI(){
    const ep=document.getElementById('cloudEndpoint'),email=document.getElementById('cloudProfile'),pw=document.getElementById('cloudKey'),en=document.getElementById('cloudEnabled'),login=document.getElementById('cloudSave');if(!ep||!email||!pw||!en||!login)return;
    ep.value=DATA_URL;ep.readOnly=true;const epLabel=ep.closest('.field')?.querySelector('label');if(epLabel)epLabel.textContent='Neon Data API';
    const el=email.closest('.field')?.querySelector('label');if(el)el.textContent='E-mail da conta';email.type='email';email.value=sync.email;email.placeholder='seu@email.com';
    const pl=pw.closest('.field')?.querySelector('label');if(pl)pl.textContent='Senha Neon Auth';pw.value='';pw.placeholder='não é salva';en.checked=sync.enabled;
    login.textContent='Entrar e sincronizar';login.onclick=()=>signIn(email.value.trim(),pw.value);
    const actions=login.parentElement;let signup=document.getElementById('cloudSignupV2');if(!signup){signup=document.createElement('button');signup.id='cloudSignupV2';signup.className='btn';signup.textContent='Criar conta';actions.insertBefore(signup,document.getElementById('cloudPull'))}signup.onclick=()=>signUp(email.value.trim(),pw.value);
    const pullBtn=document.getElementById('cloudPull'),pushBtn=document.getElementById('cloudPush');if(pullBtn){pullBtn.textContent='Baixar nuvem';pullBtn.onclick=()=>pull(true)}if(pushBtn){pushBtn.textContent='Enviar este aparelho';pushBtn.onclick=()=>push(true)}
    let logout=document.getElementById('cloudLogoutV2');if(!logout){logout=document.createElement('button');logout.id='cloudLogoutV2';logout.className='btn';logout.textContent='Sair';actions.appendChild(logout)}logout.onclick=signOut;
    en.onchange=()=>{sync.enabled=en.checked;localStorage.setItem(ENABLED_KEY,en.checked?'1':'0');if(en.checked)status('Sync ativado. Entre na conta para sincronizar.');else status('Sync automático desativado. Dados continuam locais.')};
    try{const s=await session();if(s){const user=s.user||s.session?.user||{};sync.email=user.email||sync.email;email.value=sync.email;sync.enabled=true;en.checked=true;localStorage.setItem(EMAIL_KEY,sync.email);localStorage.setItem(ENABLED_KEY,'1');const last=localStorage.getItem(LAST_KEY);status(last?`Conectado ao Neon · última sync ${new Date(last).toLocaleString('pt-BR')}`:'Conectado ao Neon · pronto para sincronizar','ok')}else status('Sem sessão Neon — entre ou crie uma conta.')}
    catch(e){status(`SDK/Neon não carregou · ${text(e)}`,'error')}
    renderConflict()
  }

  window.addEventListener('my-performance-state-saved',schedulePush);
  window.addEventListener('my-performance-view-rendered',()=>{if(state.view==='config')setTimeout(bindUI,0)});
  setTimeout(async()=>{if(sync.enabled){try{if(await session())await pull()}catch(e){console.warn('Neon startup',e)}}},800);
  window.MyPerformanceCloud={version:2,sdkVersion:SDK_VERSION,authUrl:AUTH_URL,dataUrl:DATA_URL,bindUI,pull,push,signIn,signUp,signOut,session,status:()=>({enabled:sync.enabled,email:sync.email,sdkSource:sync.sdkSource,sdkErrors:sync.sdkErrors,lastStatus:sync.lastStatus,conflict:!!sync.conflict})};
})();
