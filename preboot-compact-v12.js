"use strict";
/* My Performance 2.7.0 — preboot compactor.
   Runs before app.js so old temporal/revision payloads cannot make the first mobile load parse and retain unnecessary history. */
(function(){
  const STATE_KEY='my_performance_v1',BASE_KEY='my_performance_neon_base_snapshot';
  const pad=n=>String(n).padStart(2,'0');
  function todaySP(){try{const o={};for(const p of new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()))if(p.type!=='literal')o[p.type]=p.value;return`${o.year}-${o.month}-${o.day}`}catch{return new Date().toISOString().slice(0,10)}}
  function addDays(s,n){const d=new Date(`${s}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return`${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`}
  function hash(raw){let h=2166136261;for(let i=0;i<raw.length;i++)h=Math.imul(h^raw.charCodeAt(i),16777619);return(h>>>0).toString(36)}
  const sig=raw=>`h2:${String(raw||'').length}:${hash(String(raw||''))}`;
  function keepDateMap(src,min,max){if(!src||typeof src!=='object'||Array.isArray(src))return src;const out={};for(const [k,v] of Object.entries(src)){if(/^\d{4}-\d{2}-\d{2}$/.test(k)){if(k>=min&&k<=max)out[k]=v}else out[k]=v}return out}
  function cleanRevision(r){if(!r||typeof r!=='object')return null;const s=r.snapshot||{},cv=Object.assign({},s.calendarV5||{});delete cv.revisions;delete cv.decisionLog;return{id:r.id,at:r.at,reason:r.reason,snapshot:{calendarV5:cv,windows:Array.isArray(s.windows)?s.windows:[]}}}
  let before=0,after=0,changed=false;
  try{
    const raw=localStorage.getItem(STATE_KEY);if(raw){before=raw.length;const x=JSON.parse(raw),now=todaySP(),min7=addDays(now,-7),min14=addDays(now,-14),min30=addDays(now,-30),max2=addDays(now,2);
      if(x.calendarExecutionV8){const c=x.calendarExecutionV8;c.history=keepDateMap(c.history||{},min7,now);c.dayCheckpoints=keepDateMap(c.dayCheckpoints||{},addDays(now,-2),max2);c.actions=(Array.isArray(c.actions)?c.actions:[]).slice(-80);changed=true}
      if(x.calendarV5){const c=x.calendarV5;c.revisions=(Array.isArray(c.revisions)?c.revisions.slice(-6):[]).map(cleanRevision).filter(Boolean);c.decisionLog=(Array.isArray(c.decisionLog)?c.decisionLog:[]).slice(-60);for(const k of ['discardedDays','skippedDaily','eventCompletions'])if(c[k])c[k]=keepDateMap(c[k],min30,max2);changed=true}
      if(x.dailyReviewV6){const r=x.dailyReviewV6;r.history=(Array.isArray(r.history)?r.history:[]).slice(-10);r.pending=(Array.isArray(r.pending)?r.pending:[]).filter(v=>!v?.scheduledDate||v.scheduledDate>=min14).slice(-100);changed=true}
      x.plannerDate=now;
      const next=JSON.stringify(x);after=next.length;if(changed&&next.length<=raw.length)try{localStorage.setItem(STATE_KEY,next)}catch{}
    }
    const base=localStorage.getItem(BASE_KEY)||'';if(base&&!base.startsWith('h2:')){const s=sig(base);try{localStorage.removeItem(BASE_KEY);localStorage.setItem(BASE_KEY,s)}catch{}changed=true}
  }catch(e){try{console.warn('My Performance preboot compaction skipped',e)}catch{}}
  try{window.__MyPerformancePreboot={version:12,beforeBytes:before,afterBytes:after||before,savedBytes:Math.max(0,before-(after||before)),changed}}catch{}
})();
