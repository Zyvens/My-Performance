const fs=require('fs');
const assert=require('assert');
for(const file of ['index.html','sw.js'])assert(!fs.readFileSync(file,'utf8').includes('tuesday-therapy-layout.js'),`${file} must not reference the obsolete Tuesday-only layer`);
assert(!fs.existsSync('tuesday-therapy-layout.js'),'obsolete Tuesday-only layer must remain deleted');
console.log('Tuesday-only legacy layer removed');
