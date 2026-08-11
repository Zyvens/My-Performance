"use strict";
/* My Performance 2.0 — calendar-first domain model.
   The calendar stores availability windows; missions store work; campaigns package missions.
   Only special recurring missions may lock a specific time. */
(function(){
  if(typeof state==='undefined'||typeof QUEST_SEED==='undefined')return;

  const VERSION=3;
  const GROUPS=[
    {id:'GSA',name:'GSA',icon:'◆'},
    {id:'Estudos',name:'Estudo',icon:'⌘'},
    {id:'Pessoal',name:'Pessoal',icon:'♥'}
  ];
  const GROUP_IDS=new Set(GROUPS.map(x=>x.id));
  const LEGACY_FILLERS=new Set([
    'routine-gsa-focus-am','routine-gsa-pre-muay','routine-gsa-post-muay','routine-gsa-focus-pm','routine-gsa-admin',
    'routine-muay','routine-muay-commute','routine-muay-return','routine-muay-friday'
  ]);

  const WINDOWS=[
    // Monday
    {id:'mon-health',weekday:1,start:360,end:540,label:'Saúde / manhã',groups:['Pessoal'],preferredGroup:'Pessoal'},
    {id:'mon-gsa-1',weekday:1,start:540,end:720,label:'GSA — primeiro bloco',groups:['GSA'],preferredGroup:'GSA'},
    {id:'mon-lunch',weekday:1,start:720,end:780,label:'Almoço / pessoal',groups:['Pessoal'],preferredGroup:'Pessoal'},
    {id:'mon-gsa-2',weekday:1,start:780,end:1080,label:'GSA — segundo bloco',groups:['GSA'],preferredGroup:'GSA'},
    {id:'mon-personal',weekday:1,start:1080,end:1140,label:'Pessoal / jantar',groups:['Pessoal'],preferredGroup:'Pessoal'},
    {id:'mon-study',weekday:1,start:1140,end:1320,label:'Estudo',groups:['Estudos'],preferredGroup:'Estudos'},
    {id:'mon-sleep',weekday:1,start:1320,end:1350,label:'Encerramento / sono',groups:['Pessoal'],preferredGroup:'Pessoal'},

    // Tuesday
    {id:'tue-health',weekday:2,start:360,end:540,label:'Saúde / manhã',groups:['Pessoal'],preferredGroup:'Pessoal'},
    {id:'tue-gsa-1',weekday:2,start:540,end:720,label:'GSA — primeiro bloco',groups:['GSA'],preferredGroup:'GSA'},
    {id:'tue-training',weekday:2,start:720,end:840,label:'Treino + transição',groups:['Pessoal'],preferredGroup:'Pessoal'},
    {id:'tue-gsa-2',weekday:2,start:840,end:1080,label:'GSA / Estudo — flexível',groups:['GSA','Estudos'],preferredGroup:'GSA'},
    {id:'tue-personal',weekday:2,start:1080,end:1140,label:'Pessoal / jantar',groups:['Pessoal'],preferredGroup:'Pessoal'},
    {id:'tue-study',weekday:2,start:1140,end:1320,label:'Estudo',groups:['Estudos'],preferredGroup:'Estudos'},
    {id:'tue-sleep',weekday:2,start:1320,end:1350,label:'Encerramento / sono',groups:['Pessoal'],preferredGroup:'Pessoal'},

    // Wednesday
    {id:'wed-bni-window',weekday:3,start:270,end:660,label:'BNI / GSA',groups:['GSA','Pessoal'],preferredGroup:'GSA'},
    {id:'wed-free',weekday:3,start:660,end:720,label:'Zona livre — rua / Plaza',groups:['Pessoal'],preferredGroup:'Pessoal'},
    {id:'wed-training',weekday:3,start:720,end:870,label:'Treino / almoço',groups:['Pessoal'],preferredGroup:'Pessoal'},
    {id:'wed-gsa',weekday:3,start:870,end:1080,label:'GSA / Estudo — flexível',groups:['GSA','Estudos'],preferredGroup:'GSA'},
    {id:'wed-personal',weekday:3,start:1080,end:1140,label:'Pessoal / jantar',groups:['Pessoal'],preferredGroup:'Pessoal'},
    {id:'wed-study',weekday:3,start:1140,end:1320,label:'Estudo',groups:['Estudos'],preferredGroup:'Estudos'},
    {id:'wed-sleep',weekday:3,start:1320,end:1350,label:'Encerramento / sono',groups:['Pessoal'],preferredGroup:'Pessoal'},

    // Thursday
    {id:'thu-health',weekday:4,start:360,end:540,label:'Saúde / manhã',groups:['Pessoal'],preferredGroup:'Pessoal'},
    {id:'thu-gsa-1',weekday:4,start:540,end:720,label:'GSA — primeiro bloco',groups:['GSA'],preferredGroup:'GSA'},
    {id:'thu-lunch',weekday:4,start:720,end:780,label:'Almoço / pessoal',groups:['Pessoal'],preferredGroup:'Pessoal'},
    {id:'thu-gsa-2',weekday:4,start:780,end:900,label:'GSA — segundo bloco',groups:['GSA'],preferredGroup:'GSA'},
    {id:'thu-study',weekday:4,start:900,end:1080,label:'Estudo',groups:['Estudos'],preferredGroup:'Estudos'},
    {id:'thu-personal',weekday:4,start:1080,end:1140,label:'Pessoal / jantar',groups:['Pessoal'],preferredGroup:'Pessoal'},
    {id:'thu-cell',weekday:4,start:1140,end:1410,label:'Célula / retorno / sono',groups:['Pessoal'],preferredGroup:'Pessoal'},

    // Friday
    {id:'fri-health',weekday:5,start:360,end:540,label:'Saúde / manhã',groups:['Pessoal'],preferredGroup:'Pessoal'},
    {id:'fri-gsa-1',weekday:5,start:540,end:720,label:'GSA — primeiro bloco',groups:['GSA'],preferredGroup:'GSA'},
    {id:'fri-lunch',weekday:5,start:720,end:780,label:'Almoço / pessoal',groups:['Pessoal'],preferredGroup:'Pessoal'},
    {id:'fri-gsa-2',weekday:5,start:780,end:960,label:'GSA — segundo bloco',groups:['GSA'],preferredGroup:'GSA'},
    {id:'fri-study',weekday:5,start:960,end:1140,label:'Estudo',groups:['Estudos'],preferredGroup:'Estudos'},
    {id:'fri-extension',weekday:5,start:1140,end:1200,label:'Extensão excepcional',groups:['GSA','Estudos'],preferredGroup:'Estudos',optional:true},

    // Saturday
    {id:'sat-health',weekday:6,start:360,end:540,label:'Saúde / manhã',groups:['Pessoal'],preferredGroup:'Pessoal'},
    {id:'sat-study',weekday:6,start:540,end:720,label:'Estudo',groups:['Estudos'],preferredGroup:'Estudos'},
    {id:'sat-lunch',weekday:6,start:720,end:780,label:'Almoço / pessoal',groups:['Pessoal'],preferredGroup:'Pessoal'},

    // Sunday — only used by the planner in an actual emergency.
    {id:'sun-emergency',weekday:0,start:360,end:720,label:'Domingo — emergência',groups:['Estudos','Pessoal'],preferredGroup:'Pessoal',emergencyOnly:true}
  ];

  const PREFERENCES={
    'personal-wake':{1:[360,370],2:[360,370],3:[270,280],4:[360,370],5:[360,370],6:[360,370]},
    'routine-water-am':{1:[370,375],2:[370,375],4:[370,375],5:[370,375],6:[370,375]},
    'routine-hygiene-am':{1:[375,390],2:[375,390],4:[375,390],5:[375,390],6:[375,390]},
    'personal-gym':{1:[390,480,'Peito + Bíceps'],2:[720,810,'Perna'],3:[720,810,'Costas + Tríceps'],4:[390,480,'Peito + Bíceps'],5:[390,480,'Perna'],6:[390,480,'Costas + Tríceps']},
    'routine-shower-post-gym':{1:[480,510],2:[810,840],3:[810,840],4:[480,510],5:[480,510],6:[480,510]},
    'personal-breakfast':{1:[510,540],2:[390,410],4:[510,540],5:[510,540],6:[510,540]},
    'personal-lunch':{1:[720,780],2:[810,840],3:[810,870],4:[720,780],5:[720,780],6:[720,780]},
    'routine-dinner':{1:[1110,1140],2:[1110,1140],3:[1110,1140],4:[1110,1140]},
    'routine-hygiene-night':{1:[1320,1335],2:[1320,1335],3:[1320,1335],4:[1395,1410]},
    'personal-sleep':{1:[1350,1360],2:[1350,1360],3:[1350,1360],4:[1410,1420]},
    'personal-evening-activity':{1:[1080,1110],2:[1080,1110],3:[1080,1110],4:[1080,1110]}
  };

  function copy(x){return JSON.parse(JSON.stringify(x))}
  function seed(q){const found=QUEST_SEED.find(x=>x.id===q.id);if(found)Object.assign(found,q);else QUEST_SEED.push(q);return QUEST_SEED.find(x=>x.id===q.id)}
  function ensureSpecialMissions(){
    seed({id:'personal-therapy-weekly',title:'Terapia',description:'Compromisso semanal especial. Horário bloqueado no calendário e não deslocável.',domain:'Pessoal',category:'Saúde',questType:'side',cadence:'weekly',weekdays:[2],timeStart:'08:00',timeEnd:'08:30',durationMin:30,fixedTime:true,immovable:true,specialCommitment:true,bufferBeforeMin:60,bufferAfterMin:30,xp:20,difficulty:1,source:'Compromisso semanal'});
    seed({id:'gsa-bni-weekly',title:'BNI Fire — reunião semanal',description:'Compromisso semanal especial. Conta como atividade da GSA e não pode ser deslocado.',domain:'GSA',category:'BNI',questType:'main',cadence:'weekly',weekdays:[3],timeStart:'06:00',timeEnd:'11:00',durationMin:300,fixedTime:true,immovable:true,specialCommitment:true,bufferBeforeMin:90,bufferAfterMin:0,countsAsGsa:true,xp:90,difficulty:3,source:'Compromisso semanal'});
    seed({id:'personal-zion-brave-weekly',title:'Célula Zion Brave',description:'Compromisso espiritual semanal especial. Horário bloqueado e não deslocável.',domain:'Pessoal',category:'Fé / Comunidade',questType:'side',cadence:'weekly',weekdays:[4],timeStart:'19:00',timeEnd:'23:00',durationMin:240,fixedTime:true,immovable:true,specialCommitment:true,bufferBeforeMin:0,bufferAfterMin:15,xp:70,difficulty:2,source:'Compromisso semanal'});
    seed({id:'personal-evening-activity',title:'Atividade pessoal',description:'Janela curta para uma atividade pessoal, organização ou descanso.',domain:'Pessoal',category:'Equilíbrio',questType:'side',cadence:'daily',weekdays:[1,2,3,4],durationMin:30,fixedTime:false,movable:true,xp:15,difficulty:1,source:'Rotina pessoal'});
    seed({id:'gsa-main-hacktown-2026',title:'HackTown 2026 — preparar presença da GSA',description:'Objetivo principal da Campanha HackTown 2026.',domain:'GSA',category:'HackTown',questType:'main',cadence:'once',startDate:'2026-08-10',dueDate:'2026-09-03',durationMin:120,xp:220,difficulty:5,priorityLevel:'critical',source:'Campanha GSA',campaignContainer:false});
    seed({id:'gsa-main-eva-launch',title:'Lançamento da EVA — setembro',description:'Objetivo principal da Campanha Lançamento EVA.',domain:'GSA',category:'EVA',questType:'main',cadence:'once',startDate:'2026-08-10',dueDate:'2026-09-30',durationMin:120,xp:260,difficulty:5,priorityLevel:'high',source:'Campanha GSA',campaignContainer:false});
    seed({id:'gsa-main-editais',title:'Editais — FAPERJ e oportunidades aderentes',description:'Objetivo principal da Campanha Editais. O deadline real deve permanecer o da oportunidade ativa.',domain:'GSA',category:'Editais',questType:'main',cadence:'once',startDate:'2026-08-10',dueDate:'2026-08-31',durationMin:90,xp:120,difficulty:4,priorityLevel:'high',source:'Campanha GSA',campaignContainer:false});
  }

  function initialCampaigns(){return[
    {id:'campaign-hacktown-2026',name:'HackTown 2026',groupId:'GSA',priority:1,colorKey:'hacktown',missionIds:[],createdAt:'2026-08-10T00:00:00.000Z'},
    {id:'campaign-eva-launch',name:'Lançamento EVA',groupId:'GSA',priority:2,colorKey:'eva',missionIds:[],createdAt:'2026-08-10T00:00:00.000Z'},
    {id:'campaign-editais',name:'Editais',groupId:'GSA',priority:3,colorKey:'editais',missionIds:[],createdAt:'2026-08-10T00:00:00.000Z'}
  ]}
  function inferCampaign(q){
    const id=String(q?.id||''),text=`${q?.title||''} ${q?.category||''} ${(q?.tags||[]).join(' ')}`.toLowerCase();
    if(id==='gsa-main-hacktown-2026'||/hacktown/.test(text))return'campaign-hacktown-2026';
    if(id==='gsa-main-eva-launch'||/\beva\b/.test(text))return'campaign-eva-launch';
    if(id==='gsa-main-editais'||['gsa-c2','gsa-c3','gsa-c4','gsa-c6','gsa-c7','gsa-c8','gsa-c9','gsa-c10'].includes(id)||/faperj|sisfaperj|edital|proforma|lattes|trl 6|carta de interesse/.test(text))return'campaign-editais';
    return''
  }

  function sanitizeLegacy(){
    state.overrides=state.overrides||{};
    // Old scheduler settings must not dictate fixed times anymore.
    if(state.routineSettings){delete state.routineSettings.gymStart;delete state.routineSettings.gymDuration;delete state.routineSettings.muayFriday;delete state.routineSettings.muayDays;delete state.routineSettings.domainPriority}
    if(state.capacityBudget?.settings)delete state.capacityBudget.settings.fifthWorkoutDay;
    if(state.scheduler2?.dayContexts)state.scheduler2.dayContexts={};
    for(const id of LEGACY_FILLERS)state.overrides[id]=Object.assign({},state.overrides[id]||{},{disabled:true});
    for(const id of ['personal-gym','routine-shower-post-gym','personal-breakfast','personal-lunch','routine-dinner','routine-hygiene-am','routine-hygiene-night','personal-wake','personal-sleep']){
      const o=state.overrides[id]||{};delete o.timeStart;delete o.timeEnd;delete o.fixedTime;delete o.essential;state.overrides[id]=o
    }
    state.overrides['personal-gym']=Object.assign({},state.overrides['personal-gym'],{weekdays:[1,2,3,4,5,6],durationMin:90,movable:true,disabled:false});
    state.overrides['routine-shower-post-gym']=Object.assign({},state.overrides['routine-shower-post-gym'],{weekdays:[1,2,3,4,5,6],durationMin:30,movable:true,disabled:false});
    // Legacy synthetic/adaptive quests are planner artifacts, not user missions.
    state.customQuests=(state.customQuests||[]).filter(q=>!(q?.adaptiveSession||q?.capacityBlock||q?.scheduler2Synthetic||q?.liveFill||q?.lateWakeCanonical));
    for(const q of QUEST_SEED){
      if(q.domain==='Carreira')q.domain='Pessoal';
      if(LEGACY_FILLERS.has(q.id))q.disabled=true;
      if(q.id==='personal-gym'){q.weekdays=[1,2,3,4,5,6];q.durationMin=90;q.fixedTime=false;q.movable=true}
      if(q.id==='routine-shower-post-gym'){q.weekdays=[1,2,3,4,5,6];q.durationMin=30;q.fixedTime=false;q.movable=true}
      if(!q.specialCommitment&&q.fixedTime){q.fixedTime=false;q.movable=true}
    }
    for(const q of state.customQuests||[])if(q.domain==='Carreira')q.domain='Pessoal';
    if(typeof DOMAIN_META!=='undefined')DOMAIN_META={Pessoal:{icon:'♥',attribute:'Vitalidade'},GSA:{icon:'◆',attribute:'Negócios'},Estudos:{icon:'⌘',attribute:'Intelecto'}};
  }

  function ensureState(){
    ensureSpecialMissions();sanitizeLegacy();
    state.calendarV3=state.calendarV3||{};
    const c=state.calendarV3;
    c.version=VERSION;
    c.groups=GROUPS;
    if(!Array.isArray(c.windows)||!c.windows.length)c.windows=copy(WINDOWS);
    if(!Array.isArray(c.campaigns)||!c.campaigns.length)c.campaigns=initialCampaigns();
    c.engine=Object.assign({horizonDays:90,safetyDays:2,minSessionMin:30,maxSessionMin:120},c.engine||{});
    c.preferences=Object.assign(copy(PREFERENCES),c.preferences||{});
    c.skippedDates=c.skippedDates||{};
    c.discardedDays=c.discardedDays||{};
    c.sessionDone=c.sessionDone||{};
    c.workLedger=c.workLedger||{};
    c.missionMeta=c.missionMeta||{};
    c.migration='calendar-first-2.0';
    // Assign current mission packs without duplicating mission definitions.
    const all=QUEST_SEED.concat(state.customQuests||[]);
    for(const campaign of c.campaigns){if(!Array.isArray(campaign.missionIds))campaign.missionIds=[]}
    for(const q of all){
      const inferred=c.missionMeta[q.id]?.campaignId||q.campaignId||inferCampaign(q);if(!inferred)continue;
      c.missionMeta[q.id]=Object.assign({},c.missionMeta[q.id]||{},{campaignId:inferred,groupId:q.domain==='Estudos'?'Estudos':q.domain==='Pessoal'?'Pessoal':'GSA'});
      const campaign=c.campaigns.find(x=>x.id===inferred);if(campaign&&!campaign.missionIds.includes(q.id))campaign.missionIds.push(q.id)
    }
    c.campaigns.sort((a,b)=>Number(a.priority||99)-Number(b.priority||99));
    try{localStorage.setItem('my_performance_v1',JSON.stringify(state))}catch{}
    return c
  }

  function model(){return ensureState()}
  function groupForQuest(q){const meta=model().missionMeta[q?.id]||{};const g=meta.groupId||q?.domain;return GROUP_IDS.has(g)?g:(g==='Carreira'?'Pessoal':'Pessoal')}
  function campaignForQuest(q){const id=model().missionMeta[q?.id]?.campaignId||q?.campaignId||inferCampaign(q);return model().campaigns.find(x=>x.id===id)||null}
  function setMissionCampaign(missionId,campaignId){
    const c=model(),next=c.campaigns.find(x=>x.id===campaignId);for(const x of c.campaigns)x.missionIds=(x.missionIds||[]).filter(id=>id!==missionId);
    if(next&&!next.missionIds.includes(missionId))next.missionIds.push(missionId);
    c.missionMeta[missionId]=Object.assign({},c.missionMeta[missionId]||{},{campaignId:campaignId||''});saveState();return next||null
  }
  function addCampaign(input={}){
    const c=model(),name=String(input.name||'Nova Campanha').trim(),groupId=GROUP_IDS.has(input.groupId)?input.groupId:'Pessoal';
    const base=(name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'campanha');let id=`campaign-${base}`,n=2;while(c.campaigns.some(x=>x.id===id))id=`campaign-${base}-${n++}`;
    const campaign={id,name,groupId,priority:Number(input.priority||c.campaigns.length+1),deadline:input.deadline||'',missionIds:[],createdAt:new Date().toISOString()};c.campaigns.push(campaign);normalizePriorities();saveState();return campaign
  }
  function normalizePriorities(){const c=model();c.campaigns.sort((a,b)=>Number(a.priority||99)-Number(b.priority||99));c.campaigns.forEach((x,i)=>x.priority=i+1)}
  function moveCampaign(id,dir){const c=model();normalizePriorities();const i=c.campaigns.findIndex(x=>x.id===id),j=i+dir;if(i<0||j<0||j>=c.campaigns.length)return;[c.campaigns[i],c.campaigns[j]]=[c.campaigns[j],c.campaigns[i]];c.campaigns.forEach((x,k)=>x.priority=k+1);saveState()}
  function campaignPackage(id){const c=model(),campaign=c.campaigns.find(x=>x.id===id);if(!campaign)return null;const missions=(campaign.missionIds||[]).map(mid=>{try{return questById(mid)}catch{return null}}).filter(Boolean).map(q=>copy(q));return{schema:'my-performance-campaign',version:1,exportedAt:new Date().toISOString(),campaign:copy(campaign),missions}}
  function importCampaign(pkg,groupId,priority){
    if(!pkg||pkg.schema!=='my-performance-campaign'||!pkg.campaign||!Array.isArray(pkg.missions))throw new Error('Pacote de Campanha inválido.');
    const campaign=addCampaign({name:pkg.campaign.name,groupId,priority:priority||model().campaigns.length+1,deadline:pkg.campaign.deadline||''});
    for(const raw of pkg.missions){const q=copy(raw);q.id=`${campaign.id}-${String(q.id||'mission').replace(/^campaign-[^-]+-/,'')}`;q.domain=campaign.groupId;q.campaignId=campaign.id;q.disabled=false;q.fixedTime=!!q.specialCommitment&&!!q.fixedTime;state.customQuests.push(q);campaign.missionIds.push(q.id);model().missionMeta[q.id]={campaignId:campaign.id,groupId:campaign.groupId}}
    campaign.missionIds=[...new Set(campaign.missionIds)];saveState();return campaign
  }
  function deleteCampaign(id){
    const c=model(),campaign=c.campaigns.find(x=>x.id===id);if(!campaign)return false;const ids=new Set(campaign.missionIds||[]);
    state.customQuests=(state.customQuests||[]).filter(q=>!ids.has(q.id));
    for(const mid of ids){const seedQuest=QUEST_SEED.find(q=>q.id===mid);if(seedQuest)state.overrides[mid]=Object.assign({},state.overrides[mid]||{},{disabled:true});delete c.missionMeta[mid]}
    c.campaigns=c.campaigns.filter(x=>x.id!==id);normalizePriorities();saveState();return true
  }
  function replaceWindows(list){const c=model();c.windows=(list||[]).map(w=>Object.assign({},w,{weekday:Number(w.weekday),start:Number(w.start),end:Number(w.end),groups:(w.groups||[]).filter(g=>GROUP_IDS.has(g))})).filter(w=>w.end>w.start&&w.groups.length);saveState();return c.windows}
  function addWindow(w){const c=model(),id=w.id||`window-${Date.now().toString(36)}`;c.windows.push(Object.assign({},w,{id,weekday:Number(w.weekday),start:Number(w.start),end:Number(w.end),groups:(w.groups||[]).filter(g=>GROUP_IDS.has(g))}));saveState();return id}
  function updateWindow(id,patch){const c=model(),w=c.windows.find(x=>x.id===id);if(!w)return false;Object.assign(w,patch,{weekday:Number(patch.weekday??w.weekday),start:Number(patch.start??w.start),end:Number(patch.end??w.end)});w.groups=(w.groups||[]).filter(g=>GROUP_IDS.has(g));saveState();return true}
  function removeWindow(id){const c=model();c.windows=c.windows.filter(x=>x.id!==id);saveState()}
  function fixedMissions(){return QUEST_SEED.concat(state.customQuests||[]).filter(q=>q.specialCommitment&&q.fixedTime&&q.immovable&&!q.disabled)}
  function prefFor(q,date){const p=model().preferences[q?.id],w=dfrom(date).getDay();return p?.[w]||null}

  window.MyPerformanceCalendarModel={VERSION,model,groups:()=>copy(GROUPS),groupForQuest,campaignForQuest,setMissionCampaign,addCampaign,moveCampaign,campaignPackage,importCampaign,deleteCampaign,replaceWindows,addWindow,updateWindow,removeWindow,fixedMissions,prefFor,inferCampaign,normalizePriorities};
  ensureState();
})();