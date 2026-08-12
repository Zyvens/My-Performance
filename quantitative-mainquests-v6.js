"use strict";
/* Quantitative Main Quests V6 — turns volume targets into real multi-session effort.
   This is policy/metadata only; Planner V5 remains the single allocation authority. */
(function(){
  const D=window.MyPerformanceCalendarDomain;
  if(!D)return;
  const RULES={
    'study-aug-volume':{target:600,unit:'questões',perBlock:40,blockMinutes:90},
    'study-sep-volume':{target:1000,unit:'questões',perBlock:40,blockMinutes:90},
    'study-oct-volume':{target:1200,unit:'questões',perBlock:40,blockMinutes:90},
    'study-w-q250':{target:250,unit:'questões',perBlock:50,blockMinutes:90}
  };
  function normalize(r){
    if(!r)return null;
    const blocks=Math.max(1,Math.ceil(Number(r.target||0)/Math.max(1,Number(r.perBlock||1))));
    return Object.assign({},r,{blocks,totalMinutes:blocks*Math.max(10,Number(r.blockMinutes||60))});
  }
  const normalized=Object.fromEntries(Object.entries(RULES).map(([id,r])=>[id,normalize(r)]));
  const basePolicy=D.missionPolicy.bind(D);
  D.missionPolicy=function(q){
    const p=basePolicy(q),r=normalized[q?.id];
    if(!r)return p;
    p.effortLikelyMin=r.totalMinutes;
    p.minSessionMin=r.blockMinutes;
    p.idealSessionMin=r.blockMinutes;
    p.quantitative=true;
    p.quantityTarget=r.target;
    p.quantityUnit=r.unit;
    p.quantityPerBlock=r.perBlock;
    p.totalBlocks=r.blocks;
    return p;
  };
  function rule(id){return normalized[id]||null}
  window.MyPerformanceQuantitativeMainQuests={VERSION:6,rule,rules:()=>JSON.parse(JSON.stringify(normalized))};
})();
