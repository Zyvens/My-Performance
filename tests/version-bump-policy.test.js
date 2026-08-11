const fs=require('fs'),assert=require('assert');
const version=JSON.parse(fs.readFileSync('version.json','utf8')).version,index=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8'),stability=fs.readFileSync('runtime-stability-v5.js','utf8');
assert(index.includes(`data-build="${version}"`),'index build must match version.json');assert(sw.includes(`my-performance-v${version}`),'SW cache must match version.json');assert(stability.includes('document.documentElement.dataset.build'),'visible build guard must derive from shell version');assert(index.indexOf('runtime-stability-v5.js')>index.indexOf('calendar-ui-v5.js'),'stability patch must load after V5 UI');
console.log(`Version consistency passed for ${version}`);
