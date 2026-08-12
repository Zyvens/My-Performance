const fs=require('fs'),vm=require('vm'),assert=require('assert');
const code=fs.readFileSync('window-authority-v11.js','utf8');let saves=0,invalidates=0,refreshes=0;
const windows=[{id:'wed-gsa',weekday:3,start:870,end:1080,label:'old'}],cal={manualPins:{'2026-08-12':[{workKey:'q',windowId:'wed-gsa'}]},manualReplacements:{'2026-08-12':[{targetKey:'q',windowId:'wed-gsa'}]}};
const D={model:()=>cal,windowForId:id=>windows.find(w=>w.id===id)||null,updateWindow:(id,p)=>{Object.assign(windows[0],p);return true},addWindow:d=>{windows.push(d);return d},removeWindow:id=>{const i=windows.findIndex(w=>w.id===id);if(i>=0)windows.splice(i,1);return true}};
const E={invalidate:()=>invalidates++};const state={calendarExecutionV8:{dayCheckpoints:{'2026-08-12':{slots:[1]}}}};
const ctx={console,state,saveState:()=>saves++,dfrom:s=>new Date(s+'T12:00:00'),window:{MyPerformanceClock:{today:()=> '2026-08-12'},MyPerformanceCalendarDomain:D,MyPerformancePlannerEngine:E,MyPerformanceTemporalExecution:{refreshNow:()=>refreshes++},addEventListener:()=>{}}};ctx.window.window=ctx.window;vm.createContext(ctx);vm.runInContext(code,ctx);
D.updateWindow('wed-gsa',{start:900,end:1050});
assert.strictEqual(windows[0].start,900);assert(!state.calendarExecutionV8.dayCheckpoints['2026-08-12'],'edited weekday must drop stale future/current temporal checkpoint');assert.deepStrictEqual(cal.manualPins['2026-08-12'],[]);assert.deepStrictEqual(cal.manualReplacements['2026-08-12'],[]);assert(invalidates>0&&refreshes>0&&saves>0);assert(cal.windowRevisionV11>=1);
console.log('Window V11 authoritative-edit invalidation passed');
