"use strict";
/* My Performance 2.5.0 — Group-root taxonomy.
   Group -> Campaign -> Main Quest
   Group -> Filler -> Side Quest
   Windows only authorize Groups. Planner remains the only allocator.
   Legacy sideQuestPacks storage/API is preserved for backward compatibility. */
(function(){
  const B=window.MyPerformanceCalendarModel,D=window.MyPerformanceCalendarDomain,G=window.MyPerformanceGroups;
  if(!B||!D||!G||typeof state==='undefined')return;
  const VERSION=10;
  const clone=x=>JSON.parse(JSON.stringify(x||{}));
  const allQuests=()=>typeof quests==='function'?quests():[];
  const qById=id=>{try{return questById(id)}catch{return allQuests().find(q=>q.id===id)||null}};
  const validGroup=id=>!!G.group?.(id);
  const fallbackGroup=()=>validGroup('Pessoal')?'Pessoal':(G.groups?.()[0]?.id||'Pessoal');
  const rawGroupForQuest=B.groupForQuest.bind(B);
  const rawCampaignForQuest=B.campaignForQuest.bind(B);

  const KNOWN_FILLER_GROUPS={
    'pack-piano':'Pessoal','pack-leisure':'Pessoal','pack-daily-life':'Pessoal','pack-health':'Pessoal',
    'pack-study-practice':'Estudos','pack-professional-development':'Estudos','pack-gsa-cadence':'GSA'
  };
  function inferFillerGroup(p){
    if(validGroup(p?.groupId))return p.groupId;
    if(validGroup(KNOWN_FILLER_GROUPS[p?.id]))return KNOWN_FILLER_GROUPS[p.id];
    const counts=new Map();
    for(const id of p?.missionIds||[]){const q=qById(id);if(!q)continue;const g=rawGroupForQuest(q);if(validGroup(g))counts.set(g,(counts.get(g)||0)+1)}
    const best=[...counts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0];return validGroup(best)?best:fallbackGroup();
  }
  function fillers(){return D.model().sideQuestPacks||[]}
  function filler(id){return fillers().find(x=>x.id===id)||null}
  function syncQuestLegacyGroup(id,groupId){
    if(!id||!validGroup(groupId))return;
    const custom=(state.customQuests||[]).find(q=>q.id===id);
    if(custom)custom.domain=groupId;else{state.overrides=state.overrides||{};state.overrides[id]=Object.assign({},state.overrides[id]||{},{domain:groupId})}
    const meta=B.model().missionMeta?.[id];if(meta&&meta.groupId)delete meta.groupId;
  }
  function syncFillerMembers(p){if(!p||!validGroup(p.groupId))return;for(const id of p.missionIds||[])syncQuestLegacyGroup(id,p.groupId)}
  function migrate(){
    for(const p of fillers()){p.groupId=inferFillerGroup(p);p.kind='filler';syncFillerMembers(p)}
    for(const c of B.model().campaigns||[]){if(!validGroup(c.groupId))c.groupId=fallbackGroup();c.kind='campaign';for(const id of c.missionIds||[]){const m=B.model().missionMeta?.[id];if(m?.groupId)delete m.groupId}}
    const cv5=D.model();if(!cv5.taxonomyV10){cv5.taxonomyV10={version:VERSION,migratedAt:new Date().toISOString()};try{saveState()}catch{}}
  }
  migrate();

  // Group is inherited from the structural parent. Per-quest domain remains only a compatibility mirror.
  B.groupForQuest=function(q){
    if(!q)return fallbackGroup();
    if(q.questType==='main'){
      const c=rawCampaignForQuest(q);if(c&&validGroup(c.groupId))return c.groupId;
    }else{
      const m=D.sideMeta?.(q.id),p=filler(m?.packId);if(p&&validGroup(p.groupId))return p.groupId;
    }
    const g=rawGroupForQuest(q);return validGroup(g)?g:fallbackGroup();
  };

  // Campaigns own the Group; Main Quests inherit it.
  const rawAddCampaign=B.addCampaign.bind(B),rawSetMissionCampaign=B.setMissionCampaign.bind(B);
  B.addCampaign=function(input={}){const wanted=validGroup(input.groupId)?input.groupId:fallbackGroup(),baseGroup=['GSA','Estudos','Pessoal'].includes(wanted)?wanted:'Pessoal',c=rawAddCampaign(Object.assign({},input,{groupId:baseGroup}));if(c){c.groupId=wanted;c.kind='campaign';try{saveState()}catch{}}return c};
  B.updateCampaign=function(id,patch={}){const c=(B.model().campaigns||[]).find(x=>x.id===id);if(!c)return false;if(patch.name!==undefined)c.name=String(patch.name||'').trim()||c.name;if(patch.groupId!==undefined&&validGroup(patch.groupId))c.groupId=patch.groupId;if(patch.deadline!==undefined)c.deadline=patch.deadline||'';if(patch.priority!==undefined)c.priority=Math.max(1,Number(patch.priority||1));c.kind='campaign';B.normalizePriorities?.();for(const qid of c.missionIds||[]){const m=B.model().missionMeta?.[qid];if(m?.groupId)delete m.groupId}try{saveState()}catch{}return true};
  B.setMissionCampaign=function(missionId,campaignId){const c=rawSetMissionCampaign(missionId,campaignId),m=B.model().missionMeta?.[missionId];if(m?.groupId)delete m.groupId;if(c&&validGroup(c.groupId))syncQuestLegacyGroup(missionId,c.groupId);try{saveState()}catch{}return c};

  // Fillers are the public name for legacy Side Quest Packs.
  const rawAddPack=D.addPack.bind(D),rawUpdatePack=D.updatePack.bind(D),rawDeletePack=D.deletePack.bind(D),rawAddSide=D.addSideQuest.bind(D),rawUpdateSide=D.updateSideQuest.bind(D);
  D.addPack=function(data={}){const wanted=validGroup(data.groupId)?data.groupId:fallbackGroup(),p=rawAddPack(Object.assign({},data,{groupId:wanted,kind:'filler'}));if(p){p.groupId=wanted;p.kind='filler';syncFillerMembers(p)}return p};
  D.updatePack=function(id,patch={}){const wanted=patch.groupId!==undefined?(validGroup(patch.groupId)?patch.groupId:fallbackGroup()):undefined,ok=rawUpdatePack(id,Object.assign({},patch,wanted?{groupId:wanted,kind:'filler'}:{kind:'filler'}));const p=filler(id);if(ok&&p){if(wanted)p.groupId=wanted;p.kind='filler';syncFillerMembers(p);try{saveState()}catch{}}return ok};
  D.deletePack=function(id,deleteMissions=false){return rawDeletePack(id,deleteMissions)};
  D.addSideQuest=function(fillerId,data={}){const p=filler(fillerId);if(!p)throw new Error('Filler não encontrado');const q=rawAddSide(fillerId,Object.assign({},data,{domain:p.groupId,category:data.category||p.name,source:data.source||`Filler ${p.name}`}));if(q)syncQuestLegacyGroup(q.id,p.groupId);return q};
  D.updateSideQuest=function(id,patch={},metaPatch={}){const m=D.sideMeta?.(id),p=filler(metaPatch.packId||m?.packId),next=Object.assign({},patch);if(p)next.domain=p.groupId;const ok=rawUpdateSide(id,next,metaPatch);if(ok&&p)syncQuestLegacyGroup(id,p.groupId);return ok};
  D.fillers=()=>fillers().map(clone);D.filler=id=>filler(id);
  D.addFiller=data=>D.addPack(data);D.updateFiller=(id,patch)=>D.updatePack(id,patch);D.toggleFiller=(id,active)=>D.togglePack(id,active);D.deleteFiller=(id,del=false)=>D.deletePack(id,del);

  // Removing a custom Group also re-homes its Fillers before the Group disappears.
  const rawRemoveGroup=G.remove.bind(G);
  G.remove=function(id,fallback='Pessoal'){if(!validGroup(fallback)||fallback===id)fallback=fallbackGroup();for(const p of fillers())if(p.groupId===id){p.groupId=fallback;syncFillerMembers(p)}const out=rawRemoveGroup(id,fallback);try{saveState()}catch{}return out};

  function summary(groupId){
    const gs=G.group(groupId);if(!gs)return null;const campaigns=(B.model().campaigns||[]).filter(c=>c.groupId===groupId),fs=fillers().filter(f=>f.groupId===groupId),mainIds=new Set(campaigns.flatMap(c=>c.missionIds||[])),sideIds=new Set(fs.flatMap(f=>f.missionIds||[])),capacity=(D.baseWindows?.()||[]).filter(w=>(w.groups||[]).includes(groupId)).reduce((n,w)=>n+Math.max(0,Number(w.end||0)-Number(w.start||0)),0);return{group:clone(gs),campaigns:campaigns.map(clone),fillers:fs.map(clone),mainCount:mainIds.size,sideCount:sideIds.size,weeklyCapacityMin:capacity};
  }
  function moveSideQuest(id,targetFillerId){const p=filler(targetFillerId),m=D.sideMeta?.(id);if(!p||!m)return false;for(const x of fillers())x.missionIds=(x.missionIds||[]).filter(qid=>qid!==id);if(!p.missionIds.includes(id))p.missionIds.push(id);m.packId=p.id;syncQuestLegacyGroup(id,p.groupId);try{saveState()}catch{}return true}

  window.MyPerformanceTaxonomy={VERSION,fillers:()=>fillers().map(clone),filler:id=>clone(filler(id)),summary,moveSideQuest,groupForQuest:B.groupForQuest};
})();
