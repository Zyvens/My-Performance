"use strict";
/* Routine Anchors V7 — wake/sleep are configurable day boundaries, not Events. Also migrates meal capacity into dedicated windows. */
(function(){
  const B=window.MyPerformanceCalendarModel,D=window.MyPerformanceCalendarDomain,E=window.MyPerformancePlannerEngine;
  if(!B||!D||!E||typeof state==='undefined')return;
  const DEFAULTS={
    0:{wake:360,sleep:1350},1:{wake:360,sleep:1350},2:{wake:360,sleep:1350},3:{wake:270,sleep:1350},4:{wake:360,sleep:1410},5:{wake:360,sleep:1350},6:{wake:360,sleep:1350}
  };
  const SLEEP_WINDOWS={0:'sun-sleep',1:'mon-sleep',2:'tue-sleep',3:'wed-sleep',4:'thu-sleep',5:'fri-sleep',6:'sat-sleep'};
  const clone=x=>JSON.parse(JSON.stringify(x||{})),toMin=t=>E.toMin(t),toTime=n=>E.toTime(n),dayKey=n=>String(Number(n));
  function store(){const c=D.model();c.dayAnchors=c.dayAnchors||{};for(let i=0;i<7;i++){const k=dayKey(i),d=DEFAULTS[i];c.dayAnchors[k]=Object.assign({wakeMin:d.wake,sleepMin:d.sleep,extensionMaxMin:120},c.dayAnchors[k]||{})}return c.dayAnchors}
  function get(wd){return clone(store()[dayKey(wd)]||DEFAULTS[Number(wd)]||DEFAULTS[1])}
  function upsertWindow(id,data){const w=D.windowForId(id);if(w){Object.assign(w,data,{id});w.windowV5=Object.assign({},w.windowV5||{},{color:w.color,energy:w.energy,allowSideQuests:!!w.allowSideQuests,sideQuestDedicated:!!w.sideQuestDedicated,zoneFree:!!w.zoneFree,rigidity:w.rigidity||'normal'});return w}return D.addWindow(Object.assign({id},data))}
  function syncSleepWindow(wd){const a=get(wd),id=SLEEP_WINDOWS[Number(wd)],start=Math.max(0,a.sleepMin-30),end=Math.min(1560,a.sleepMin+10);return upsertWindow(id,{weekday:Number(wd),start,end,label:'Encerramento / Sono',groups:['Pessoal'],preferredGroup:'Pessoal',color:'#718096',energy:'low',allowSideQuests:true,sideQuestDedicated:true,zoneFree:false,rigidity:'preferred'})}
  function set(wd,patch={}){const k=dayKey(wd),x=store()[k]=Object.assign({},store()[k]||DEFAULTS[Number(wd)]||DEFAULTS[1]);if(patch.wakeMin!==undefined)x.wakeMin=Math.max(0,Math.min(1439,Number(patch.wakeMin)));if(patch.sleepMin!==undefined)x.sleepMin=Math.max(0,Math.min(1559,Number(patch.sleepMin)));if(patch.extensionMaxMin!==undefined)x.extensionMaxMin=Math.max(0,Math.min(180,Number(patch.extensionMaxMin)));syncSleepWindow(Number(wd));saveState();E.invalidate?.();return clone(x)}
  const basePref=B.prefFor.bind(B),baseWindowsForWeekday=D.windowsForWeekday.bind(D);
  B.prefFor=function(q,date){const wd=dfrom(date).getDay(),a=get(wd);if(q?.id==='personal-wake')return[a.wakeMin,a.wakeMin+10,'âncora de despertar configurada'];if(q?.id==='personal-sleep')return[a.sleepMin,a.sleepMin+10,'âncora de sono configurada'];return basePref(q,date)};
  D.windowsForWeekday=function(wd){const a=get(wd);return(baseWindowsForWeekday(wd)||[]).map(w=>{if(w.id===SLEEP_WINDOWS[Number(wd)])return w;const start=Math.max(Number(w.start),Number(a.wakeMin)),end=Math.min(Number(w.end),Number(a.sleepMin));if(end<=start)return null;return Object.assign({},w,{start,end})}).filter(Boolean)};
  function migrateWindows(){const c=D.model();if(Number(c.routineWindowSchema||0)<7){c.routineWindowSchema=7;
    const tue=D.windowForId('tue-training');if(tue&&tue.start===720&&tue.end>=840){tue.end=810;tue.label='Saúde / Treino';tue.groups=['Pessoal'];tue.preferredGroup='Pessoal'}
    upsertWindow('tue-lunch',{weekday:2,start:810,end:840,label:'Almoço / Pessoal',groups:['Pessoal'],preferredGroup:'Pessoal',color:'#45b97c',energy:'medium',allowSideQuests:true,sideQuestDedicated:true,zoneFree:false,rigidity:'preferred'});
    const wed=D.windowForId('wed-training');if(wed&&wed.start===720&&wed.end>=870){wed.end=810;wed.label='Saúde / Treino';wed.groups=['Pessoal'];wed.preferredGroup='Pessoal'}
    upsertWindow('wed-lunch',{weekday:3,start:810,end:870,label:'Almoço / Pessoal',groups:['Pessoal'],preferredGroup:'Pessoal',color:'#45b97c',energy:'medium',allowSideQuests:true,sideQuestDedicated:true,zoneFree:false,rigidity:'preferred'});
    const thuCell=D.windowForId('thu-cell');if(thuCell&&thuCell.end>1380)thuCell.end=1380;
  }
    for(let wd=0;wd<7;wd++)syncSleepWindow(wd);saveState();E.invalidate?.();
  }
  migrateWindows();
  window.addEventListener?.('my-performance-cloud-loaded',()=>{try{store();migrateWindows()}catch{}});
  window.MyPerformanceRoutineAnchors={VERSION:7,get,set,all:()=>clone(store()),toTime,toMin};
})();
