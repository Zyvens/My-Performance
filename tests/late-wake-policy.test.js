"use strict";
const fs=require('fs');
const late=fs.readFileSync('late-wake-policy.js','utf8');
for(const token of ['recuperada após despertar tardio','Main Quest ·','lateWakeCanonicalAdded','isGym(q)','q.cadence!==\'once\'']){
  if(!late.includes(token))throw new Error(`Missing late-wake behavior token: ${token}`)
}
const css=fs.readFileSync('modal-overlay-fix.css','utf8');
if(!css.includes('.modal-backdrop{position:fixed'))throw new Error('Modal is not fixed overlay');
if(!css.includes("#adaptiveRecalc::after{content:'↻ Recalcular / Diagnóstico'"))throw new Error('Recalc label flash guard missing');
console.log('Late wake and modal contracts passed');
