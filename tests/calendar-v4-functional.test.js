const fs=require('fs'),vm=require('vm'),assert=require('assert');
const listeners={};
const ctx={console,Date,JSON,Math,setTimeout:()=>0,clearTimeout:()=>{},CustomEvent:function(type,init){this.type=type;this.detail=init?.detail},localStorage:{m:new Map(),getItem(k){return this.m.get(k)||null},setItem(k,v){this.m.set(k,String(v))}},state:{completed:{},xpLedger:{},bonusLedger:{},customQuests:[],overrides:{},questPlans:{}},DOMAIN_META:{Pessoal:{},GSA:{},Estudos:{},Carreira:{}},QUEST_SEED:[]};
ctx.globalThis=ctx;ctx.window=ctx;ctx.addEventListener=(type,fn)=>(listeners[type]||(listeners[type]=[])).push(fn);ctx.dispatchEvent=e=>{for(const fn of listeners[e.type]||[])fn(e)};
ctx.iso=d=>{const x=new Date(d||Date.now());x.setMinutes(x.getMinutes()-x.getTimezoneOffset());return x.toISOString().slice(0,10)};ctx.dfrom=s=>new Date(`${s}T12:00:00`);ctx.today=()=> '2026-08-11';ctx.addDays=(s,n)=>{const d=ctx.dfrom(s);d.setDate(d.getDate()+n);return ctx.iso(d)};ctx.diffDays=(a,b)=>Math.round((ctx.dfrom(b)-ctx.dfrom(a))/864e5);ctx.weekStart=s=>{const d=ctx.dfrom(s),n=(d.getDay()+6)%7;d.setDate(d.getDate()-n);return ctx.iso(d)};ctx.saveState=()=>{ctx.localStorage.setItem('my_performance_v1',JSON.stringify(ctx.state));ctx.dispatchEvent(new ctx.CustomEvent('my-performance-state-saved',{detail:ctx.state}))};ctx.Q=o=>ctx.QUEST_SEED.push(Object.assign({domain:'Pessoal',questType:'side',cadence:'once',weekdays:[],xp:20,difficulty:1},o));
[
{id:'personal-wake',title:'Acordar',domain:'Pessoal',cadence:'daily',weekdays:[1,2,3,4,5,6]},
{id:'routine-water-am',title:'Água',domain:'Pessoal',cadence:'daily',weekdays:[1,2,4,5,6]},
{id:'routine-hygiene-am',title:'Higiene',domain:'Pessoal',cadence:'daily',weekdays:[1,2,4,5,6]},
{id:'personal-breakfast',title:'Café',domain:'Pessoal',cadence:'daily',weekdays:[1,2,4,5,6]},
{id:'personal-gym',title:'Academia',domain:'Pessoal',cadence:'daily',weekdays:[1,2,3,4,5,6],timeStart:'06:30',fixedTime:true,durationMin:90},
{id:'routine-shower-post-gym',title:'Banho',domain:'Pessoal',cadence:'daily',weekdays:[1,2,3,4,5,6],timeStart:'08:00',fixedTime:true,durationMin:30},
{id:'personal-lunch',title:'Almoço',domain:'Pessoal',cadence:'daily',weekdays:[1,2,3,4,5,6]},
{id:'routine-dinner',title:'Jantar',domain:'Pessoal',cadence:'daily',weekdays:[1,2,3,4]},
{id:'routine-hygiene-night',title:'Higiene sono',domain:'Pessoal',cadence:'daily',weekdays:[1,2,3,4]},
{id:'personal-sleep',title:'Dormir',domain:'Pessoal',cadence:'daily',weekdays:[1,2,3,4]},
{id:'career-impact',title:'Ação carreira',domain:'Carreira',cadence:'daily',weekdays:[2]},
{id:'study-main',title:'Estudar concurso',domain:'Estudos',questType:'main',cadence:'once',startDate:'2026-08-10',dueDate:'2026-11-30',durationMin:180,priorityLevel:'high'},
{id:'gsa-c2',title:'Cadastro no SisFAPERJ',domain:'GSA',category:'Editais',questType:'main',cadence:'once',startDate:'2026-08-10',dueDate:'2026-08-17',durationMin:60,priorityLevel:'high'}
].forEach(ctx.Q);
ctx.quests=()=>ctx.QUEST_SEED.concat(ctx.state.customQuests||[]).map(q=>Object.assign({},q,ctx.state.overrides[q.id]||{})).filter(q=>!q.disabled);ctx.questById=id=>ctx.quests().find(q=>q.id===id);ctx.scheduled=(q,date)=>{if(q.startDate&&date<q.startDate)return false;const w=ctx.dfrom(date).getDay();if(q.cadence==='daily'||q.cadence==='weekly')return !(q.weekdays||[]).length||(q.weekdays||[]).includes(w);if(q.cadence==='monthly')return true;if(q.cadence==='once')return date>=(q.startDate||date)&&date<=(q.dueDate||date);return false};ctx.done=()=>false;ctx.hasEverDone=()=>false;
vm.createContext(ctx);vm.runInContext(fs.readFileSync('calendar-model-v3.js','utf8'),ctx);vm.runInContext(fs.readFileSync('campaign-policy-v3.js','utf8'),ctx);vm.runInContext(fs.readFileSync('planner-engine-v4.js','utf8'),ctx);
const M=ctx.MyPerformanceCalendarModel,E=ctx.MyPerformancePlannerEngine;assert(M&&E&&E.VERSION===4);assert.deepStrictEqual(Array.from(M.groups().map(x=>x.id)),['GSA','Estudos','Pessoal']);assert.strictEqual(ctx.questById('career-impact').domain,'Pessoal');assert(!('gymStart'in(ctx.state.routineSettings||{})));
const tue=E.planDay('2026-08-11'),therapy=tue.slots.find(x=>x.q?.id==='personal-therapy-weekly'),gym=tue.slots.find(x=>x.q?.id==='personal-gym');assert(therapy&&therapy.start===480&&therapy.end===510&&therapy.fixed);assert(gym&&gym.start===720&&gym.end===810);assert(!tue.slots.some(x=>x.q?.id==='personal-gym'&&x.start===390));assert.strictEqual(tue.slots.filter(x=>x.q?.id==='personal-gym').length,1);assert(tue.slots.some(x=>x.q?.id==='routine-shower-post-gym'));
const wed=E.planDay('2026-08-12');assert(wed.slots.some(x=>x.q?.id==='gsa-bni-weekly'&&x.start===360&&x.end===660&&x.fixed));const thu=E.planDay('2026-08-13');assert(thu.slots.some(x=>x.q?.id==='personal-zion-brave-weekly'&&x.start===1140&&x.end===1380&&x.fixed));
for(const plan of [tue,wed,thu])for(let i=1;i<plan.slots.length;i++)assert(plan.slots[i-1].end<=plan.slots[i].start,`overlap ${plan.date}: ${plan.slots[i-1].id} / ${plan.slots[i].id}`);
const edital=ctx.questById('gsa-c2'),deadline=edital.dueDate;assert.strictEqual(M.campaignForQuest(edital).id,'campaign-editais');assert(E.discardDay('2026-08-11'));const discarded=E.planDay('2026-08-11');assert(discarded.discarded);assert(discarded.slots.some(x=>x.q?.id==='personal-therapy-weekly'));assert.strictEqual(ctx.questById('gsa-c2').dueDate,deadline);assert(E.restoreDay('2026-08-11'));assert(!E.planDay('2026-08-11').discarded);
console.log('Calendar V4 functional regression passed');
