const fs=require('fs');
const assert=require('assert');

const update=fs.readFileSync('pwa-update.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const version=JSON.parse(fs.readFileSync('version.json','utf8'));

assert.strictEqual(version.version,'1.5.21');
assert(index.includes('data-build="1.5.21"'));
assert(update.includes("navigator.serviceWorker.addEventListener('controllerchange'"),'client must listen for controller changes');
assert(update.includes('cacheBust(pendingVersion)'),'controller change must force a cache-busted navigation');
assert(update.includes('await applyUpdate(reg,remote.version)'),'remote version mismatch must auto-apply instead of only showing a banner');
assert(sw.includes("const BUILD='1.5.21'"),'service worker build must be 1.5.21');
assert(sw.includes("const CACHE='my-performance-v1.5.21'"),'service worker cache must be 1.5.21');
assert(sw.includes('self.clients.matchAll({type:\'window\',includeUncontrolled:true})'),'activated worker must enumerate open windows');
assert(sw.includes('await client.navigate(u.toString())'),'activated worker must force stale open tabs onto the new document');
assert(sw.includes("fetch(event.request,{cache:'no-store'})"),'runtime assets must prefer a fresh network response');
console.log('PWA stale-runtime forced refresh passed');
