"use strict";
/* My Performance 2.5.0 — atomic Side Quest bulk editing.
   One selection -> one revision -> one save -> one Planner invalidation.
   Never loops through Calendar Domain mutators, so bulk edits cannot trigger N replans/snapshots. */
(function(){
  const B=window.MyPerformanceCalendarModel,D=window.MyPerformanceCalendarDomain,E=window.MyPerformancePlannerEngine,T=window.MyPerformanceTaxonomy;
  if(!B||!D||!T||typeof state==='undefined')return;
  const VERSION=10,MAX_REVISIONS=20;
  const all=()=>typeof quests==='function'?quests():[];
  const qById=id=>{try{return questById(id)}catch{return all().find(q=>q.id===id)||null}};
  const fillers=()=>D.model().sideQuestPacks||[];
  const filler=id=>fillers().find(x=>x.id===id)||null;
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number(n)||0));
  const unique=a=>[...new Set((a||[]).filter(x=>x!==undefined&&x!==null&&x!==''))];
  function setQuestPatch(id,patch){const custom=(state.customQuests||[]).find(q=>q.id===id);if(custom)Object.assign(custom,patch);else{state.overrides=state.overrides||{};state.overrides[id]=Object.assign({},state.overrides[id]||{},patch)}}
  function moveToFiller(id,fillerId){const p=filler(fillerId),m=D.sideMeta?.(id);if(!p||!m)return false;for(const x of fillers())x.missionIds=(x.missionIds||[]).filter(qid=>qid!==id);if(!p.missionIds.includes(id))p.missionIds.push(id);m.packId=p.id;setQuestPatch(id,{domain:p.groupId,category:p.name,source:`Filler ${p.name}`});const mm=B.model().missionMeta?.[id];if(mm?.groupId)delete mm.groupId;return true}
  function transaction(reason,fn,detail={}){
    const c=D.model(),previous=Array.isArray(c.revisions)?c.revisions.slice(-(MAX_REVISIONS-1)):[];c.revisions=[];
    let result;
    try{D.recordRevision(reason);result=fn()}finally{const fresh=Array.isArray(c.revisions)?c.revisions.slice():[];c.revisions=[...previous,...fresh].slice(-MAX_REVISIONS);D.log?.('bulk-sidequest',reason,detail);try{saveState()}catch{};try{E?.invalidate?.()}catch{}}
    return result;
  }
  const PRESETS={
    leisure:{name:'Lazer oportunístico',meta:{scheduleType:'opportunistic',rigidity:'free',energyDemand:'low',subtype:'leisure'}},
    necessary:{name:'Rotina necessária',meta:{scheduleType:'flex-window',rigidity:'preferred',energyDemand:'low',subtype:'necessary'}},
    health:{name:'Saúde preferencial',meta:{scheduleType:'preferred',rigidity:'preferred',energyDemand:'medium',subtype:'wellbeing'}},
    development:{name:'Desenvolvimento flexível',meta:{scheduleType:'flex-window',rigidity:'free',energyDemand:'medium',subtype:'development'}}
  };
  function applyOne(id,spec={}){
    const q=qById(id),m=D.sideMeta?.(id);if(!q||!m||q.questType==='main')return false;
    if(spec.active!==undefined)m.active=!!spec.active;
    if(spec.fillerId)moveToFiller(id,spec.fillerId);
    if(spec.preset&&PRESETS[spec.preset])Object.assign(m,PRESETS[spec.preset].meta);
    if(spec.cadence)setQuestPatch(id,{cadence:spec.cadence});
    if(spec.rigidity)m.rigidity=spec.rigidity;
    if(spec.scheduleType)m.scheduleType=spec.scheduleType;
    if(spec.energyDemand)m.energyDemand=spec.energyDemand;
    if(spec.subtype)m.subtype=spec.subtype;
    if(spec.preferredStart!==undefined)m.preferredStart=spec.preferredStart||'';
    if(spec.days){const current=Array.isArray(q.weekdays)?q.weekdays:[],incoming=unique(spec.days.values).map(Number).filter(n=>n>=0&&n<=6);let next=current;if(spec.days.mode==='add')next=unique([...current,...incoming]);else if(spec.days.mode==='remove')next=current.filter(x=>!incoming.includes(Number(x)));else if(spec.days.mode==='replace')next=incoming;setQuestPatch(id,{weekdays:next})}
    if(spec.windows){const current=Array.isArray(m.windowIds)?m.windowIds:[],incoming=unique(spec.windows.values);let next=current;if(spec.windows.mode==='add')next=unique([...current,...incoming]);else if(spec.windows.mode==='remove')next=current.filter(x=>!incoming.includes(x));else if(spec.windows.mode==='replace')next=incoming;m.windowIds=next;m.windowMode=next.length?'exclusive':'group'}
    if(spec.duration){const mode=spec.duration.mode,total=Math.max(5,Number(spec.duration.total||q.durationMin||30));setQuestPatch(id,{durationMin:total});if(mode==='fixed'){m.durationMode='fixed';m.minSessionMin=total;m.idealSessionMin=total;delete m.flexMinMin;delete m.flexMaxMin}else if(mode==='flexible'){const min=Math.min(total,Math.max(5,Number(spec.duration.min||10))),max=Math.max(min,Number(spec.duration.max||total));m.durationMode='flexible';m.flexMinMin=min;m.flexMaxMin=max;m.minSessionMin=min;m.idealSessionMin=max}}
    if(spec.copyFrom){const src=qById(spec.copyFrom.id),sm=D.sideMeta?.(spec.copyFrom.id),fields=new Set(spec.copyFrom.fields||[]);if(src&&sm){if(fields.has('cadence'))setQuestPatch(id,{cadence:src.cadence,weekdays:[...(src.weekdays||[])]});if(fields.has('rigidity')){m.rigidity=sm.rigidity;m.scheduleType=sm.scheduleType;m.subtype=sm.subtype}if(fields.has('energy'))m.energyDemand=sm.energyDemand;if(fields.has('duration')){setQuestPatch(id,{durationMin:src.durationMin});for(const k of ['durationMode','flexMinMin','flexMaxMin','minSessionMin','idealSessionMin']){if(sm[k]===undefined)delete m[k];else m[k]=sm[k]}}if(fields.has('windows')){m.windowMode=sm.windowMode;m.windowIds=[...(sm.windowIds||[])]}if(fields.has('preferred'))m.preferredStart=sm.preferredStart||''}}
    const owning=filler(m.packId);if(owning&&owning.groupId)setQuestPatch(id,{domain:owning.groupId});return true;
  }
  function apply(ids,spec={}){ids=unique(ids).filter(id=>{const q=qById(id);return q&&q.questType!=='main'&&D.sideMeta?.(id)});if(!ids.length)return{changed:0};let changed=0;transaction(`Editar ${ids.length} Side Quests em bloco`,()=>{for(const id of ids)if(applyOne(id,spec))changed++},{ids:[...ids],keys:Object.keys(spec)});return{changed}}
  function remove(ids){ids=unique(ids).filter(id=>qById(id)&&D.sideMeta?.(id));if(!ids.length)return{removed:0};let removed=0;transaction(`Remover ${ids.length} Side Quests em bloco`,()=>{for(const id of ids){for(const p of fillers())p.missionIds=(p.missionIds||[]).filter(x=>x!==id);const i=(state.customQuests||[]).findIndex(q=>q.id===id);if(i>=0)state.customQuests.splice(i,1);else{state.overrides=state.overrides||{};state.overrides[id]=Object.assign({},state.overrides[id]||{},{disabled:true})}delete D.model().sideQuestMeta[id];removed++}},{ids:[...ids]});return{removed}}
  function toggle(ids,active){return apply(ids,{active:!!active})}
  function preview(ids,spec={}){ids=unique(ids);const qs=ids.map(qById).filter(Boolean),groups=new Set(qs.map(q=>B.groupForQuest(q))),fillersTouched=new Set(qs.map(q=>D.sideMeta?.(q.id)?.packId).filter(Boolean));return{count:qs.length,groups:[...groups],fillers:[...fillersTouched],fields:Object.keys(spec),targetFiller:spec.fillerId?filler(spec.fillerId)?.name||'':''}}
  window.MyPerformanceSideQuestBulk={VERSION,PRESETS,apply,remove,toggle,preview,moveToFiller};
})();
