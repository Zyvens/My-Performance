const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

function dfrom(s){return new Date(`${s}T12:00:00Z`)}
const qmap={
  'personal-therapy-weekly':{id:'personal-therapy-weekly',title:'Terapia',domain:'Pessoal',category:'Saúde',cadence:'weekly',fixedTime:true,essential:true,externalActivity:true},
  'gsa-bni-weekly':{id:'gsa-bni-weekly',title:'BNI Fire — reunião semanal',domain:'GSA',category:'BNI',cadence:'weekly',fixedTime:true,essential:true,externalActivity:true,countsAsGsa:true},
  'personal-zion-brave-weekly':{id:'personal-zion-brave-weekly',title:'Célula Zion Brave',domain:'Pessoal',category:'Fé / Comunidade',cadence:'weekly',fixedTime:true,essential:true,externalActivity:true}
};
function brokenPlan(date){
  const w=dfrom(date).getUTCDay();
  const study=w===4?[900,1080]:[1140,1320];
  const slots=[{q:{id:`study-${date}`,title:'Estudar',domain:'Estudos',category:'Transpetro',capacityBlock:true},start:study[0],end:study[1],originDate:date}];
  if(w===2)slots.push({q:{id:'personal-gym',title:'Academia errada',domain:'Pessoal',essential:true},start:450,end:500,originDate:date});
  return{date,wake:w===3?270:360,end:w===4?1410:1350,slots,capacityWarnings:[],critical:[],capacityDeferred:[],capacity:{}};
}
const window={
  MyPerformanceRoutine:{planDay:brokenPlan,missionNow:()=>null,toTime:n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`},
  MyPerformanceCanonicalWeek:{plan:brokenPlan},
  MyPerformanceScheduler2:{summary:()=>({}),startTracking:()=>{}},
  MyPerformanceDiscardDay:{record:()=>null},
  addEventListener:()=>{}
};
const state={view:'dashboard',plannerDate:'2026-08-11',scheduler2:{dayContexts:{}}};
const context={
  window,state,dfrom,today:()=> '2026-08-11',questById:id=>qmap[id]||null,
  renderToday:function baseRender(){},render:()=>{},questCard:()=>'<article></article>',bindQuestCards:()=>{},
  fmt:s=>s,esc:s=>String(s),document:{getElementById:()=>null,querySelectorAll:()=>[],querySelector:()=>null},
  setTimeout:()=>{},console,Date
};
vm.createContext(context);vm.runInContext(fs.readFileSync('schedule-authority.js','utf8'),context);
const A=context.window.MyPerformanceScheduleAuthority;
assert(A,'schedule authority must load');
assert.strictEqual(A.STUDY_MIN,180);

const cases=[
  ['2026-08-11','personal-therapy-weekly',480,510],
  ['2026-08-12','gsa-bni-weekly',360,660],
  ['2026-08-13','personal-zion-brave-weekly',1140,1380]
];
for(const [date,id,start,end] of cases){
  const p=A.plan(date),hits=p.slots.filter(x=>x.q.id===id);
  assert.strictEqual(hits.length,1,`${id} must appear exactly once on ${date}`);
  assert.deepStrictEqual([hits[0].start,hits[0].end],[start,end],`${id} must keep its canonical time`);
  assert.strictEqual(hits[0].q.canonicalMandatory,true,`${id} must be marked mandatory`);
  const study=p.slots.filter(x=>x.q.domain==='Estudos').reduce((n,x)=>n+x.end-x.start,0);
  assert(study>=180,`${date} must retain at least 3h study`);
  const xs=p.slots.slice().sort((a,b)=>a.start-b.start||a.end-b.end);
  for(let i=1;i<xs.length;i++)assert(xs[i-1].end<=xs[i].start,`${date}: ${xs[i-1].q.title} overlaps ${xs[i].q.title}`);
  assert.strictEqual(p.scheduleAuthority.validated,true,`${date} authoritative plan must validate`);
}
const tue=A.plan('2026-08-11');
assert(!tue.slots.some(x=>x.q.id==='personal-gym'&&x.start<510&&x.end>480),'conflicting Tuesday gym must be removed around therapy');
assert(tue.capacityDeferred.some(x=>x.q.id==='personal-gym'),'displaced conflict must be retained as deferred context');
console.log('Mandatory schedule authority passed');
