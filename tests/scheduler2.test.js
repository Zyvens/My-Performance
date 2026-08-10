"use strict";
const assert=require('node:assert/strict');
const core=require('../scheduler-core.js');

{
  const x=core.computeLateWakeWindow({actualWake:9*60,standardEnd:22*60});
  assert.equal(x.wake,540);assert.equal(x.end,1320);assert.equal(x.minutes,780);assert.equal(x.lateAfterNoon,false);
}
{
  const x=core.computeLateWakeWindow({actualWake:13*60,standardEnd:22*60});
  assert.equal(x.end,25*60,'waking at 13:00 must extend operational window to 01:00');
  assert.equal(x.minutes,12*60);assert.equal(x.lateAfterNoon,true);
}
{
  const x=core.computeLateWakeWindow({actualWake:13*60,standardEnd:18*60,hardCutoff:18*60});
  assert.equal(x.end,18*60,'Friday protected cutoff must win over late-wake extension');
}
{
  assert.equal(core.muayAllowed(1),true);assert.equal(core.muayAllowed(3),false,'Wednesday Muay conflicts with BNI 06:00–11:00');assert.equal(core.muayAllowed(5),true);
}
{
  const q=core.quotaStatus(4,5);assert.equal(q.pct,80);assert.equal(q.remaining,1);assert.equal(q.status,'attention');
}
{
  const h=core.goalHealth({actualMinutes:60,estimatedMinutes:600,startDate:'2026-08-10',dueDate:'2026-08-20',todayDate:'2026-08-18',behindMinutes:180});
  assert.equal(h.status,'critical');assert.equal(h.daysLeft,2);
}
{
  const local={completed:{a:'x'},activityDates:['2026-08-10'],customQuests:[{id:'q1',title:'local'}],timeTracking:{entries:[{id:'t1',accumulatedMs:100}]},syncMeta:{lastMutationAt:'2026-08-10T12:00:00Z'}};
  const remote={completed:{b:'y'},activityDates:['2026-08-11'],customQuests:[{id:'q2',title:'remote'}],timeTracking:{entries:[{id:'t2',accumulatedMs:200}]},syncMeta:{lastMutationAt:'2026-08-10T13:00:00Z'}};
  const m=core.smartMerge(local,remote);assert.ok(m.completed.a&&m.completed.b);assert.deepEqual(m.activityDates,['2026-08-10','2026-08-11']);assert.equal(m.customQuests.length,2);assert.equal(m.timeTracking.entries.length,2);
}
{
  const rec=core.recommendRemoval({title:'Zerar leads sem resposta',description:'Responder leads',domain:'GSA'},{onlyDomainMission:false});assert.equal(rec.allowed,true);assert.match(rec.reason,/não existem leads/i);
}
console.log('Scheduler 2.0 core tests passed');
