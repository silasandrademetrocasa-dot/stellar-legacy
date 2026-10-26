/** V71: safe visual-only renderer. Physical positions, click targets, combat and server state are untouched. */
import {portalKindV69,frameIndexV69,drawRelayV69,noteRelayAttackV69,resetRelayVisualMemoryV69} from './stellar-animation-v69.js';
export {noteRelayAttackV69,resetRelayVisualMemoryV69};
const ROOT='/assets/animations/v71';
const PORTALS=Object.freeze({normal:'Portal_Comum',pvp:'Portal_PvP',universe:'Portal_Universo',aurora:'Portal_Aurora',nexus:'Portal_Nexus',eclipse:'Portal_Eclipse'});
const BASES=Object.freeze({earth:'Terra',mars:'Marte',jupiter:'Jupiter'});
const COLORS=Object.freeze({normal:'#50baff',pvp:'#ff524e',universe:'#bd69ff',aurora:'#51f5e6',nexus:'#ffbf50',eclipse:'#eb55ff'});
const loaded=im=>!!im&&Number(im.naturalWidth||im.width)>0;
const frame=(t,fps,len)=>frameIndexV69(t,fps,len);
const pPath=(kind,file)=>`${ROOT}/Portais/${PORTALS[kind]||PORTALS.normal}/${file}`;
const bPath=(fac,file)=>`${ROOT}/Bases/${fac}/${file}`;
/** Portal ring never rotates. The energy core is a separate 106px transparent texture under the structural shell. */
export function drawPortalV71(ctx,{portal={},visualId='',mapId='',quality='medium',time=0,getImage}={}){
 if(typeof getImage!=='function')return false;
 const kind=portalKindV69(portal,visualId,mapId);
 const still=getImage(pPath(kind,'static.webp'));
 if(!loaded(still))return false;
 const size=150;
 if(quality==='low'){ctx.drawImage(still,-75,-75,size,size);return true;}
 const core=getImage(pPath(kind,`cores/core_${String(frame(time,5.3,8)).padStart(2,'0')}.webp`));
 const shell=getImage(pPath(kind,'shell.webp'));
 if(!loaded(core)||!loaded(shell)){
   ctx.drawImage(still,-75,-75,size,size);return true;
 }
 // No expensive runtime clipping or drawing a second 256x256 portal on top of itself.
 ctx.save();ctx.drawImage(core,-31,-31,62,62);ctx.drawImage(shell,-75,-75,size,size);
 if(quality==='high'){
  ctx.globalAlpha=.10+.045*Math.sin(time*Math.PI*2/3.1);
  ctx.strokeStyle=COLORS[kind];ctx.lineWidth=1;
  ctx.beginPath();ctx.arc(0,0,51,0,Math.PI*2);ctx.stroke();
 }
 ctx.restore();return true;
}
/** Fixed 512x299 structural shell, incremental energy-only lighting. Never swap the building silhouette. */
export function drawBaseV71(ctx,{faction='earth',quality='medium',time=0,getImage,width=610}={}){
 if(typeof getImage!=='function')return false;
 const fac=BASES[String(faction).toLowerCase()]||'Terra';
 const station=getImage(bPath(fac,'static.webp'));if(!loaded(station))return false;
 const h=width*490/840;
 ctx.drawImage(station,-width/2,-h/2,width,h);
 if(quality==='low')return true;
 const fps=quality==='medium'?5:7;
 const index=frame(time,fps,12);
 // Medium renders six stable lighting phases, high all twelve.
 const phase=quality==='medium'?(index&~1):index;
 const illumination=getImage(bPath(fac,`light/light_${String(phase).padStart(2,'0')}.webp`));
 if(loaded(illumination)){
  ctx.save();ctx.globalAlpha=quality==='medium'?.64:.82;ctx.drawImage(illumination,-width/2,-h/2,width,h);ctx.restore();
 }
 return true;
}
/** Static relay texture LOD; all visual combat states stay bound to the V69 server-event logic. */
export function drawRelayV71(ctx,node,options={}){
 const getImage=options.getImage;
 if(typeof getImage!=='function')return false;
 return drawRelayV69(ctx,node,{...options,getImage:path=>{
  if(/^\/assets\/animations\/v69\/Reles\//.test(path)){
   const optimised=path.replace('/animations/v69/Reles/','/animations/v71/Reles/');
   return getImage(optimised);
  }
  return getImage(path);
 }});
}
