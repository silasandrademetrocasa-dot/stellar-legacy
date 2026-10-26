/** V69: renderer visual-only, no gameplay writes. All images served from local assets. */
const TAU=Math.PI*2, ROOT='/assets/animations/v69';
const PORTALS={normal:'Portal_Comum',pvp:'Portal_PvP',universe:'Portal_Universo',aurora:'Portal_Aurora',nexus:'Portal_Nexus',eclipse:'Portal_Eclipse'};
const COLORS={normal:'#50baff',pvp:'#ff524e',universe:'#bd69ff',aurora:'#51f5e6',nexus:'#ffbf50',eclipse:'#eb55ff'};
const BASES={earth:'Terra',mars:'Marte',jupiter:'Jupiter'};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(v))?Number(v):a));
const loaded=img=>!!img&&(img.naturalWidth>0||img.width>0);
export const frameIndexV69=(time,fps,count)=>Math.floor(Math.max(0,Number(time)||0)*fps)%count;
export function portalKindV69(portal={},visualId='',mapId=''){
 const to=String(portal.to||'').toLowerCase(),label=String(portal.targetLabel||'').toLowerCase(),all=to+' '+label+' '+String(mapId||'').toLowerCase();
 if(/(ggalpha|aurora)/.test(all))return 'aurora';
 if(/(ggbeta|nexus)/.test(all))return 'nexus';
 if(/(gggamma|eclipse)/.test(all))return 'eclipse';
 if(visualId==='portal_pvp'||/\bb4[1-3]\b|4-[1-3]|warzone|battle/.test(to+' '+label))return 'pvp';
 if(visualId==='portal_universe'||/\bu-?[1-3]\b|universe|universo/.test(to+' '+label))return 'universe';
 return 'normal';
}
export const portalFramePathV69=(kind,frame)=>`${ROOT}/Portais/${PORTALS[kind]||PORTALS.normal}/frames/frame_${String(Math.round(clamp(frame,0,7))).padStart(2,'0')}.webp`;
export const baseFramePathV69=(faction,frame)=>`${ROOT}/Bases/${BASES[String(faction||'').toLowerCase()]||'Terra'}/frames/frame_${String(Math.round(clamp(frame,0,11))).padStart(2,'0')}.webp`;
export function drawPortalV69(ctx,{portal,visualId,mapId,quality='medium',time=0,getImage}={}){
 if(typeof getImage!=='function')return false;
 const kind=portalKindV69(portal,visualId,mapId),dir=PORTALS[kind],color=COLORS[kind],still=getImage(`${ROOT}/Portais/${dir}/base.webp`);
 if(!loaded(still))return false;
 const size=150;ctx.save();ctx.drawImage(still,-size/2,-size/2,size,size);
 if(quality!=='low'){
  const frame=getImage(portalFramePathV69(kind,frameIndexV69(time,5.3,8)));
  if(loaded(frame)){
   ctx.save();ctx.beginPath();ctx.arc(0,0,31.5,0,TAU);ctx.clip();ctx.drawImage(frame,-size/2,-size/2,size,size);ctx.restore();
  }
  if(quality==='high'){
   ctx.save();ctx.globalAlpha=.22+.11*Math.sin(time*TAU/3.1);ctx.shadowColor=color;ctx.shadowBlur=14;ctx.strokeStyle=color;ctx.lineWidth=1.4;
   ctx.beginPath();ctx.arc(0,0,53,0,TAU);ctx.stroke();ctx.restore();
  }
 }
 ctx.restore();return true;
}
export function drawBaseV69(ctx,{faction,quality='medium',time=0,getImage,width=610}={}){
 if(typeof getImage!=='function')return false;
 const fac=BASES[String(faction||'').toLowerCase()]||'Terra',still=getImage(`${ROOT}/Bases/${fac}/base.png`);
 if(!loaded(still))return false;
 let img=still;
 if(quality!=='low'){
  const k=frameIndexV69(time,quality==='medium'?5:7,12),use=quality==='medium'?(k&~1):k;
  const next=getImage(baseFramePathV69(faction,use));if(loaded(next))img=next;
 }
 const h=width*490/840;ctx.save();ctx.drawImage(img,-width/2,-h/2,width,h);
 if(quality==='high'){
  const color=fac==='Marte'?'#ff6f4b':fac==='Jupiter'?'#ffda86':'#63dfff';
  ctx.globalAlpha=.1+.05*Math.sin(time*2);ctx.shadowColor=color;ctx.shadowBlur=8;ctx.strokeStyle=color;ctx.lineWidth=1.2;
  ctx.beginPath();ctx.ellipse(0,0,width*.18,h*.10,0,0,TAU);ctx.stroke();
 }
 ctx.restore();return true;
}
export const relayLevelV69=node=>Math.round(clamp(node?.relayLevel??node?.fortificationLevel??1,1,3));
export function relayVisualStateV69(node,time=0,attackAt=-1,impactAt=-1){
 const hp=Number(node?.hp)||0,sh=Math.max(0,Number(node?.shield)||0),disabled=hp<=0;
 return {level:relayLevelV69(node),disabled,attacking:!disabled&&attackAt>=0&&time>=attackAt&&time-attackAt<.5,impact:!disabled&&impactAt>=0&&time>=impactAt&&time-impactAt<.35,alert:!!(node?.contested||node?.challenger),shield:!disabled&&sh>0,shieldRatio:clamp(sh/Math.max(1,Number(node?.maxShield)||1),0,1),hpRatio:clamp(hp/Math.max(1,Number(node?.maxHp)||1),0,1)};
}
const lastServerAttack=new Map(),lastObserved=new Map();
const coordKey=(x,y)=>`${Math.round(Number(x)||0)}:${Math.round(Number(y)||0)}`;
export function noteRelayAttackV69(x,y,time){lastServerAttack.set(coordKey(x,y),time);if(lastServerAttack.size>60)lastServerAttack.delete(lastServerAttack.keys().next().value);}
export function resetRelayVisualMemoryV69(){lastServerAttack.clear();lastObserved.clear();}
export function drawRelayV69(ctx,node,{quality='medium',time=0,getImage,baseColor='#80d7ff',mapId=''}={}){
 if(!node?.relayMode||typeof getImage!=='function')return false;
 const lvl=relayLevelV69(node),img=getImage(`${ROOT}/Reles/Nivel_${lvl}/base.webp`);
 if(!loaded(img))return false;
 const key=`${mapId}:${String(node.id||'')}`,previous=lastObserved.get(key),hp=Number(node.hp)||0,shield=Math.max(0,Number(node.shield)||0);
 const impactAt=previous&&(hp<previous.hp||shield<previous.shield)?time:(previous?.impactAt??-1);
 lastObserved.set(key,{hp,shield,impactAt});if(lastObserved.size>80)lastObserved.delete(lastObserved.keys().next().value);
 const st=relayVisualStateV69(node,time,lastServerAttack.get(coordKey(node.x,node.y))??-1,impactAt);
 const w=lvl===3?163:lvl===2?149:135,h=w*1.2,pulse=.65+.35*Math.sin(time*(st.alert?3.9:2.1));
 ctx.save();ctx.globalAlpha=st.disabled?.54:1;ctx.drawImage(img,-w/2,-h/2,w,h);
 ctx.globalAlpha=st.disabled?.17:(quality==='low'?.25:.37+.18*pulse);ctx.fillStyle=st.alert?'#ff9d63':baseColor;
 ctx.beginPath();ctx.arc(0,-5,st.level===3?6:4.5,0,TAU);ctx.fill();
 if(st.shield){ctx.strokeStyle='#73dcff';ctx.lineWidth=quality==='low'?1.1:1.9;ctx.globalAlpha=quality==='low'?.18:.16+.18*st.shieldRatio;ctx.beginPath();ctx.ellipse(0,0,w*.51,h*.42,0,0,TAU);ctx.stroke();}
 if(quality!=='low'){
  if(st.alert){ctx.strokeStyle='#ff956b';ctx.lineWidth=2;ctx.globalAlpha=.35+.15*pulse;ctx.setLineDash([5,9]);ctx.beginPath();ctx.arc(0,0,w*.48,0,TAU);ctx.stroke();ctx.setLineDash([]);}
  if(st.attacking){ctx.strokeStyle='#ffac53';ctx.globalAlpha=.8;ctx.lineWidth=2.3;ctx.beginPath();ctx.arc(0,-5,18+(time%1)*5,0,TAU);ctx.stroke();}
  if(st.impact){ctx.globalAlpha=Math.max(0,.48-(time-impactAt));ctx.fillStyle=shield>0?'#b0f7ff':'#ffbf98';ctx.fillRect(-w*.34,-h*.3,w*.68,h*.6);}
 }
 ctx.restore();return true;
}
