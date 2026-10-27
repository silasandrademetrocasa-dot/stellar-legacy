/** Stellar Legacy V79 — desenho visual somente. Nenhuma alteração em dano ou navegação. */
const TAU=Math.PI*2;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,Number.isFinite(Number(n))?Number(n):a));
/** As artes TOP originais são usadas em TODAS as qualidades; nunca miniaturas. */
export function spriteSamplingV79({mobile=false}={}){
  // medium do Canvas é interpolação bilinear e evita o custo do filtro high em Android antigo.
  // Não reduz a resolução da textura original e é igual em Baixo, Médio e Alto.
  return mobile?'medium':'high';
}
export function drawEntitySpriteV79(ctx,img,args,{mobile=false}={}){
  if(!ctx||!img||!Array.isArray(args)||(args.length!==4&&args.length!==8))return false;
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality=spriteSamplingV79({mobile});
  ctx.drawImage(img,...args);
  return true;
}
/** Exaustão discreta da antiga qualidade BAIXA, agora igual em todas as qualidades. */
export function drawEngineWakeLiteV79(ctx,{size=72,color='#68dfff',intensity=1}={}){
  if(!ctx||!Number.isFinite(size)||size<=0||!Number.isFinite(intensity)||intensity<=0)return false;
  const span=Math.max(2,size*.12),start=size*.33,end=start+size*.22;
  ctx.save();
  try{
    ctx.globalAlpha=.52*clamp(intensity,0,1);
    ctx.fillStyle=color;
    for(const x of [-span,span]){
      ctx.beginPath();ctx.moveTo(x-2,start);ctx.lineTo(x+2,start);ctx.lineTo(x,end);ctx.closePath();ctx.fill();
    }
    return true;
  }finally{ctx.restore();}
}
