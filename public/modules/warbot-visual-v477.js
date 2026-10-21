// V47.7.1: real faction sprites already present in the project's asset cache.
export const WARBOT_SHIP_ASSETS=Object.freeze({
  earth:'/assets/v2212/ships/earth-map.webp',
  mars:'/assets/v2212/ships/mars-map.webp',
  jupiter:'/assets/v2212/ships/jupiter-map.webp'
});
const COLORS={earth:'#58d8ff',mars:'#ff8969',jupiter:'#e7c36f'};
export function drawWarbotShipV477(ctx,e,selected=false,quality='low',time=0){
  const c=COLORS[e.faction]||'#a4d6ee',img=e.spriteImage;
  const size=e.role==='guardian'?76:e.role==='interceptor'?54:64;
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.angle||0);
  if(img?.naturalWidth>0&&img?.naturalHeight>0){
    const f=size/Math.max(img.naturalWidth,img.naturalHeight);
    ctx.save();ctx.rotate(Math.PI/2); // top-down source images point upward
    ctx.drawImage(img,-img.naturalWidth*f/2,-img.naturalHeight*f/2,img.naturalWidth*f,img.naturalHeight*f);ctx.restore();
  }else{
    // Fallback while the reused image is loading.
    const scale=size/65;ctx.scale(scale,scale);ctx.fillStyle=c;ctx.strokeStyle='#e5f7ff';ctx.lineWidth=1.2;
    ctx.beginPath();ctx.moveTo(27,0);ctx.lineTo(-8,-13);ctx.lineTo(-16,-23);ctx.lineTo(-22,-10);
    ctx.lineTo(-14,0);ctx.lineTo(-22,10);ctx.lineTo(-16,23);ctx.lineTo(-8,13);ctx.closePath();ctx.fill();ctx.stroke();
  }
  if(quality!=='low'){
    ctx.globalAlpha=.6;ctx.strokeStyle=c;ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(0,0,size*.5,0,Math.PI*2);ctx.stroke();
  }
  if(selected){ctx.globalAlpha=.9;ctx.setLineDash([5,4]);ctx.strokeStyle='#ffffff';ctx.beginPath();ctx.arc(0,0,size*.56,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
  ctx.restore();
}
export function drawWarbotBeamV477(ctx,fx,now,quality='low'){
  const age=now-fx.created; if(age>.22)return false;
  ctx.save();ctx.globalAlpha=Math.max(0,1-age/.22);ctx.strokeStyle=fx.color||'#80d9ff';ctx.lineWidth=quality==='low'?1.2:2.6;
  ctx.beginPath();ctx.moveTo(fx.a.x,fx.a.y);ctx.lineTo(fx.b.x,fx.b.y);ctx.stroke();ctx.restore();return true;
}
