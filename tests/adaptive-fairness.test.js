const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

function dfrom(s){return new Date(`${s}T12:00:00Z`)}
function addDays(s,n){const d=dfrom(s);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
const parents={
  funding:{id:'funding',domain:'GSA',questType:'main',priorityLevel:'critical',startDate:'2026-08-10',dueDate:'2026-08-20'},
  contest:{id:'contest',domain:'Estudos',questType:'main',priorityLevel:'critical',startDate:'2026-08-10',dueDate:'2026-11-30'}
};
const schedule=[];
for(let i=0;i<4;i++)schedule.push({questId:`f-${i}`,parentId:'funding',date:'2026-08-10',minutes:60,index:i});
for(let i=0;i<4;i++)schedule.push({questId:`c-${i}`,parentId:'contest',date:'2026-08-10',minutes:60,index:i});
const state={adaptive:{settings:{maxAdaptiveMinPerDay:240,dailyBufferMin:90},schedule},completed:{}};
const window={MyPerformanceAdaptive:{recalculate:()=>({}),priority:q=>q.priorityLevel},addEventListener:()=>{}};
const context={state,window,today:()=> '2026-08-10',dfrom,addDays,questById:id=>parents[id]||null,setTimeout:fn=>fn(),console,Date};
vm.createContext(context);vm.runInContext(fs.readFileSync('adaptive-fairness.js','utf8'),context);
const result=context.window.MyPerformanceAdaptiveFairness.rebalance('2026-08-10');
const perParentDay=new Map(),daily=new Map();
for(const s of state.adaptive.schedule){const key=`${s.parentId}@${s.date}`;perParentDay.set(key,(perParentDay.get(key)||0)+1);daily.set(s.date,(daily.get(s.date)||0)+s.minutes)}
assert([...perParentDay.values()].every(n=>n===1),'same parent must not stack multiple Avançar sessions on one day');
assert([...daily.values()].every(n=>n<=150),'normal adaptive load must respect the configured daily cap');
assert(new Set(state.adaptive.schedule.filter(s=>s.parentId==='funding').map(s=>s.date)).size===4,'funding sessions must spread across days');
assert(new Set(state.adaptive.schedule.filter(s=>s.parentId==='contest').map(s=>s.date)).size===4,'longer-deadline critical goal must also keep distributed sessions');
assert.strictEqual(result.emergencies,0);
console.log('Adaptive fairness distribution passed');
