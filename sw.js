const CACHE='my-performance-v1.2.2';
const ASSETS=['./','./index.html','./styles.css','./planner.css','./routine.css','./data.js','./routine-data.js','./app.js','./cloud-sync.js','./planner.js','./routine.js','./muay-optional.js','./runtime-hooks.js','./notifications.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request).then(found=>found||caches.match('./index.html'))));
});
self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{}}catch(e){data={body:event.data?event.data.text():'Nova missão disponível.'}}
  const title=data.title||'⚔ My Performance · missão atual';
  event.waitUntil(self.registration.showNotification(title,{body:data.body||'Abra a agenda para ver sua missão atual.',tag:data.tag||'my-performance-push',renotify:true,requireInteraction:data.requireInteraction!==false,icon:'./icon.svg',badge:'./icon.svg',vibrate:[180,90,180,90,300],data:{url:data.url||'./?view=today',questId:data.questId||''},actions:[{action:'open',title:'Abrir agenda'}]}));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();const target=event.notification.data?.url||'./?view=today';
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const client of list){if('focus'in client){client.postMessage({type:'OPEN_TODAY',questId:event.notification.data?.questId||''});return client.focus()}}
    return clients.openWindow?clients.openWindow(target):undefined;
  }));
});
