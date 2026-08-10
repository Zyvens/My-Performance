"use strict";
/* System notifications for the current/next mission. Web Push receiver lives in sw.js. */
(function(){
  const BASE_RENDER_CONFIG=renderConfig;
  const DEFAULTS={enabled:false,leadMin:5,persistent:true,alarmSound:true,vibrate:true};
  const NOTICE_KEY='my_performance_notified_v2';
  let ticking=false,lastCurrent='';
  function ensure(){state.notificationSettings=Object.assign({},DEFAULTS,state.notificationSettings||{})}
  ensure();
  const cfg=()=>{ensure();return state.notificationSettings};
  const supported=()=>('Notification'in window)&&('serviceWorker'in navigator);
  function sentMap(){try{return JSON.parse(localStorage.getItem(NOTICE_KEY)||'{}')}catch{return{}}}
  function markSent(k){const m=sentMap();m[k]=Date.now();const cutoff=Date.now()-3*864e5;Object.keys(m).forEach(x=>{if(m[x]<cutoff)delete m[x]});localStorage.setItem(NOTICE_KEY,JSON.stringify(m))}
  function wasSent(k){return!!sentMap()[k]}
  async function registration(){if(!supported())throw new Error('Notificações não suportadas neste navegador.');return navigator.serviceWorker.ready}
  function beep(){
    if(!cfg().alarmSound||document.hidden)return;try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const ac=new C(),o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.value=760;g.gain.setValueAtTime(.0001,ac.currentTime);g.gain.exponentialRampToValueAtTime(.18,ac.currentTime+.02);g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+.45);o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+.5);setTimeout(()=>ac.close(),800)}catch(e){}
  }
  function vibrate(){if(cfg().vibrate&&navigator.vibrate)navigator.vibrate([180,90,180,90,300])}
  async function show(title,body,tag,data={}){
    if(!cfg().enabled||Notification.permission!=='granted')return false;const reg=await registration();
    await reg.showNotification(title,{body,tag,renotify:true,requireInteraction:!!cfg().persistent,icon:'./icon.svg',badge:'./icon.svg',vibrate:cfg().vibrate?[180,90,180,90,300]:undefined,data:Object.assign({url:'./?view=today'},data),actions:[{action:'open',title:'Abrir agenda'}]});return true
  }
  function slotKey(slot,prefix){return`${prefix}:${slot.q.id}:${slot.originDate}:${slot.start}`}
  async function notifyCurrent(slot){const key=slotKey(slot,'current');if(wasSent(key)&&lastCurrent===key)return;const t=window.MyPerformanceRoutine.toTime;await show(`⚔ Missão atual · ${t(slot.start)}–${t(slot.end)}`,`${slot.q.domain} — ${slot.q.title}`,'my-performance-current',{questId:slot.q.id,originDate:slot.originDate});markSent(key);lastCurrent=key;beep();vibrate()}
  async function notifyUpcoming(slot,min){const key=slotKey(slot,'soon');if(wasSent(key))return;const t=window.MyPerformanceRoutine.toTime;await show(`⏰ Próxima missão em ${min} min`,`${t(slot.start)} · ${slot.q.title} · ${slot.q.domain}`,'my-performance-next',{questId:slot.q.id,originDate:slot.originDate});markSent(key);vibrate()}
  async function tick(){
    if(ticking||!cfg().enabled||!supported()||Notification.permission!=='granted'||!window.MyPerformanceRoutine)return;ticking=true;try{const x=window.MyPerformanceRoutine.missionNow();if(x.current)await notifyCurrent(x.current);if(x.next){const d=x.next.start-x.minute;if(d>=0&&d<=Number(cfg().leadMin||5))await notifyUpcoming(x.next,d)}}catch(e){console.warn('Mission notification',e)}finally{ticking=false}
  }
  async function enable(){
    if(!supported()){toast('Este navegador não suporta notificações do PWA');return false}
    const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();if(permission!=='granted'){cfg().enabled=false;saveState();toast('Permissão de notificação não concedida');return false}
    cfg().enabled=true;saveState();await tick();toast('Alarmes de missão ativados');return true
  }
  async function test(){if(Notification.permission!=='granted'){const ok=await enable();if(!ok)return}const x=window.MyPerformanceRoutine?.missionNow();const body=x?.current?`${x.current.q.title} · ${x.current.q.domain}`:x?.next?`Próxima: ${x.next.q.title}`:'Nenhuma missão ativa agora';await show('🧭 My Performance · teste',body,'my-performance-test');beep();vibrate()}

  renderConfig=function(){
    BASE_RENDER_CONFIG();ensure();const host=document.getElementById('view');if(!host)return;const c=cfg(),perm=supported()?Notification.permission:'unsupported';
    host.insertAdjacentHTML('beforeend',`<div class="section-title"><div><span class="eyebrow">ALARMES & NOTIFICAÇÕES</span><h2>Missão atual na tela do celular</h2><p class="muted">Mantém a missão atual/seguinte visível nas notificações do sistema e dispara lembrete antes do horário.</p></div></div><div class="card notification-settings"><div class="notification-status ${perm==='granted'?'ok':perm==='denied'?'bad':''}"><span>Permissão do sistema</span><b>${perm==='granted'?'Concedida':perm==='denied'?'Bloqueada':perm==='unsupported'?'Não suportada':'Ainda não solicitada'}</b></div><div class="form-row"><div class="field"><label>Avisar quantos minutos antes</label><input id="notifyLead" type="number" min="0" max="60" value="${Number(c.leadMin||5)}"></div><div class="field"><label>Comportamento</label><select id="notifyPersistence"><option value="1" ${c.persistent?'selected':''}>Persistente até interagir</option><option value="0" ${!c.persistent?'selected':''}>Notificação normal</option></select></div></div><label class="setting-toggle"><input id="notifyEnabled" type="checkbox" ${c.enabled?'checked':''}><span><b>Ativar missão atual nas notificações</b><small>A notificação pode aparecer na tela bloqueada conforme as permissões do Android.</small></span></label><label class="setting-toggle"><input id="notifySound" type="checkbox" ${c.alarmSound?'checked':''}><span><b>Alarme sonoro quando o PWA estiver ativo</b><small>O som do sistema da notificação continua sendo controlado pelo Android.</small></span></label><label class="setting-toggle"><input id="notifyVibrate" type="checkbox" ${c.vibrate?'checked':''}><span><b>Vibrar nos alertas</b><small>Quando o navegador/dispositivo permitir.</small></span></label><div class="notification-actions"><button class="btn primary" id="notifySave">Salvar e ativar</button><button class="btn" id="notifyTest">Testar notificação</button></div><div class="note notification-note"><b>Limite do PWA:</b> notificações exatas com o app totalmente fechado exigem Web Push enviado por um serviço/servidor. Esta versão mantém o aviso persistente, atualiza ao abrir/focar o PWA e possui o receptor de Web Push pronto no service worker.</div></div>`);
    document.getElementById('notifySave').onclick=async()=>{c.leadMin=Math.max(0,Math.min(60,Number(document.getElementById('notifyLead').value||5)));c.persistent=document.getElementById('notifyPersistence').value==='1';c.alarmSound=document.getElementById('notifySound').checked;c.vibrate=document.getElementById('notifyVibrate').checked;const wants=document.getElementById('notifyEnabled').checked;if(wants){const ok=await enable();c.enabled=ok}else c.enabled=false;saveState();render()};
    document.getElementById('notifyTest').onclick=test;
  };

  window.MyPerformanceNotifications={enable,test,tick,show,status:()=>({supported:supported(),permission:supported()?Notification.permission:'unsupported',settings:Object.assign({},cfg())})};
  setInterval(tick,30000);window.addEventListener('focus',tick);document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick()});window.addEventListener('my-performance-state-saved',()=>setTimeout(tick,250));setTimeout(tick,1200);
})();
