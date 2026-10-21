// Stellar Legacy V38.0.0 — Astral Gates Rebirth.
// Funções de combate/visuais puras: nenhuma operação econômica ou escrita remota.
export const ASTRAL_ARENAS = Object.freeze({
 ggAlpha:Object.freeze({key:'alpha',label:'AURORA',w:11500,h:8500,main:'#5affdb',rim:'#249cd3',core:'#d9fff0',danger:'#ffe08c'}),
 ggBeta:Object.freeze({key:'beta',label:'NEXUS',w:13200,h:9600,main:'#9b79ff',rim:'#52bdff',core:'#ebdeff',danger:'#ffbaf0'}),
 ggGamma:Object.freeze({key:'gamma',label:'ECLIPSE',w:14800,h:10800,main:'#ff6674',rim:'#ed9b45',core:'#ffdfbb',danger:'#ff4970'})
});
export function isAstralArena(mapId){return Object.hasOwn(ASTRAL_ARENAS,String(mapId||''));}
// Exclusivamente no mapa do portal, todos os NPCs vivos aparecem no minimapa.
export function astralRadarVisible({mapId,enemy,dist,radarRange}={}){
 if(!enemy||Number(enemy.hp)<=0)return false;
 if(isAstralArena(mapId))return true;
 return !!enemy.eventNpc||Number(dist)<=Number(radarRange);
}
export function astralResumePoint(point,world,{fallbackX,fallbackY}={}){
 const w=Math.max(200,Number(world?.w)||200),h=Math.max(200,Number(world?.h)||200);
 const fallback={x:Number.isFinite(fallbackX)?fallbackX:w/2,y:Number.isFinite(fallbackY)?fallbackY:h/2};
 if(!point||!Number.isFinite(Number(point.x))||!Number.isFinite(Number(point.y)))return fallback;
 return {x:Math.max(80,Math.min(w-80,Number(point.x))),y:Math.max(80,Math.min(h-80,Number(point.y)))};
}
export function astralBossStage(enemy){
 if(!enemy||!enemy.astralProtocol||!String(enemy.type||'').startsWith('boss')||Number(enemy.hp)<=0)return 0;
 const ratio=(Math.max(0,Number(enemy.hp)||0)+Math.max(0,Number(enemy.shield)||0))/Math.max(1,(Number(enemy.maxHp)||0)+(Number(enemy.maxShield)||0));
 return ratio<=.33?3:ratio<=.66?2:1;
}
export function astralBossLabel(enemy){const n=astralBossStage(enemy);if(!n)return '';
 const titles={alpha:['','DESPERTAR','TEMPESTADE','AURORA FINAL'],beta:['','VIGÍLIA','RUPTURA','NEXUS INSTÁVEL'],gamma:['','ECLIPSE','COLAPSO','ABISMO OMEGA']};
 return (titles[enemy.astralProtocol]||titles.alpha)[n];
}
// Estrutura no centro do setor: no gráfico baixo é um desenho estático sem filtros.
export function drawAstralRift(ctx,{mapId,screenX,screenY,time=0,quality='low',mobile=false,image=null}={}){
 const d=ASTRAL_ARENAS[mapId];if(!d||!ctx||!Number.isFinite(screenX)||!Number.isFinite(screenY))return false;
 const low=quality==='low',medium=quality==='medium'||mobile;
 ctx.save();ctx.translate(screenX,screenY);
 if(image?.naturalWidth){ctx.globalAlpha=low?.87:.94;ctx.drawImage(image,-165,-165,330,330);ctx.globalAlpha=1;}
 else {ctx.strokeStyle=d.rim;ctx.lineWidth=8;ctx.beginPath();ctx.arc(0,0,123,0,Math.PI*2);ctx.stroke();}
 ctx.lineWidth=low?2:3;ctx.strokeStyle=d.main;ctx.globalAlpha=low?.46:.68;
 ctx.beginPath();ctx.arc(0,0,150,0,Math.PI*2);ctx.stroke();
 if(!low){const angle=time*(medium?.12:.21);ctx.rotate(angle);ctx.strokeStyle=d.core;ctx.globalAlpha=.52;
  for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.arc(0,0,157,a,a+.26);ctx.stroke();}
  ctx.rotate(-angle);
 }
 ctx.globalAlpha=1;ctx.restore();return true;
}
// Pinta fase do boss sem criar partículas extras por frame.
export function drawAstralBossCrest(ctx,{enemy,time=0,quality='low'}={}){
 const stage=astralBossStage(enemy);if(!stage||!ctx)return false;
 const palette={alpha:'#5affdb',beta:'#bb9eff',gamma:'#ff8a64'};
 const r=Math.max(24,(Number(enemy.size)||24)+19+stage*4);
 ctx.save();ctx.strokeStyle=palette[enemy.astralProtocol]||'#fff';ctx.globalAlpha=quality==='low'?.62:.88;
 ctx.lineWidth=stage===3?2.5:1.5;
 if(quality!=='low')ctx.rotate((time*.15)*(enemy.astralProtocol==='gamma'?-1:1));
 const count=stage+2;for(let i=0;i<count;i++){const a=i*Math.PI*2/count;ctx.beginPath();ctx.arc(0,0,r,a+.08,a+.40);ctx.stroke();}
 ctx.restore();return true;
}
