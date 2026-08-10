"use strict";
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MyPerformanceTimeCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function completionRelease({now,start,end,minGap=15}={}){
    now=Number(now);start=Number(start);end=Number(end);minGap=Math.max(1,Number(minGap)||15);
    if(!Number.isFinite(now)||!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return{early:false,recoveredMin:0,release:null};
    if(now>=end)return{early:false,recoveredMin:0,release:null};
    const releaseStart=Math.max(start,now),recovered=Math.max(0,end-releaseStart);
    return{early:true,recoveredMin:recovered,release:recovered>=minGap?{start:releaseStart,end}:null};
  }
  function authorizeFill(fill,windows,now,minGap=15){
    if(!fill||!Array.isArray(windows)||!windows.length)return null;
    now=Number(now);minGap=Math.max(1,Number(minGap)||15);
    const fs=Number(fill.start),fe=Number(fill.end);if(!Number.isFinite(fs)||!Number.isFinite(fe)||fe<=fs)return null;
    let best=null;
    for(const w of windows){
      const ws=Number(w?.start),we=Number(w?.end);if(!Number.isFinite(ws)||!Number.isFinite(we)||we<=ws||we<=now)continue;
      const start=Math.max(fs,ws,now),end=Math.min(fe,we);if(end-start<minGap)continue;
      const candidate={start,end,window:w};if(!best||(candidate.end-candidate.start)>(best.end-best.start))best=candidate;
    }
    return best;
  }
  function shouldCreateRelease({kind='completion',now,start,end,minGap=15}={}){
    if(kind==='removed-today'){
      const releaseStart=Math.max(Number(start)||0,Number(now)||0),releaseEnd=Number(end)||0,recovered=Math.max(0,releaseEnd-releaseStart);
      return{allowed:recovered>=minGap,recoveredMin:recovered,release:recovered>=minGap?{start:releaseStart,end:releaseEnd}:null};
    }
    const x=completionRelease({now,start,end,minGap});return{allowed:!!x.release,recoveredMin:x.recoveredMin,release:x.release,early:x.early};
  }
  return{completionRelease,authorizeFill,shouldCreateRelease};
});
