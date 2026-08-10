"use strict";
/* Fixed Commitments — recurring personal appointments that must win over flexible work/study blocks. */
(function(){
  if(typeof QUEST_SEED==='undefined'||!Array.isArray(QUEST_SEED))return;

  const THERAPY={
    id:'personal-therapy-weekly',
    title:'Terapia',
    description:'Compromisso pessoal fixo de terça-feira. O Scheduler deve proteger este horário contra GSA, Estudos, Carreira e sessões adaptativas.',
    domain:'Pessoal',
    category:'Saúde',
    questType:'side',
    cadence:'weekly',
    weekdays:[2],
    timeStart:'08:00',
    timeEnd:'09:00',
    durationMin:60,
    fixedTime:true,
    essential:true,
    externalActivity:true,
    commuteOutMin:0,
    commuteReturnMin:0,
    xp:20,
    difficulty:1,
    priorityLevel:'critical',
    source:'Compromisso fixo',
    tags:['terapia','saúde','terça-feira','08:00']
  };

  const existing=QUEST_SEED.find(q=>q.id===THERAPY.id);
  if(existing)Object.assign(existing,THERAPY);
  else QUEST_SEED.push(THERAPY);

  window.MyPerformanceFixedCommitments=Object.assign({},window.MyPerformanceFixedCommitments||{},{therapy:THERAPY});
})();
