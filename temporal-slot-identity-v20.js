"use strict";
/* My Performance 2.9.9 — temporal slot identity authority.
   Prevents different sessions from the same workKey/Main Quest overwriting each other's execution status. */
(function(){
  const Clock=window.MyPerformanceClock,T=window.MyPerformanceTemporalExecution,E=window.MyPerformancePlannerEngine;
  if(!Clock||!T||!E||typeof state==='undefined')return;
  const VERSION=20;
  const clone=x=>JSON.parse(JSON.stringify(x||{}));
  const store=()=>{state.calendarExecutionV8=state.calendarExecutionV8||{history:{},dayCheckpoints:{},actions:[]};state.calendarExecutionV8.history=state.calendarExecutionV8.history||{};state.calendarExecutionV8.dayCheckpoints=state.calendarExecutionV8.dayCheckpoints||{};state.calendarExecutionV8.actions=Array.isArray(state.calendarExecutionV8.actions)?state.calendarExecutionV8.actions:[];return state.calendarExecutionV8};
  const rows=d=>store().history[d]||(store().history[d]=[]);
  function idOf(slot){return String(slot?.sourceSlotId||slot?.id||'')}
  function seedFrom(slot,date){
    const id=idOf(slot),cp=store().dayCheckpoints?.[date]?.slots||[];
    const saved=cp.find(r=>String(r.sourceSlotId||'')===id);
    if(saved)return clone(saved);
    return{sourceSlotId:id,workKey:slot?.workKey||'',questId:slot?.q?.id||'',qSnapshot:clone(slot?.q||{}),originDate:slot?.originDate||date,start:Number(slot?.start||0),end:Number(slot?.end||0),group:slot?.group||slot?.q?.domain||'Pessoal',packId:slot?.packId||'',campaignId:slot?.campaignId||'',campaignName:slot?.campaignName||'',deadline:slot?.deadline||slot?.q?.dueDate||'',targetDate:slot?.targetDate||'',mainQuest:!!slot?.mainQuest,sideQuest:!!slot?.sideQuest,sessionOnly:!!slot?.sessionOnly,windowId:slot?.windowId||'',reason:slot?.reason||'',explanation:slot?.explanation||'',status:'pending',actualAt:'',actualMinute:null,releaseMinutes:0,releaseStart:null,releaseEnd:null};
  }
  function putTargetFirst(slot,date){
    const id=idOf(slot);if(!id)return;
    const list=rows(date),i=list.findIndex(r=>String(r.sourceSlotId||'')===id);
    const row=i>=0?list.splice(i,1)[0]:seedFrom(slot,date);
    list.unshift(row);
  }
  function replay(date){
    const list=rows(date),acts=store().actions||[];
    for(const a of acts){if(a.date!==date)continue;const status=a.kind==='skip-slot'?'missed':a.kind==='record-session'?'session':a.kind==='complete-mission'?'completed':'';if(!status)continue;const r=list.find(x=>x.workKey===a.workKey&&Number(x.start)===Number(a.plannedStart)&&Number(x.end)===Number(a.plannedEnd));if(r){r.status=status;if(a.actualMinute!=null)r.actualMinute=a.actualMinute}}
    const seen=new Set();store().history[date]=list.filter(r=>{const k=`${r.sourceSlotId||''}|${r.start}|${r.end}|${r.workKey||''}`;if(seen.has(k))return false;seen.add(k);return true});
  }
  function wrap(name){const base=T[name];if(typeof base!=='function'||base.__slotIdentityV20)return;const fn=function(slot,date){date=date||Clock.today();putTargetFirst(slot,date);const result=base.call(T,slot,date);replay(date);try{saveState()}catch{};return result};fn.__slotIdentityV20=true;T[name]=fn}
  wrap('skipSlot');wrap('recordSession');wrap('completeMission');
  const today=Clock.today();replay(today);
  if(typeof E.invalidate==='function')E.invalidate();
  window.MyPerformanceTemporalSlotIdentity={VERSION,replay,idOf};
})();
