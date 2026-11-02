/** V71: safe visual-only renderer. Physical positions, click targets, combat and server state are untouched. */
import {portalKindV69,drawRelayV69,noteRelayAttackV69,resetRelayVisualMemoryV69} from './stellar-animation-v69.js';
export {noteRelayAttackV69,resetRelayVisualMemoryV69};
const ROOT='/assets/animations/v71';
const PORTALS=Object.freeze({normal:'Portal_Comum',pvp:'Portal_PvP',universe:'Portal_Universo',aurora:'Portal_Aurora',nexus:'Portal_Nexus',eclipse:'Portal_Eclipse'});
const BASES=Object.freeze({earth:'Terra',mars:'Marte',jupiter:'Jupiter'});
const loaded=im=>!!im&&Number(im.naturalWidth||im.width)>0;
const pPath=(kind,file)=>`${ROOT}/Portais/${PORTALS[kind]||PORTALS.normal}/${file}`;
const bPath=(fac,file)=>`${ROOT}/Bases/${fac}/${file}`;
/** Portal ring never rotates. The energy core is a separate 106px transparent texture under the structural shell. */
/** V80: portal V71 is a SINGLE static texture at every quality. No frame fetch or halo. */
export function drawPortalV71(ctx,{portal={},visualId='',mapId='',getImage}={}){
 if(typeof getImage!=='function')return false;
 const kind=portalKindV69(portal,visualId,mapId);
 const still=getImage(pPath(kind,'static.webp'));
 if(!loaded(still))return false;
 // V116.3: os quadros originais têm 40–80px de margem transparente.
 // Recortamos apenas o vazio do próprio sprite; posição, hitbox e rota não mudam.
 const w=Math.max(1,Number(still.naturalWidth||still.width)||256);
 const h=Math.max(1,Number(still.naturalHeight||still.height)||256);
 const common=kind==='normal';
 const sx=w*(common?46:40)/256,sy=h*(common?66:30)/256;
 const sw=w*(common?168:176)/256,sh=h*(common?156:195)/256;
 ctx.drawImage(still,sx,sy,sw,sh,-68,-70,136,140);
 return true;
}
/** V80: permanent station silhouette, one drawImage, no lighting-frame sequence. */
export function drawBaseV71(ctx,{faction='earth',getImage,width=610}={}){
 if(typeof getImage!=='function')return false;
 const fac=BASES[String(faction).toLowerCase()]||'Terra';
 const station=getImage(bPath(fac,'static.webp'));
 if(!loaded(station))return false;
 const h=width*490/840;
 ctx.drawImage(station,-width/2,-h/2,width,h);
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
