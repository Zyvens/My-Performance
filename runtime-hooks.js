"use strict";
(function(){
  state.routineSettings=state.routineSettings||{};
  if(Number(state.routineSettingsVersion||0)<2){
    state.routineSettings.gymStart='06:30';
    if(!state.routineSettings.gymDuration)state.routineSettings.gymDuration=90;
    if(!state.routineSettings.wakeTime)state.routineSettings.wakeTime='06:00';
    if(!state.routineSettings.sleepTime)state.routineSettings.sleepTime='22:00';
    state.routineSettingsVersion=2;
    window.MyPerformanceRoutine?.applySettings?.();
  }
  function minusFive(t){const[h,m]=(t||'22:00').split(':').map(Number),n=((h*60+m-5)%1440+1440)%1440;return`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`}
  function normalizeSleepMarker(){
    const sleep=state.routineSettings?.sleepTime||'22:00';state.overrides=state.overrides||{};
    state.overrides['personal-sleep']=Object.assign({},state.overrides['personal-sleep']||{},{timeStart:minusFive(sleep),timeEnd:sleep,durationMin:5,fixedTime:true,essential:true});
  }
  normalizeSleepMarker();saveState();
  let lock=false;window.addEventListener('my-performance-state-saved',()=>{if(lock)return;lock=true;setTimeout(()=>{normalizeSleepMarker();lock=false},0)});
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
