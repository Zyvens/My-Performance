"use strict";
/* Side Quest quality policies for Planner V5. Constraints/scoring data only; no scheduling loop. */
(function(){
  const D=window.MyPerformanceCalendarDomain;if(!D)return;const c=D.model();
  const defaults={
    'pack-piano':{dailyMinCount:0,dailyMaxMin:90,weeklyMinCount:1,exclusiveSets:[]},
    'pack-leisure':{dailyMinCount:0,dailyMaxMin:120,weeklyMinCount:0,exclusiveSets:[['side-leisure-series','side-leisure-movie','side-leisure-gaming']]},
    'pack-daily-life':{dailyMinCount:3,dailyMaxMin:300,weeklyMinCount:0,exclusiveSets:[]},
    'pack-health':{dailyMinCount:2,dailyMaxMin:210,weeklyMinCount:5,exclusiveSets:[]}
  };
  for(const p of c.sideQuestPacks||[]){const d=defaults[p.id]||{dailyMinCount:0,dailyMaxMin:180,weeklyMinCount:0,exclusiveSets:[]};p.quality=Object.assign({},d,p.quality||{})}
  c.engine.transitionBufferMin=Math.max(0,Number(c.engine.transitionBufferMin??10));c.engine.transitionBufferAfterMin=Math.max(45,Number(c.engine.transitionBufferAfterMin??60));
  function packForItem(item){const id=item?.policy?.packId||D.sideMeta(item?.q?.id)?.packId;return id?D.pack(id):null}
  function metaForItem(item){return Object.assign({},D.sideMeta(item?.q?.id)||{},item?.policy||{})}
  function policy(item){return packForItem(item)?.quality||{dailyMinCount:0,dailyMaxMin:180,weeklyMinCount:0,exclusiveSets:[]}}
  function isOpportunistic(item){const m=metaForItem(item),p=packForItem(item);if(typeof m.opportunistic==='boolean')return m.opportunistic;if(typeof p?.opportunistic==='boolean')return p.opportunistic;if(p?.id==='pack-leisure')return true;return m.rigidity==='free'}
  function ensureUsage(usage,packId){return usage[packId]||(usage[packId]={minutes:0,count:0,questIds:new Set()})}
  function conflict(item,usage){const p=packForItem(item);if(!p)return false;const u=ensureUsage(usage,p.id),sets=p.quality?.exclusiveSets||[];for(const set of sets){if(!set.includes(item.q.id))continue;if(set.some(id=>id!==item.q.id&&u.questIds.has(id)))return true}return false}
  function remainingMinutes(item,usage){const p=packForItem(item);if(!p)return Infinity;const u=ensureUsage(usage,p.id),max=Math.max(0,Number(p.quality?.dailyMaxMin??Infinity));return Number.isFinite(max)?Math.max(0,max-u.minutes):Infinity}
  function scoreBonus(item,usage){if(isOpportunistic(item))return-900;const p=packForItem(item);if(!p)return 0;const u=ensureUsage(usage,p.id),min=Math.max(0,Number(p.quality?.dailyMinCount||0));return u.count<min?240:0}
  function allowed(item,usage){return !conflict(item,usage)&&remainingMinutes(item,usage)>=Math.max(5,Number(item?.policy?.minSessionMin||5))}
  function record(item,minutes,usage){const p=packForItem(item);if(!p)return;const u=ensureUsage(usage,p.id);u.minutes+=Math.max(0,Number(minutes||0));if(!u.questIds.has(item.q.id)){u.count++;u.questIds.add(item.q.id)}}
  function usageFromSlots(slots=[]){const out={};for(const s of slots){if(!s.sideQuest)continue;const fake={q:s.q,policy:{packId:s.packId||D.sideMeta(s.q?.id)?.packId}};record(fake,Math.max(0,Number(s.end)-Number(s.start)),out)}return out}
  function showInBacklog(item){return !isOpportunistic(item)}
  window.MyPerformanceSideQuestQuality={VERSION:5,POLICY_VERSION:'opportunistic-v1',defaults,packForItem,policy,isOpportunistic,showInBacklog,allowed,remainingMinutes,scoreBonus,record,usageFromSlots};
})();
