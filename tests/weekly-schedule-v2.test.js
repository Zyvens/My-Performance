const fs=require('fs'),vm=require('vm'),assert=require('assert');
const qs=[
 {id:'personal-wake',title:'Wake',domain:'Pessoal',category:'Rotina',cadence:'daily',weekdays:[1,2,3,4,5,6]},
 {id:'routine-water-am',title:'Water',domain:'Pessoal',category:'Rotina',cadence:'daily',weekdays:[1,2,3,4,5,6]},
 {id:'routine-hygiene-am',title:'Hygiene',domain:'Pessoal',category:'Rotina',cadence:'daily',weekdays:[1,2,3,4,5,6]},
 {id:'personal-breakfast',title:'Breakfast',domain:'Pessoal',category:'Food',cadence:'daily',weekdays:[1,2,3,4,5,6]},
 {id:'personal-gym',title:'Gym',domain:'Pessoal',category:'Corpo',cadence:'daily',weekdays:[1,2,3,4,5,6],xp:40},
 {id:'routine-shower-post-gym',title:'Shower',domain:'Pessoal',category:'Higiene',cadence:'daily',weekdays:[1,2,3,4,5,6],xp:10},
 {id:'personal-therapy-weekly',title:'Terapia',domain:'Pessoal',category:'Saúde',cadence:'weekly',weekdays:[2],xp:20},
 {id:'gsa-bni-weekly',title:'BNI',domain:'GSA',category:'BNI',cadence:'weekly',weekdays:[3],xp:90},
 {id:'personal-zion-brave-weekly',title:'Célula Zion Brave',domain:'Pessoal',category:'Fé',cadence:'weekly',weekdays:[4],xp:70},
 {id:'gsa-task',title:'GSA task',domain:'GSA',category:'Work',cadence:'daily',weekdays:[1,2,3,4,5],durationMin:60,priorityLevel:'high'},
 {id:'study-task',title:'Study task',domain:'Estudos',category:'Transpetro',cadence:'daily',weekdays:[1,2,3,4,5,6],durationMin:90,priorityLevel:'critical'}
];
const state={routineSettings:{gymStart:'06:25',muayDays:[1],muayFriday:true},capacityBudget:{settings:{fifthWorkoutDay:6}},overrides:{'personal-gym':{timeStart:'06:30',timeEnd:'08:00',fixedTime:true},'routine-muay':{disabled:false}},scheduler2:{dayContexts:{'2026-08-11':{actualWakeMin:500}}},dayPlanning:{skipped:{}}};
const localStorage={m:new Map(),getItem(k){return this.m.get(k)||null},setItem(k,v){this.m.set(k,String(v))}};
const dfrom=s=>new Date(`${s}T12:00:00`),toTime=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
const resolved=()=>qs.map(q=>Object.assign({},q,state.overrides[q.id]||{})).filter(q=>!q.disabled);
const ctx={console,state,localStorage,dfrom,today:()=> '2026-08-11',quests:resolved,questById:id=>resolved().find(q=>q.id===id),scheduled:(q,date)=>{const w=dfrom(date).getDay();return !q.weekdays||q.weekdays.includes(w)},done:()=>false,diffDays:(a,b)=>Math.round((dfrom(b)-dfrom(a))/864e5),fmt:s=>s,esc:s=>String(s),questCard:q=>`<q>${q.title}</q>`,bindQuestCards:()=>{},renderConfig:()=>{},renderToday:()=>{},render:()=>{},saveState:()=>{},toast:()=>{},addDays:(s,n)=>{const d=dfrom(s);d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)},document:{getElementById:()=>null,querySelectorAll:()=>[]},setTimeout:()=>{},window:{MyPerformanceRoutine:{toTime,planDay:()=>({}),missionNow:()=>({})},MyPerformanceScheduler2:{startTracking:()=>{}},MyPerformanceDiscardDay:{record:()=>null},MyPerformanceRecalcCenterFix:{bind:()=>{}}}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('weekly-schedule-v2.js','utf8'),ctx);
const A=ctx.window.MyPerformanceWeeklyScheduleV2;assert(A,'weekly schedule v2 must load');
assert.strictEqual(state.routineSettings.gymStart,undefined,'global gymStart must be migrated away');
assert.strictEqual(state.routineSettings.muayDays,undefined,'Muay engine settings must be migrated away');
assert.strictEqual(state.scheduler2.dayContexts['2026-08-11'],undefined,'legacy late-wake context must not resurrect obsolete fixed slots');
assert.strictEqual(state.overrides['routine-muay'].disabled,true,'legacy Muay engine quest must be disabled');
function check(date){const p=A.plan(date),xs=p.slots.slice().sort((a,b)=>a.start-b.start||a.end-b.end);for(let i=1;i<xs.length;i++)assert(xs[i-1].end<=xs[i].start,`${date}: ${xs[i-1].q.title} overlaps ${xs[i].q.title}`);assert.strictEqual(p.critical.length,0,`${date}: canonical plan must not generate fixed conflicts`);return p}
const hit=(p,id)=>p.slots.find(x=>x.q.id===id);
const tue=check('2026-08-11');
assert.deepStrictEqual([hit(tue,'personal-therapy-weekly').start,hit(tue,'personal-therapy-weekly').end],[480,510],'Tuesday therapy must be 08:00–08:30');
assert.deepStrictEqual([hit(tue,'personal-gym').start,hit(tue,'personal-gym').end],[720,810],'Tuesday gym must be 12:00–13:30');
assert.deepStrictEqual([hit(tue,'routine-shower-post-gym').start,hit(tue,'routine-shower-post-gym').end],[810,840],'Tuesday shower must follow gym at 13:30');
assert(!tue.slots.some(x=>x.q.id==='personal-gym'&&x.start<720),'Tuesday must never use the obsolete 06:30 gym slot');
assert(tue.scheduleAuthority.studyMinutes>=180,'Tuesday must preserve at least 3h study');
const wed=check('2026-08-12');assert.deepStrictEqual([hit(wed,'gsa-bni-weekly').start,hit(wed,'gsa-bni-weekly').end],[360,660],'Wednesday BNI must be 06:00–11:00');
const thu=check('2026-08-13');assert.deepStrictEqual([hit(thu,'personal-zion-brave-weekly').start,hit(thu,'personal-zion-brave-weekly').end],[1140,1380],'Thursday Zion Brave must be 19:00–23:00');
for(const date of ['2026-08-10','2026-08-11','2026-08-12','2026-08-13','2026-08-14','2026-08-15'])assert(check(date).scheduleAuthority.studyMinutes>=180,`${date}: 3h study floor missing`);
console.log('Weekly schedule v2 canonical runtime passed');
