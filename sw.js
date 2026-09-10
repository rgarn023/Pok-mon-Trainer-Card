const CACHE='trainer-card-studio-v11';
self.addEventListener('install',event=>{self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('trainer-card-studio-')).map(k=>caches.delete(k)));await self.registration.unregister();await self.clients.claim();})());});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match(event.request)));});
