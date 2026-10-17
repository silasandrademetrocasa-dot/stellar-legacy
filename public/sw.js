// V21 • Service Worker deliberadamente restrito: APENAS offline.html e ícones.
// Nunca cacheia API, autenticação, WebSocket, dados de jogador ou HTML dinâmico.
const CACHE='stellar-shell-v22-0-1';
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
