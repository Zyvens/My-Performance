"use strict";
/* Fixed Commitments — recurring personal appointments that must win over flexible work/study blocks. */
(function(){
  if(typeof QUEST_SEED==='undefined'||!Array.isArray(QUEST_SEED))return;

  const THERAPY={
    id:'personal-therapy-weekly',
    title:'Terapia',
    description:'Compromisso pessoal fixo de terça-feira, com deslocamento protegido por trânsito intenso. O Scheduler deve proteger terapia e deslocamentos contra GSA, Estudos, Carreira, academia e sessões adaptativas.',
    domain:'Pessoal',
    category:'Saúde',
    questType:'side',
    cadence:'weekly',
    weekdays:[2],
    timeStart:'08:00',
    timeEnd:'08:30',
    durationMin:30,
    fixedTime:true,
    essential:true,
    externalActivity:true,
    commuteOutMin:60,
    commuteReturnMin:60,
    xp:20,
    difficulty:1,
    priorityLevel:'critical',
    source:'Compromisso fixo',
    tags:['terapia','saúde','terça-feira','08:00','trânsito','deslocamento']
  };

  const existing=QUEST_SEED.find(q=>q.id===THERAPY.id);
  if(existing)Object.assign(existing,THERAPY);
  else QUEST_SEED.push(THERAPY);

  window.MyPerformanceFixedCommitments=Object.assign({},window.MyPerformanceFixedCommitments||{},{therapy:THERAPY});
})();
