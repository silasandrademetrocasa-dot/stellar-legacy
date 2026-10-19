// V34.4.2 — buffered render positions for remote online pilots.
// Render-only: combat authority, server validation and persisted coordinates are untouched.
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const finite=(v,backup=0)=>Number.isFinite(Number(v))?Number(v):backup;
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export const REMOTE_RENDER_DELAY_MS=160;
export const REMOTE_MAX_EXTRAPOLATION_MS=65;
export const REMOTE_TELEPORT_GAP=500;

export function recordRemotePilotPosition(p,{x,y,angle,receivedAt=Date.now(),serverAt=null,spawn=false}={}){
  const px=finite(x,finite(p.netX,finite(p.x))),py=finite(y,finite(p.netY,finite(p.y)));
  const pa=finite(angle,finite(p.targetAngle,finite(p.angle)));
  const now=finite(receivedAt,Date.now());
  const stamp=serverAt==null?null:Number(serverAt);
  // Do not rewind a pilot on stale server messages after reconnects.
  if(!spawn&&Number.isFinite(stamp)&&Number.isFinite(p.lastRemoteServerAt)&&stamp<p.lastRemoteServerAt)return false;
  let samples=Array.isArray(p.remoteMotionSamples)?p.remoteMotionSamples:[];
  const prev=samples[samples.length-1];
  const teleport=!!prev&&Math.hypot(px-prev.x,py-prev.y)>REMOTE_TELEPORT_GAP;
  if(spawn||teleport||!prev){
    samples=[];
    p.x=px;p.y=py;p.angle=pa;
    p.vx=0;p.vy=0;
  } else {
    const span=Math.max(1,now-prev.at);
    const maxSpeed=1400;
    p.vx=clamp((px-prev.x)*1000/span,-maxSpeed,maxSpeed);
    p.vy=clamp((py-prev.y)*1000/span,-maxSpeed,maxSpeed);
  }
  const at=prev&&!spawn&&!teleport?Math.max(now,prev.at+1):now;
  samples.push({x:px,y:py,angle:pa,at});
  if(samples.length>6)samples=samples.slice(-6);
  p.remoteMotionSamples=samples;
  p.netX=px;p.netY=py;p.tx=px;p.ty=py;p.targetAngle=pa;
  if(Number.isFinite(stamp))p.lastRemoteServerAt=stamp;
  return true;
}

export function remotePilotVisualAt(p,now=Date.now()){
  const samples=p?.remoteMotionSamples;
  if(!Array.isArray(samples)||!samples.length)return null;
  const clock=finite(now,Date.now())-REMOTE_RENDER_DELAY_MS;
  const first=samples[0],last=samples[samples.length-1];
  if(clock<=first.at||samples.length===1)return {x:first.x,y:first.y,angle:first.angle,mode:'buffer'};
  for(let i=1;i<samples.length;i++){
    const a=samples[i-1],b=samples[i];
    if(clock<=b.at){
      const t=clamp((clock-a.at)/Math.max(1,b.at-a.at),0,1);
      return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:a.angle+angleDelta(a.angle,b.angle)*t,mode:'interpolate'};
    }
  }
  // No runaway prediction when frames/network stop; at most 65ms of visual lead.
  const prev=samples[samples.length-2];
  const span=Math.max(1,last.at-prev.at),lead=Math.min(REMOTE_MAX_EXTRAPOLATION_MS,Math.max(0,clock-last.at));
  const vx=clamp((last.x-prev.x)*1000/span,-1400,1400),vy=clamp((last.y-prev.y)*1000/span,-1400,1400);
  return {x:last.x+vx*lead/1000,y:last.y+vy*lead/1000,angle:last.angle,mode:'bounded-lead'};
}

export function advanceRemotePilotVisual(p,{now=Date.now(),dt=1/30}={}){
  const goal=remotePilotVisualAt(p,now);
  if(!goal)return false;
  const gap=Math.hypot(goal.x-finite(p.x,goal.x),goal.y-finite(p.y,goal.y));
  if(gap>REMOTE_TELEPORT_GAP){p.x=goal.x;p.y=goal.y;p.angle=goal.angle;return true;}
  // Exponential smoothing gives identical behavior at 16, 30 and 60 FPS.
  const k=1-Math.exp(-clamp(finite(dt),0,.1)*34);
  p.x=finite(p.x,goal.x)+(goal.x-finite(p.x,goal.x))*k;
  p.y=finite(p.y,goal.y)+(goal.y-finite(p.y,goal.y))*k;
  p.angle=finite(p.angle,goal.angle)+angleDelta(finite(p.angle,goal.angle),goal.angle)*k;
  return true;
}
