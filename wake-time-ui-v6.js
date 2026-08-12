"use strict";
/* Wake Time UI V6 — explicit Sao Paulo wake-time input for the Day Frame. */
(function(){
  const Clock=window.MyPerformanceClock,Frame=window.MyPerformanceDayFrame;
  if(!Clock||!Frame)return;
  const escHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function close(){const root=document.getElementById('modal');if(root)root.innerHTML='';document.body.classList.remove('modal-open')}
  function minuteOf(value){const m=String(value||'').match(/^(\d{2}):(\d{2})$/);if(!m)return null;const h=Number(m[1]),n=Number(m[2]);return h>=0&&h<=23&&n>=0&&n<=59?h*60+n:null}
  function openWake(date){
    if(date!==Clock.today())return;
    const root=document.getElementById('modal');if(!root)return;
    const current=Clock.time();
    root.innerHTML=`<div class="modal-backdrop" data-wake-modal><div class="modal-card calendar-modal" role="dialog" aria-modal="true" aria-labelledby="wakeTimeTitle"><button class="modal-close" data-wake-close>×</button><span class="eyebrow">INÍCIO REAL DO DIA</span><h2 id="wakeTimeTitle">Que horas você acordou?</h2><p class="muted">Informe o horário real em São Paulo. O período anterior ficará indisponível e o Planner reorganizará somente o restante do dia.</p><div class="field"><label>Horário em que despertou</label><input id="actualWakeTimeV6" type="time" step="60" value="${escHtml(current)}"></div><div class="callout"><b>Como o Planner vai agir</b><p>Missões móveis que ficaram antes desse horário serão reavaliadas. Eventos mantêm seus horários. Deadlines não são alterados.</p></div><div class="modal-actions"><button class="btn" data-wake-cancel>Cancelar</button><button class="btn primary" data-wake-save>Registrar e replanejar</button></div></div></div>`;
    document.body.classList.add('modal-open');
    const input=root.querySelector('#actualWakeTimeV6');input?.focus();
    const dismiss=()=>close();root.querySelector('[data-wake-close]')?.addEventListener('click',dismiss);root.querySelector('[data-wake-cancel]')?.addEventListener('click',dismiss);root.querySelector('[data-wake-modal]')?.addEventListener('click',e=>{if(e.target===e.currentTarget)dismiss()});
    root.querySelector('[data-wake-save]')?.addEventListener('click',()=>{
      const minute=minuteOf(input?.value),now=Clock.minutesNow();
      if(minute===null){toast('Informe um horário válido.');return}
      if(minute>now){toast('O horário de despertar não pode estar no futuro.');return}
      if(!Frame.wakeNow(date,minute)){toast('Não foi possível registrar o horário.');return}
      window.MyPerformancePlannerEngine?.invalidate?.();close();toast(`Acordar registrado às ${input.value}; o restante do dia foi replanejado.`);render()
    });
  }
  function patch(){
    if(state?.view!=='today')return;
    const old=document.querySelector('[data-wake-now]');if(!old||old.dataset.wakeV6)return;
    const btn=old.cloneNode(true);btn.dataset.wakeV6='1';btn.textContent='☀ Acordei';old.replaceWith(btn);
    btn.addEventListener('click',()=>openWake(state.plannerDate||Clock.today()));
  }
  window.addEventListener('my-performance-view-rendered',()=>requestAnimationFrame(patch));setTimeout(patch,0);
  window.MyPerformanceWakeTimeUI={VERSION:6,openWake,minuteOf,patch};
})();
