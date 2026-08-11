const fs=require('fs'),vm=require('vm'),assert=require('assert');
const listeners={};
const packs=[{id:'pack-leisure',name:'Lazer',missionIds:['leisure'],quality:{}},{id:'pack-daily-life',name:'Cotidiano',missionIds:['free-daily','preferred-daily'],quality:{}}];
const metas={
  leisure:{packId:'pack-leisure',subtype:'leisure',rigidity:'free',minSessionMin:10},
  'free-daily':{packId:'pack-daily-life',subtype:'necessary',rigidity:'free',minSessionMin:10},
  'preferred-daily':{packId:'pack-daily-life',subtype:'necessary',rigidity:'preferred',minSessionMin:10},
  explicit:{packId:'pack-daily-life',subtype:'necessary',rigidity:'free',opportunistic:false,minSessionMin:10}
};
const model={sideQuestPacks:packs,engine:{},sideQuestMeta:metas};
const D={model:()=>model,sideMeta:id=>metas[id]||null,pack:id=>packs.find(p=>p.id===id)||null,missionPolicy:q=>metas[q?.id]||{}};
const ctx={console,Date,JSON,Math,state:{view:'today',plannerDate:'2026-08-11'},today:()=> '2026-08-11',setTimeout:fn=>{fn();return 0},clearTimeout:()=>{},esc:s=>String(s),MyPerformanceCalendarDomain:D};ctx.window=ctx;ctx.globalThis=ctx;ctx.addEventListener=(t,f)=>(listeners[t]||(listeners[t]=[])).push(f);
vm.createContext(ctx);vm.runInContext(fs.readFileSync('sidequest-quality-v5.js','utf8'),ctx);
const SQ=ctx.MyPerformanceSideQuestQuality;assert(SQ&&SQ.POLICY_VERSION==='opportunistic-v1');
assert.strictEqual(SQ.isOpportunistic({q:{id:'leisure'},policy:metas.leisure}),true,'leisure must be opportunistic');
assert.strictEqual(SQ.isOpportunistic({q:{id:'free-daily'},policy:metas['free-daily']}),true,'free daily Side Quest must be opportunistic');
assert.strictEqual(SQ.isOpportunistic({q:{id:'preferred-daily'},policy:metas['preferred-daily']}),false,'preferred Side Quest must stay planned support');
assert.strictEqual(SQ.isOpportunistic({q:{id:'explicit'},policy:metas.explicit}),false,'explicit override must win');
assert(SQ.scoreBonus({q:{id:'leisure'},policy:metas.leisure},{})<=-900,'opportunistic scoring must be strongly penalized');
const raw={date:'2026-08-11',slots:[{id:'main-slot'}],outsideCalendar:[
  {key:'leisure@wk',kind:'side',daily:false,q:{id:'leisure',title:'Assistir série'}},
  {key:'free@day',kind:'side',daily:true,q:{id:'free-daily',title:'Lanche'}},
  {key:'preferred@day',kind:'side',daily:true,q:{id:'preferred-daily',title:'Almoço'}},
  {key:'main',kind:'main',daily:false,q:{id:'main',title:'Entrega importante'}}
]};
ctx.MyPerformancePlannerEngine={planDay:()=>raw,planWeek:()=>[raw],diagnostics:()=>({outside:raw.outsideCalendar}),emptyWindows:()=>[],VERSION:5};ctx.MyPerformanceRoutine={};
vm.runInContext(fs.readFileSync('opportunistic-sidequests-v5.js','utf8'),ctx);
const p=ctx.MyPerformancePlannerEngine.planDay('2026-08-11');
assert.deepStrictEqual(Array.from(p.outsideCalendar.map(x=>x.key)),['preferred@day','main'],'opportunistic Side Quests must not pollute daily backlog');
assert.deepStrictEqual(Array.from(p.autoIgnored.map(x=>x.key)),['leisure@wk','free@day'],'omitted Side Quests must remain auditable');
assert.strictEqual(p.slots.length,1,'adapter must never reallocate or mutate Planner slots');
assert(p.autoIgnored.find(x=>x.daily).reason.includes('expira silenciosamente'),'daily optional must expire silently');
assert(p.autoIgnored.find(x=>!x.daily).reason.includes('permanece elegível'),'weekly/monthly optional must remain eligible later');
console.log('Opportunistic Side Quest policy regression passed');
