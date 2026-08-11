"use strict";
/* Fixed Commitments — recurring appointments that always win over flexible GSA/study blocks. */
(function(){
  if(typeof QUEST_SEED==='undefined'||!Array.isArray(QUEST_SEED))return;
  const upsert=q=>{const existing=QUEST_SEED.find(x=>x.id===q.id);if(existing)Object.assign(existing,q);else QUEST_SEED.push(q)};

  const THERAPY={
    id:'personal-therapy-weekly',title:'Terapia',description:'Compromisso pessoal fixo de terça-feira. O template semanal reserva a manhã de saúde, com margem ampla de ida por trânsito e retorno até o início do bloco da GSA.',
    domain:'Pessoal',category:'Saúde',questType:'side',cadence:'weekly',weekdays:[2],timeStart:'08:00',timeEnd:'08:30',durationMin:30,
    fixedTime:true,essential:true,externalActivity:true,commuteOutMin:60,commuteReturnMin:30,xp:20,difficulty:1,priorityLevel:'critical',source:'Compromisso fixo',
    tags:['terapia','saúde','terça-feira','08:00','trânsito','deslocamento']
  };
  const ZION={
    id:'personal-zion-brave-weekly',title:'Célula Zion Brave',description:'Compromisso espiritual fixo de quinta-feira, das 19:00 às 23:00, seguido de 15 min de deslocamento para casa.',
    domain:'Pessoal',category:'Fé / Comunidade',questType:'main',cadence:'weekly',weekdays:[4],timeStart:'19:00',timeEnd:'23:00',durationMin:240,
    fixedTime:true,essential:true,externalActivity:true,commuteOutMin:0,commuteReturnMin:15,xp:70,difficulty:2,priorityLevel:'critical',source:'Compromisso fixo',
    tags:['célula','Zion Brave','quinta-feira','fé','comunidade']
  };
  upsert(THERAPY);upsert(ZION);
  window.MyPerformanceFixedCommitments=Object.assign({},window.MyPerformanceFixedCommitments||{},{therapy:THERAPY,zionBrave:ZION});
})();
