"use strict";
/* My Performance 2.3 — one-time semantic audit of the existing mission catalog.
   Main Quest = strategic Campaign delivery. Side Quest = recurring/support activity. */
(function(){
  const B=window.MyPerformanceCalendarModel,D=window.MyPerformanceCalendarDomain;
  if(!B||!D||typeof state==='undefined'||typeof QUEST_SEED==='undefined')return;
  const VERSION=1;
  const all=()=>QUEST_SEED.concat(state.customQuests||[]);
  const byId=id=>all().find(q=>q.id===id)||null;
  const v3=B.model(),v5=D.model();
  state.overrides=state.overrides||{};

  function ensureCampaign(id,name,groupId,priority,deadline,colorKey){
    let c=v3.campaigns.find(x=>x.id===id);if(!c){c={id,name,groupId,priority,deadline:deadline||'',colorKey:colorKey||id,missionIds:[],createdAt:new Date().toISOString()};v3.campaigns.push(c)}
    c.name=name;c.groupId=groupId;c.deadline=deadline||c.deadline||'';c.priority=priority;c.missionIds=Array.isArray(c.missionIds)?c.missionIds:[];return c
  }
  const transpetro=ensureCampaign('campaign-transpetro-2026','Transpetro 2026','Estudos',1,'2026-11-30','transpetro');
  const hack=ensureCampaign('campaign-hacktown-2026','HackTown 2026','GSA',2,'2026-09-08','hacktown');
  const eva=ensureCampaign('campaign-eva-launch','Lançamento EVA','GSA',3,'2026-09-30','eva');
  const editais=ensureCampaign('campaign-editais','Editais','GSA',4,'','editais');
  const ops=ensureCampaign('campaign-gsa-operacao-2026','GSA — Operação e Crescimento 2026','GSA',5,'2026-12-31','gsa-operacao');
  const campaigns=[transpetro,hack,eva,editais,ops];
  v3.campaigns.sort((a,b)=>Number(a.priority||99)-Number(b.priority||99));

  function ensurePack(id,name,description,color){let p=v5.sideQuestPacks.find(x=>x.id===id);if(!p){p={id,name,description,active:true,color,missionIds:[]};v5.sideQuestPacks.push(p)}p.name=name;p.description=description;p.active=p.active!==false;p.missionIds=Array.isArray(p.missionIds)?p.missionIds:[];return p}
  const packs={
    study:ensurePack('pack-study-practice','Prática de Estudos','Rotinas de preparação, questões, revisão e simulados que sustentam as Campanhas de Estudo.','#8b75e8'),
    professional:ensurePack('pack-professional-development','Desenvolvimento Profissional','Networking, candidaturas, pipeline e ativos profissionais fora da GSA.','#6f9dd8'),
    gsa:ensurePack('pack-gsa-cadence','Cadências GSA','Rotinas operacionais, vendas, produto e acompanhamento da GSA.','#4d8dff')
  };
  function addToCampaign(q,campaign){for(const c of v3.campaigns)c.missionIds=(c.missionIds||[]).filter(id=>id!==q.id);if(campaign&&!campaign.missionIds.includes(q.id))campaign.missionIds.push(q.id);v3.missionMeta[q.id]=Object.assign({},v3.missionMeta[q.id]||{},{campaignId:campaign?.id||'',groupId:campaign?.groupId||q.domain})}
  function addToPack(q,pack,meta={}){for(const p of v5.sideQuestPacks)p.missionIds=(p.missionIds||[]).filter(id=>id!==q.id);if(pack&&!pack.missionIds.includes(q.id))pack.missionIds.push(q.id);v5.sideQuestMeta[q.id]=Object.assign({packId:pack?.id||'',active:true,subtype:'support',rigidity:'free',energyDemand:'low',minSessionMin:10,idealSessionMin:Number(q.durationMin||30),scheduleType:'opportunistic',durationMode:'flexible',flexMinMin:10,flexMaxMin:Number(q.durationMin||30),windowMode:'group',windowIds:[]},v5.sideQuestMeta[q.id]||{},meta,{packId:pack?.id||v5.sideQuestMeta[q.id]?.packId||''})}
  function forceSide(q,pack,meta={}){q.questType='side';state.overrides[q.id]=Object.assign({},state.overrides[q.id]||{},{questType:'side'});delete v3.missionMeta[q.id]?.campaignId;for(const c of v3.campaigns)c.missionIds=(c.missionIds||[]).filter(id=>id!==q.id);addToPack(q,pack,meta)}
  function forceMain(q,campaign){q.questType='main';state.overrides[q.id]=Object.assign({},state.overrides[q.id]||{},{questType:'main'});for(const p of v5.sideQuestPacks)p.missionIds=(p.missionIds||[]).filter(id=>id!==q.id);delete v5.sideQuestMeta[q.id];addToCampaign(q,campaign)}

  // Campaign headers are containers, never schedulable work themselves.
  for(const id of ['gsa-main-hacktown-2026','gsa-main-eva-launch','gsa-main-editais']){const q=byId(id);if(q){q.campaignContainer=true;q.dueDate='';state.overrides[id]=Object.assign({},state.overrides[id]||{},{campaignContainer:true,dueDate:''})}}

  const personalMeta={
    'personal-wake':{scheduleType:'anchor',rigidity:'preferred',durationMode:'fixed',subtype:'necessary'},
    'personal-sleep':{scheduleType:'anchor',rigidity:'preferred',durationMode:'fixed',subtype:'necessary'},
    'personal-breakfast':{scheduleType:'flex-window',rigidity:'preferred',durationMode:'flexible',flexMinMin:15,flexMaxMin:30,subtype:'necessary'},
    'personal-lunch':{scheduleType:'flex-window',rigidity:'preferred',durationMode:'flexible',flexMinMin:30,flexMaxMin:60,subtype:'necessary'},
    'routine-dinner':{scheduleType:'flex-window',rigidity:'preferred',durationMode:'flexible',flexMinMin:20,flexMaxMin:40,subtype:'necessary'},
    'personal-gym':{scheduleType:'preferred',rigidity:'preferred',durationMode:'flexible',flexMinMin:60,flexMaxMin:90,subtype:'wellbeing',energyDemand:'high'},
    'routine-shower-post-gym':{scheduleType:'flex-window',rigidity:'preferred',durationMode:'flexible',flexMinMin:15,flexMaxMin:30,subtype:'necessary'},
    'routine-hygiene-am':{scheduleType:'flex-window',rigidity:'preferred',durationMode:'flexible',flexMinMin:10,flexMaxMin:20,subtype:'necessary'},
    'routine-hygiene-night':{scheduleType:'flex-window',rigidity:'preferred',durationMode:'flexible',flexMinMin:10,flexMaxMin:20,subtype:'necessary'},
    'personal-week-review':{scheduleType:'flex-window',rigidity:'free',durationMode:'flexible',flexMinMin:30,flexMaxMin:60,subtype:'development'},
    'personal-leisure':{scheduleType:'opportunistic',rigidity:'free',durationMode:'flexible',flexMinMin:30,flexMaxMin:90,subtype:'leisure'}
  };
  for(const q of all())if(personalMeta[q.id]){const pack=D.pack(v5.sideQuestMeta[q.id]?.packId)||(q.id==='personal-gym'||q.id==='routine-shower-post-gym'?D.pack('pack-health'):D.pack('pack-daily-life'));forceSide(q,pack,personalMeta[q.id])}

  // Old Career domain becomes Study/Professional support work; it is not a fourth Group.
  for(const q of all().filter(q=>/^career-/.test(q.id||'')||q.domain==='Carreira')){q.domain='Estudos';state.overrides[q.id]=Object.assign({},state.overrides[q.id]||{},{domain:'Estudos',questType:'side'});forceSide(q,packs.professional,{scheduleType:q.cadence==='daily'?'opportunistic':'flex-window',rigidity:'free',subtype:'development',energyDemand:'medium'})}

  // Transpetro: milestones/targets are Main Quests; practice routines are Side Quests.
  const studySupport=new Set(['study-focus','study-q25','study-errors','study-basic','study-boss','study-postboss','study-sunday','study-basicmix']);
  for(const q of all().filter(q=>/^study-/.test(q.id||''))){q.domain='Estudos';state.overrides[q.id]=Object.assign({},state.overrides[q.id]||{},{domain:'Estudos'});if(studySupport.has(q.id)){if(q.id==='study-boss'||q.id==='study-postboss'||q.id==='study-sunday'||q.id==='study-basicmix'){q.cadence='weekly';state.overrides[q.id].cadence='weekly'}forceSide(q,packs.study,{scheduleType:q.id==='study-focus'||q.id==='study-boss'?'preferred':'flex-window',rigidity:q.id==='study-focus'||q.id==='study-boss'?'preferred':'free',subtype:q.id==='study-boss'?'assessment':'study-practice',energyDemand:q.id==='study-focus'||q.id==='study-boss'?'high':'medium',durationMode:'flexible',flexMinMin:q.id==='study-focus'?60:20,flexMaxMin:Number(q.durationMin||90)})}else forceMain(q,transpetro)}

  // Every GSA milestone with a deadline is a Main Quest. Recurring cadences are Side Quests.
  function campaignForGsa(q){const text=`${q.id} ${q.title||''} ${q.category||''}`.toLowerCase();if(/hacktown|investidor|rodada|pitch/.test(text))return hack;if(/faperj|sisfaperj|lattes|proforma|trl 6|carta de interesse|edital|youtube/.test(text))return editais;if(/^gsa-p\d+/.test(q.id||'')||/\beva\b/.test(text))return eva;return ops}
  for(const q of all().filter(q=>/^gsa-[cspe]\d+$/.test(q.id||'')))forceMain(q,campaignForGsa(q));
  for(const q of all().filter(q=>/^gsa-r-/.test(q.id||''))){q.domain='GSA';state.overrides[q.id]=Object.assign({},state.overrides[q.id]||{},{domain:'GSA',questType:'side'});forceSide(q,packs.gsa,{scheduleType:'flex-window',rigidity:'free',subtype:'operations',energyDemand:q.category==='Cadência'?'low':'medium',durationMode:'flexible',flexMinMin:10,flexMaxMin:Math.max(20,Number(q.durationMin||45))})}

  // Any remaining active Side Quest receives a pack/policy instead of floating unclassified.
  for(const q of all().filter(q=>q.questType!=='main'&&!q.specialCommitment&&!q.disabled)){
    if(v5.sideQuestMeta[q.id]?.packId)continue;let pack=null,meta={};if(q.domain==='GSA'){pack=packs.gsa;meta={scheduleType:'opportunistic',subtype:'operations'}}else if(q.domain==='Estudos'){pack=packs.study;meta={scheduleType:'opportunistic',subtype:'study-practice'}}else{pack=/lazer|game|série|filme/i.test(`${q.title} ${q.category}`)?D.pack('pack-leisure'):/saúde|corpo|treino|hidrata|mobil|along/i.test(`${q.title} ${q.category}`)?D.pack('pack-health'):D.pack('pack-daily-life');meta={scheduleType:'opportunistic',subtype:pack?.id==='pack-leisure'?'leisure':'support'}}addToPack(q,pack,meta)
  }

  // Every Main Quest must belong to a Campaign. Seed leftovers are placed in the matching strategic Campaign.
  for(const q of all().filter(q=>q.questType==='main'&&!q.specialCommitment&&!q.campaignContainer&&!q.disabled)){
    let c=B.campaignForQuest(q);if(!c){if(q.domain==='Estudos')c=transpetro;else if(q.domain==='GSA')c=campaignForGsa(q);else{forceSide(q,D.pack('pack-daily-life'),{scheduleType:'flex-window',rigidity:'free',subtype:'development'});continue}}addToCampaign(q,c)
  }

  // Remove duplicate legacy BNI quest now represented by an Event.
  for(const id of ['gsa-r-bni'])state.overrides[id]=Object.assign({},state.overrides[id]||{},{disabled:true});
  state.questAuditV6={version:VERSION,auditedAt:new Date().toISOString(),mainCount:all().filter(q=>(state.overrides[q.id]?.questType||q.questType)==='main'&&!state.overrides[q.id]?.disabled).length,sideCount:all().filter(q=>(state.overrides[q.id]?.questType||q.questType)!=='main'&&!state.overrides[q.id]?.disabled).length};
  try{saveState()}catch{}
  window.MyPerformanceQuestAudit={VERSION,campaigns:campaigns.map(c=>c.id),packs:[packs.study.id,packs.professional.id,packs.gsa.id]};
})();
