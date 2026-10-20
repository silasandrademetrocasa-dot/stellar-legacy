// V34.4.3 - multiplayer cruise stabilization with server-clock timeline.
// Render-only interpolation. No changes to PvP authority, player physics or saved coordinates.
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const finite=(v,backup=0)=>Number.isFinite(Number(v))?Number(v):backup;
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export const REMOTE_RENDER_DELAY_MS=105;
export const REMOTE_MAX_EXTRAPOLATION_MS=235;
export const REMOTE_TELEPORT_GAP=500;
const MAX_REMOTE_VISUAL_SPEED=1400;
const SERVER_CLOCK_SAMPLES=12;

// Assign a timeline to snapshots using their SERVER timestamp, not the irregular
// time a network packet happens to reach this phone. Minimum observed clock
// offset filters latency spikes while tolerating different device clock settings.
function packetTimeline(p,{serverAt,receivedAt}){
  const recv=finite(receivedAt,Date.now());
  const stamp=serverAt==null?NaN:Number(serverAt);
  if(!Number.isFinite(stamp)||stamp<=0)return {at:recv,stamp:null};
  const offset=recv-stamp;
  if(!Number.isFinite(offset))return {at:recv,stamp:null};
  const offsets=Array.isArray(p.remoteClockOffsets)?p.remoteClockOffsets:[];
  offsets.push(offset);if(offsets.length>SERVER_CLOCK_SAMPLES)offsets.shift();
  p.remoteClockOffsets=offsets;
  // This timeline cannot be in the future relative to local reception.
  return {at:Math.min(recv,stamp+Math.min(...offsets)),stamp};
}

export function recordRemotePilotPosition(p,{x,y,angle,receivedAt=Date.now(),serverAt=null,spawn=false}={}){
  const px=finite(x,finite(p.netX,finite(p.x))),py=finite(y,finite(p.netY,finite(p.y)));
  const pa=finite(angle,finite(p.targetAngle,finite(p.angle)));
  const now=finite(receivedAt,Date.now());
  const stamp=serverAt==null?null:Number(serverAt);
  // Ignore duplicate/out-of-order frames; delayed network frames must not rewind a pilot.
  if(!spawn&&Number.isFinite(stamp)&&Number.isFinite(p.lastRemoteServerAt)&&stamp<=p.lastRemoteServerAt)return false;
  let samples=Array.isArray(p.remoteMotionSamples)?p.remoteMotionSamples:[];
  const prev=samples[samples.length-1];
  const teleport=!!prev&&Math.hypot(px-prev.x,py-prev.y)>REMOTE_TELEPORT_GAP;
  const longGap=!!prev&&(now-prev.receivedAt>1300||Number.isFinite(stamp)&&Number.isFinite(prev.serverAt)&&stamp-prev.serverAt>1300);
  if(spawn||teleport||longGap||!prev){
    samples=[];p.remoteClockOffsets=[];p.x=px;p.y=py;p.angle=pa;p.vx=0;p.vy=0;
  }
  const timeline=packetTimeline(p,{serverAt,receivedAt:now});
  const old=samples[samples.length-1];
  // Keep ordering even if our offset estimate improves midway through the stream.
  const at=old?Math.max(old.at+1,timeline.at):timeline.at;
  if(old){
    const span=Math.max(1,Number.isFinite(timeline.stamp)&&Number.isFinite(old.serverAt)?timeline.stamp-old.serverAt:at-old.at);
    const newVx=clamp((px-old.x)*1000/span,-MAX_REMOTE_VISUAL_SPEED,MAX_REMOTE_VISUAL_SPEED);
    const newVy=clamp((py-old.y)*1000/span,-MAX_REMOTE_VISUAL_SPEED,MAX_REMOTE_VISUAL_SPEED);
    // Recent motion dominates; filter one-packet network discontinuities.
    const alpha=.72;
    p.vx=(Number(p.vx)||0)*(1-alpha)+newVx*alpha;
    p.vy=(Number(p.vy)||0)*(1-alpha)+newVy*alpha;
    if(Math.hypot(px-old.x,py-old.y)<1){p.vx=0;p.vy=0;}
  }
  samples.push({x:px,y:py,angle:pa,at,serverAt:timeline.stamp,receivedAt:now});
  if(samples.length>8)samples=samples.slice(-8);
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
  // Predict at constant observed velocity for at most 235ms; when updates return,
  // ease back to authoritative snapshots. Unlike the previous 65ms cap, a remote
  // ship no longer appears to brake in the middle of a fast shared cruise.
  const lead=clamp(clock-last.at,0,REMOTE_MAX_EXTRAPOLATION_MS);
  return {x:last.x+clamp(finite(p.vx),-MAX_REMOTE_VISUAL_SPEED,MAX_REMOTE_VISUAL_SPEED)*lead/1000,
          y:last.y+clamp(finite(p.vy),-MAX_REMOTE_VISUAL_SPEED,MAX_REMOTE_VISUAL_SPEED)*lead/1000,
          angle:last.angle,mode:lead>0?'cruise-lead':'buffer'};
}

export function advanceRemotePilotVisual(p,{now=Date.now(),dt=1/30}={}){
  const goal=remotePilotVisualAt(p,now);
  if(!goal)return false;
  const x=finite(p.x,goal.x),y=finite(p.y,goal.y);
  const dx=goal.x-x,dy=goal.y-y,gap=Math.hypot(dx,dy);
  if(gap>REMOTE_TELEPORT_GAP){p.x=goal.x;p.y=goal.y;p.angle=goal.angle;return true;}
  // Smooth small corrections but cap the trailing distance on continuous cruises.
  const k=1-Math.exp(-clamp(finite(dt),0,.1)*35);
  p.x=x+dx*k;p.y=y+dy*k;
  const remaining=Math.hypot(goal.x-p.x,goal.y-p.y);
  const maxTrailing=28;
  if(remaining>maxTrailing){p.x=goal.x-(goal.x-p.x)/remaining*maxTrailing;p.y=goal.y-(goal.y-p.y)/remaining*maxTrailing;}
  p.angle=finite(p.angle,goal.angle)+angleDelta(finite(p.angle,goal.angle),goal.angle)*k;
  return true;
}
