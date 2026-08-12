"use strict";
/* My Performance 2.8.0 — zero-history preboot compactor.
   Before app.js parses state, every operational calendar date except Today is removed. Completion/XP ledgers remain authoritative history. */
(function(){
  const STATE_KEY='my_performance_v1',BASE_KEY='my_performance_neon_base_snapshot',REVIEW_KEY='my_performance_daily_review_v6';
  function todaySP(){try{const o={};for(const p of new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()))if(p.type!=='literal')o[p.type]=p.value;return`${o.year}-${o.month}-${o.day}`}catch{return new Date().toISOString().slice(0,10)}}
  function hash(raw){let h=2166136261;for(let i=0;i<raw.length;i++)h=Math.imul(h^raw.charCodeAt(i),16777619);return(h>>>0).toString(36)}
  const sig=raw=>`h2:${String(raw||'').length}:${hash(String(raw||''))}`;
  function onlyToday(src,today){if(!src||typeof src!=='object'||Array.isArray(src))return{};const out={};if(Object.prototype.hasOwnProperty.call(src,today))out[today]=src[today];return out}
  function cleanRevision(r){if(!r||typeof r!=='object')return null;const s=r.snapshot||{},cv=Object.assign({},s.calendarV5||{});delete cv.revisions;delete cv.decisionLog;delete cv.eventCompletions;delete cv.discardedDays;delete cv.skippedDaily;return{id:r.id,at:r.at,reason:r.reason,snapshot:{calendarV5:cv,windows:Array.isArray(s.windows)?s.windows:[]}}}
  let before=0,after=0,changed=false;
  try{
    const raw=localStorage.getItem(STATE_KEY);if(raw){before=raw.length;const x=JSON.parse(raw),now=todaySP();
      x.plannerDate=now;delete x.dailyReviewV6;
      if(x.calendarExecutionV8){const c=x.calendarExecutionV8;c.history=onlyToday(c.history,now);c.dayCheckpoints=onlyToday(c.dayCheckpoints,now);c.actions=(Array.isArray(c.actions)?c.actions:[]).filter(a=>!a?.date||a.date===now).slice(-30);changed=true}
      if(x.calendarV5){const c=x.calendarV5;c.revisions=(Array.isArray(c.revisions)?c.revisions.slice(-4):[]).map(cleanRevision).filter(Boolean);c.decisionLog=(Array.isArray(c.decisionLog)?c.decisionLog:[]).slice(-30);for(const k of ['discardedDays','skippedDaily','eventCompletions'])c[k]=onlyToday(c[k],now);changed=true}
      if(x.calendarV3){const c=x.calendarV3;for(const k of ['discardedDays','skippedDates','liveCapacityReleases'])if(c[k])c[k]=onlyToday(c[k],now);changed=true}
      const next=JSON.stringify(x);after=next.length;if(next!==raw)try{localStorage.setItem(STATE_KEY,next)}catch{}
    }
    try{localStorage.removeItem(REVIEW_KEY)}catch{}
    const base=localStorage.getItem(BASE_KEY)||'';if(base&&!base.startsWith('h2:')){const s=sig(base);try{localStorage.removeItem(BASE_KEY);localStorage.setItem(BASE_KEY,s)}catch{}changed=true}
  }catch(e){try{console.warn('My Performance preboot zero-history compaction skipped',e)}catch{}}
  try{window.__MyPerformancePreboot={version:13,mode:'today-only',beforeBytes:before,afterBytes:after||before,savedBytes:Math.max(0,before-(after||before)),changed}}catch{}
})();
