"use strict";
(function(){
  function migrateRoutine(){
    let changed=false;state.routineSettings=state.routineSettings||{};
    if(Number(state.routineSettingsVersion||0)<2){
      state.routineSettings.gymStart='06:30';
      if(!state.routineSettings.gymDuration)state.routineSettings.gymDuration=90;
      if(!state.routineSettings.wakeTime)state.routineSettings.wakeTime='06:00';
      if(!state.routineSettings.sleepTime)state.routineSettings.sleepTime='22:00';
      state.routineSettingsVersion=2;changed=true;
    }
    window.MyPerformanceRoutine?.applySettings?.();return changed;
  }
  function minusFive(t){const[h,m]=(t||'22:00').split(':').map(Number),n=((h*60+m-5)%1440+1440)%1440;return`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`}
  function normalizeSleepMarker(){
    const sleep=state.routineSettings?.sleepTime||'22:00';state.overrides=state.overrides||{};const cur=state.overrides['personal-sleep']||{},next={timeStart:minusFive(sleep),timeEnd:sleep,durationMin:5,fixedTime:true,essential:true};
    const changed=Object.keys(next).some(k=>cur[k]!==next[k]);state.overrides['personal-sleep']=Object.assign({},cur,next);return changed;
  }
  let lock=false;
  function reconcile(){
    if(lock)return;lock=true;const changed=migrateRoutine()|normalizeSleepMarker();if(changed)saveState();lock=false;
  }
  reconcile();
  window.addEventListener('my-performance-state-saved',()=>setTimeout(reconcile,0));
  window.addEventListener('my-performance-cloud-loaded',()=>setTimeout(()=>{reconcile();render()},0));
  if('serviceWorker'in navigator){
    navigator.serviceWorker.addEventListener('message',event=>{
      if(event.data?.type==='OPEN_TODAY'){
        state.plannerDate=today();
        go('today');
      }
    });
  }
  setTimeout(()=>render(),0);
})();
