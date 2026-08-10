"use strict";
/* Local voice narrator — speaks the live plan without external AI or API keys. */
(function(){
  const BASE_RENDER_CONFIG=renderConfig;
  const DEFAULTS={enabled:false,voiceURI:'',rate:1,pitch:1,volume:0.9,style:'rpg',missionChanges:true,completions:true,replans:true,procrastination:true,morningBrief:true,eveningDebrief:true,quietStart:'22:00',quietEnd:'06:00'};
  let lastMission='',lastCompleted=new Set(Object.keys(state.completed||{})),speaking=false,interactionReady=false;
  const K_BRIEF='my_performance_narrator_briefed',K_DEBRIEF='my_performance_narrator_debriefed';

  function ensure(){state.narratorSettings=Object.assign({},DEFAULTS,state.narratorSettings||{})}
  ensure();
  const cfg=()=>{ensure();return state.narratorSettings};
  const supported=()=>('speechSynthesis'in window)&&('SpeechSynthesisUtterance'in window);
  const mins=t=>{const[h,m]=(t||'00:00').split(':').map(Number);return h*60+m};
  function quiet(){const c=cfg(),now=new Date(),n=now.getHours()*60+now.getMinutes(),a=mins(c.quietStart),b=mins(c.quietEnd);return a>b?(n>=a||n<b):(n>=a&&n<b)}
  function voices(){return supported()?speechSynthesis.getVoices().slice().sort((a,b)=>{const ap=/^pt(-BR)?/i.test(a.lang)?0:1,bp=/^pt(-BR)?/i.test(b.lang)?0:1;return ap-bp||a.name.localeCompare(b.name)}):[]}
  function selectedVoice(){const vs=voices(),c=cfg();return vs.find(v=>v.voiceURI===c.voiceURI)||vs.find(v=>/^pt-BR$/i.test(v.lang))||vs.find(v=>/^pt/i.test(v.lang))||vs[0]||null}
  function styleText(kind,data={}){
    const style=cfg().style;
    if(kind==='current'){
      if(style==='calm')return`Agora é hora de ${data.title}. Você tem até ${data.end}. Faça apenas esta missão por vez.`;
      if(style==='focus')return`Missão atual: ${data.title}. Janela até ${data.end}. Foque no próximo passo.`;
      return`Missão ativa. ${data.title}. Você tem até ${data.end}. Concentre-se nesta quest e deixe o restante comigo.`
    }
    if(kind==='complete'){
      if(style==='calm')return`${data.title} concluída. Bom. A agenda continua sem pressa desnecessária.`;
      if(style==='focus')return`${data.title} concluída. Próximo objetivo disponível no cronograma.`;
      return`Quest concluída: ${data.title}. Progresso registrado. Vamos para a próxima.`
    }
    if(kind==='replan')return style==='rpg'?`Cronograma recalculado. ${data.sessions} sessões futuras redistribuídas. Suas prioridades principais continuam protegidas.`:`Calendário recalculado. ${data.sessions} sessões foram redistribuídas sem alterar as âncoras essenciais.`;
    if(kind==='procrastination')return`Atenção: ${data.title} ficou abaixo do ritmo esperado. Eu redistribuí ${data.behindMin||0} minutos pendentes ao longo dos próximos dias, sem empilhar cópias da tarefa.`;
    return''
  }
  function say(text,{force=false,interrupt=true}={}){
    ensure();if(!text||!supported()||(!cfg().enabled&&!force)||(!force&&(document.hidden||quiet())))return false;
    if(!interactionReady&&!force){pending.push(text);return false}if(interrupt)speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text),v=selectedVoice();if(v)u.voice=v;u.lang=v?.lang||'pt-BR';u.rate=Number(cfg().rate||1);u.pitch=Number(cfg().pitch||1);u.volume=Number(cfg().volume??.9);u.onstart=()=>speaking=true;u.onend=u.onerror=()=>speaking=false;speechSynthesis.speak(u);return true
  }
  const pending=[];
  function unlock(){if(interactionReady)return;interactionReady=true;if(cfg().enabled&&pending.length){const text=pending.splice(0).join(' ');say(text,{interrupt:true})}}
  ['pointerdown','keydown','touchstart'].forEach(e=>window.addEventListener(e,unlock,{once:true,passive:true}));

  function briefingText(){
    const plan=window.MyPerformanceRoutine?.planDay?.(today()),slots=plan?.slots||[],open=slots.filter(x=>!done(x.q,x.originDate)),mains=open.filter(x=>x.q.questType==='main'),p=state.routineSettings?.domainPriority||['GSA','Estudos','Pessoal'];const first=open[0];
    let text=`Bom dia. O sistema está rodando desde dez de agosto. Hoje há ${open.length} missões abertas, sendo ${mains.length} Main Quests. A prioridade das campanhas é ${p.slice(0,3).join(', depois ')}.`;
    if(first)text+=` A primeira missão é ${first.q.title}, às ${window.MyPerformanceRoutine.toTime(first.start)}.`;
    const alerts=window.MyPerformanceAdaptive?.alerts?.()||[];if(alerts.length)text+=` Há ${alerts.length} meta${alerts.length>1?'s':''} pedindo recuperação progressiva, e o calendário já foi redistribuído.`;return text
  }
  function debriefText(){
    const plan=window.MyPerformanceRoutine?.planDay?.(today()),slots=plan?.slots||[],doneN=slots.filter(x=>done(x.q,x.originDate)).length,total=slots.length,mains=slots.filter(x=>x.q.questType==='main'),mainDone=mains.filter(x=>done(x.q,x.originDate)).length;
    return`Fechamento do dia. Você concluiu ${doneN} de ${total} missões e ${mainDone} de ${mains.length} Main Quests. O que não coube foi replanejado sem ultrapassar o horário de descanso. Amanhã o sistema recalcula novamente.`
  }
  function speakBriefing(force=false){const ok=say(briefingText(),{force});if(ok||force)localStorage.setItem(K_BRIEF,today())}
  function speakDebrief(force=false){const ok=say(debriefText(),{force});if(ok||force)localStorage.setItem(K_DEBRIEF,today())}
  function missionTick(){if(!cfg().enabled||!cfg().missionChanges||!window.MyPerformanceRoutine)return;const x=window.MyPerformanceRoutine.missionNow();if(!x.current)return;const key=`${x.current.q.id}:${x.current.originDate}:${x.current.start}`;if(key===lastMission)return;lastMission=key;say(styleText('current',{title:x.current.q.title,end:window.MyPerformanceRoutine.toTime(x.current.end)}))}
  function completionTick(){const current=new Set(Object.keys(state.completed||{})),added=[...current].filter(k=>!lastCompleted.has(k));lastCompleted=current;if(!cfg().enabled||!cfg().completions||!added.length)return;const key=added[added.length-1],id=key.split('@')[0],q=questById(id);if(q)say(styleText('complete',{title:q.title}),{interrupt:false})}
  function dailyTick(){if(!cfg().enabled)return;const now=new Date(),minute=now.getHours()*60+now.getMinutes();if(cfg().morningBrief&&minute>=mins(state.routineSettings?.wakeTime||'06:00')&&minute<10*60&&localStorage.getItem(K_BRIEF)!==today())speakBriefing();if(cfg().eveningDebrief&&minute>=21*60+30&&minute<mins(state.routineSettings?.sleepTime||'22:00')&&localStorage.getItem(K_DEBRIEF)!==today())speakDebrief()}
  function addQuickButton(){let b=document.getElementById('narratorQuick');if(b)return;const host=document.querySelector('.top-actions');if(!host)return;b=document.createElement('button');b.id='narratorQuick';b.className='btn narrator-quick';b.textContent='🔊';b.title='Narrar missão atual';b.onclick=()=>{unlock();const x=window.MyPerformanceRoutine?.missionNow();if(x?.current)say(styleText('current',{title:x.current.q.title,end:window.MyPerformanceRoutine.toTime(x.current.end)}),{force:true});else speakBriefing(true)};host.insertBefore(b,document.getElementById('quickAdd'))}
  function voiceOptions(){const vs=voices(),chosen=cfg().voiceURI;return vs.map(v=>`<option value="${esc(v.voiceURI)}" ${v.voiceURI===chosen?'selected':''}>${esc(v.name)} · ${esc(v.lang)}</option>`).join('')||'<option value="">Voz padrão do dispositivo</option>'}
  function refreshVoiceSelect(){const e=document.getElementById('narratorVoice');if(e)e.innerHTML=voiceOptions()}

  renderConfig=function(){
    BASE_RENDER_CONFIG();ensure();const host=document.getElementById('view'),c=cfg();if(!host)return;host.insertAdjacentHTML('beforeend',`<div class="section-title"><div><span class="eyebrow">NARRADOR</span><h2>A agenda fala com você</h2><p class="muted">Usa a voz nativa do aparelho. Nenhuma chave de IA é necessária para o Narrador.</p></div></div><div class="grid2"><div class="card narrator-settings"><label class="setting-toggle"><input id="narratorEnabled" type="checkbox" ${c.enabled?'checked':''}><span><b>Ativar Narrador</b><small>Fala missão atual, transições e eventos selecionados abaixo.</small></span></label><div class="field"><label>Voz</label><select id="narratorVoice">${voiceOptions()}</select></div><div class="form-row"><div class="field"><label>Velocidade · <span id="narratorRateVal">${Number(c.rate).toFixed(1)}×</span></label><input id="narratorRate" type="range" min="0.7" max="1.5" step="0.1" value="${c.rate}"></div><div class="field"><label>Tom · <span id="narratorPitchVal">${Number(c.pitch).toFixed(1)}</span></label><input id="narratorPitch" type="range" min="0.7" max="1.4" step="0.1" value="${c.pitch}"></div></div><div class="field"><label>Volume · <span id="narratorVolumeVal">${Math.round(Number(c.volume)*100)}%</span></label><input id="narratorVolume" type="range" min="0" max="1" step="0.1" value="${c.volume}"></div><div class="field"><label>Personalidade</label><select id="narratorStyle"><option value="rpg" ${c.style==='rpg'?'selected':''}>Game Master — dinâmica</option><option value="focus" ${c.style==='focus'?'selected':''}>Foco — objetiva</option><option value="calm" ${c.style==='calm'?'selected':''}>Calma — menos pressão</option></select></div><div class="notification-actions"><button class="btn primary" id="narratorSave">Salvar Narrador</button><button class="btn" id="narratorTest">▶ Testar voz</button><button class="btn" id="narratorBrief">☀ Briefing agora</button></div></div><div class="card"><h2>O que ele deve anunciar</h2>${[['missionChanges','Mudança da missão atual','Fala quando começa um novo bloco.'],['completions','Conclusões','Confirma quando uma quest é concluída.'],['replans','Replanejamentos','Explica quando o calendário é recalculado.'],['procrastination','Procrastinação','Avisa quando uma meta está ficando para trás.'],['morningBrief','Briefing da manhã','Resume prioridades e primeira missão do dia.'],['eveningDebrief','Fechamento noturno','Resume o dia antes do horário de dormir.']].map(([k,t,d])=>`<label class="setting-toggle"><input data-narrator-toggle="${k}" type="checkbox" ${c[k]?'checked':''}><span><b>${t}</b><small>${d}</small></span></label>`).join('')}<div class="form-row"><div class="field"><label>Silêncio a partir de</label><input id="narratorQuietStart" type="time" value="${c.quietStart}"></div><div class="field"><label>Voltar a falar às</label><input id="narratorQuietEnd" type="time" value="${c.quietEnd}"></div></div><div class="callout">O Narrador nunca altera uma missão sozinho. Ele comunica o que o motor de planejamento decidiu e o que você concluiu.</div></div></div>`);
    ['Rate','Pitch','Volume'].forEach(k=>{const e=document.getElementById('narrator'+k),v=document.getElementById('narrator'+k+'Val');e.oninput=()=>v.textContent=k==='Rate'?`${Number(e.value).toFixed(1)}×`:k==='Volume'?`${Math.round(Number(e.value)*100)}%`:Number(e.value).toFixed(1)});
    document.getElementById('narratorSave').onclick=()=>{c.enabled=document.getElementById('narratorEnabled').checked;c.voiceURI=document.getElementById('narratorVoice').value;c.rate=Number(document.getElementById('narratorRate').value);c.pitch=Number(document.getElementById('narratorPitch').value);c.volume=Number(document.getElementById('narratorVolume').value);c.style=document.getElementById('narratorStyle').value;c.quietStart=document.getElementById('narratorQuietStart').value||'22:00';c.quietEnd=document.getElementById('narratorQuietEnd').value||'06:00';document.querySelectorAll('[data-narrator-toggle]').forEach(e=>c[e.dataset.narratorToggle]=e.checked);saveState();unlock();if(c.enabled)say('Narrador ativado. A partir de agora eu acompanho a sua agenda.',{force:true});render();toast('Narrador atualizado')};
    document.getElementById('narratorTest').onclick=()=>{unlock();say('Teste de voz do My Performance. Sua agenda está pronta para falar com você.',{force:true})};document.getElementById('narratorBrief').onclick=()=>{unlock();speakBriefing(true)}
  };

  window.addEventListener('my-performance-state-saved',completionTick);
  window.addEventListener('my-performance-plan-recalculated',e=>{if(cfg().enabled&&cfg().replans)say(styleText('replan',e.detail||{}),{interrupt:false})});
  window.addEventListener('my-performance-procrastination',e=>{if(cfg().enabled&&cfg().procrastination)say(styleText('procrastination',e.detail||{}),{interrupt:false})});
  window.addEventListener('focus',()=>{missionTick();dailyTick()});document.addEventListener('visibilitychange',()=>{if(!document.hidden){missionTick();dailyTick()}});
  if(supported())speechSynthesis.addEventListener?.('voiceschanged',refreshVoiceSelect);
  setInterval(()=>{missionTick();dailyTick()},30000);addQuickButton();setTimeout(()=>{addQuickButton();dailyTick()},1000);
  window.MyPerformanceNarrator={say,briefing:()=>speakBriefing(true),debrief:()=>speakDebrief(true),voices,status:()=>({supported:supported(),speaking,settings:Object.assign({},cfg())})};
})();
