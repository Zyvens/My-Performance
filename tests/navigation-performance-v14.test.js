"use strict";
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const perf=fs.readFileSync(path.join(root,'runtime-performance-v14.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');

const goBody=perf.match(/go=function\(view\)\{([\s\S]*?)\n  \};/);
if(!goBody)throw new Error('runtime-performance-v14 must override go(view)');
if(/saveState\s*\(/.test(goBody[1]))throw new Error('UI navigation must not call saveState() and invalidate Planner caches');
if(!/persistUiOnly\(\)/.test(goBody[1]))throw new Error('UI navigation must persist its view without mutation events');
if(!/if\(rendering\)\{queued=true;skippedReentry\+\+;return;\}/.test(perf))throw new Error('render reentry guard missing');
const perfPos=index.indexOf('runtime-performance-v14.js');
const bootPos=index.indexOf('boot-ready-v11.js');
if(perfPos<0)throw new Error('runtime-performance-v14.js is not loaded in production');
if(bootPos<0||perfPos>bootPos)throw new Error('performance guard must load before boot-ready final render');
if(!/data-build="2\.8\.2"/.test(index))throw new Error('production build should be 2.8.2');
console.log('navigation performance v14 contract OK');
