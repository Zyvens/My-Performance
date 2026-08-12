"use strict";
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const index=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8'),pwa=fs.readFileSync('pwa-update.js','utf8'),css=fs.readFileSync('config-performance-v1.css','utf8'),version=require('../version.json');
for(const f of ['quest-repository-v1.js','planning-context-v1.js','config-performance-v1.js','performance-observability-v1.js','config-performance-v1.css'])assert(index.includes(f),`missing phase 2 asset ${f}`);
assert(index.includes(`data-build="${version.version}"`));assert.strictEqual(version.version,'2.9.0');
assert(sw.includes("CACHE='my-performance-v2.9.0'"));assert(sw.includes("event.request.mode==='navigate'"));assert(sw.includes('caches.match(event.request).then(found=>found||fetch(event.request)'),'static assets must use cache-first');
assert(pwa.includes('PERIODIC_INTERVAL=30*60*1000'),'PWA periodic update check must be 30 min');assert(pwa.includes('FOREGROUND_MIN_GAP=10*60*1000'),'foreground checks must be throttled');
assert(css.includes('content-visibility:auto'),'Config must use browser-native lazy rendering');

{
  const listeners={};let baseCalls=0;
  const context={console,state:{},QUEST_SEED:[],window:{addEventListener:(n,f)=>listeners[n]=f},quests:()=>{baseCalls++;return[{id:'a',title:'A'},{id:'b',title:'B'}]},questById:()=>null};context.globalThis=context;vm.createContext(context);vm.runInContext(fs.readFileSync('quest-repository-v1.js','utf8'),context);
  assert.strictEqual(context.quests().length,2);assert.strictEqual(context.quests().length,2);assert.strictEqual(baseCalls,1,'quest list should rebuild once');assert.strictEqual(context.questById('b').title,'B');
  listeners['my-performance-state-saved']();context.quests();assert.strictEqual(baseCalls,2,'quest cache must invalidate on mutation');
  const m=context.window.MyPerformanceQuestRepository.metrics();assert(m.hits>=2&&m.rebuilds===2,'quest repository metrics missing');
}
{
  const listeners={};let calls=0,t=100;
  const E={planDay:x=>{calls++;return{x,calls}},planWeek:x=>({x}),strategicWeek:x=>({x})};
  const context={console,performance:{now:()=>t},window:{MyPerformancePlannerEngine:E,addEventListener:(n,f)=>listeners[n]=f}};context.globalThis=context;vm.createContext(context);vm.runInContext(fs.readFileSync('planning-context-v1.js','utf8'),context);
  const a=E.planDay('2026-08-12'),b=E.planDay('2026-08-12');assert.strictEqual(a,b);assert.strictEqual(calls,1,'duplicate planner reads in a render burst should coalesce');
  t+=300;E.planDay('2026-08-12');assert.strictEqual(calls,2,'planning context cache must expire');listeners['my-performance-state-saved']();E.planDay('2026-08-12');assert.strictEqual(calls,3,'planning context must invalidate on mutation');
}
console.log('My Performance 2.9.0 Phase 2 performance contracts passed');
