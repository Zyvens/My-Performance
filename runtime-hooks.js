"use strict";
(function(){
  /* v2 routine migration: training starts at 06:30 and lasts 90 min by default. */
  state.routineSettings=state.routineSettings||{};
  if(Number(state.routineSettingsVersion||0)<2){
    state.routineSettings.gymStart='06:30';
    if(!state.routineSettings.gymDuration)state.routineSettings.gymDuration=90;
    if(!state.routineSettings.wakeTime)state.routineSettings.wakeTime='06:00';
    if(!state.routineSettings.sleepTime)state.routineSettings.sleepTime='22:00';
    state.routineSettingsVersion=2;
    window.MyPerformanceRoutine?.applySettings?.();
    saveState();
  }
  if('serviceWorker'in navigator){
    navigator.serviceWorker.addEventListener('message',event=>{
      if(event.data?.type==='OPEN_TODAY'){
        state.plannerDate=today();
        go('today');
      }
    });
  }
})();
