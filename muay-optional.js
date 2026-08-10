"use strict";
/* Muay Thai is additive to the gym session, never a replacement. Wednesday 10:00 is blocked by BNI 06:00–11:00. */
(function(){
  const BASE_RENDER_CONFIG=renderConfig;
  const DEFAULT_DAYS=[];
  const DISPLAY_DAYS=[1,3,5];
  const ALLOWED_DAYS=[1,5];
  const BLOCKED={3:'BNI fixo 06:00–11:00'};

  function ensure(){
    state.routineSettings=state.routineSettings||{};
    if(!Array.isArray(state.routineSettings.muayDays))state.routineSettings.muayDays=[...DEFAULT_DAYS];
    state.routineSettings.muayDays=[...new Set(state.routineSettings.muayDays.map(Number).filter(d=>ALLOWED_DAYS.includes(d)))].sort((a,b)=>a-b);
    state.routineSettings.muayFriday=false;
  }
  function mergeOverride(id,patch){state.overrides=state.overrides||{};state.overrides[id]=Object.assign({},state.overrides[id]||{},patch)}
  function baseGymDays(){const seed=QUEST_SEED.find(q=>q.id==='personal-gym');return Array.isArray(seed?.weekdays)?seed.weekdays:[1,2,3,4,6]}
  function activeDays(){ensure();return state.routineSettings.muayDays}

  function applyMuay(){
    ensure();const before=JSON.stringify(state.overrides||{}),days=activeDays(),enabled=days.length>0,gymDays=[...new Set(baseGymDays().concat(days))].sort((a,b)=>a-b);
    mergeOverride('personal-gym',{weekdays:gymDays,timeStart:state.routineSettings.gymStart||'06:30',durationMin:Number(state.routineSettings.gymDuration||90),fixedTime:true,essential:true});
    mergeOverride('routine-shower-post-gym',{weekdays:gymDays});
    mergeOverride('routine-gsa-focus-am',{weekdays:[1,2,3,4,5].filter(d=>!days.includes(d))});
    mergeOverride('routine-gsa-pre-muay',{weekdays:days,timeStart:'09:10',timeEnd:'09:50',durationMin:40,disabled:!enabled,description:'Sprint GSA antes do deslocamento. Só aparece nos dias em que o Muay Thai estiver ativado.'});
    mergeOverride('routine-gsa-post-muay',{weekdays:days,timeStart:'11:10',timeEnd:'12:20',durationMin:70,disabled:!enabled,description:'Retomada GSA após o Muay Thai. Só aparece nos dias em que o Muay Thai estiver ativado.'});
    mergeOverride('routine-muay-commute',{weekdays:days,timeStart:'09:50',timeEnd:'10:00',durationMin:10,disabled:!enabled,title:'Deslocamento para Muay Thai',description:'10 minutos reservados para ida. A academia de 1h30 continua acontecendo no mesmo dia.'});
    mergeOverride('routine-muay',{weekdays:days,timeStart:'10:00',timeEnd:'11:00',durationMin:60,disabled:!enabled,title:'Muay Thai — opcional',description:'Aula opcional de 1h adicionada ao treino de academia. Quarta-feira não é elegível porque o BNI ocupa 06:00–11:00.'});
    mergeOverride('routine-muay-return',{weekdays:days,timeStart:'11:00',timeEnd:'11:10',durationMin:10,disabled:!enabled,title:'Volta do Muay Thai',description:'10 minutos reservados para retorno.'});
    mergeOverride('routine-muay-friday',{disabled:true});
    return before!==JSON.stringify(state.overrides||{})
  }

  renderConfig=function(){
    BASE_RENDER_CONFIG();ensure();applyMuay();const host=document.getElementById('view');if(!host)return;const old=document.getElementById('routineMuayFriday');if(old){old.checked=false;const label=old.closest('.setting-toggle');if(label)label.style.display='none'}
    const days=activeDays(),labels={1:'Segunda',3:'Quarta',5:'Sexta'};
    host.insertAdjacentHTML('beforeend',`<div class="section-title"><div><span class="eyebrow">MUAY THAI OPCIONAL</span><h2>Treino extra, não substituição</h2><p class="muted">A academia de 1h30 continua existindo. Muay acrescenta 1h + 10 min de ida + 10 min de volta.</p></div></div><div class="card"><div class="form-row"><div><h3>Dias possíveis às 10:00</h3><div class="weekdays">${DISPLAY_DAYS.map(d=>`<button type="button" class="${days.includes(d)?'on':''}" data-muay-day="${d}" ${BLOCKED[d]?'disabled':''}>${labels[d].slice(0,3)}</button>`).join('')}</div><p class="subtle" style="margin-top:8px">${DISPLAY_DAYS.map(d=>BLOCKED[d]?`${labels[d]}: indisponível — ${BLOCKED[d]}.`:null).filter(Boolean).join(' ')||'Desligado por padrão.'}</p></div><div class="callout"><b>Carga em dia com Muay</b><br>Academia: 1h30 · Muay: 1h · deslocamento: 20 min → <b>2h50</b>.</div></div><div class="note" style="margin-top:12px">${days.length?`Ativo em: ${days.map(d=>labels[d]).join(', ')}.`:'Muay Thai desativado.'}</div></div>`);
    document.querySelectorAll('[data-muay-day]:not([disabled])').forEach(b=>b.onclick=()=>{const d=Number(b.dataset.muayDay),a=activeDays().slice(),i=a.indexOf(d);if(i>=0)a.splice(i,1);else a.push(d);state.routineSettings.muayDays=a.sort((x,y)=>x-y);applyMuay();saveState();render();toast(a.includes(d)?`${labels[d]} de Muay Thai ativada`:`${labels[d]} de Muay Thai desativada`)})
  };
  let lock=false;function reconcile(){if(lock)return;lock=true;const before=JSON.stringify(state.routineSettings?.muayDays||[]),changed=applyMuay()||before!==JSON.stringify(state.routineSettings?.muayDays||[]);if(changed)saveState();lock=false}
  reconcile();window.addEventListener('my-performance-cloud-loaded',()=>setTimeout(()=>{reconcile();render()},0));window.addEventListener('my-performance-state-saved',()=>setTimeout(reconcile,0));window.MyPerformanceMuay={activeDays,applyMuay,allowedDays:()=>[...ALLOWED_DAYS],blockedDays:()=>Object.assign({},BLOCKED)};
})();
