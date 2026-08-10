"use strict";
/* Daily-life mission layer. Loaded after data.js and before app.js. */
(function(){
  const get=id=>QUEST_SEED.find(q=>q.id===id);
  const patch=(id,o)=>{const q=get(id);if(q)Object.assign(q,o)};
  const add=o=>{if(!get(o.id))Q(o)};

  /* Core anchors: 06:00 wake, 22:00 sleep => 16h awake / 8h sleep. */
  patch('personal-wake',{timeStart:'06:00',timeEnd:'06:10',durationMin:10,fixedTime:true,essential:true,priority:100});
  patch('personal-sleep',{timeStart:'22:00',timeEnd:'22:10',durationMin:10,fixedTime:true,essential:true,priority:100});
  patch('personal-gym',{timeStart:'06:25',timeEnd:'07:55',durationMin:90,weekdays:[1,2,4,6],priority:85,tags:['treino','manhã','início até 07:00']});
  patch('personal-breakfast',{timeStart:'08:10',timeEnd:'08:35',durationMin:25,fixedTime:true,essential:true,priority:95});
  patch('personal-lunch',{timeStart:'12:30',timeEnd:'13:15',durationMin:45,fixedTime:true,essential:true,priority:95});
  patch('personal-leisure',{timeStart:'21:00',timeEnd:'21:30',durationMin:30,priority:70});
  patch('personal-week-review',{timeStart:'18:00',durationMin:45});

  /* Career and study are pulled earlier so the day can close by 22:00. */
  patch('career-impact',{timeStart:'17:00',timeEnd:'17:30',durationMin:30});
  patch('career-network',{timeStart:'16:45',timeEnd:'17:15',durationMin:30});
  patch('career-pipeline',{timeStart:'08:40',timeEnd:'09:10',durationMin:30});
  patch('career-assets',{durationMin:60});
  patch('study-focus',{timeStart:'18:30',timeEnd:'20:00',durationMin:90});
  patch('study-q25',{timeStart:'20:00',timeEnd:'20:30',durationMin:30});
  patch('study-errors',{timeStart:'20:30',timeEnd:'20:50',durationMin:20});
  patch('study-basic',{timeStart:'20:50',timeEnd:'21:10',durationMin:20});
  patch('study-boss',{durationMin:120});
  patch('study-postboss',{durationMin:60});
  patch('study-sunday',{durationMin:60});
  patch('study-basicmix',{durationMin:45});

  /* Morning routine. */
  add({id:'routine-water-am',title:'Beber água ao acordar',description:'Começar o dia hidratado antes de entrar no fluxo.',domain:'Pessoal',category:'Rotina',cadence:'daily',weekdays:[0,1,2,3,4,5,6],timeStart:'06:10',timeEnd:'06:15',durationMin:5,fixedTime:true,essential:true,xp:8,difficulty:1,source:'Rotina diária',tags:['hidratação','manhã']});
  add({id:'routine-hygiene-am',title:'Higiene da manhã',description:'Banheiro, dentes, rosto e preparação rápida para começar o dia.',domain:'Pessoal',category:'Rotina',cadence:'daily',weekdays:[0,1,2,3,4,5,6],timeStart:'06:15',timeEnd:'06:25',durationMin:10,fixedTime:true,essential:true,xp:10,difficulty:1,source:'Rotina diária',tags:['higiene','manhã']});
  add({id:'routine-shower-post-gym',title:'Banho e troca pós-treino',description:'Fechar o treino e entrar no restante do dia sem arrastar a transição.',domain:'Pessoal',category:'Rotina',cadence:'daily',weekdays:[1,2,4,6],timeStart:'07:55',timeEnd:'08:10',durationMin:15,fixedTime:true,essential:true,xp:10,difficulty:1,source:'Rotina diária',dependencies:['personal-gym'],tags:['higiene','treino']});
  add({id:'routine-sun-mobility',title:'Luz do dia + mobilidade curta',description:'10 minutos para sair da inércia, mobilizar o corpo e marcar o início produtivo do dia.',domain:'Pessoal',category:'Saúde',cadence:'daily',weekdays:[0,1,2,3,4,5,6],timeStart:'08:35',timeEnd:'08:45',durationMin:10,xp:10,difficulty:1,source:'Rotina diária',tags:['mobilidade','sol']});
  add({id:'routine-day-plan',title:'Briefing do dia',description:'Revisar a agenda, identificar a Main Quest do dia e confirmar a sequência das próximas missões.',domain:'Pessoal',category:'Planejamento',cadence:'daily',weekdays:[1,2,3,4,5],timeStart:'08:45',timeEnd:'09:00',durationMin:15,xp:15,difficulty:1,source:'Rotina diária',tags:['planejamento']});

  /* GSA work blocks. They coexist with the granular GSA quests and are treated as campaign focus blocks. */
  add({id:'routine-gsa-focus-am',title:'Bloco de foco GSA — manhã',description:'Bloco protegido para a campanha GSA: vendas, execução, produto ou captação conforme a prioridade do dia.',domain:'GSA',category:'Foco',questType:'main',cadence:'daily',weekdays:[2,4,5],timeStart:'09:00',timeEnd:'11:15',durationMin:135,xp:45,difficulty:2,source:'Rotina diária',tags:['deep work','gsa']});
  add({id:'routine-gsa-pre-muay',title:'Bloco GSA antes do Muay Thai',description:'Sprint curto e objetivo antes do deslocamento para a aula.',domain:'GSA',category:'Foco',questType:'main',cadence:'daily',weekdays:[1,3],timeStart:'08:45',timeEnd:'09:25',durationMin:40,xp:30,difficulty:2,source:'Rotina diária',tags:['deep work','gsa','muay thai']});
  add({id:'routine-gsa-post-muay',title:'Bloco GSA pós-Muay Thai',description:'Retomar a campanha antes do almoço com uma entrega concreta.',domain:'GSA',category:'Foco',cadence:'daily',weekdays:[1,3],timeStart:'11:30',timeEnd:'12:20',durationMin:50,xp:30,difficulty:2,source:'Rotina diária',tags:['gsa','muay thai']});
  add({id:'routine-gsa-focus-pm',title:'Bloco de foco GSA — tarde',description:'Janela principal da tarde para execução e avanço da campanha GSA.',domain:'GSA',category:'Foco',questType:'main',cadence:'daily',weekdays:[1,2,3,4,5],timeStart:'13:30',timeEnd:'16:00',durationMin:150,xp:50,difficulty:2,source:'Rotina diária',tags:['deep work','gsa']});
  add({id:'routine-gsa-admin',title:'Fechamento operacional GSA',description:'Responder pendências, atualizar CRM/funil, registrar decisões e preparar o próximo passo.',domain:'GSA',category:'Operação',cadence:'daily',weekdays:[1,2,3,4,5],timeStart:'16:10',timeEnd:'16:45',durationMin:35,xp:25,difficulty:1,source:'Rotina diária',tags:['gsa','admin']});

  /* Muay Thai: Mon/Wed viable by default. Friday exists as an optional mission controlled in Settings. */
  add({id:'routine-muay-commute',title:'Deslocamento / preparação para Muay Thai',description:'Encerrar o bloco anterior, pegar equipamento e chegar sem atraso.',domain:'Pessoal',category:'Muay Thai',cadence:'daily',weekdays:[1,3],timeStart:'09:25',timeEnd:'10:00',durationMin:35,fixedTime:true,essential:true,xp:10,difficulty:1,source:'Rotina diária',tags:['muay thai','transição']});
  add({id:'routine-muay',title:'Muay Thai',description:'Aula de 1 hora. Segunda e quarta são o padrão para não quebrar três manhãs nobres da GSA.',domain:'Pessoal',category:'Muay Thai',questType:'main',cadence:'daily',weekdays:[1,3],timeStart:'10:00',timeEnd:'11:00',durationMin:60,fixedTime:true,essential:true,xp:55,difficulty:3,source:'Rotina diária',tags:['muay thai','treino']});
  add({id:'routine-muay-return',title:'Volta + banho pós-Muay Thai',description:'Transição de volta para o trabalho.',domain:'Pessoal',category:'Muay Thai',cadence:'daily',weekdays:[1,3],timeStart:'11:00',timeEnd:'11:30',durationMin:30,fixedTime:true,essential:true,xp:10,difficulty:1,source:'Rotina diária',tags:['muay thai','transição']});
  add({id:'routine-muay-friday',title:'Muay Thai — sexta opcional',description:'Terceira aula opcional. Fica desligada por padrão porque sexta 10:00 fragmenta uma manhã de alta prioridade da GSA.',domain:'Pessoal',category:'Muay Thai',questType:'main',cadence:'daily',weekdays:[5],timeStart:'10:00',timeEnd:'11:00',durationMin:60,fixedTime:true,essential:true,xp:55,difficulty:3,source:'Rotina diária',optionalRoutine:'muayFriday',tags:['muay thai','opcional']});

  /* Meals and evening shutdown. */
  add({id:'routine-dinner',title:'Jantar',description:'Refeição de encerramento do período produtivo antes do estudo.',domain:'Pessoal',category:'Alimentação',cadence:'daily',weekdays:[0,1,2,3,4,5,6],timeStart:'17:45',timeEnd:'18:15',durationMin:30,fixedTime:true,essential:true,xp:15,difficulty:1,source:'Rotina diária',tags:['alimentação']});
  add({id:'routine-water-close',title:'Fechar meta de hidratação',description:'Conferir se a hidratação do dia foi suficiente e completar água se necessário.',domain:'Pessoal',category:'Saúde',cadence:'daily',weekdays:[0,1,2,3,4,5,6],timeStart:'21:30',timeEnd:'21:35',durationMin:5,xp:8,difficulty:1,source:'Rotina diária',tags:['hidratação']});
  add({id:'routine-tomorrow',title:'Preparar amanhã',description:'Separar roupa/equipamento, olhar agenda e definir a primeira Main Quest do dia seguinte.',domain:'Pessoal',category:'Planejamento',cadence:'daily',weekdays:[0,1,2,3,4,5,6],timeStart:'21:35',timeEnd:'21:50',durationMin:15,fixedTime:true,essential:true,xp:15,difficulty:1,source:'Rotina diária',tags:['planejamento','noite']});
  add({id:'routine-hygiene-night',title:'Higiene noturna + desacelerar',description:'Dentes, higiene e encerramento de telas para estar pronto para dormir às 22:00.',domain:'Pessoal',category:'Rotina',cadence:'daily',weekdays:[0,1,2,3,4,5,6],timeStart:'21:50',timeEnd:'22:00',durationMin:10,fixedTime:true,essential:true,xp:10,difficulty:1,source:'Rotina diária',tags:['higiene','sono']});

  /* Weekend maintenance so the non-work days also have a complete campaign skeleton. */
  add({id:'routine-home-reset',title:'Reset da casa / roupas / ambiente',description:'Organizar o básico para não começar a semana com dívida doméstica.',domain:'Pessoal',category:'Casa',cadence:'daily',weekdays:[6],timeStart:'10:00',timeEnd:'10:45',durationMin:45,xp:25,difficulty:1,source:'Rotina diária',tags:['casa','sábado']});
  add({id:'routine-week-prep',title:'Preparação logística da semana',description:'Checar compromissos, treino, refeições, deslocamentos e pontos críticos da semana.',domain:'Pessoal',category:'Planejamento',cadence:'daily',weekdays:[0],timeStart:'19:45',timeEnd:'20:15',durationMin:30,xp:30,difficulty:1,source:'Rotina diária',tags:['domingo','planejamento']});
})();
