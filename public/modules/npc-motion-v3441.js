// V34.5.0 — NPC movement deltas: server packets may contain only X OR Y.
// Keep server coordinates separate from interpolated visual coordinates.
// No combat stats, drops, server authority or collision rules are modified.
const safe=(v,f=0)=>Number.isFinite(v)?v:f;
export function mergeNpcMotionPatch(entity,patch,now){
  if(!entity||!patch)return false;
  const hasX=Number.isFinite(patch.x),hasY=Number.isFinite(patch.y);
  if(!hasX&&!hasY)return false; // HP/angle-only patch is not a motion sample.
  const previousX=safe(entity.netX,safe(entity.x));
  const previousY=safe(entity.netY,safe(entity.y));
  const nx=hasX?patch.x:previousX;
  const ny=hasY?patch.y:previousY;
  const deltaX=nx-previousX,deltaY=ny-previousY;
  const elapsed=Math.max(0.05,Math.min(2,(now-safe(entity.netAt,now))/1000));
  // NPC spawn reset / server relocation: do not slide a ghost through the map.
  if(Math.hypot(deltaX,deltaY)>520){
    entity.x=nx;entity.y=ny;entity.vx=0;entity.vy=0;
  }else{
    entity.vx=Math.max(-720,Math.min(720,deltaX/elapsed));
    entity.vy=Math.max(-720,Math.min(720,deltaY/elapsed));
  }
  entity.netX=nx;entity.netY=ny;entity.tx=nx;entity.ty=ny;entity.netAt=now;
  return true;
}
