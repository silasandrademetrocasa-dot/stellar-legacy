// V20.2.4 • Agenda das atualizações visuais. Sem DOM, rede ou gravação em save.
// Chamadas explícitas de updateUI() nunca são limitadas: compra/combate/menus refletem imediatamente.
export function createHudUpdateScheduler(){
  let lastFast=-Infinity,lastAmmo=-Infinity,lastFull=-Infinity;
  return {
    next(mode='low',now=0){
      const isLow=mode==='low';
      const fastInterval=isLow?140:100;
      const ammoInterval=isLow?380:300;
      const fullInterval=isLow?850:550;
      const full=now-lastFull>=fullInterval;
      const fast=full||now-lastFast>=fastInterval;
      const ammo=full||now-lastAmmo>=ammoInterval;
      if(fast)lastFast=now;
      if(ammo)lastAmmo=now;
      if(full)lastFull=now;
      return {full,fast,ammo};
    },
    markFull(now=0){lastFull=now;lastFast=now;lastAmmo=now;},
    reset(){lastFast=-Infinity;lastAmmo=-Infinity;lastFull=-Infinity;}
  };
}
