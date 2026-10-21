// Stellar Legacy — Visual Revolution. Pure, presentation-only helpers.
// Does not author combat, relay ownership, damage, rewards or save state.
const TAU=Math.PI*2;
const CLAMP=(n,lo,hi)=>Math.min(hi,Math.max(lo,Number.isFinite(Number(n))?Number(n):lo));
export const RELAY_VISUAL_SLOTS=Object.freeze([
  'laser','missile','capacitor','regenerator','armor','nanobots','bonus','bonus'
]);
const SUBTYPE_CATEGORY=Object.freeze({laser:'weapon',missile:'weapon',capacitor:'shield',regenerator:'shield',armor:'hp',nanobots:'hp',bonus:'bonus'});

export function visualFxBudget(quality='medium',mobile=false){
  if(quality==='low')return {relayGeometry:1,relayGlow:0,portalAccents:0,oreAccents:0,impactEffects:0,shipLights:0};
  if(mobile||quality==='medium')return {relayGeometry:2,relayGlow:0,portalAccents:1,oreAccents:0,impactEffects:1,shipLights:1};
  return {relayGeometry:3,relayGlow:1,portalAccents:2,oreAccents:1,impactEffects:2,shipLights:2};
}
export function relayVisualLoadout(node){
  const supplied=Array.isArray(node?.modules)?node.modules:[];
  const isNeutral=!node?.ownerClanId;
  return RELAY_VISUAL_SLOTS.map((type,i)=>{
    const slot=i+1,m=supplied.find(m=>Number(m?.slot)===slot);
    if(m)return {slot,attribute:String(m.attribute||type),category:String(m.category||SUBTYPE_CATEGORY[type]),level:CLAMP(m.level,1,3),virtual:false};
    if(isNeutral)return {slot,attribute:type,category:SUBTYPE_CATEGORY[type],level:1,virtual:true};
    return null;
  });
}
export function relayVisualHealth(node){
  const hp=CLAMP(node?.hp,0,Infinity),shield=CLAMP(node?.shield,0,Infinity);
  const maxHp=Math.max(1,Number(node?.maxHp)||1),maxShield=Math.max(1,Number(node?.maxShield)||1);
  return {hpRatio:CLAMP(hp/maxHp,0,1),shieldRatio:CLAMP(shield/maxShield,0,1),destroyed:hp<=0,critical:hp>0&&hp/maxHp<.3};
}
export function relayImpactType(node){
  return relayVisualHealth(node).destroyed?'explosion':Number(node?.shield)>0?'shield':'spark';
}
export function drawRelayStation(ctx,node,{quality='medium',mobile=false,time=0,baseColor='#79d9fa',aimAngle=0}={}){
  if(!node?.relayMode)return;
  const b=visualFxBudget(quality,mobile),health=relayVisualHealth(node),mounts=relayVisualLoadout(node);
  // Caller has already translated to the node center. Draw only inside a balanced save/restore.
  ctx.save();
  const destroyed=health.destroyed,neutral=!node.ownerClanId,level=Math.max(1,Math.min(3,Number(node.relayLevel||node.level)||1));
  const cLevel=level>=3?'#ffdca3':level===2?'#92bfff':baseColor;
  // Angular hull is intentionally sprite-sized so it stays readable in the mobile map.
  ctx.fillStyle=destroyed?'#25252f':level===3?'#24304d':level===2?'#132c49':'#10273b';ctx.strokeStyle=destroyed?'#805b62':cLevel;ctx.lineWidth=2;
  ctx.beginPath();for(let i=0;i<8;i++){const a=TAU*i/8-Math.PI/8,r=i%2?34:31,x=Math.cos(a)*r,y=Math.sin(a)*r*.83;
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
  ctx.closePath();ctx.fill();ctx.stroke();
  // Visible silhouette stages. No raster effects and no costly shadows in mobile LOW.
  if(level>=2){
    ctx.fillStyle=destroyed?'#372d39':'#193f58';ctx.strokeStyle=cLevel;ctx.lineWidth=1.5;
    for(const side of [-1,1]){
      ctx.beginPath();ctx.moveTo(side*23,-21);ctx.lineTo(side*39,-23);ctx.lineTo(side*48,-11);ctx.lineTo(side*45,13);ctx.lineTo(side*28,19);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='#5be4ff';ctx.fillRect(side*37-2,-3,4,8);ctx.fillStyle=destroyed?'#372d39':'#193f58';
    }
  }
  if(level>=3){
    ctx.strokeStyle=destroyed?'#826170':'#ffd476';ctx.fillStyle='#242846';ctx.lineWidth=2;
    for(const side of [-1,1]){
      ctx.beginPath();ctx.moveTo(side*16,-28);ctx.lineTo(side*24,-45);ctx.lineTo(side*11,-53);ctx.lineTo(side*4,-34);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.moveTo(side*16,25);ctx.lineTo(side*25,42);ctx.lineTo(side*12,48);ctx.lineTo(side*5,30);ctx.closePath();ctx.fill();ctx.stroke();
    }
    ctx.strokeStyle='rgba(255,212,110,.80)';ctx.beginPath();ctx.arc(0,0,45,Math.PI*.13,Math.PI*.87);ctx.stroke();
  }
  // V36 Galactic Dominion: higher-tier relay silhouettes remain recognizable even
  // with every cosmetic effect disabled. On low quality only a few plain strokes.
  if(level>=2){
    ctx.save();ctx.strokeStyle=destroyed?'#6b5860':level===3?'#e0c16e':'#7badce';
    ctx.fillStyle=destroyed?'#342c35':'#192d48';ctx.lineWidth=b.relayGeometry>=3?2:1.2;
    for(const sign of [-1,1]){
      // Dual reinforced pylons visible behind weapon hardpoints.
      ctx.beginPath();ctx.moveTo(sign*29,-19);ctx.lineTo(sign*44,-15);
      ctx.lineTo(sign*49,-6);ctx.lineTo(sign*31,-3);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.moveTo(sign*29,19);ctx.lineTo(sign*44,15);
      ctx.lineTo(sign*49,6);ctx.lineTo(sign*31,3);ctx.closePath();ctx.fill();ctx.stroke();
    }
    if(b.relayGeometry>1&&health.shieldRatio>0){
      ctx.strokeStyle='#65bde9';ctx.globalAlpha=.3+.35*health.shieldRatio;
      ctx.beginPath();ctx.arc(0,0,level===3?57:48,Math.PI*.14,Math.PI*.86);
      ctx.moveTo(level===3?-51:-42,-16);ctx.arc(0,0,level===3?57:48,Math.PI*1.14,Math.PI*1.86);ctx.stroke();ctx.globalAlpha=1;
    }
    if(level===3&&b.relayGeometry>=3){
      // Four luminous vents make the citadel distinct without shadowBlur or spritesheets.
      ctx.fillStyle=destroyed?'#805754':'#ffcc71';
      for(let ix of [-1,1])for(let iy of [-1,1])ctx.fillRect(ix*38-2,iy*34-2,4,4);
    }
    ctx.restore();
  }
  // Clan/faction targeting stripe, intentionally static for mobile performance.
  if(!destroyed){
   const factionColor={earth:'#5ea9ff',mars:'#ff7b6c',jupiter:'#ffce6c'}[String(node.owner||'')];
   if(factionColor){ctx.fillStyle=factionColor;ctx.fillRect(-10,-28,20,3);}
  }
  // Layered armor plates, not a blurred full-screen effect.
  ctx.fillStyle=destroyed?'#4b3d46':'#183b51';ctx.strokeStyle='rgba(183,233,250,.40)';ctx.lineWidth=.9;
  for(let side of [-1,1]){ctx.beginPath();ctx.moveTo(side*8,-18);ctx.lineTo(side*24,-10);ctx.lineTo(side*27,7);ctx.lineTo(side*8,13);ctx.closePath();ctx.fill();if(b.relayGeometry>1)ctx.stroke();}
  if(b.relayGeometry>1){ctx.strokeStyle='rgba(90,188,219,.35)';ctx.beginPath();ctx.moveTo(-19,0);ctx.lineTo(19,0);ctx.moveTo(0,-24);ctx.lineTo(0,24);ctx.stroke();}
  // Eight physical hardpoints: differentiated laser, missile, shield, hull and bonus.
  for(let i=0;i<8;i++){
    const a=TAU*i/8-Math.PI/2,x=Math.cos(a)*29,y=Math.sin(a)*23,m=mounts[i],type=m?.attribute||RELAY_VISUAL_SLOTS[i];
    ctx.save();ctx.translate(x,y);
    const color=!m?'#587181':m.category==='weapon'?'#ff947a':m.category==='shield'?'#65d9ff':m.category==='hp'?'#86ffb3':'#ffd46d';
    ctx.fillStyle=m?'#182d42':'#0a1622';ctx.strokeStyle=color;ctx.lineWidth=1.3;ctx.fillRect(-5.3,-4.1,10.6,8.2);ctx.strokeRect(-5.3,-4.1,10.6,8.2);
    if(m&&!destroyed){
      if(type==='laser'){
        ctx.save();ctx.rotate(aimAngle);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-1,0);ctx.lineTo(10,0);ctx.stroke();ctx.restore();
      }else if(type==='missile'){
        ctx.save();ctx.rotate(aimAngle);ctx.fillStyle=color;ctx.fillRect(1,-3.2,8,2.4);ctx.fillRect(1,1.2,8,2.4);ctx.restore();
      }else if(type==='capacitor'||type==='regenerator'){
        ctx.strokeStyle=color;ctx.beginPath();ctx.arc(0,0,3,0,TAU);ctx.stroke();
      }else if(type==='armor'||type==='nanobots'){
        ctx.fillStyle=color;ctx.fillRect(-2.5,-2.5,5,5);
      }else{ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,-3);ctx.lineTo(3,0);ctx.lineTo(0,3);ctx.lineTo(-3,0);ctx.closePath();ctx.fill();}
      if(b.relayGeometry>=3&&m.level>1){ctx.fillStyle='#f6ffff';ctx.fillRect(-4.1,4.6,m.level*2.1,1);}
    }
    ctx.restore();
  }
  // Core pulse communicates energy and neutral defense without changing damage or state.
  const pulse=b.relayGlow?0.86+.14*Math.sin(time*3):1;
  ctx.fillStyle=destroyed?'#321f30':neutral?'#5bc3e1':level>=3?'#ffd476':level===2?'#9dc4ff':'#54e8ff';ctx.strokeStyle=destroyed?'#a66b6d':'#e5ffff';ctx.lineWidth=1.3;
  ctx.beginPath();ctx.arc(0,0,destroyed?7:8*pulse,0,TAU);ctx.fill();ctx.stroke();
  if(b.relayGlow&&health.shieldRatio>0&&!destroyed){ctx.globalAlpha=.26+.17*Math.sin(time*2);ctx.strokeStyle='#69cfff';ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(0,0,level>=3?50:level===2?44:39,0,TAU);ctx.stroke();ctx.globalAlpha=1;}
  if(health.critical||destroyed){ctx.strokeStyle=destroyed?'#ff6f5c':'#ffba62';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(-10,-10);ctx.lineTo(-3,-4);ctx.lineTo(1,2);ctx.lineTo(10,12);ctx.stroke();}
  ctx.restore();
}
export function drawPortalGateAccents(ctx,{quality='medium',mobile=false,time=0,color='#6cdeff'}={}){
  const budget=visualFxBudget(quality,mobile);if(!budget.portalAccents)return;
  ctx.save();ctx.strokeStyle=color;ctx.globalAlpha=budget.portalAccents===1?.32:.53;ctx.lineWidth=1.1;
  const angle=Math.floor(time*4)/4*.26;
  for(let i=0;i<4*budget.portalAccents;i++){
    const a=angle+TAU*i/(4*budget.portalAccents),x=Math.cos(a)*44,y=Math.sin(a)*62;
    ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.beginPath();ctx.moveTo(-3,0);ctx.lineTo(3,0);ctx.stroke();ctx.restore();
  }ctx.restore();
}
export function drawOreEventAccents(ctx,{quality='medium',mobile=false,time=0,color='#8ffff0',radius=24}={}){
  if(!visualFxBudget(quality,mobile).oreAccents)return;
  ctx.save();ctx.strokeStyle=color;ctx.lineWidth=1;ctx.globalAlpha=.5;
  ctx.setLineDash([4,8]);ctx.rotate(Math.floor(time*3)/3*.08);ctx.beginPath();ctx.arc(0,0,Math.max(15,radius),0,TAU);ctx.stroke();ctx.setLineDash([]);ctx.restore();
}
export function drawShipWingLights(ctx,{quality='medium',mobile=false,size=75,color='#78dfff'}={}){
  const b=visualFxBudget(quality,mobile);if(!b.shipLights)return;
  ctx.save();ctx.fillStyle=color;ctx.globalAlpha=.55;
  const d=Math.max(5,size*.25),r=Math.max(1,size*.023);
  ctx.fillRect(-d-r,-r,r*2,r*2);ctx.fillRect(d-r,-r,r*2,r*2);
  if(b.shipLights>1){ctx.strokeStyle=color;ctx.globalAlpha=.25;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-d,3);ctx.lineTo(-d+7,6);ctx.moveTo(d,3);ctx.lineTo(d-7,6);ctx.stroke();}
  ctx.restore();
}
