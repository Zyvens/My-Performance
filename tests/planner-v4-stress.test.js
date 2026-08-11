const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx={console,Date,JSON,Math,setTimeout:()=>0,clearTimeout:()=>{},CustomEvent:function(type,init){this.type=type;this.detail=init?.detail},dispatchEvent:()=>{},addEventListener:()=>{},localStorage:{m:new Map(),getItem(k){return this.m.get(k)||null},setItem(k,v){this.m.set(k,String(v))}},state:{completed:{},xpLedger:{},bonusLedger:{},customQuests:[],overrides:{},questPlans:{},calendarV3:{engine:{horizonDays:120,minSessionMin:30,maxSessionMin:120}}},DOMAIN_META:{Pessoal:{},GSA:{},Estudos:{},Carreira:{}},QUEST_SEED:[]};
ctx.globalThis=ctx;ctx.window=ctx;
ctx.iso=d=>{const x=new Date(d||Date.now());x.setMinutes(x.getMinutes()-x.getTimezoneOffset());return x.toISOString().slice(0,10)};
ctx.dfrom=s=>new Date(`${s}T12:00:00`);ctx.today=()=> '2026-08-11';ctx.addDays=(s,n)=>{const d=ctx.dfrom(s);d.setDate(d.getDate()+n);return ctx.iso(d)};ctx.diffDays=(a,b)=>Math.round((ctx.dfrom(b)-ctx.dfrom(a))/864e5);ctx.weekStart=s=>{const d=ctx.dfrom(s),n=(d.getDay()+6)%7;d.setDate(d.getDate()-n);return ctx.iso(d)};
ctx.saveState=()=>ctx.localStorage.setItem('my_performance_v1',JSON.stringify(ctx.state));
ctx.Q=o=>ctx.QUEST_SEED.push(Object.assign({domain:'Pessoal',questType:'side',cadence:'once',weekdays:[],xp:20,difficulty:1},o));
for(let i=0;i<150;i++)ctx.Q({id:`stress-main-${i}`,title:`Stress Main ${i}`,domain:i%3===0?'Estudos':'GSA',category:i%3===0?'Transpetro':'Teste',questType:'main',cadence:'once',startDate:'2026-08-10',dueDate:ctx.addDays('2026-08-11',10+(i%100)),durationMin:60+(i%3)*30,priorityLevel:i%11===0?'critical':'high'});
[
 {id:'personal-wake',title:'Acordar',domain:'Pessoal',cadence:'daily',weekdays:[1,2,3,4,5,6]},
 {id:'routine-water-am',title:'Água',domain:'Pessoal',cadence:'daily',weekdays:[1,2,4,5,6]},
 {id:'routine-hygiene-am',title:'Higiene',domain:'Pessoal',cadence:'daily',weekdays:[1,2,4,5,6]},
 {id:'personal-breakfast',title:'Café',domain:'Pessoal',cadence:'daily',weekdays:[1,2,4,5,6]},
 {id:'personal-gym',title:'Academia',domain:'Pessoal',cadence:'daily',weekdays:[1,2,3,4,5,6]},
 {id:'routine-shower-post-gym',title:'Banho',domain:'Pessoal',cadence:'daily',weekdays:[1,2,3,4,5,6]},
 {id:'personal-lunch',title:'Almoço',domain:'Pessoal',cadence:'daily',weekdays:[1,2,3,4,5,6]},
 {id:'routine-dinner',title:'Jantar',domain:'Pessoal',cadence:'daily',weekdays:[1,2,3,4]},
 {id:'routine-hygiene-night',title:'Higiene sono',domain:'Pessoal',cadence:'daily',weekdays:[1,2,3,4]},
 {id:'personal-sleep',title:'Dormir',domain:'Pessoal',cadence:'daily',weekdays:[1,2,3,4]}
].forEach(ctx.Q);
ctx.quests=()=>ctx.QUEST_SEED.concat(ctx.state.customQuests||[]).map(q=>Object.assign({},q,ctx.state.overrides[q.id]||{})).filter(q=>!q.disabled);
ctx.questById=id=>ctx.quests().find(q=>q.id===id);
ctx.scheduled=(q,date)=>{if(q.startDate&&date<q.startDate)return false;const w=ctx.dfrom(date).getDay();if(q.cadence==='daily'||q.cadence==='weekly')return !(q.weekdays||[]).length||(q.weekdays||[]).includes(w);if(q.cadence==='monthly')return true;if(q.cadence==='once')return date>=(q.startDate||date)&&date<=(q.dueDate||date);return false};
ctx.done=()=>false;ctx.hasEverDone=()=>false;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('calendar-model-v3.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('campaign-policy-v3.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('planner-engine-v4.js','utf8'),ctx);
const E=ctx.MyPerformancePlannerEngine;assert(E&&E.VERSION===4,'Planner V4 must load');
const first=E.planDay('2026-08-11');assert(first.engine==='calendar-v4');
for(let i=0;i<30;i++){E.planDay('2026-08-11');E.missionNow('2026-08-11',new Date('2026-08-11T10:00:00'));E.diagnostics('2026-08-11')}
for(let i=0;i<7;i++)E.planDay(ctx.addDays('2026-08-11',i));
const m=E.metrics();assert(m.rangeCacheEntries<=2,`range cache grew unexpectedly: ${m.rangeCacheEntries}`);assert(m.capacityCacheEntries<=500,`capacity cache grew unexpectedly: ${m.capacityCacheEntries}`);
const tue=E.planDay('2026-08-11');assert(tue.slots.some(x=>x.q?.id==='personal-therapy-weekly'&&x.start===480&&x.end===510),'therapy must stay fixed');assert(!tue.slots.some(x=>x.q?.id==='personal-gym'&&x.start===390),'Tuesday gym must not return to 06:30');
for(let i=1;i<tue.slots.length;i++)assert(tue.slots[i-1].end<=tue.slots[i].start,`overlap ${tue.slots[i-1].id} / ${tue.slots[i].id}`);
console.log('Planner V4 bounded-memory stress regression passed',m);
