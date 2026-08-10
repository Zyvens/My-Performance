const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

function dfrom(s){return new Date(`${s}T12:00:00Z`)}
const basePlan={
  date:'2026-08-11',wake:360,end:1320,used:300,capacityDeferred:[],capacityWarnings:[],
  slots:[
    {q:{id:'therapy',title:'Terapia',domain:'Pessoal',fixedTime:true,essential:true,externalActivity:true},start:480,end:510},
    {q:{id:'commute-out',domain:'Pessoal',commuteBlock:true,essential:true},start:420,end:480},
    {q:{id:'commute-back',domain:'Pessoal',commuteBlock:true,essential:true},start:510,end:570},
    {q:{id:'gsa-a',domain:'GSA',capacityGsa:true,capacityBlock:true},start:600,end:720},
    {q:{id:'gsa-b',domain:'GSA',capacityGsa:true,capacityBlock:true},start:720,end:840}
  ]
};
const context={
  window:{MyPerformanceRoutine:{planDay:()=>JSON.parse(JSON.stringify(basePlan)),missionNow:()=>null}},
  today:()=> '2026-08-11',dfrom,
  questById:id=>id==='study-focus'?{id:'study-focus',title:'Sessão foco — específicos',domain:'Estudos',category:'Transpetro',questType:'main',cadence:'daily',durationMin:90,xp:80,difficulty:3}:null,
  Date,console
};
vm.createContext(context);vm.runInContext(fs.readFileSync('balanced-capacity.js','utf8'),context);
const p=context.window.MyPerformanceBalancedCapacity.plan('2026-08-11');
const study=p.slots.filter(x=>x.q.domain==='Estudos').reduce((n,x)=>n+x.end-x.start,0);
const gsa=p.slots.filter(x=>x.q.domain==='GSA').reduce((n,x)=>n+x.end-x.start,0);
assert(study>=90,'weekday study must retain at least 90 protected minutes');
assert(gsa<240,'synthetic GSA filler must yield capacity to protected study');
assert(p.slots.some(x=>x.q.id==='therapy'&&x.start===480&&x.end===510),'fixed therapy must remain untouched');
assert.strictEqual(p.capacity.studyProtectedMin,90);
assert.strictEqual(p.capacity.gsaSoftTarget,480);
console.log('Balanced capacity protected study passed');
