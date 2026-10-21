// Small faction silhouettes without new image assets, canvas shadows or gradients in LOW mode.
const COLORS={earth:'#58d8ff',mars:'#ff8969',jupiter:'#e7c36f'};
export function drawWarbotShipV477(ctx,e,selected=false,quality='low',time=0){
  const c=COLORS[e.faction]||'#a4d6ee';
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.angle||0);ctx.fillStyle=c;ctx.strokeStyle='#e5f7ff';
  ctx.lineWidth=1.2;ctx.globalAlpha=.94;
  ctx.beginPath();ctx.moveTo(25,0);ctx.lineTo(-8,-13);ctx.lineTo(-16,-23);ctx.lineTo(-22,-10);
  ctx.lineTo(-14,0);ctx.lineTo(-22,10);ctx.lineTo(-16,23);ctx.lineTo(-8,13);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#0d1d32';ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(-5,-7);ctx.lineTo(-4,7);ctx.closePath();ctx.fill();
  ctx.fillStyle='#b6f1ff';ctx.fillRect(-23,-4,8,8);
  if(quality!=='low'){
    ctx.globalAlpha=.5+.24*Math.sin(time*7);
    ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(-20,-6);ctx.lineTo(-30-3*Math.sin(time*15),0);ctx.lineTo(-20,6);ctx.fill();
  }
  if(selected){ctx.globalAlpha=.8;ctx.setLineDash([5,4]);ctx.strokeStyle='#ffffff';ctx.beginPath();ctx.arc(0,0,36,0,Math.PI*2);ctx.stroke();}
  ctx.restore();
}
export function drawWarbotBeamV477(ctx,fx,now,quality='low'){
  const age=now-fx.created; if(age>.22)return false;
  ctx.save();ctx.globalAlpha=Math.max(0,1-age/.22);ctx.strokeStyle=fx.color||'#80d9ff';ctx.lineWidth=quality==='low'?1.2:2.6;
  ctx.beginPath();ctx.moveTo(fx.a.x,fx.a.y);ctx.lineTo(fx.b.x,fx.b.y);ctx.stroke();ctx.restore();return true;
}
