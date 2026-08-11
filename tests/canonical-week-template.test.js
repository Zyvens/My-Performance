const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

function dfrom(s){return new Date(`${s}T12:00:00Z`)}
function addDays(s,n){const d=dfrom(s);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function diffDays(a,b){return Math.round((dfrom(b)-dfrom(a))/86400000)}
const qmap={
  'personal-wake':{id:'personal-wake',title:'Acordar no horário planejado',domain:'Pessoal',category:'Rotina'},
  'personal-gym':{id:'personal-gym',title:'Academia / treino do dia',domain:'Pessoal',category:'Corpo',questType:'main'},
  'personal-therapy-weekly':{id:'personal-therapy-weekly',title:'Terapia',domain:'Pessoal',category:'Saúde',fixedTime:true,essential:true,externalActivity:true},
  'personal-zion-brave-weekly':{id:'personal-zion-brave-weekly',title:'Célula Zion Brave',domain:'Pessoal',category:'Fé / Comunidade',fixedTime:true,essential:true,externalActivity:true},
  'gsa-bni-weekly':{id:'gsa-bni-weekly',title:'BNI Fire — reunião semanal',domain:'GSA',category:'BNI',questType:'main',fixedTime:true,essential:true,countsAsGsa:true,externalActivity:true}
};
function base(date){return{date,wake:360,end:1320,requestedSleep:1320,slots:[],capacityDeferred:[],movedOut:[],capacityWarnings:[],critical:[],capacity:{}}}
const state={weekendProtection:{extreme:{}}};
const window={MyPerformanceRoutine:{planDay:date=>base(date),missionNow:()=>null,toTime:m=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`},MyPerformanceAdaptive:{priority:q=>q.priorityLevel||(q.questType==='main'?'high':'normal')}};
const context={window,state,today:()=> '2026-08-10',dfrom,addDays,diffDays,done:()=>false,questById:id=>qmap[id]||null,toTime:window.MyPerformanceRoutine.toTime,Date,console};
vm.createContext(context);vm.runInContext(fs.readFileSync('canonical-week-template.js','utf8'),context);
const plan=date=>context.window.MyPerformanceCanonicalWeek.plan(date);
const minutes=(p,domain)=>p.slots.filter(x=>x.q.domain===domain).reduce((n,x)=>n+x.end-x.start,0);
const byId=(p,id)=>p.slots.find(x=>x.q.id===id);
function noCollision(p){const xs=p.slots.slice().sort((a,b)=>a.start-b.start||a.end-b.end);for(let i=1;i<xs.length;i++)assert(xs[i-1].end<=xs[i].start,`${p.date}: ${xs[i-1].q.title} collides with ${xs[i].q.title}`)}

const mon=plan('2026-08-10');
assert.deepStrictEqual([byId(mon,'personal-gym').start,byId(mon,'personal-gym').end],[390,480]);
assert.strictEqual(minutes(mon,'Estudos'),180);assert.strictEqual(minutes(mon,'GSA'),480);noCollision(mon);

const tue=plan('2026-08-11');
assert.deepStrictEqual([byId(tue,'personal-therapy-weekly').start,byId(tue,'personal-therapy-weekly').end],[480,510]);
assert.deepStrictEqual([byId(tue,'personal-gym').start,byId(tue,'personal-gym').end],[720,810]);
assert(tue.slots.some(x=>x.q.title==='Retorno da terapia / margem de trânsito'&&x.start===510&&x.end===540));
assert.strictEqual(minutes(tue,'Estudos'),180);noCollision(tue);

const wed=plan('2026-08-12');
assert.deepStrictEqual([byId(wed,'gsa-bni-weekly').start,byId(wed,'gsa-bni-weekly').end],[360,660]);
assert.deepStrictEqual([byId(wed,'personal-gym').start,byId(wed,'personal-gym').end],[720,810]);
assert(wed.slots.some(x=>x.q.title==='Almoço'&&x.start===810&&x.end===870));
assert(wed.slots.some(x=>x.q.domain==='GSA'&&x.start===870),'Wednesday GSA second block must start after lunch at 14:30');
assert.strictEqual(minutes(wed,'Estudos'),180);noCollision(wed);

const thu=plan('2026-08-13');
assert(thu.slots.some(x=>x.q.domain==='Estudos'&&x.start===900&&x.end===1080),'Thursday must reserve 15:00-18:00 for study');
assert.deepStrictEqual([byId(thu,'personal-zion-brave-weekly').start,byId(thu,'personal-zion-brave-weekly').end],[1140,1380]);
assert.strictEqual(minutes(thu,'Estudos'),180);noCollision(thu);

const fri=plan('2026-08-14');
assert(fri.slots.some(x=>x.q.domain==='Estudos'&&x.start===960&&x.end===1140),'Friday must reserve 16:00-19:00 for study');
assert.strictEqual(minutes(fri,'Estudos'),180);noCollision(fri);

const sat=plan('2026-08-15');
assert.deepStrictEqual([byId(sat,'personal-gym').start,byId(sat,'personal-gym').end],[390,480]);
assert(sat.slots.some(x=>x.q.domain==='Estudos'&&x.start===540&&x.end===720));
assert.strictEqual(minutes(sat,'Estudos'),180);noCollision(sat);

const sun=plan('2026-08-16');
assert.strictEqual(sun.slots.length,0,'Sunday stays protected by default');
assert.strictEqual(sun.sundayRest,true);

for(const p of [mon,tue,wed,thu,fri,sat])assert.strictEqual(p.capacity.workoutTarget,6,'weekly workout target must be 6');
console.log('Canonical weekly template passed');
