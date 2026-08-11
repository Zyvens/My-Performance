"use strict";
/* Calendar V5 persistence policy. Keeps user-edited window identity stable across migrations/cloud loads. */
(function(){
  const D=window.MyPerformanceCalendarDomain;if(!D||typeof state==='undefined')return;const c=D.model();c.windowLabels=c.windowLabels||{};
  function restore(){for(const w of D.baseWindows())if(c.windowLabels[w.id])w.label=c.windowLabels[w.id]}
  restore();
  const update=D.updateWindow.bind(D);D.updateWindow=function(id,patch){if(patch&&Object.prototype.hasOwnProperty.call(patch,'label'))c.windowLabels[id]=String(patch.label||'Janela');return update(id,patch)};
  const add=D.addWindow.bind(D);D.addWindow=function(data){const w=add(data);if(w?.id)c.windowLabels[w.id]=String(w.label||'Janela');return w};
  const remove=D.removeWindow.bind(D);D.removeWindow=function(id){delete c.windowLabels[id];return remove(id)};
  window.addEventListener('my-performance-cloud-loaded',()=>{const next=D.model();next.windowLabels=next.windowLabels||{};for(const w of D.baseWindows())if(next.windowLabels[w.id])w.label=next.windowLabels[w.id];window.MyPerformancePlannerEngine?.invalidate?.()});
  window.MyPerformanceCalendarPersistence={VERSION:5,restoreLabels:restore};
})();
