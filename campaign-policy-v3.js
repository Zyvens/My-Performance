"use strict";
/* Campaign content policy: a Campaign is a container; only concrete Main Quests carry real deadlines.
   The generic Editais campaign must not become urgent before an actual call/opportunity exists. */
(function(){
  if(typeof state==='undefined'||typeof QUEST_SEED==='undefined'||!window.MyPerformanceCalendarModel)return;
  const q=QUEST_SEED.find(x=>x.id==='gsa-main-editais');
  if(q){q.dueDate='';q.campaignContainer=true;q.description='Contêiner da Campanha Editais. Não possui deadline próprio; apenas oportunidades e Main Quests concretas entram no calendário.'}
  state.overrides=state.overrides||{};
  state.overrides['gsa-main-editais']=Object.assign({},state.overrides['gsa-main-editais']||{},{dueDate:'',campaignContainer:true});
  const campaign=window.MyPerformanceCalendarModel.model().campaigns.find(x=>x.id==='campaign-editais');
  if(campaign)campaign.deadline='';
  try{localStorage.setItem('my_performance_v1',JSON.stringify(state))}catch{}
})();
