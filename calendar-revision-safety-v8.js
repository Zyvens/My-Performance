"use strict";
/* My Performance 2.4.2 — safe Calendar Domain revisions.
   Revision snapshots never contain revision/log history, preventing recursive state growth. */
(function(){
  const D=window.MyPerformanceCalendarDomain,M=window.MyPerformanceCalendarModel,P=window.MyPerformanceRevisionPrune;
  if(!D||!M||typeof state==='undefined')return;
  const MAX_REVISIONS=20,MAX_LOG=120,clone=x=>{try{return JSON.parse(JSON.stringify(x))}catch{return null}};
  function cleanCalendar(src){
    if(P?.cleanCalendar)return P.cleanCalendar(src);
    const out={};for(const [k,v] of Object.entries(src||{})){if(k==='revisions'||k==='decisionLog')continue;const c=clone(v);if(c!==null)out[k]=c}out.revisions=[];out.decisionLog=[];return out;
  }
  function compact(){
    const c=D.model();
    c.revisions=(Array.isArray(c.revisions)?c.revisions.slice(-MAX_REVISIONS):[]).map(r=>({id:Number(r?.id||0),at:String(r?.at||''),reason:String(r?.reason||'Revisão'),snapshot:{calendarV5:cleanCalendar(r?.snapshot?.calendarV5||{}),windows:clone(r?.snapshot?.windows||[])||[]}}));
    c.decisionLog=(Array.isArray(c.decisionLog)?c.decisionLog.slice(-MAX_LOG):[]).map(x=>({at:String(x?.at||''),type:String(x?.type||''),message:String(x?.message||''),detail:clone(x?.detail||{})||{}}));
    c.revisionStorageV8=true;return c;
  }
  D.recordRevision=function(reason){
    const c=compact(),id=Math.max(Number(c.lastRevisionId||0),...c.revisions.map(r=>Number(r.id||0)))+1;c.lastRevisionId=id;
    c.revisions.push({id,at:new Date().toISOString(),reason:String(reason||'Revisão'),snapshot:{calendarV5:cleanCalendar(c),windows:clone(D.baseWindows?.()||M.model()?.windows||[])||[]}});
    if(c.revisions.length>MAX_REVISIONS)c.revisions.splice(0,c.revisions.length-MAX_REVISIONS);
    return id;
  };
  const mutators=['updateWindow','addWindow','removeWindow','addPack','updatePack','togglePack','deletePack','addSideQuest','updateSideQuest','toggleSideQuest','removeSideQuest','addEvent','updateEvent','toggleEvent','deleteEvent','setMissionPolicy','updateEngine'];
  for(const name of mutators){const base=typeof D[name]==='function'?D[name].bind(D):null;if(!base)continue;D[name]=function(...args){const out=base(...args);compact();try{saveState()}catch{}return out}}
  compact();
  window.MyPerformanceCalendarRevisionSafety={VERSION:8,compact};
})();
