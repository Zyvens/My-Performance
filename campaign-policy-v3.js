"use strict";
/* Campaign/content policy.
   - A generic Campaign container never invents its own deadline.
   - Side Quests that already enter the calendar through a preferred-time rule are not also emitted as free planner work items. */
(function(){
  if(typeof state==='undefined'||typeof QUEST_SEED==='undefined'||!window.MyPerformanceCalendarModel)return;

  const edital=QUEST_SEED.find(x=>x.id==='gsa-main-editais');
  if(edital){edital.dueDate='';edital.campaignContainer=true;edital.description='Contêiner da Campanha Editais. Não possui deadline próprio; apenas oportunidades e Main Quests concretas entram no calendário.'}
  state.overrides=state.overrides||{};
  state.overrides['gsa-main-editais']=Object.assign({},state.overrides['gsa-main-editais']||{},{dueDate:'',campaignContainer:true});
  const campaign=window.MyPerformanceCalendarModel.model().campaigns.find(x=>x.id==='campaign-editais');
  if(campaign)campaign.deadline='';

  // These are real Side Quests, but their occurrence is already created by preferredSideSlots().
  // planner-engine-v3 skips calendarBuffer missions in workItems(), which prevents a second copy from filling another Pessoal gap.
  const PREFERENCE_ONLY=[
    'personal-wake','routine-water-am','routine-hygiene-am','personal-breakfast','personal-gym',
    'routine-shower-post-gym','personal-lunch','routine-dinner','routine-hygiene-night','personal-sleep',
    'personal-evening-activity'
  ];
  for(const id of PREFERENCE_ONLY){
    const q=QUEST_SEED.find(x=>x.id===id);if(q){q.calendarPreferenceOnly=true;q.calendarBuffer=true}
    state.overrides[id]=Object.assign({},state.overrides[id]||{},{calendarPreferenceOnly:true,calendarBuffer:true})
  }
  try{localStorage.setItem('my_performance_v1',JSON.stringify(state))}catch{}
})();
