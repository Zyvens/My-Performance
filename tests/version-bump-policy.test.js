const fs=require('fs');
const assert=require('assert');

const version=JSON.parse(fs.readFileSync('version.json','utf8')).version;
const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const health=fs.readFileSync('runtime-health.js','utf8');

assert(index.includes(`data-build="${version}"`),'index.html build must match version.json');
assert(sw.includes(`my-performance-v${version}`),'service-worker cache must match version.json');
assert(health.includes(`dataset.build||'${version}'`),'runtime-health fallback must match version.json');
console.log(`Version consistency passed for ${version}`);
