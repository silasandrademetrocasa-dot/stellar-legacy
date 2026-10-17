// V21 • Instalação Android opcional, sem downloads automáticos e sem offline game.
let pending=null;
export function registerStellarPwaV21(){
 if(typeof window==='undefined')return;
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();pending=event;});
 window.addEventListener('appinstalled',()=>{pending=null;});
 if('serviceWorker' in navigator&&location.protocol==='https:'){
  window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}),{once:true});
 }
}
export async function offerInstallV21(){
 if(!pending)return false;
 const event=pending;pending=null;
 try{await event.prompt();await event.userChoice;return true;}catch{return false;}
}
