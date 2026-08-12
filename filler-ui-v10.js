"use strict";
/* My Performance 2.5.0 — Filler terminology + Side Quest parent inheritance UI. */
(function(){
  const B=window.MyPerformanceCalendarModel,D=window.MyPerformanceCalendarDomain,G=window.MyPerformanceGroups,T=window.MyPerformanceTaxonomy,E=window.MyPerformancePlannerEngine;
  if(!B||!D||!G||!T||typeof state==='undefined')return;
  const VERSION=10;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const all=()=>typeof quests==='function'?quests():[];
  const fillers=()=>T.fillers();
  const currentQuest=()=>{const title=document.getElementById('sqTitle')?.value||'';return all().find(q=>q.title===title)||null};
  function fillerOptions(current){return G.groups().map(g=>{const fs=fillers().filter(f=>f.groupId===g.id);if(!fs.length)return'';return`<optgroup label="${esc(g.icon||'●')} ${esc(g.name)}">${fs.map(f=>`<option value="${esc(f.id)}" ${f.id===current?'selected':''}>${esc(f.name)}</option>`).join('')}</optgroup>`}).join('')}
  function inferCurrentFiller(){const q=currentQuest(),m=q?D.sideMeta?.(q.id):null;if(m?.packId)return m.packId;const eyebrow=document.querySelector('#modal .eyebrow')?.textContent||'';return fillers().find(f=>eyebrow.includes(f.name))?.id||fillers()[0]?.id||''}
  function formFiller(){return document.getElementById('sqFillerV10')?.value||''}
  const baseAdd=D.addSideQuest.bind(D),baseUpdate=D.updateSideQuest.bind(D);
  D.addSideQuest=function(parentId,data={}){const target=formFiller()||parentId,q=baseAdd(target,data);if(q&&target)T.moveSideQuest?.(q.id,target);return q};
  D.updateSideQuest=function(id,patch={},metaPatch={}){const target=formFiller()||metaPatch.packId||D.sideMeta?.(id)?.packId,out=baseUpdate(id,patch,Object.assign({},metaPatch,target?{packId:target}:{}));if(out&&target)T.moveSideQuest?.(id,target);return out};

  function syncInherited(root){const sel=root.querySelector('#sqFillerV10'),label=root.querySelector('[data-filler-group-v10]');if(!sel||!label)return;const p=D.filler?.(sel.value)||D.pack(sel.value),g=G.group(p?.groupId);label.textContent=g?`${g.icon||'●'} ${g.name}`:(p?.groupId||'Pessoal');label.style.setProperty('--filler-group-color',g?.color||'#718096');const legacy=root.querySelector('#sqGroup');if(legacy){legacy.value=p?.groupId||'Pessoal';legacy.disabled=true;const field=legacy.closest('.field');if(field){field.hidden=true;field.dataset.inheritedV10='1'}}}
  function enhanceModal(){
    const root=document.getElementById('modal'),title=root?.querySelector('#sqTitle');if(!title||root.querySelector('#sqFillerV10'))return;
    const current=inferCurrentFiller(),p=D.filler?.(current)||D.pack(current),host=title.closest('.field');if(!host||!p)return;
    host.insertAdjacentHTML('afterend',`<div class="form-row filler-parent-v10"><div class="field"><label>Filler</label><select id="sqFillerV10">${fillerOptions(current)}</select><small class="subtle">A Side Quest herda o Grupo do Filler.</small></div><div class="field"><label>Grupo herdado</label><div class="filler-group-readonly-v10" data-filler-group-v10></div><small class="subtle">Para mudar de Grupo, mova a Side Quest para um Filler daquele Grupo.</small></div></div>`);
    const sel=root.querySelector('#sqFillerV10');sel.onchange=()=>{syncInherited(root);const legacy=root.querySelector('#sqGroup');legacy?.dispatchEvent(new Event('change',{bubbles:true}))};setTimeout(()=>syncInherited(root),0);syncInherited(root);
  }
  const REPLACEMENTS=[
    ['SIDE QUEST PACKS','FILLERS'],['SIDE QUEST PACK','FILLER'],['Pack:','Filler:'],['Pack ·','Filler ·'],
    ['Pacotes de atividades secundárias','Fillers de Side Quests'],['pacotes inteiros','Fillers inteiros'],['pacote de Side Quests','Filler de Side Quests'],['pacote “','Filler “']
  ];
  function terminology(scope=document.getElementById('view')){if(!scope)return;const walker=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const n of nodes){if(!n.nodeValue?.trim())continue;let s=n.nodeValue;for(const [a,b] of REPLACEMENTS)s=s.split(a).join(b);if(s!==n.nodeValue)n.nodeValue=s}}
  function enhance(){enhanceModal();terminology(document.getElementById('view'));terminology(document.getElementById('modal'))}
  const mo=new MutationObserver(()=>requestAnimationFrame(enhance));const modalRoot=document.getElementById('modal');if(modalRoot)mo.observe(modalRoot,{childList:true,subtree:true});window.addEventListener?.('my-performance-view-rendered',()=>requestAnimationFrame(enhance));setTimeout(enhance,0);
  window.MyPerformanceFillerUI={VERSION,enhance,formFiller};
})();
