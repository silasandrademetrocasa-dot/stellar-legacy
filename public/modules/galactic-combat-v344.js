// V34.5.0 — Visual combat interpolation and target feedback.
// This module only interpolates already-authorized positions. It does not
// modify authoritative server coordinates, damage, cooldowns or loot.
const finite=(n,fallback=0)=>Number.isFinite(Number(n))?Number(n):fallback;
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export function smoothNpcPosition(entity,{now=0,dt=0}={}){
  const x=finite(entity?.x),y=finite(entity?.y);
  const targetX=finite(entity?.netX,x),targetY=finite(entity?.netY,y);
  const age=Math.max(0,finite(now)-finite(entity?.netAt,now));
  const velocityX=clamp(finite(entity?.vx),-720,720),velocityY=clamp(finite(entity?.vy),-720,720);
  // Never extrapolate a stale packet: this prevents endless ghost chasing.
  const lead=age<280?Math.min(0.11,Math.max(0,age)/1000+0.025):age<760?0.11*(760-age)/480:0;
  const destX=targetX+velocityX*lead,destY=targetY+velocityY*lead;
  const gap=Math.hypot(destX-x,destY-y);
  if(gap>520)return {x:targetX,y:targetY,snapped:true};
  // Consistent at 16/30/60 FPS, with no overshoot on long frames.
  const factor=1-Math.exp(-Math.max(0,Math.min(.08,finite(dt)))*10.5);
  let nx=x+(destX-x)*factor,ny=y+(destY-y)*factor;
  if(age>=1100){ // no new packets: settle exactly at the last known server point
    nx=x+(targetX-x)*factor;ny=y+(targetY-y)*factor;
  }
  if(!Number.isFinite(nx)||!Number.isFinite(ny))return {x:targetX,y:targetY,snapped:true};
  return {x:nx,y:ny,snapped:false};
}
export function smoothNpcHeading(angle,authoritative,dt){
  const from=finite(angle,finite(authoritative)),to=finite(authoritative,from);
  const diff=Math.atan2(Math.sin(to-from),Math.cos(to-from));
  return from+diff*(1-Math.exp(-Math.max(0,Math.min(.08,finite(dt)))*12));
}
export function npcCombatLockCue({distance=0,laserRange=0,rocketRange=0,aggro=false,threat=''}={}){
  const d=Math.max(0,finite(distance)),lr=Math.max(0,finite(laserRange)),rr=Math.max(0,finite(rocketRange));
  if(d>Math.max(lr,rr))return 'FORA DO ALCANCE';
  if(d>lr&&d<=rr)return 'ALCANCE DO MÍSSIL';
  if(aggro)return 'AMEAÇA FIXADA';
  return String(threat||'NA MIRA').slice(0,48);
}
export function rocketVisualTarget({sx,sy,tx,ty}={}, target){
  const originX=finite(tx),originY=finite(ty);
  const desiredX=finite(target?.x,originX),desiredY=finite(target?.y,originY);
  const dx=desiredX-originX,dy=desiredY-originY,dist=Math.hypot(dx,dy);
  if(!target||!Number.isFinite(dist)||dist>280)return {x:originX,y:originY};
  return {x:desiredX,y:desiredY};
}
