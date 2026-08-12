"use strict";
/* My Performance 2.8.1 — Config Main Quest grouping + inline dependency state. UI only. */
(function(){
  const B=window.MyPerformanceCalendarModel,D=window.MyPerformanceCalendarDomain,A=window.MyPerformanceCalendarAdvanced,Deps=window.MyPerformancePlannerDependencies;
  if(!B||!D)return;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const all=()=>typeof quests==='function'?quests():[];
  const due=q=>String(q?.dueDate||'9999-12-31');
  const dateLabel=d=>{if(!d)return'Sem prazo';const [y,m,day]=String(d).split('-');return day&&m&&y?`${day}/${m}/${y}`:String(d)};
  function groupId(q){return B.groupForQuest?.(q)||q?.domain||'Pessoal'}
  function activeMain(){return all().filter(q=>q.questType==='main'&&!q.disabled&&!q.campaignContainer&&groupId(q)!=='Carreira').sort((a,b)=>due(a).localeCompare(due(b))||String(a.title).localeCompare(String(b.title),'pt-BR'))}
  function groups(){const configured=B.groups?.()||[],map=new Map(configured.map((g,i)=>[g.id,Object.assign({order:i},g)])),ids=[...new Set(activeMain().map(groupId))];return ids.map(id=>map.get(id)||{id,name:id,icon:'●',color:'#718096',order:999}).sort((a,b)=>Number(a.order||0)-Number(b.order||0)||String(a.name).localeCompare(String(b.name),'pt-BR'))}
  function dependencyLabel(q){const s=Deps?.status?.(q);if(!s||s.ready)return'';if(s.cycle)return`depende de: corrigir ciclo ${s.cycle.map(id=>{try{return questById(id)?.title||id}catch{return id}}).join(' → ')}`;return`depende de: ${(s.missing||[]).map(id=>{try{return questById(id)?.title||id}catch{return id}}).join(', ')}`}
  function row(q){
    const p=D.missionPolicy(q),camp=B.campaignForQuest?.(q),gid=groupId(q),g=(B.groups?.()||[]).find(x=>x.id===gid)||{name:gid,color:'#718096',icon:'●'},dep=dependencyLabel(q),blocked=!!dep;
    return`<div class="v5-manager-row mq-row-v9 ${blocked?'mq-dependency-blocked-v9':''}"><div><b>◆ ${esc(q.title)}</b><div class="v5-meta"><span class="tag mq-group-tag-v9" style="--mqg:${esc(g.color||'#718096')}">${esc(g.icon||'●')} ${esc(g.name||gid)}</span>${camp?`<span class="pill amber">${esc(camp.name)}</span>`:''}<span class="pill ${q.dueDate?'':'muted'}">${q.dueDate?`⌛ ${esc(dateLabel(q.dueDate))}`:'Sem deadline'}</span>${p.targetDate?`<span class="pill">alvo ${esc(dateLabel(p.targetDate))}</span>`:''}<span class="pill">${Number(p.effortLikelyMin||q.durationMin||60)} min provável</span></div>${blocked?`<div class="mq-dependency-note-v9"><span>🔒 BLOQUEADA</span><b>${esc(dep)}</b></div>`:''}</div><div class="v5-manager-actions"><button class="btn small" data-main-strategy-v9="${esc(q.id)}">Estratégia</button></div></div>`;
  }
  function enhance(){if(state?.view!=='config')return;const root=document.getElementById('mainQuestStrategyV5'),manager=root?.querySelector('.v5-manager');if(!root||!manager)return;const qs=activeMain(),gs=groups();manager.innerHTML=gs.map(g=>{const items=qs.filter(q=>groupId(q)===g.id);return`<section class="mq-group-v9" style="--mqg:${esc(g.color||'#718096')}"><div class="mq-group-head-v9"><span><i></i>${esc(g.icon||'●')} <b>${esc(g.name||g.id)}</b></span><small>${items.length} Main Quest${items.length===1?'':'s'} · ordenadas por deadline</small></div>${items.map(row).join('')}</section>`}).join('')||'<div class="empty">Nenhuma Main Quest ativa.</div>';manager.querySelectorAll('[data-main-strategy-v9]').forEach(b=>b.onclick=()=>A?.openStrategy?.(b.dataset.mainStrategyV9));root.dataset.groupedV9='1'}
  window.addEventListener?.('my-performance-view-rendered',()=>requestAnimationFrame(enhance));setTimeout(enhance,0);
  window.MyPerformanceMainQuestGrouped={VERSION:10,enhance};
})();
