"use strict";
/* My Performance 2.6.0 — Side Quest order/repetition policy.
   Filler missionIds order is the priority order. maxRepeatsPerDay limits fragments of the same Side Quest per day. */
(function(){
  const D=window.MyPerformanceCalendarDomain,SQ=window.MyPerformanceSideQuestQuality,E=window.MyPerformancePlannerEngine;
  if(!D||!SQ||typeof state==='undefined')return;
  const VERSION=11,baseScore=SQ.scoreBonus.bind(SQ),baseAllowed=SQ.allowed.bind(SQ);
  function pack(item){return SQ.packForItem?.(item)||D.pack(D.sideMeta?.(item?.q?.id)?.packId)}
  function maxRepeats(item){const m=D.sideMeta?.(item?.q?.id);return Math.max(1,Math.min(8,Number(m?.maxRepeatsPerDay||1)))}
  function ensureUsage(usage,pid){const u=usage[pid]||(usage[pid]={minutes:0,count:0,questIds:new Set()});u.questCounts=u.questCounts||{};return u}
  function questCount(item,usage){const p=pack(item);if(!p)return 0;return Number(ensureUsage(usage,p.id).questCounts[item.q.id]||0)}
  function canRepeat(item,usage){return item?.kind==='side'&&questCount(item,usage)<maxRepeats(item)}
  SQ.scoreBonus=function(item,usage){const p=pack(item),base=baseScore(item,usage);if(!p)return base;const i=(p.missionIds||[]).indexOf(item.q?.id),n=(p.missionIds||[]).length;return base+(i<0?0:Math.max(0,n-i)*85)};
  SQ.allowed=function(item,usage){return baseAllowed(item,usage)&&canRepeat(item,usage)};
  SQ.record=function(item,minutes,usage){const p=pack(item);if(!p)return;const u=ensureUsage(usage,p.id);u.minutes+=Math.max(0,Number(minutes||0));u.questCounts[item.q.id]=Number(u.questCounts[item.q.id]||0)+1;if(!u.questIds.has(item.q.id)){u.count++;u.questIds.add(item.q.id)}};
  SQ.usageFromSlots=function(slots=[]){const out={};for(const s of slots){if(!s.sideQuest)continue;const item={kind:'side',q:s.q,policy:{packId:s.packId||D.sideMeta(s.q?.id)?.packId}};SQ.record(item,Math.max(0,Number(s.end)-Number(s.start)),out)}return out};
  SQ.canRepeat=canRepeat;SQ.maxRepeats=maxRepeats;SQ.questCount=questCount;SQ.POLICY_VERSION='filler-priority-repeat-v11';
  function reorderFiller(id,orderedIds=[]){const p=D.pack(id);if(!p)return false;const current=p.missionIds||[],known=new Set(current),ordered=[...new Set(orderedIds)].filter(x=>known.has(x)),rest=current.filter(x=>!ordered.includes(x));p.missionIds=[...ordered,...rest];D.recordRevision?.(`Reordenar Filler ${p.name}`);D.log?.('filler-priority',`Prioridade do Filler ${p.name} atualizada`,{id,missionIds:p.missionIds});saveState();E?.invalidate?.();return true}
  function setRepeats(id,n){const m=D.sideMeta?.(id);if(!m)return false;m.maxRepeatsPerDay=Math.max(1,Math.min(8,Number(n||1)));D.recordRevision?.(`Repetição diária de ${id}`);D.log?.('side-repeat',`${id}: até ${m.maxRepeatsPerDay}x/dia`,{id,maxRepeatsPerDay:m.maxRepeatsPerDay});saveState();E?.invalidate?.();return true}
  window.MyPerformanceSideQuestPriority={VERSION,reorderFiller,setRepeats,maxRepeats};
})();
