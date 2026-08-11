const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

function dfrom(s){return new Date(`${s}T12:00:00Z`)}
const date='2026-08-11'; // Tuesday
const therapy={id:'personal-therapy-weekly',title:'Terapia',domain:'Pessoal',category:'Saúde',cadence:'weekly',weekdays:[2],timeStart:'08:00',timeEnd:'08:30',durationMin:30,fixedTime:true,essential:true,externalActivity:true,commuteOutMin:60,commuteReturnMin:60};
const gym={id:'personal-gym',title:'Academia / treino do dia',domain:'Pessoal',category:'Corpo',durationMin:90};
const basePlan={
  date,wake:360,end:1320,capacityDeferred:[],capacityWarnings:[],capacity:{},
  slots:[
    {q:gym,start:390,end:480,originDate:date},
    {q:{id:`shower-${date}`,title:'Banho',domain:'Pessoal',category:'Higiene',anchorBlock:true,essential:true},start:480,end:510,originDate:date},
    {q:{id:`breakfast-${date}`,title:'Café da manhã',domain:'Pessoal',category:'Alimentação',anchorBlock:true,essential:true},start:510,end:530,originDate:date},
    {q:{id:'adaptive-funding-1',title:'Avançar · Funding',domain:'GSA',adaptiveSession:true,parentId:'funding'},start:570,end:630,originDate:date}
  ]
};
const window={MyPerformanceRoutine:{planDay:()=>JSON.parse(JSON.stringify(basePlan)),missionNow:()=>null}};
const context={window,today:()=>date,dfrom,questById:id=>id==='personal-therapy-weekly'?therapy:id==='personal-gym'?gym:null,console,Date};
vm.createContext(context);vm.runInContext(fs.readFileSync('tuesday-therapy-layout.js','utf8'),context);
const p=context.window.MyPerformanceRoutine.planDay(date);
function one(id){return p.slots.filter(x=>x.q.id===id)}
assert.strictEqual(one('personal-therapy-weekly').length,1,'therapy must always exist exactly once on Tuesday');
assert.deepStrictEqual([one('personal-therapy-weekly')[0].start,one('personal-therapy-weekly')[0].end],[480,510]);
assert.deepStrictEqual([one(`commute-out-personal-therapy-weekly-${date}`)[0].start,one(`commute-out-personal-therapy-weekly-${date}`)[0].end],[420,480]);
assert.deepStrictEqual([one(`commute-back-personal-therapy-weekly-${date}`)[0].start,one(`commute-back-personal-therapy-weekly-${date}`)[0].end],[510,570]);
assert.deepStrictEqual([one('personal-gym')[0].start,one('personal-gym')[0].end],[570,660],'gym must be the first block after returning from therapy');
assert.deepStrictEqual([one(`shower-${date}`)[0].start,one(`shower-${date}`)[0].end],[660,690],'shower must follow gym');
assert.deepStrictEqual([one(`breakfast-${date}`)[0].start,one(`breakfast-${date}`)[0].end],[390,410],'breakfast must move before the commute');
assert(!p.slots.some(x=>x.q.id==='adaptive-funding-1'),'flexible adaptive work must not overlap therapy-first morning');
assert(p.capacityDeferred.some(x=>x.q.id==='adaptive-funding-1'),'displaced flexible work must be preserved as deferred context');
const xs=p.slots.slice().sort((a,b)=>a.start-b.start||a.end-b.end);for(let i=1;i<xs.length;i++)assert(xs[i-1].end<=xs[i].start,`Tuesday plan collision: ${xs[i-1].q.title} x ${xs[i].q.title}`);
assert.strictEqual(p.capacity.tuesdayTherapyProtected,true);
console.log('Tuesday therapy-first layout passed');
