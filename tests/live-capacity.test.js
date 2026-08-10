"use strict";
const fs=require('fs');
const src=fs.readFileSync('live-capacity.js','utf8');
const required=[
  "disabled:true,boundaryOnly:true",
  "const MIN_GAP=15",
  "const GSA_TARGET=480",
  "candidatePool",
  "syntheticForGap",
  "espaço liberado por conclusão antecipada",
  "Transpetro · sessão adicional",
  "window.MyPerformanceRoutine.planDay=fillPlan",
  "window.MyPerformanceRoutine.missionNow=missionNow",
  "my-performance-tracking"
];
for(const token of required)if(!src.includes(token))throw new Error(`Missing live-capacity behavior: ${token}`);
if(!src.includes("date!==today()"))throw new Error('Live filling must only reshape the current day.');
if(!src.includes("protectedTask(q)"))throw new Error('Protected anchors must never be pulled into freed gaps.');
console.log('Live capacity contracts OK');
