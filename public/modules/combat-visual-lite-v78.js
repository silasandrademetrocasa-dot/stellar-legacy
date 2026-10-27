/** V78 • Efeitos visuais leves. Exclusivamente Canvas 2D; nenhuma regra de gameplay. */
const TAU=Math.PI*2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(n))?Number(n):a));
export function combatVisualPolicyV78(quality='medium',mobile=false){
  const low=quality==='low',high=quality==='high';
  return Object.freeze({
    laserBeams:high&&!mobile?2:1,
    laserGlow:high&&!mobile?3:0,
    rocketTrail:!low,
    repairDots:high&&!mobile?1:0,
    reticleAccent:high&&!mobile,
    maxDrawnRockets:low?4:mobile?6:10,
  });
}
export function drawLaserLiteV78(ctx,{sx,sy,tx,ty,ammoId='lcb10',color='#76d9ff',alpha=1,widthScale=1,quality='medium',mobile=false}={}){
  if(![sx,sy,tx,ty].every(Number.isFinite))return false;
  const settings=combatVisualPolicyV78(quality,mobile),dx=tx-sx,dy=ty-sy,length=Math.max(1,Math.hypot(dx,dy)),nx=-dy/length,ny=dx/length;
  const drain=ammoId==='sab50',heavy=ammoId==='ucb100';
  ctx.save();
  try{
    ctx.globalAlpha=clamp(alpha,0,1);
    ctx.strokeStyle=color;ctx.lineWidth=(heavy?2.15:drain?1.85:1.55)*clamp(widthScale,.25,2);
    ctx.shadowBlur=settings.laserGlow; if(settings.laserGlow)ctx.shadowColor=color;
    for(let i=0;i<settings.laserBeams;i++){
      const d=(i-(settings.laserBeams-1)*.5)*3;
      ctx.beginPath();ctx.moveTo(sx+nx*d,sy+ny*d);ctx.lineTo(tx+nx*d,ty+ny*d);ctx.stroke();
    }
    return true;
  }finally{ctx.restore();}
}
export function drawRocketLiteV78(ctx,{x,y,tailX=x,tailY=y,color='#ffb36d',quality='medium',mobile=false}={}){
  if(![x,y,tailX,tailY].every(Number.isFinite))return false;
  const policy=combatVisualPolicyV78(quality,mobile);
  ctx.save();
  try{
    ctx.strokeStyle=color;ctx.fillStyle=color;ctx.globalAlpha=.88;
    if(policy.rocketTrail){ctx.lineWidth=1.7;ctx.beginPath();ctx.moveTo(tailX,tailY);ctx.lineTo(x,y);ctx.stroke();}
    ctx.beginPath();ctx.arc(x,y,quality==='low'?2.7:3.3,0,TAU);ctx.fill();
    return true;
  }finally{ctx.restore();}
}
/** Regen/repair/impact: um único desenho simples, sem desfoque, gradiente, filtro ou composição lighter. */
export function drawLightFxV78(ctx,fx,{quality='medium',mobile=false}={}){
  const kind=String(fx?.type||'');
  if(!['repair','shieldcharge','shield','impact','spark','explosion'].includes(kind))return false;
  // Alto desktop mantém outras famílias de efeitos; regens sempre usam o caminho leve.
  if(!mobile&&quality==='high'&&!['repair','shieldcharge','shield'].includes(kind))return false;
  const a=clamp(fx.life/Math.max(.001,fx.maxLife||1),0,1),q=1-a,r=clamp(fx.size,8,160)*(.68+q*.36),color=fx.color||'#75d9ff';
  ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=kind==='explosion'?2:1.65;
  ctx.globalAlpha=clamp(a*.72,0,.80);
  ctx.beginPath();
  if(kind==='shield'||kind==='shieldcharge')ctx.ellipse(0,0,r,r*.80,0,0,TAU);
  else ctx.arc(0,0,r,0,TAU);
  ctx.stroke();
  if(kind==='repair'){
    // O sinal de cura continua visível; elimina as quatro bolinhas orbitais.
    const s=Math.min(8,r*.22);ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-s,0);ctx.lineTo(s,0);ctx.moveTo(0,-s);ctx.lineTo(0,s);ctx.stroke();
  }else if(kind==='spark'){
    ctx.beginPath();ctx.arc(0,0,Math.min(3.2,r*.2),0,TAU);ctx.fill();
  }
  return true;
}
export function drawCircularSelectionV78(ctx,{radius=40,color='#ffdf7f',quality='medium',mobile=false,time=0}={}){
  const r=clamp(radius,8,240);
  ctx.save();
  try{
    ctx.strokeStyle=color;ctx.lineWidth=2;ctx.globalAlpha=.89;
    ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.stroke();
    // Somente Alto no desktop possui um curto traço de referência giratório.
    if(combatVisualPolicyV78(quality,mobile).reticleAccent){
      const angle=(Number(time)||0)*.45;ctx.globalAlpha=.65;ctx.lineWidth=2.8;
      ctx.beginPath();ctx.arc(0,0,r+3,angle,angle+.35);ctx.stroke();
    }
    return true;
  }finally{ctx.restore();}
}
