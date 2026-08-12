const fs=require('fs'),vm=require('vm'),assert=require('assert');
const code=fs.readFileSync('sidequest-lane-authority-v13.js','utf8');
const quests=[
{id:'gym',title:'Treino',questType:'side',domain:'Pessoal',cadence:'daily',weekdays:[1],durationMin:90},
{id:'breakfast',title:'Café da manhã',questType:'side',domain:'Pessoal',cadence:'daily',weekdays:[1],durationMin:30},
{id:'lunch',title:'Almoço',questType:'side',domain:'Pessoal',cadence:'daily',weekdays:[1],durationMin:60},
{id:'generic',title:'Filler genérico',questType:'side',domain:'Pessoal',cadence:'daily',weekdays:[1],durationMin:60}
];
const metas={gym:{packId:'health',rigidity:'preferred',windowMode:'exclusive',windowIds:['mon-health'],minSessionMin:60,idealSessionMin:90,flexMaxMin:90},breakfast:{packId:'daily',rigidity:'preferred',windowMode:'exclusive',windowIds:['mon-health'],minSessionMin:20,idealSessionMin:30,flexMaxMin:30},lunch:{packId:'daily',rigidity:'preferred',windowMode:'exclusive',windowIds:['mon-lunch'],minSessionMin:30,idealSessionMin:60,flexMaxMin:60},generic:{packId:'daily',rigidity:'free'}};
const packs={health:{id:'health',active:true,missionIds:['gym']},daily:{id:'daily',active:true,missionIds:['lunch','breakfast','generic']}};
const B={groupForQuest:q=>q.domain,prefFor(q){return q.id==='gym'?[390,480]:q.id==='breakfast'?[510,540]:q.id==='lunch'?[720,780]:null}};
const D={sideMeta:id=>metas[id]||{},pack:id=>packs[id]};
const base={date:'2026-08-10',windows:[{id:'mon-health',start:360,end:540,groups:['Pessoal'],allowSideQuests:true,sideQuestDedicated:true},{id:'mon-lunch',start:720,end:780,groups:['Pessoal'],allowSideQuests:true,sideQuestDedicated:true}],slots:[{id:'generic-lunch',q:quests[3],start:720,end:780,sideQuest:true,group:'Pessoal'}],outsideCalendar:[]};
const E={planDay:()=>JSON.parse(JSON.stringify(base))};
const ctx={console,state:{},quests:()=>quests,done:()=>false,dfrom:s=>new Date(`${s}T12:00:00Z`),window:{MyPerformanceCalendarModel:B,MyPerformanceCalendarDomain:D,MyPerformancePlannerEngine:E,MyPerformanceRoutine:{}}};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(code,ctx);
const p=E.planDay('2026-08-10'),ids=p.slots.map(s=>s.q?.id);assert(ids.includes('gym'),'treino prioritário deve entrar na janela de saúde');assert(ids.includes('breakfast'),'café da manhã prioritário deve coexistir na janela de saúde');assert(ids.includes('lunch'),'almoço explícito deve substituir filler genérico na janela de almoço');assert(!p.slots.some(s=>s.id==='generic-lunch'),'filler genérico deve ceder espaço à Side Quest explícita');assert(p.slots.find(s=>s.q?.id==='lunch').laneAuthorityV13);console.log('Side Quest lane authority V13 dedicated-window priority passed');
