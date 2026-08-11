"use strict";
/* Runtime Health Guard — prevents false overload UI and exposes the exact build loaded by the browser. */
(function(){
  const BUILD=String(document.documentElement.dataset.build||'1.5.21');
  let scheduled=false;
  const duration=x=>Math.max(0,Number(x?.end||0)-Number(x?.start||0));
  const isSleep=x=>x?.q?.id==='personal-sleep'||/^(dormir|sono)$/i.test(String(x?.q?.title||'').trim());
  function health(plan){const slots=(plan?.slots||[]).filter(x=>!isSleep(x)).slice().sort((a,b)=>a.start-b.start||a.end-b.end),collisions=[];let prev=null;for(const x of slots){if(prev&&Number(x.start)<Number(prev.end))collisions.push({a:prev,b:x});if(!prev||Number(x.end)>Number(prev.end))prev=x}const awake=Math.max(0,Number(plan?.end||0)-Number(plan?.wake||0)),used=slots.reduce((n,x)=>n+duration(x),0),critical=(plan?.critical||[]).filter(x=>!isSleep(x)),realCritical=collisions.length>0||used>awake||critical.some(x=>x?.q?.fixedTime||x?.q?.commuteBlock);return{realCritical,collisions,critical,awake,used}}
  function fmtMin(n){n=Math.max(0,Math.round(Number(n)||0));return `${Math.floor(n/60)}h ${String(n%60).padStart(2,'0')}min`}
  function setText(el,text){if(el&&el.textContent!==text)el.textContent=text}
  function injectBuildBadge(){const head=document.querySelector('.planner-head');if(!head)return;let b=document.getElementById('runtimeBuildBadge');if(!b){b=document.createElement('span');b.id='runtimeBuildBadge';b.className='pill';b.title='Versão efetivamente carregada neste navegador';head.appendChild(b)}setText(b,`v${BUILD}`)}
  function clearFalseOverload(h){if(h.realCritical)return;document.querySelectorAll('#view .emergency-day').forEach(x=>x.remove());document.querySelectorAll('#view .card.danger').forEach(card=>{const text=(card.textContent||'').toLowerCase();if(text.includes('conflito crítico')||text.includes('horários protegidos')||text.includes('overload')||text.includes('conflito fixo'))card.remove()});document.querySelectorAll('.planner-stats .mini-stat').forEach(card=>{const label=(card.querySelector('span')?.textContent||'').trim();if(label!=='Capacidade')return;card.classList.remove('danger');setText(card.querySelector('b'),'Dentro da janela');setText(card.querySelector('small'),`${fmtMin(h.used)} ocupados de ${fmtMin(h.awake)}`)})}
  function check(){if(state?.view!=='today')return;let plan;try{plan=window.MyPerformanceRoutine?.planDay?.(state.plannerDate||today())}catch(e){console.error('Runtime health plan failed',e);return}const h=health(plan);injectBuildBadge();clearFalseOverload(h);window.dispatchEvent(new CustomEvent('my-performance-runtime-health',{detail:{build:BUILD,...h}}))}
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;check()})}
  window.addEventListener('my-performance-view-rendered',schedule);window.addEventListener('my-performance-cloud-loaded',()=>setTimeout(schedule,50));window.addEventListener('pageshow',schedule);document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});setTimeout(schedule,120);window.MyPerformanceRuntimeHealth={BUILD,check,health};
})();
