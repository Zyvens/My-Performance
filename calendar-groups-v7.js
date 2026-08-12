"use strict";
/* Calendar Groups V7 — configurable groups without turning them into scheduler rules. */
(function(){
  const B=window.MyPerformanceCalendarModel,D=window.MyPerformanceCalendarDomain;
  if(!B||!D||typeof state==='undefined')return;
  const clone=x=>JSON.parse(JSON.stringify(x||{}));
  const DEFAULTS=[
    {id:'GSA',name:'GSA',icon:'◆',color:'#36c596',builtin:true},
    {id:'Estudos',name:'Estudo',icon:'⌘',color:'#4d8dff',builtin:true},
    {id:'Pessoal',name:'Pessoal',icon:'♥',color:'#b52b70',builtin:true}
  ];
  function store(){const c=D.model();if(!Array.isArray(c.groups)||!c.groups.length)c.groups=clone(DEFAULTS);for(const g of DEFAULTS)if(!c.groups.some(x=>x.id===g.id))c.groups.unshift(clone(g));return c.groups}
  function groups(){return clone(store())}
  function group(id){return store().find(g=>g.id===id)||null}
  function valid(id){return!!group(id)}
  const baseGroup=B.groupForQuest.bind(B),baseUpdateWindow=D.updateWindow.bind(D),baseAddWindow=D.addWindow.bind(D),baseAddEvent=D.addEvent.bind(D),baseUpdateEvent=D.updateEvent.bind(D);
  B.groups=groups;
  B.groupForQuest=function(q){const meta=B.model().missionMeta?.[q?.id]||{},candidate=meta.groupId||q?.domain;if(valid(candidate))return candidate;if(candidate==='Carreira'&&valid('Estudos'))return'Estudos';const fallback=baseGroup(q);return valid(fallback)?fallback:'Pessoal'};
  D.updateWindow=function(id,patch={}){const wanted=(patch.groups||[]).filter(valid),preferred=valid(patch.preferredGroup)?patch.preferredGroup:'';const ok=baseUpdateWindow(id,Object.assign({},patch,{groups:wanted.length?wanted:['Pessoal'],preferredGroup:preferred||wanted[0]||'Pessoal'}));const w=D.windowForId(id);if(ok&&w){w.groups=wanted.length?wanted:['Pessoal'];w.preferredGroup=preferred||w.groups[0];saveState()}return ok};
  D.addWindow=function(data={}){const wanted=(data.groups||[]).filter(valid),preferred=valid(data.preferredGroup)?data.preferredGroup:'';const w=baseAddWindow(Object.assign({},data,{groups:wanted.length?wanted:['Pessoal'],preferredGroup:preferred||wanted[0]||'Pessoal'}));if(w){w.groups=wanted.length?wanted:['Pessoal'];w.preferredGroup=preferred||w.groups[0];saveState()}return w};
  D.addEvent=function(data={}){const desired=valid(data.groupId)?data.groupId:'Pessoal',e=baseAddEvent(Object.assign({},data,{groupId:'Pessoal'}));if(e){e.groupId=desired;saveState()}return e};
  D.updateEvent=function(id,patch={}){const desired=patch.groupId&&valid(patch.groupId)?patch.groupId:null,ok=baseUpdateEvent(id,Object.assign({},patch,desired?{groupId:'Pessoal'}:{}));const e=D.event(id);if(ok&&e&&desired){e.groupId=desired;saveState()}return ok};
  function slug(name){const base=String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'grupo';let id=`grp-${base}`,n=2;while(group(id))id=`grp-${base}-${n++}`;return id}
  function add(data={}){const name=String(data.name||'').trim();if(!name)throw new Error('Informe o nome do Grupo');const g={id:slug(name),name,icon:String(data.icon||'●').trim()||'●',color:data.color||'#8b75e8',builtin:false};store().push(g);saveState();return g}
  function update(id,patch={}){const g=group(id);if(!g)return false;if(patch.name)g.name=String(patch.name).trim()||g.name;if(patch.icon!==undefined)g.icon=String(patch.icon||'●').trim()||'●';if(patch.color)g.color=patch.color;saveState();return true}
  function remove(id,fallback='Pessoal'){const g=group(id);if(!g||g.builtin)return false;if(!valid(fallback)||fallback===id)fallback='Pessoal';const c=D.model(),m=B.model();for(const w of m.windows||[]){w.groups=(w.groups||[]).map(x=>x===id?fallback:x);if(w.preferredGroup===id)w.preferredGroup=fallback}for(const e of c.events||[])if(e.groupId===id)e.groupId=fallback;for(const campaign of m.campaigns||[])if(campaign.groupId===id)campaign.groupId=fallback;for(const [qid,meta] of Object.entries(m.missionMeta||{}))if(meta.groupId===id)meta.groupId=fallback;for(const q of state.customQuests||[])if(q.domain===id)q.domain=fallback;state.overrides=state.overrides||{};for(const q of (typeof quests==='function'?quests():[]))if(q.domain===id)state.overrides[q.id]=Object.assign({},state.overrides[q.id]||{},{domain:fallback});c.groups=c.groups.filter(x=>x.id!==id);saveState();return true}
  window.MyPerformanceGroups={VERSION:7,groups,group,add,update,remove,valid};
})();
