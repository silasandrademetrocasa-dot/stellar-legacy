// V21/V48.5 • Worker restrito: apenas offline.html e ícones cacheados.
// Nunca cacheia API, autenticação, WebSocket ou saves.
const CACHE='stellar-shell-v22-6-0';
const OFFLINE='/offline.html';
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll([OFFLINE,'/icons/stellar-192.png','/icons/stellar-512.png'])).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('stellar-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||req.mode!=='navigate')return;
 const url=new URL(req.url);if(url.origin!==self.location.origin)return;
 event.respondWith(fetch(req).catch(()=>caches.match(OFFLINE)));
});
// Atalha o retorno ao jogo ao tocar em alertas gerados enquanto o PWA está em execução.
self.addEventListener('notificationclick',event=>{
 event.notification.close();event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{
  const existing=clients.find(c=>new URL(c.url).origin===self.location.origin);
  if(existing){await existing.focus();return;}
  if(self.clients.openWindow)await self.clients.openWindow('/');
 }));
});

// STELLAR_V49_WEB_PUSH: triggered by the browser push service even with the PWA closed.
// No game state, credits or saves are altered by this event.
self.addEventListener('push',event=>{
 let payload={};try{payload=event.data?.json()||{};}catch{}
 event.waitUntil(self.registration.showNotification(String(payload.title||'Stellar Legacy • Farm concluído'),{
  body:String(payload.body||'O tempo de Farm Offline terminou. Abra o jogo para resgatar.'),
  icon:'/icons/stellar-192.png',badge:'/icons/stellar-192.png',tag:'stellar-farm-'+String(payload.sessionId||'v49'),
  data:{url:'/'},requireInteraction:false
 }));
});
