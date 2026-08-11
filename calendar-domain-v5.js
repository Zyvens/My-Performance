"use strict";
/* My Performance 2.1 — Calendar Domain V5.
   Data model only: windows, Events, Side Quest Packs, policies, revisions and metadata.
   No planning loop lives here. Reads are zero-write after the one-time migration. */
(function(){
  const M=window.MyPerformanceCalendarModel;
  if(!M||typeof state==='undefined'||typeof QUEST_SEED==='undefined')return;

  const VERSION=5,SCHEMA=5,MAX_REVISIONS=20,MAX_LOG=120;
  const clone=x=>JSON.parse(JSON.stringify(x));
  const now=()=>new Date().toISOString();
  const validGroups=new Set(['GSA','Estudos','Pessoal']);
  const DEFAULT_COLORS={health:'#e85d5d',work:'#4d8dff',study:'#9b6dff',personal:'#45b97c',sleep:'#718096',free:'#d7a646'};

  const PACK_DEFS=[
    {id:'pack-piano',name:'Piano',description:'Desenvolvimento musical e prática de teclado/piano.',active:true,color:'#4db6ac',missionIds:['side-piano-lesson']},
    {id:'pack-leisure',name:'Lazer',description:'Séries, filmes, videogame e descanso recreativo.',active:true,color:'#59a7ff',missionIds:['personal-leisure','side-leisure-series','side-leisure-movie','side-leisure-gaming']},
    {id:'pack-daily-life',name:'Atividades Cotidianas',description:'Refeições, acordar, higiene, organização e encerramento do dia.',active:true,color:'#62c77f',missionIds:['personal-wake','personal-breakfast','personal-lunch','side-afternoon-snack','routine-dinner','routine-hygiene-am','routine-hygiene-night','personal-sleep','personal-evening-activity','routine-tomorrow','routine-day-plan']},
    {id:'pack-health',name:'Saúde e Bem-estar',description:'Treino, mobilidade, sol, alongamento e hidratação.',active:true,color:'#ee7272',missionIds:['personal-gym','routine-shower-post-gym','routine-water-am','routine-water-close','routine-sun-mobility','side-daily-stretch']}
  ];

  const EVENT_DEFS=[
    {id:'event-therapy',title:'Terapia',type:'Terapia',groupId:'Pessoal',recurrence:'weekly',weekdays:[2],start:'08:00',end:'08:30',travelRequired:true,travelBeforeMin:60,travelAfterMin:30,location:'Presencial',active:true,xp:20,sourceQuestId:'personal-therapy-weekly'},
    {id:'event-bni',title:'BNI Fire — reunião semanal',type:'BNI',groupId:'GSA',recurrence:'weekly',weekdays:[3],start:'06:00',end:'11:00',travelRequired:true,travelBeforeMin:90,travelAfterMin:30,location:'Presencial',active:true,xp:90,countsAsGsa:true,sourceQuestId:'gsa-bni-weekly'},
    {id:'event-zion',title:'Célula Zion Brave',type:'Célula',groupId:'Pessoal',recurrence:'weekly',weekdays:[4],start:'19:00',end:'23:00',travelRequired:true,travelBeforeMin:30,travelAfterMin:15,location:'Presencial',active:true,xp:70,sourceQuestId:'personal-zion-brave-weekly'}
  ];

  function qById(id){return QUEST_SEED.find(q=>q.id===id)||(state.customQuests||[]).find(q=>q.id===id)||null}
  function ensureQuest(q){if(qById(q.id))return qById(q.id);state.customQuests=state.customQuests||[];state.customQuests.push(q);return q}
  function seedSideQuests(){
    ensureQuest({id:'side-piano-lesson',title:'Aula / prática de Piano',description:'Prática musical flexível. Entra preferencialmente quando houver capacidade secundária.',domain:'Pessoal',category:'Piano',questType:'side',cadence:'weekly',weekdays:[1,2,3,4,5,6],durationMin:60,xp:35,difficulty:2,source:'Pacote Piano'});
    ensureQuest({id:'side-leisure-series',title:'Assistir série',description:'Lazer leve para preencher capacidade ociosa.',domain:'Pessoal',category:'Lazer',questType:'side',cadence:'weekly',durationMin:60,xp:10,difficulty:1,source:'Pacote Lazer'});
    ensureQuest({id:'side-leisure-movie',title:'Ver um filme',description:'Sessão de lazer longa e flexível.',domain:'Pessoal',category:'Lazer',questType:'side',cadence:'weekly',durationMin:120,xp:15,difficulty:1,source:'Pacote Lazer'});
    ensureQuest({id:'side-leisure-gaming',title:'Jogar videogame',description:'Lazer interativo para capacidade livre.',domain:'Pessoal',category:'Lazer',questType:'side',cadence:'weekly',durationMin:60,xp:10,difficulty:1,source:'Pacote Lazer'});
    ensureQuest({id:'side-afternoon-snack',title:'Lanche da tarde',description:'Refeição secundária; diária e não acumulável.',domain:'Pessoal',category:'Alimentação',questType:'side',cadence:'daily',weekdays:[1,2,3,4,5,6],durationMin:15,xp:6,difficulty:1,source:'Pacote Atividades Cotidianas'});
    ensureQuest({id:'side-daily-stretch',title:'Alongamento',description:'Alongamento breve para mobilidade e recuperação.',domain:'Pessoal',category:'Saúde',questType:'side',cadence:'daily',weekdays:[1,2,3,4,5,6],durationMin:15,xp:8,difficulty:1,source:'Pacote Saúde e Bem-estar'});
  }

  function defaultWindowPolicy(w){
    const id=String(w.id||''),label=String(w.label||'').toLowerCase(),pessoal=(w.groups||[]).length===1&&(w.groups||[])[0]==='Pessoal';
    let color=DEFAULT_COLORS.personal,energy='medium',allowSideQuests=false,sideQuestDedicated=false,zoneFree=false,rigidity='normal';
    if(/health|saúde|training|treino/.test(id+' '+label)){color=DEFAULT_COLORS.health;energy='high';sideQuestDedicated=true;allowSideQuests=true;rigidity='preferred'}
    else if(/study|estudo/.test(id+' '+label)){color=DEFAULT_COLORS.study;energy='high'}
    else if(/gsa|trabalho|bni/.test(id+' '+label)){color=DEFAULT_COLORS.work;energy='high'}
    else if(/sleep|sono|encerramento/.test(id+' '+label)){color=DEFAULT_COLORS.sleep;energy='low';sideQuestDedicated=true;allowSideQuests=true}
    else if(/free|livre|emerg/.test(id+' '+label)){color=DEFAULT_COLORS.free;energy='low';allowSideQuests=true;zoneFree=/free|livre/.test(id+' '+label)}
    else if(pessoal){color=DEFAULT_COLORS.personal;energy='medium';sideQuestDedicated=true;allowSideQuests=true}
    if((w.groups||[]).length>1&&!pessoal)allowSideQuests=true;
    return{color,energy,allowSideQuests,sideQuestDedicated,zoneFree,rigidity};
  }
  function friendlyWindowLabel(w){const id=String(w.id||'');if(/health/.test(id))return'Acordar com Saúde';if(/gsa/.test(id)&&!/bni/.test(id))return'Trabalho';if(/study/.test(id))return'Estudo';if(/lunch/.test(id))return'Almoço / Pessoal';if(/personal/.test(id))return'Pessoal';if(/sleep/.test(id))return'Encerramento';if(/training/.test(id))return'Saúde / Treino';if(/free/.test(id))return'Zona Livre';return w.label||'Janela'}

  function defaultSideMeta(){
    const out={};
    for(const p of PACK_DEFS)for(const id of p.missionIds)out[id]={packId:p.id,active:true,subtype:p.id==='pack-leisure'?'leisure':p.id==='pack-health'?'wellbeing':p.id==='pack-piano'?'development':'necessary',rigidity:'free',energyDemand:'low',minSessionMin:10,idealSessionMin:30};
    Object.assign(out,{
      'personal-wake':{packId:'pack-daily-life',active:true,subtype:'necessary',rigidity:'preferred',energyDemand:'low',minSessionMin:10,idealSessionMin:10},
      'personal-breakfast':{packId:'pack-daily-life',active:true,subtype:'necessary',rigidity:'preferred',energyDemand:'low',minSessionMin:20,idealSessionMin:30},
      'personal-lunch':{packId:'pack-daily-life',active:true,subtype:'necessary',rigidity:'preferred',energyDemand:'low',minSessionMin:30,idealSessionMin:60},
      'routine-dinner':{packId:'pack-daily-life',active:true,subtype:'necessary',rigidity:'preferred',energyDemand:'low',minSessionMin:20,idealSessionMin:30},
      'routine-hygiene-am':{packId:'pack-daily-life',active:true,subtype:'necessary',rigidity:'preferred',energyDemand:'low',minSessionMin:10,idealSessionMin:15},
      'routine-hygiene-night':{packId:'pack-daily-life',active:true,subtype:'necessary',rigidity:'preferred',energyDemand:'low',minSessionMin:10,idealSessionMin:15},
      'personal-sleep':{packId:'pack-daily-life',active:true,subtype:'necessary',rigidity:'preferred',energyDemand:'low',minSessionMin:10,idealSessionMin:10},
      'personal-gym':{packId:'pack-health',active:true,subtype:'wellbeing',rigidity:'preferred',energyDemand:'high',minSessionMin:60,idealSessionMin:90},
      'routine-shower-post-gym':{packId:'pack-health',active:true,subtype:'necessary',rigidity:'preferred',energyDemand:'low',minSessionMin:15,idealSessionMin:30},
      'routine-water-am':{packId:'pack-health',active:true,subtype:'wellbeing',rigidity:'free',energyDemand:'low',minSessionMin:5,idealSessionMin:5},
      'routine-water-close':{packId:'pack-health',active:true,subtype:'wellbeing',rigidity:'free',energyDemand:'low',minSessionMin:5,idealSessionMin:5},
      'routine-sun-mobility':{packId:'pack-health',active:true,subtype:'wellbeing',rigidity:'free',energyDemand:'low',minSessionMin:10,idealSessionMin:15},
      'side-daily-stretch':{packId:'pack-health',active:true,subtype:'wellbeing',rigidity:'free',energyDemand:'low',minSessionMin:10,idealSessionMin:15},
      'side-afternoon-snack':{packId:'pack-daily-life',active:true,subtype:'necessary',rigidity:'free',energyDemand:'low',minSessionMin:10,idealSessionMin:15},
      'side-piano-lesson':{packId:'pack-piano',active:true,subtype:'development',rigidity:'free',energyDemand:'medium',minSessionMin:30,idealSessionMin:60},
      'personal-leisure':{packId:'pack-leisure',active:true,subtype:'leisure',rigidity:'free',energyDemand:'low',minSessionMin:30,idealSessionMin:60}
    });return out
  }

  function initial(){return{
    schema:SCHEMA,
    sideQuestPacks:clone(PACK_DEFS),sideQuestMeta:defaultSideMeta(),events:clone(EVENT_DEFS),
    missionMeta:{},
    engine:{horizonDays:90,safetyDays:2,maxSessionMin:120,minSessionMin:30,contextSwitchPenalty:75,continuityBonus:110,energyMatching:true,protectedWeeklyMinutes:{GSA:0,Estudos:900,Pessoal:0},sideQuestDailyMaxMin:180,sideQuestLeisureMaxMin:120},
    deferredUntil:{},manualPins:{},manualReplacements:{},skippedDaily:{},
    revisions:[],decisionLog:[],lastRevisionId:0
  }}

  function normalizeEvent(e){
    e.groupId=validGroups.has(e.groupId)?e.groupId:'Pessoal';e.active=e.active!==false;e.recurrence=e.recurrence||'once';e.weekdays=Array.isArray(e.weekdays)?e.weekdays.map(Number):[];e.travelRequired=e.travelRequired!==false;
    if(e.travelRequired){e.travelBeforeMin=Math.max(30,Number(e.travelBeforeMin||30));e.travelAfterMin=Math.max(30,Number(e.travelAfterMin||30))}else{e.travelBeforeMin=Math.max(0,Number(e.travelBeforeMin||0));e.travelAfterMin=Math.max(0,Number(e.travelAfterMin||0))}
    e.type=e.type||'Outro';e.location=e.location||'Presencial';return e
  }
  function migrate(){
    seedSideQuests();
    let c=state.calendarV5;if(!c||Number(c.schema||0)<SCHEMA)c=state.calendarV5=Object.assign(initial(),c||{}, {schema:SCHEMA});
    c.sideQuestPacks=Array.isArray(c.sideQuestPacks)?c.sideQuestPacks:clone(PACK_DEFS);for(const p of PACK_DEFS)if(!c.sideQuestPacks.some(x=>x.id===p.id))c.sideQuestPacks.push(clone(p));
    c.sideQuestMeta=Object.assign(defaultSideMeta(),c.sideQuestMeta||{});c.events=Array.isArray(c.events)?c.events:[];for(const e of EVENT_DEFS)if(!c.events.some(x=>x.id===e.id))c.events.push(clone(e));c.events.forEach(normalizeEvent);
    c.engine=Object.assign(initial().engine,c.engine||{});c.engine.protectedWeeklyMinutes=Object.assign({GSA:0,Estudos:900,Pessoal:0},c.engine.protectedWeeklyMinutes||{});
    for(const k of ['deferredUntil','manualPins','manualReplacements','skippedDaily','missionMeta'])c[k]=c[k]||{};c.revisions=Array.isArray(c.revisions)?c.revisions:[];c.decisionLog=Array.isArray(c.decisionLog)?c.decisionLog:[];
    // Old special commitments become Events. Keep historical completion data but remove the old quest instances from active scheduling/logs.
    state.overrides=state.overrides||{};for(const id of EVENT_DEFS.map(x=>x.sourceQuestId))state.overrides[id]=Object.assign({},state.overrides[id]||{},{disabled:true});
    const base=M.model();base.windows=base.windows||[];for(const w of base.windows){Object.assign(w,defaultWindowPolicy(w),w.windowV5||{});w.label=friendlyWindowLabel(w);w.windowV5={color:w.color,energy:w.energy,allowSideQuests:w.allowSideQuests,sideQuestDedicated:w.sideQuestDedicated,zoneFree:w.zoneFree,rigidity:w.rigidity}}
    // Old rigid routine flags are data noise now. Planner V5 derives placement from Side Quest metadata + window policies.
    for(const id of Object.keys(c.sideQuestMeta)){state.overrides[id]=state.overrides[id]||{};delete state.overrides[id].fixedTime;delete state.overrides[id].essential}
    return c
  }

  let refState=null,refV5=null;
  function model(){if(state===refState&&state.calendarV5===refV5&&refV5)return refV5;const c=migrate();refState=state;refV5=c;return c}
  function baseWindows(){return M.model().windows||[]}
  function windowForId(id){return baseWindows().find(w=>w.id===id)||null}
  function windowsForWeekday(wd){return baseWindows().filter(w=>Number(w.weekday)===Number(wd)).sort((a,b)=>a.start-b.start)}
  function pack(id){return model().sideQuestPacks.find(p=>p.id===id)||null}
  function sideMeta(id){return model().sideQuestMeta[id]||null}
  function isSideEnabled(id){const m=sideMeta(id);if(!m||m.active===false)return false;const p=pack(m.packId);return !p||p.active!==false}
  function event(id){return model().events.find(e=>e.id===id)||null}
  function events(){return model().events.filter(e=>e.active!==false).map(clone)}

  function snapshot(){return{calendarV5:clone(model()),windows:clone(baseWindows())}}
  function recordRevision(reason){const c=model(),id=++c.lastRevisionId;c.revisions.push({id,at:now(),reason,snapshot:snapshot()});if(c.revisions.length>MAX_REVISIONS)c.revisions.splice(0,c.revisions.length-MAX_REVISIONS);return id}
  function log(type,message,detail={}){const c=model();c.decisionLog.push({at:now(),type,message,detail});if(c.decisionLog.length>MAX_LOG)c.decisionLog.splice(0,c.decisionLog.length-MAX_LOG)}
  function commit(reason,message,detail){log(reason,message||reason,detail||{});saveState();return true}
  function undoRevision(id){const c=model(),r=c.revisions.find(x=>Number(x.id)===Number(id));if(!r)return false;const keepRevisions=clone(c.revisions),keepLog=clone(c.decisionLog);state.calendarV5=clone(r.snapshot.calendarV5);state.calendarV5.revisions=keepRevisions;state.calendarV5.decisionLog=keepLog;M.replaceWindows(clone(r.snapshot.windows));refState=null;refV5=null;log('undo',`Replanejamento desfeito: ${r.reason}`,{revisionId:id});saveState();return true}

  function updateWindow(id,patch){const w=windowForId(id);if(!w)return false;recordRevision(`Editar janela ${w.label}`);Object.assign(w,patch);w.groups=(w.groups||[]).filter(g=>validGroups.has(g));w.color=w.color||DEFAULT_COLORS.personal;w.energy=['low','medium','high'].includes(w.energy)?w.energy:'medium';w.windowV5={color:w.color,energy:w.energy,allowSideQuests:!!w.allowSideQuests,sideQuestDedicated:!!w.sideQuestDedicated,zoneFree:!!w.zoneFree,rigidity:w.rigidity||'normal'};return commit('window-update',`Janela ${w.label} atualizada`,{id})}
  function addWindow(data){recordRevision('Adicionar janela');const w=Object.assign({id:`window-${Date.now().toString(36)}`,weekday:1,start:540,end:720,label:'Nova janela',groups:['Pessoal'],preferredGroup:'Pessoal',color:DEFAULT_COLORS.personal,energy:'medium',allowSideQuests:true,sideQuestDedicated:false,zoneFree:false,rigidity:'normal'},data||{});M.model().windows.push(w);w.windowV5={color:w.color,energy:w.energy,allowSideQuests:!!w.allowSideQuests,sideQuestDedicated:!!w.sideQuestDedicated,zoneFree:!!w.zoneFree,rigidity:w.rigidity||'normal'};return commit('window-add',`Janela ${w.label} criada`,{id:w.id})&&w}
  function removeWindow(id){const w=windowForId(id);if(!w)return false;recordRevision(`Excluir janela ${w.label}`);M.model().windows=M.model().windows.filter(x=>x.id!==id);return commit('window-delete',`Janela ${w.label} excluída`,{id})}

  function addPack(data){const c=model();recordRevision('Adicionar pacote de Side Quests');const p=Object.assign({id:`pack-${Date.now().toString(36)}`,name:'Novo pacote',description:'',active:true,color:'#59a7ff',missionIds:[]},data||{});c.sideQuestPacks.push(p);commit('pack-add',`Pacote ${p.name} criado`,{id:p.id});return p}
  function updatePack(id,patch){const p=pack(id);if(!p)return false;recordRevision(`Editar pacote ${p.name}`);Object.assign(p,patch);return commit('pack-update',`Pacote ${p.name} atualizado`,{id})}
  function togglePack(id,active){const p=pack(id);if(!p)return false;recordRevision(`${active===false?'Desativar':'Ativar'} pacote ${p.name}`);p.active=active!==false;return commit('pack-toggle',`${p.name}: ${p.active?'ativo':'inativo'}`,{id,active:p.active})}
  function deletePack(id,deleteMissions=false){const c=model(),p=pack(id);if(!p)return false;recordRevision(`Excluir pacote ${p.name}`);const ids=[...(p.missionIds||[])];c.sideQuestPacks=c.sideQuestPacks.filter(x=>x.id!==id);for(const qid of ids){if(deleteMissions){const i=(state.customQuests||[]).findIndex(q=>q.id===qid);if(i>=0)state.customQuests.splice(i,1);else state.overrides[qid]=Object.assign({},state.overrides[qid]||{},{disabled:true})}delete c.sideQuestMeta[qid]}return commit('pack-delete',`Pacote ${p.name} excluído`,{id,deleteMissions,count:ids.length})}
  function addSideQuest(packId,data){const p=pack(packId);if(!p)throw new Error('Pacote não encontrado');recordRevision(`Adicionar Side Quest a ${p.name}`);const id=data?.id||`side-${Date.now().toString(36)}`,q=Object.assign({id,title:'Nova Side Quest',description:'',domain:'Pessoal',category:p.name,questType:'side',cadence:'weekly',weekdays:[],durationMin:30,xp:15,difficulty:1,source:`Pacote ${p.name}`},data||{},{id,questType:'side'});state.customQuests=state.customQuests||[];state.customQuests.push(q);if(!p.missionIds.includes(id))p.missionIds.push(id);model().sideQuestMeta[id]=Object.assign({packId,active:true,subtype:'development',rigidity:'free',energyDemand:'low',minSessionMin:15,idealSessionMin:Number(q.durationMin||30)},data?.sideMeta||{});commit('side-add',`Side Quest ${q.title} criada`,{id,packId});return q}
  function updateSideQuest(id,patch={},metaPatch={}){const q=qById(id);if(!q)return false;recordRevision(`Editar Side Quest ${q.title}`);const custom=(state.customQuests||[]).find(x=>x.id===id);if(custom)Object.assign(custom,patch);else state.overrides[id]=Object.assign({},state.overrides[id]||{},patch);model().sideQuestMeta[id]=Object.assign({},model().sideQuestMeta[id]||{packId:''},metaPatch);return commit('side-update',`Side Quest ${patch.title||q.title} atualizada`,{id})}
  function toggleSideQuest(id,active){const m=model().sideQuestMeta[id];if(!m)return false;recordRevision(`${active===false?'Desativar':'Ativar'} Side Quest`);m.active=active!==false;return commit('side-toggle',`Side Quest ${id}: ${m.active?'ativa':'inativa'}`,{id,active:m.active})}
  function removeSideQuest(id){const q=qById(id);if(!q)return false;recordRevision(`Remover Side Quest ${q.title}`);const c=model();for(const p of c.sideQuestPacks)p.missionIds=(p.missionIds||[]).filter(x=>x!==id);delete c.sideQuestMeta[id];const i=(state.customQuests||[]).findIndex(x=>x.id===id);if(i>=0)state.customQuests.splice(i,1);else state.overrides[id]=Object.assign({},state.overrides[id]||{},{disabled:true});return commit('side-delete',`Side Quest ${q.title} removida`,{id})}

  function addEvent(data){recordRevision('Adicionar Evento');const e=normalizeEvent(Object.assign({id:`event-${Date.now().toString(36)}`,title:'Novo Evento',type:'Outro',groupId:'Pessoal',recurrence:'once',date:today(),weekdays:[],start:'09:00',end:'10:00',travelRequired:true,travelBeforeMin:30,travelAfterMin:30,location:'Presencial',active:true,xp:20},data||{}));model().events.push(e);commit('event-add',`Evento ${e.title} criado`,{id:e.id});return e}
  function updateEvent(id,patch){const e=event(id);if(!e)return false;recordRevision(`Editar Evento ${e.title}`);Object.assign(e,patch);normalizeEvent(e);return commit('event-update',`Evento ${e.title} atualizado`,{id})}
  function toggleEvent(id,active){const e=event(id);if(!e)return false;recordRevision(`${active===false?'Desativar':'Ativar'} Evento ${e.title}`);e.active=active!==false;return commit('event-toggle',`Evento ${e.title}: ${e.active?'ativo':'inativo'}`,{id})}
  function deleteEvent(id){const e=event(id);if(!e)return false;recordRevision(`Excluir Evento ${e.title}`);model().events=model().events.filter(x=>x.id!==id);return commit('event-delete',`Evento ${e.title} excluído`,{id})}

  function missionPolicy(q){
    const c=model(),m=c.missionMeta[q?.id]||{},side=c.sideQuestMeta[q?.id]||{};if(q?.questType==='side')return Object.assign({rigidity:'free',energyDemand:'low',minSessionMin:15,idealSessionMin:Number(q?.durationMin||30),effortMode:'likely'},side,m);
    return Object.assign({rigidity:'flexible',energyDemand:q?.difficulty>=4?'high':'medium',minSessionMin:Math.min(60,Number(q?.durationMin||60)),idealSessionMin:Math.min(120,Number(q?.durationMin||90)),targetDate:q?.targetDate||'',effortOptimisticMin:Math.round(Number(q?.durationMin||60)*.75),effortLikelyMin:Number(q?.durationMin||60),effortPessimisticMin:Math.round(Number(q?.durationMin||60)*1.35)},m)
  }
  function setMissionPolicy(id,patch){recordRevision('Atualizar política de missão');model().missionMeta[id]=Object.assign({},model().missionMeta[id]||{},patch);return commit('mission-policy',`Política de ${id} atualizada`,{id})}
  function updateEngine(patch){recordRevision('Atualizar motor');model().engine=Object.assign({},model().engine,patch||{});return commit('engine-update','Políticas globais do Planner atualizadas',patch||{})}

  window.MyPerformanceCalendarDomain={VERSION,SCHEMA,model,baseWindows,windowsForWeekday,windowForId,pack,sideMeta,isSideEnabled,event,events,missionPolicy,recordRevision,undoRevision,log,updateWindow,addWindow,removeWindow,addPack,updatePack,togglePack,deletePack,addSideQuest,updateSideQuest,toggleSideQuest,removeSideQuest,addEvent,updateEvent,toggleEvent,deleteEvent,setMissionPolicy,updateEngine,DEFAULT_COLORS};
  migrate();saveState();
})();
