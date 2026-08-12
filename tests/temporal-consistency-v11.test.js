const fs=require('fs'),vm=require('vm'),assert=require('assert');
const code=fs.readFileSync('temporal-consistency-v11.js','utf8');
const plans={
  '2026-08-11':{date:'2026-08-11',slots:[
    {id:'fresh',workKey:'q@old',q:{id:'q'},start:360,end:390,sideQuest:true},
    {id:'hist-pending',sourceSlotId:'old',workKey:'q@old',q:{id:'q'},start:360,end:390,executionHistory:true,executionStatus:'pending'},
    {id:'hist-done',sourceSlotId:'done',workKey:'d@old',q:{id:'d'},start:400,end:430,executionHistory:true,executionStatus:'completed'},
    {id:'event',eventSlot:true,q:{id:'event'},start:500,end:550}
  ],outsideCalendar:[{key:'new-retroactive'}]},
  '2026-08-12':{date:'2026-08-12',slots:[],outsideCalendar:[]}
};
const E={planDay:d=>JSON.parse(JSON.stringify(plans[d])),planWeek:()=>[],emptyWindows:()=>[{start:360,end:400}],missionNow:()=>({})};
const ctx={console,state:{calendarV3:{discardedDays:{}}},weekStart:d=>d,addDays:(d,n)=>d,window:{MyPerformanceClock:{today:()=> '2026-08-12',minutesNow:()=>70},MyPerformancePlannerEngine:E,MyPerformanceRoutine:{}}};ctx.window.window=ctx.window;vm.createContext(ctx);vm.runInContext(code,ctx);
let p=E.planDay('2026-08-11');
assert(!p.slots.some(x=>x.id==='fresh'),'past must not contain freshly allocated Planner work');
assert(p.slots.some(x=>x.id==='hist-pending'),'unreviewed historical fact remains visible until day is discarded/reviewed');
assert(p.slots.some(x=>x.id==='hist-done'),'completed historical fact must remain');
assert(p.slots.some(x=>x.id==='event'),'past Event remains factual');
assert.deepStrictEqual(p.outsideCalendar,[],'past must never expose retroactive backlog/fill gaps');
assert.deepStrictEqual(E.emptyWindows('2026-08-11'),[],'past has zero fillable gaps');
ctx.state.calendarV3.discardedDays['2026-08-11']={at:'now'};
p=E.planDay('2026-08-11');
assert(!p.slots.some(x=>x.id==='hist-pending'),'discarded day must not retain pending awaiting-confirmation work');
assert(p.slots.some(x=>x.id==='hist-done'),'discarding a day must preserve already completed history');
assert(p.slots.some(x=>x.id==='event'),'discarding a day must preserve factual Events');
assert.deepStrictEqual(E.emptyWindows('2026-08-11'),[]);
console.log('Temporal V11 immutable-past/discard semantics passed');
