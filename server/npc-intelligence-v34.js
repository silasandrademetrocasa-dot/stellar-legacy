// Server-side patrol geometry. Pure helpers; no SQL, damage or rewards changed.
const finite=(n,fallback=0)=>Number.isFinite(Number(n))?Number(n):fallback;
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export function shouldLeashNpc(e){
  return !!e&&e.hp>0&&!e.eventNpc&&!e.forceChase&&!e.gateEnemy&&!e.worldBoss&&
    !String(e.type||'').startsWith('boss')&&!e.aggroUserId;
}
export function NpcAggroWindow(e){return clamp(finite(e?.aggroRange,1000),200,1600);}
export function idleNpcStep(e,{dt=0,worldW=6000,worldH=4500,leash=680}={}){
  const x=finite(e?.x),y=finite(e?.y),hx=finite(e?.patrolHomeX,x),hy=finite(e?.patrolHomeY,y);
  const range=clamp(finite(leash,680),200,1400),speed=clamp(finite(e?.speed,80),0,1800),step=clamp(finite(dt),0,.15)*speed;
  const dx=hx-x,dy=hy-y,d=Math.hypot(dx,dy);
  // Hysteresis prevents oscillating at the leash boundary.
  const returning=!!e?.patrolReturning?d>range*.42:d>range;
  let nx=x,ny=y;
  if(returning&&d>.01){const move=Math.min(d,step*.66);nx+=dx/d*move;ny+=dy/d*move;}
  else {const phase=finite(e?.angle);nx+=Math.cos(phase)*step*.12;ny+=Math.sin(phase)*step*.12;}
  return {x:clamp(nx,25,Math.max(25,worldW-25)),y:clamp(ny,25,Math.max(25,worldH-25)),returning};
}
