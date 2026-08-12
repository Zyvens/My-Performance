"use strict";
/* My Performance 2.4.2 — pre-domain revision compaction.
   Removes recursive revision snapshots before Calendar Domain performs its startup save. */
(function(){
  if(typeof state==='undefined')return;
  const MAX_REVISIONS=20,MAX_LOG=120;
  const clone=x=>{try{return JSON.parse(JSON.stringify(x))}catch{return null}};
  function cleanCalendar(src){
    const out={};
    for(const [k,v] of Object.entries(src||{})){
      if(k==='revisions'||k==='decisionLog')continue;
      const c=clone(v);if(c!==null)out[k]=c;
    }
    out.revisions=[];out.decisionLog=[];
    return out;
  }
  function cleanRevision(r){
    if(!r||typeof r!=='object')return null;
    const snap=r.snapshot||{};
    return{id:Number(r.id||0),at:String(r.at||''),reason:String(r.reason||'Revisão'),snapshot:{calendarV5:cleanCalendar(snap.calendarV5||{}),windows:clone(snap.windows||[])||[]}};
  }
  function prune(){
    const c=state.calendarV5;if(!c||typeof c!=='object')return{changed:false,count:0};
    const source=Array.isArray(c.revisions)?c.revisions.slice(-MAX_REVISIONS):[];
    c.revisions=source.map(cleanRevision).filter(Boolean);
    c.decisionLog=(Array.isArray(c.decisionLog)?c.decisionLog.slice(-MAX_LOG):[]).map(x=>({at:String(x?.at||''),type:String(x?.type||''),message:String(x?.message||''),detail:clone(x?.detail||{})||{}}));
    c.revisionStorageV8=true;
    return{changed:true,count:c.revisions.length};
  }
  const result=prune();
  window.MyPerformanceRevisionPrune={VERSION:8,prune,cleanCalendar,result};
})();
