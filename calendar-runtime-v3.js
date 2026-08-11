"use strict";
/* Shared classic-script helpers used by the final calendar UI. */
var dow=function(date){return dfrom(date).getDay()};
if(typeof state!=='undefined'){
  if(state.filters?.domain==='Carreira')state.filters.domain='Todos';
  if(state.timelineDomain==='Carreira')state.timelineDomain='Todos';
}
