/** V54 Relay Elite — VISUAL ONLY. All authoritative capture, shield, HP, modules,
 * clan ownership, damage, repairs and rewards remain server-controlled. */
const TAU=Math.PI*2;
const last=new Map();
const clamp=(v,a,b)=>Math.min(b,Math.max(a,Number(v)||0));
export function relayLevelV54(node){return clamp(Math.round(node?.relayLevel??node?.fortificationLevel??1),1,3);}
export function relayPaletteV54(node){
 const owner=String(node?.owner||'').toLowerCase();
 return ['earth','mars','jupiter'].includes(owner)?owner:'neutral';
}
export function relayAssetV54(node){return `relay_${relayLevelV54(node)}_${relayPaletteV54(node)}`;}
export const relaySpriteV54=node=>`/assets/v54/sprites/${relayAssetV54(node)}.webp`;
export function relayVisualStateV54(node){
 const maxHp=Math.max(1,Number(node?.maxHp)||1),maxShield=Math.max(1,Number(node?.maxShield)||1);
 const hp=clamp((Number(node?.hp)||0)/maxHp,0,1),shield=clamp((Number(node?.shield)||0)/maxShield,0,1);
 return {tier:relayLevelV54(node),faction:relayPaletteV54(node),hp,shield,destroyed:hp<=0,critical:hp>0&&hp<.25,contested:!!node?.contested,
  ownerClanId:node?.ownerClanId||null,challenger:node?.challenger||null};
}
/** Time-driven effects; no timer or network calls, and no mutation of a node. */
export function drawRelayEliteV54(ctx,node,options={}){
 if(!node?.relayMode)return false;
 const {quality='medium',mobile=false,time=0,baseColor='#6acfff',drawModel=()=>false,getSprite=()=>null,fallback=()=>{}}=options;
 const low=quality==='low',st=relayVisualStateV54(node),size=st.tier===3?153:st.tier===2?141:126;
 const id=String(node?.mapId||'')+':'+String(node?.id||'')+':'+String(node?.x||'');
 let prev=last.get(id);if(!prev){prev={tier:st.tier,owner:st.ownerClanId,faction:st.faction,at:time,type:'init'};}
 if(prev.tier!==st.tier||prev.owner!==st.ownerClanId||prev.faction!==st.faction){
  prev={tier:st.tier,owner:st.ownerClanId,faction:st.faction,at:time,type:prev.tier!==st.tier?'evolve':'claim'};
 }
 last.set(id,prev);if(last.size>64){last.delete(last.keys().next().value);}
 const img=getSprite(relaySpriteV54(node));
 let drawn=false;
 if(!low){drawn=Boolean(drawModel(relayAssetV54(node),size));}
 if(!drawn&&img&&img.naturalWidth){ctx.save();const sc=st.destroyed?.48:1;ctx.globalAlpha=st.destroyed?.56:1;ctx.drawImage(img,-size*.53*sc,-size*.53*sc,size*1.06*sc,size*1.06*sc);ctx.restore();drawn=true;}
 if(!drawn)fallback();
 const pulse=Math.sin(time*2.6),glow=(st.faction==='neutral'?'#7dcfff':baseColor);
 // Corona atop the geometry; continuous but inexpensive in LOW.
 ctx.save();ctx.globalAlpha=st.destroyed?.25:1;
 const rr=st.tier===3?52:st.tier===2?47:42;
 ctx.strokeStyle=glow;ctx.lineWidth=low?1.2:2;
 ctx.globalAlpha=st.destroyed?.18:.30+.11*pulse;
 ctx.beginPath();ctx.arc(0,0,rr,0,TAU);ctx.stroke();
 if(!low){
  // Orbital ring pulses: segmented and rotating with a low draw-call count.
  const sectors=mobile?4:8;
  ctx.lineWidth=st.tier>=3?2.7:2;ctx.globalAlpha=.50+.12*pulse;
  for(let k=0;k<sectors;k++){const a=time*.20+TAU*k/sectors;ctx.beginPath();ctx.arc(0,0,rr+8,a,a+.33);ctx.stroke();}
  // Animated energy core, physical height is drawn in GLB.
  ctx.globalAlpha=.3+.17*Math.sin(time*3.8);ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,-6,st.tier>=3?8:6,0,TAU);ctx.fill();
  if(st.shield>0&&!st.destroyed){
   ctx.lineWidth=1.5;ctx.strokeStyle='#74d8ff';ctx.globalAlpha=.08+.25*st.shield;
   ctx.beginPath();ctx.ellipse(0,-4,rr+13,(rr+13)*.70,-.10,0,TAU);ctx.stroke();
   if(!mobile&&quality==='high'){
    ctx.beginPath();ctx.ellipse(0,-4,rr+13,(rr+13)*.70,-.10,Math.PI*.08,Math.PI*.88);ctx.stroke();
   }
  }
  if(st.contested){
   ctx.strokeStyle='#ff794e';ctx.globalAlpha=.45+.22*Math.sin(time*7);
   ctx.lineWidth=2.7;ctx.setLineDash([8,7]);ctx.beginPath();ctx.arc(0,0,rr+19,time*.42,time*.42+Math.PI*1.2);ctx.stroke();ctx.setLineDash([]);
  }
  if(st.critical||st.destroyed){
   ctx.globalAlpha=.55;ctx.strokeStyle='#ff5f48';ctx.lineWidth=2;
   for(let j=0;j<3;j++){const a=time*.5+j*TAU/3;const x=Math.cos(a)*(rr-5),y=Math.sin(a)*(rr-5);ctx.beginPath();ctx.moveTo(x-6,y-2);ctx.lineTo(x+5,y+4);ctx.stroke();}
  }
  if(st.challenger&&Number(node.progress)>0){
   ctx.strokeStyle='#f9db80';ctx.globalAlpha=.8;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,rr+24,-Math.PI/2,-Math.PI/2+TAU*clamp(Number(node.progress)/100,0,1));ctx.stroke();
  }
  const effectAge=time-prev.at;
  if(prev.type!=='init'&&effectAge>=0&&effectAge<2.1){
   // Evolution / conquest: expanding reactor shockwave; first second strongly visible.
   const t=effectAge/2.1;ctx.strokeStyle=prev.type==='evolve'?'#ffe29a':glow;ctx.lineWidth=3*(1-t)+.5;
   ctx.globalAlpha=(1-t)*.80;ctx.beginPath();ctx.arc(0,0,rr*(.6+t*1.4),0,TAU);ctx.stroke();
   if(prev.type==='claim'&&t<.6){ctx.globalAlpha=(1-t)*.6;ctx.fillStyle=glow;ctx.fillRect(-2,-rr-30,4,rr+18);}
  }
 }
 ctx.restore();return drawn;
}
