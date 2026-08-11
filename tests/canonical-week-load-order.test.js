const fs=require('fs');
const assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const order=['post-funding-rebalance.js','canonical-week-template.js','canonical-week-policy.js','scheduler-2.js'];
const pos=order.map(x=>html.indexOf(`src="${x}"`));
assert(pos.every(x=>x>=0),'all canonical scheduler layers must be loaded');
for(let i=1;i<pos.length;i++)assert(pos[i-1]<pos[i],`${order[i-1]} must load before ${order[i]}`);
assert(!html.includes('tuesday-therapy-layout.js'),'obsolete Tuesday-only wrapper must stay removed');
console.log('Canonical week load order passed');
