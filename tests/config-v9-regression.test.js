const fs=require('fs'),vm=require('vm'),assert=require('assert');
const index=fs.readFileSync('index.html','utf8'),bounded=fs.readFileSync('calendar-mutation-bounded-v9.js','utf8'),duration=fs.readFileSync('sidequest-duration-v9.js','utf8'),grouped=fs.readFileSync('mainquest-grouped-config-v9.js','utf8'),css=fs.readFileSync('config-polish-v9.css','utf8'),version=require('../version.json').version;
for(const a of ['calendar-mutation-bounded-v9.js','sidequest-duration-v9.js','mainquest-grouped-config-v9.js','config-polish-v9.css'])assert(index.includes(a),`missing ${a}`);
assert(index.indexOf('calendar-revision-safety-v8.js')<index.indexOf('calendar-mutation-bounded-v9.js'),'bounded mutations must wrap safe revisions before domain consumers');
assert(index.indexOf('mission-context-v5.js')<index.indexOf('sidequest-duration-v9.js'),'duration semantics must run after mission-context');
assert(index.indexOf('calendar-advanced-v5.js')<index.indexOf('mainquest-grouped-config-v9.js'),'grouped Main Quest UI must run after advanced strategy UI');
for(const t of ['c.revisions=[]','previous','newOnes','MAX_REVISIONS'])assert(bounded.includes(t),`bounded mutation invariant missing ${t}`);
for(const t of ['Duração fixa (min)','Esforço total no período (min)','Um único bloco por ocorrência','delete m.flexMinMin','setQuestDuration'])assert(duration.includes(t),`duration invariant missing ${t}`);
for(const t of ['mq-group-v9','ordenadas por deadline','due(a).localeCompare(due(b))','B.groupForQuest'])assert(grouped.includes(t),`Main Quest grouping invariant missing ${t}`);
for(const t of ['.mq-group-v9','.mq-group-head-v9','.duration-help-v9'])assert(css.includes(t),`config CSS invariant missing ${t}`);

// Behavioral: repeated Side Quest toggles must never snapshot prior revision history.
{
  const state={calendarV5:{lastRevisionId:1,revisions:[{id:1,snapshot:{calendarV5:{revisions:[]},windows:[]}}],decisionLog:[],sideQuestMeta:{sq:{active:true}}}};let saves=0;
  const D={model:()=>state.calendarV5,toggleSideQuest(id,active){const c=state.calendarV5,idn=++c.lastRevisionId,snap=JSON.parse(JSON.stringify(c));c.revisions.push({id:idn,snapshot:{calendarV5:snap,windows:[]}});c.sideQuestMeta[id].active=active!==false;saves++;return true}};
  const ctx={window:{MyPerformanceCalendarDomain:D,MyPerformanceCalendarRevisionSafety:{compact(){}}},state,saveState(){saves++},console};vm.createContext(ctx);vm.runInContext(bounded,ctx);
  for(let i=0;i<60;i++)ctx.window.MyPerformanceCalendarDomain.toggleSideQuest('sq',i%2===0);
  const revs=state.calendarV5.revisions;assert(revs.length<=20,'revision history must stay bounded');for(const r of revs.slice(1))assert.strictEqual((r.snapshot.calendarV5.revisions||[]).length,0,'new snapshots must not contain previous snapshots');assert(JSON.stringify(state).length<150000,'repeated toggles must remain compact');
}

// Behavioral: fixed duration is exactly one block; flexible keeps total effort separate from fragment size.
{
  const state={customQuests:[{id:'sq',durationMin:30}],overrides:{},calendarV5:{sideQuestMeta:{sq:{durationMode:'flexible',flexMinMin:10,flexMaxMin:30,minSessionMin:10,idealSessionMin:30}}}};
  const D={sideMeta:id=>state.calendarV5.sideQuestMeta[id],addSideQuest(){return{id:'x'}},updateSideQuest(){return true}};
  const ctx={window:{MyPerformanceCalendarDomain:D,MyPerformancePlannerEngine:{invalidate(){}}},state,saveState(){},quests:()=>state.customQuests,questById:id=>state.customQuests.find(q=>q.id===id),document:{getElementById(){return null}},MutationObserver:class{observe(){}},setTimeout(){},requestAnimationFrame:f=>f(),console};vm.createContext(ctx);vm.runInContext(duration,ctx);
  const api=ctx.window.MyPerformanceSideQuestDuration;api.normalize('sq',{mode:'fixed',total:45,min:10,max:30});assert.strictEqual(state.customQuests[0].durationMin,45);assert.strictEqual(D.sideMeta('sq').minSessionMin,45);assert.strictEqual(D.sideMeta('sq').idealSessionMin,45);assert.strictEqual(D.sideMeta('sq').flexMinMin,undefined);
  api.normalize('sq',{mode:'flexible',total:120,min:20,max:45});assert.strictEqual(state.customQuests[0].durationMin,120,'flexible max must not overwrite total effort');assert.strictEqual(D.sideMeta('sq').flexMinMin,20);assert.strictEqual(D.sideMeta('sq').flexMaxMin,45);
}
console.log(`Config V9 mutation, Main Quest grouping and Side Quest duration regression passed for ${version}`);
