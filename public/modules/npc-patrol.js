// Experimental V32 worktree: pure, low-cost leash helper for LOCAL idle NPCs.
// Network-authoritative NPCs, event ships and bosses must remain untouched.
export function npcPatrolEligible(enemy){
  return !!enemy && enemy.hp>0 && !enemy.sharedWorld && !enemy.gateEnemy &&
    !enemy.eventNpc && !enemy.worldBoss && !enemy.sharedStaticBoss &&
    !enemy.forceChase && !enemy.playerProvoked && !enemy.selected && !enemy.isTarget &&
    !String(enemy.type||'').startsWith('boss');
}
export function npcPatrolPosition(enemy, nextX, nextY, {leash=900, dt=0, speed=0}={}){
  if(!npcPatrolEligible(enemy))return {x:nextX,y:nextY,returning:false};
  const hx=Number.isFinite(enemy.patrolHomeX)?enemy.patrolHomeX:enemy.x;
  const hy=Number.isFinite(enemy.patrolHomeY)?enemy.patrolHomeY:enemy.y;
  if(!Number.isFinite(enemy.patrolHomeX)){enemy.patrolHomeX=hx;enemy.patrolHomeY=hy;}
  const dx=nextX-hx,dy=nextY-hy,d=Math.hypot(dx,dy);
  if(d<=leash)return {x:nextX,y:nextY,returning:false};
  const step=Math.min(Math.max(0,dt)*Math.max(0,speed)*.40,d);
  const bx=nextX-dx/Math.max(d,1)*step, by=nextY-dy/Math.max(d,1)*step;
  return {x:bx,y:by,returning:true};
}
