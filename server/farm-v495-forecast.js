/* STELLAR FARM V49.5 - bounded planning ONLY, never credits rewards. */
const number=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const limit=(v,min,max)=>Math.min(max,Math.max(min,v));
export function forecastV495({npc,cycle,minutes=60,maxKills=550,stock=0,credits=0,autoBuy=true,pack=null}){
 const maxSeconds=limit(Math.floor(number(minutes,60)),30,720)*60;
 const cycleSeconds=Math.max(1,Math.ceil(number(cycle?.killSeconds,60)));
 const ammoPerKill=Math.max(1,Math.ceil(number(cycle?.ammoPerKill,1)));
 const maxTimeKills=Math.floor(maxSeconds/cycleSeconds);
 const limitKills=Math.min(2000,limit(Math.floor(number(maxKills,550)),0,2000),maxTimeKills);
 let ammo=Math.max(0,Math.floor(number(stock))),wallet=Math.max(0,Math.floor(number(credits)));
 const packQty= Math.max(0,Math.floor(number(pack?.qty))),packPrice=Math.max(0,Math.ceil(number(pack?.price)));
 const canBuy=Boolean(autoBuy && pack?.currency==='credits' && packQty>0 && packPrice>0);
 let bought=0,spent=0,kills=0,npcCredits=0;
 for(;kills<limitKills;kills++){
  while(ammo<ammoPerKill){
   if(!canBuy||wallet<packPrice||bought>=10000000)break;
   wallet-=packPrice; spent+=packPrice; ammo+=packQty;bought+=packQty;
  }
  if(ammo<ammoPerKill)break;
  ammo-=ammoPerKill;
  const gain=Math.max(0,Math.floor(number(npc?.credits)));wallet+=gain;npcCredits+=gain;
 }
 return {kills,creditsNet:npcCredits-spent,npcCredits,xp:kills*Math.max(0,Math.floor(number(npc?.xp))),stl:kills*Math.max(0,Math.floor(number(npc?.stl))),ammoSpent:spent,ammoBought:bought,ammoRemaining:ammo,ammoPerKill,minutes:Math.round(maxSeconds/60),stoppedBy:kills===limitKills?'time_or_limit':'ammo_or_budget'};
}
