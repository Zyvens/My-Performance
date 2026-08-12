"use strict";
/* My Performance 2.4.4 — bounded mutation history.
   Keeps prior revision history detached while legacy mutators create their new snapshot,
   preventing transient recursive/large clones when several Side Quests are toggled. */
(function(){
  const D=window.MyPerformanceCalendarDomain,S=window.MyPerformanceCalendarRevisionSafety;
  if(!D||typeof state==='undefined')return;
  const MAX=20;
  const names=['updateWindow','addWindow','removeWindow','addPack','updatePack','togglePack','deletePack','addSideQuest','updateSideQuest','toggleSideQuest','removeSideQuest','addEvent','updateEvent','toggleEvent','deleteEvent','setMissionPolicy','updateEngine'];
  for(const name of names){
    const base=typeof D[name]==='function'?D[name].bind(D):null;if(!base||base.__boundedV9)continue;
    const wrapped=function(...args){
      const c=D.model(),previous=Array.isArray(c.revisions)?c.revisions.slice(-(MAX-1)):[];
      c.revisions=[];
      let out,newOnes=[];
      try{
        out=base(...args);
        newOnes=Array.isArray(c.revisions)?c.revisions.slice():[];
      }finally{
        c.revisions=[...previous,...newOnes].slice(-MAX);
        try{S?.compact?.()}catch{}
        try{saveState()}catch{}
      }
      return out;
    };
    wrapped.__boundedV9=true;D[name]=wrapped;
  }
  try{S?.compact?.()}catch{}
  window.MyPerformanceMutationBounded={VERSION:9,MAX_REVISIONS:MAX};
})();
