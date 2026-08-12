const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('sidequest-bulk-v10.js','utf8');
const quests=[{id:'s1',title:'A',questType:'side',domain:'Pessoal',cadence:'weekly',durationMin:30,weekdays:[1]},{id:'s2',title:'B',questType:'side',domain:'Estudos',cadence:'weekly',durationMin:45,weekdays:[2]}];
const state={customQuests:quests,overrides:{},calendarV5:{sideQuestPacks:[{id:'f1',name:'Rotina',groupId:'Pessoal',missionIds:['s1']},{id:'f2',name:'Estudo',groupId:'Estudos',missionIds:['s2']}],sideQuestMeta:{s1:{packId:'f1',active:true},s2:{packId:'f2',active:true}},revisions:[],decisionLog:[]},calendarV3:{missionMeta:{}}};
let saves=0,invalidates=0,revisions=0,logs=0;
const D={model:()=>state.calendarV5,sideMeta:id=>state.calendarV5.sideQuestMeta[id],recordRevision(reason){revisions++;state.calendarV5.revisions.push({id:revisions,reason,snapshot:{calendarV5:{revisions:[]}}})},log(){logs++}};
const B={model:()=>state.calendarV3,groupForQuest:q=>q.domain};
const T={};
const ctx={window:{MyPerformanceCalendarModel:B,MyPerformanceCalendarDomain:D,MyPerformancePlannerEngine:{invalidate(){invalidates++}},MyPerformanceTaxonomy:T},state,quests:()=>quests,questById:id=>quests.find(q=>q.id===id),saveState(){saves++},console};vm.createContext(ctx);vm.runInContext(src,ctx);
const Bulk=ctx.window.MyPerformanceSideQuestBulk;assert(Bulk,'bulk API missing');
const out=Bulk.apply(['s1','s2'],{fillerId:'f2',cadence:'daily',duration:{mode:'flexible',total:120,min:20,max:45},windows:{mode:'replace',values:['w-study']},days:{mode:'replace',values:[1,3,5]},energyDemand:'high'});
assert.strictEqual(out.changed,2);assert.strictEqual(revisions,1,'bulk edit must create exactly one revision');assert.strictEqual(saves,1,'bulk edit must save exactly once');assert.strictEqual(invalidates,1,'bulk edit must invalidate Planner exactly once');assert.strictEqual(logs,1,'bulk edit must log once');
for(const q of quests){assert.strictEqual(q.domain,'Estudos','moving to Estudo Filler must mirror inherited Group');assert.strictEqual(q.cadence,'daily');assert.strictEqual(q.durationMin,120);assert.deepStrictEqual(Array.from(q.weekdays),[1,3,5]);const m=D.sideMeta(q.id);assert.strictEqual(m.packId,'f2');assert.strictEqual(m.durationMode,'flexible');assert.strictEqual(m.flexMinMin,20);assert.strictEqual(m.flexMaxMin,45);assert.strictEqual(m.windowMode,'exclusive');assert.deepStrictEqual(Array.from(m.windowIds),['w-study']);assert.strictEqual(m.energyDemand,'high')}
assert.deepStrictEqual(state.calendarV5.sideQuestPacks[0].missionIds,[]);assert.deepStrictEqual(Array.from(state.calendarV5.sideQuestPacks[1].missionIds).sort(),['s1','s2']);
Bulk.toggle(['s1','s2'],false);assert.strictEqual(revisions,2);assert.strictEqual(saves,2);assert.strictEqual(invalidates,2);assert.strictEqual(D.sideMeta('s1').active,false);assert.strictEqual(D.sideMeta('s2').active,false);
console.log('Bulk Side Quest V10 atomic edit passed');
