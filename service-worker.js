const CACHE='carino-pwa-v1';
const ASSETS=[
  './','./index.html','./style.css','./install.js','./manifest.webmanifest','./marca.png',
  './icons/favicon-32.png','./icons/apple-touch-icon.png','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png',
  './dashboard/','./dashboard/index.html','./dashboard/model.js','./dashboard/dashboard.js',
  './cliente/','./cliente/index.html','./cliente/style.css','./cliente/app.js'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  event.respondWith(fetch(request).then(response=>{
    const copy=response.clone();
    caches.open(CACHE).then(cache=>cache.put(request,copy));
    return response;
  }).catch(()=>caches.match(request).then(cached=>cached||caches.match('./index.html'))));
});
