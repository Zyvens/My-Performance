"use strict";
/* My Performance 2.6.0 — Side Quest order/repetition policy.
   Filler missionIds order is the priority order. maxRepeatsPerDay limits fragments of the same Side Quest per day. */
(function(){
  const D=window.MyPerformanceCalendarDomain,SQ=window.MyPerformanceSideQuestQuality,E=window.MyPerformancePlannerEngine;
  if(!D||!SQ||!E||typeof state==='undefined')return;
  const VERSION=11,baseScore=SQ.scoreBonus.bind(SQ),baseAllowed=SQ.allowed.bind(SQ),basePlan=E.planDay.bind(E),baseWeek=E.planWeek.bind(E);
  const REPEAT_MARK='::repeat-v11:';
  function pack(item){return SQ.packForItem?.(item)||D.pack(D.sideMeta?.(item?.q?.id)?.packId)}
  function maxRepeats(item){const m=D.sideMeta?.(item?.q?.id);return Math.max(1,Math.min(8,Number(m?.maxRepeatsPerDay||1)))}
  function ensureUsage(usage,pid){const u=usage[pid]||(usage[pid]={minutes:0,count:0,questIds:new Set()});u.questCounts=u.questCounts||{};return u}
  function questCount(item,usage){const p=pack(item);if(!p)return 0;return Number(ensureUsage(usage,p.id).questCounts[item.q.id]||0)}
  function canRepeat(item,usage){return item?.kind==='side'&&questCount(item,usage)<maxRepeats(item)}
  function baseKey(key=''){return String(key).split(REPEAT_MARK)[0]}
  SQ.scoreBonus=function(item,usage){const p=pack(item),base=baseScore(item,usage);if(!p)return base;const i=(p.missionIds||[]).indexOf(item.q?.id),n=(p.missionIds||[]).length;return base+(i<0?0:Math.max(0,n-i)*85)};
  SQ.allowed=function(item,usage){return baseAllowed(item,usage)&&canRepeat(item,usage)};
  SQ.record=function(item,minutes,usage){const p=pack(item);if(!p)return;const u=ensureUsage(usage,p.id),root=baseKey(item.key);u.minutes+=Math.max(0,Number(minutes||0));u.questCounts[item.q.id]=Number(u.questCounts[item.q.id]||0)+1;if(!u.questIds.has(item.q.id)){u.count++;u.questIds.add(item.q.id)};const count=u.questCounts[item.q.id],max=maxRepeats(item);if(item.kind==='side'){if(item.remaining>0&&count<max)item.key=`${root}${REPEAT_MARK}${count+1}`;else item.key=root}};
  SQ.usageFromSlots=function(slots=[]){const out={};for(const s of slots){if(!s.sideQuest)continue;const item={kind:'side',q:s.q,key:s.workKey||'',remaining:0,policy:{packId:s.packId||D.sideMeta(s.q?.id)?.packId}};SQ.record(item,Math.max(0,Number(s.end)-Number(s.start)),out)}return out};
  SQ.canRepeat=canRepeat;SQ.maxRepeats=maxRepeats;SQ.questCount=questCount;SQ.POLICY_VERSION='filler-priority-repeat-v11';
  function normalizePlan(p){if(!p)return p;for(const s of p.slots||[])if(s.sideQuest&&s.workKey)s.workKey=baseKey(s.workKey);for(const x of p.outsideCalendar||[])if(x.kind==='side'&&x.key)x.key=baseKey(x.key);return p}
  E.planDay=function(date){return normalizePlan(basePlan(date))};E.planWeek=function(date){return(baseWeek(date)||[]).map(normalizePlan)};
  if(window.MyPerformanceRoutine)window.MyPerformanceRoutine.planDay=E.planDay;
  function reorderFiller(id,orderedIds=[]){const p=D.pack(id);if(!p)return false;const current=p.missionIds||[],known=new Set(current),ordered=[...new Set(orderedIds)].filter(x=>known.has(x)),rest=current.filter(x=>!ordered.includes(x));p.missionIds=[...ordered,...rest];D.recordRevision?.(`Reordenar Filler ${p.name}`);D.log?.('filler-priority',`Prioridade do Filler ${p.name} atualizada`,{id,missionIds:p.missionIds});saveState();E?.invalidate?.();return true}
  function setRepeats(id,n){const m=D.sideMeta?.(id);if(!m)return false;m.maxRepeatsPerDay=Math.max(1,Math.min(8,Number(n||1)));D.recordRevision?.(`Repetição diária de ${id}`);D.log?.('side-repeat',`${id}: até ${m.maxRepeatsPerDay}x/dia`,{id,maxRepeatsPerDay:m.maxRepeatsPerDay});saveState();E?.invalidate?.();return true}
  window.MyPerformanceSideQuestPriority={VERSION,reorderFiller,setRepeats,maxRepeats,baseKey,normalizePlan};
})();
