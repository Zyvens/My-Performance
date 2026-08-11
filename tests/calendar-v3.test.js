const fs=require('fs'),vm=require('vm'),assert=require('assert');
const DAY=86400000;
const ctx={console,Date,JSON,Math,setTimeout:()=>0,clearTimeout:()=>{},CustomEvent:function(type,init){this.type=type;this.detail=init?.detail},dispatchEvent:()=>{},localStorage:{m:new Map(),getItem(k){return this.m.get(k)||null},setItem(k,v){this.m.set(k,String(v))}},state:{completed:{},xpLedger:{},bonusLedger:{},customQuests:[],overrides:{},questPlans:{}},DOMAIN_META:{Pessoal:{},GSA:{},Estudos:{},Carreira:{}},QUEST_SEED:[]};
ctx.globalThis=ctx;ctx.window=ctx;
ctx.iso=d=>{const x=new Date(d||Date.now());x.setMinutes(x.getMinutes()-x.getTimezoneOffset());return x.toISOString().slice(0,10)};
ctx.dfrom=s=>new Date(`${s}T12:00:00`);ctx.today=()=> '2026-08-11';ctx.addDays=(s,n)=>{const d=ctx.dfrom(s);d.setDate(d.getDate()+n);return ctx.iso(d)};ctx.diffDays=(a,b)=>Math.round((ctx.dfrom(b)-ctx.dfrom(a))/DAY);ctx.weekStart=s=>{const d=ctx.dfrom(s),n=(d.getDay()+6)%7;d.setDate(d.getDate()-n);return ctx.iso(d)};
ctx.saveState=()=>ctx.localStorage.setItem('my_performance_v1',JSON.stringify(ctx.state));
ctx.Q=o=>ctx.QUEST_SEED.push(Object.assign({domain:'Pessoal',questType:'side',cadence:'once',weekdays:[],xp:20,difficulty:1},o));
[
 {id:'personal-wake',title:'Acordar',domain:'Pessoal',cadence:'daily',weekdays:[1,2,3,4,5,6]},
 {id:'routine-water-am',title:'Água',domain:'Pessoal',cadence:'daily',weekdays:[1,2,4,5,6]},
 {id:'routine-hygiene-am',title:'Higiene',domain:'Pessoal',cadence:'daily',weekdays:[1,2,4,5,6]},
 {id:'personal-breakfast',title:'Café',domain:'Pessoal',cadence:'daily',weekdays:[1,2,4,5,6]},
 {id:'personal-gym',title:'Academia',domain:'Pessoal',cadence:'daily',weekdays:[1,2,4,6],timeStart:'06:30',fixedTime:true,durationMin:90},
 {id:'routine-shower-post-gym',title:'Banho',domain:'Pessoal',cadence:'daily',weekdays:[1,2,4,6],timeStart:'08:00',fixedTime:true,durationMin:30},
 {id:'personal-lunch',title:'Almoço',domain:'Pessoal',cadence:'daily',weekdays:[1,2,3,4,5,6]},
 {id:'routine-dinner',title:'Jantar',domain:'Pessoal',cadence:'daily',weekdays:[1,2,3,4]},
 {id:'routine-hygiene-night',title:'Higiene sono',domain:'Pessoal',cadence:'daily',weekdays:[1,2,3,4]},
 {id:'personal-sleep',title:'Dormir',domain:'Pessoal',cadence:'daily',weekdays:[1,2,3,4]},
 {id:'career-impact',title:'Ação carreira',domain:'Carreira',cadence:'daily',weekdays:[2]},
 {id:'study-aug-diag',title:'Diagnóstico Transpetro',domain:'Estudos',questType:'main',cadence:'monthly',startDate:'2026-08-01',dueDate:'2026-08-16',monthDay:16,durationMin:90},
 {id:'gsa-c2',title:'Cadastro no SisFAPERJ',domain:'GSA',questType:'main',cadence:'once',startDate:'2026-08-05',dueDate:'2026-08-17',durationMin:60}
].forEach(ctx.Q);
ctx.quests=()=>ctx.QUEST_SEED.concat(ctx.state.customQuests||[]).map(q=>Object.assign({},q,ctx.state.overrides[q.id]||{})).filter(q=>!q.disabled);
ctx.questById=id=>ctx.quests().find(q=>q.id===id);
ctx.scheduled=(q,date)=>{if(q.startDate&&date<q.startDate)return false;const w=ctx.dfrom(date).getDay();if(q.cadence==='daily'||q.cadence==='weekly')return !(q.weekdays||[]).length||(q.weekdays||[]).includes(w);if(q.cadence==='monthly')return true;if(q.cadence==='once')return date>=(q.startDate||date)&&date<=(q.dueDate||date);return false};
ctx.done=()=>false;ctx.hasEverDone=()=>false;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('calendar-model-v3.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('campaign-policy-v3.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('planner-engine-v3.js','utf8'),ctx);
const M=ctx.MyPerformanceCalendarModel,E=ctx.MyPerformancePlannerEngine;
assert(M&&E,'calendar model and planner must load');
assert.strictEqual(M.model().campaigns.length,3,'three current campaigns must be seeded');
assert.deepStrictEqual(Array.from(M.groups().map(x=>x.id)),['GSA','Estudos','Pessoal']);
assert.strictEqual(ctx.questById('career-impact').domain,'Pessoal','legacy Carreira group must be removed');
assert(!('gymStart' in (ctx.state.routineSettings||{})),'global gymStart must not survive migration');
assert.strictEqual(ctx.questById('gsa-main-editais').campaignContainer,true,'generic Editais mission must be a campaign container, not a deadline');
assert.strictEqual(ctx.questById('gsa-main-editais').dueDate,'','generic Editais campaign must have no fictitious deadline');
const tue=E.planDay('2026-08-11');
const therapy=tue.slots.find(x=>x.q?.id==='personal-therapy-weekly');
assert(therapy&&therapy.start===480&&therapy.end===510&&therapy.fixed,'Tuesday therapy must be immovable 08:00-08:30');
const gym=tue.slots.find(x=>x.q?.id==='personal-gym');
assert(gym&&gym.start===720&&gym.end===810,'Tuesday gym preference must be 12:00-13:30');
assert(!tue.slots.some(x=>x.q?.id==='personal-gym'&&x.start===390),'Tuesday gym must never be resurrected at 06:30');
assert(tue.slots.some(x=>x.q?.id==='routine-shower-post-gym'),'Tuesday shower mission must stay on Tuesday, but remain movable');
const preferenceOnly=['personal-wake','routine-water-am','routine-hygiene-am','personal-breakfast','personal-gym','routine-shower-post-gym','personal-lunch','routine-dinner','routine-hygiene-night','personal-sleep','personal-evening-activity'];
for(const id of preferenceOnly)assert(tue.slots.filter(x=>x.q?.id===id).length<=1,`${id} must never be scheduled twice on the same day`);
for(let i=1;i<tue.slots.length;i++){const a=tue.slots[i-1],b=tue.slots[i];if(a.end>b.start)throw new Error(`Tuesday overlap: ${a.q?.title} ${a.start}-${a.end} x ${b.q?.title} ${b.start}-${b.end}`)}
const wed=E.planDay('2026-08-12');const bni=wed.slots.find(x=>x.q?.id==='gsa-bni-weekly');assert(bni&&bni.start===360&&bni.end===660&&bni.fixed,'BNI must remain fixed Wednesday 06:00-11:00');
const thu=E.planDay('2026-08-13');const cell=thu.slots.find(x=>x.q?.id==='personal-zion-brave-weekly');assert(cell&&cell.start===1140&&cell.end===1380&&cell.fixed,'Zion Brave must remain fixed Thursday 19:00-23:00');
const edital=ctx.questById('gsa-c2');assert.strictEqual(M.campaignForQuest(edital).id,'campaign-editais','SisFAPERJ must belong to Editais campaign');
const beforeDeadline=edital.dueDate;assert(E.discardDay('2026-08-11'),'discard day should be accepted once');const discarded=E.planDay('2026-08-11');assert(discarded.discarded,'day must be marked discarded');assert(discarded.slots.some(x=>x.q?.id==='personal-therapy-weekly'),'discarding a day must not erase its fixed commitment');assert.strictEqual(ctx.questById('gsa-c2').dueDate,beforeDeadline,'discarding must never move mission deadline');
console.log('Calendar V3 behavioral contracts passed');
