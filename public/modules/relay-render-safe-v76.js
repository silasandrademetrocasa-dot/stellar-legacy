/** V76 • Renderização visual protegida dos relés em TODOS os modos de qualidade.
 * Não muda captura, colisões, raio lógico, combates, posição nem dados de rede.
 */
import {drawRelaySpriteV74} from './relay-sprite-framing-v74.js';
const TAU=Math.PI*2;
const bounded=(value,fallback,min,max)=>{
  const v=Number(value);return Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
};
const diagnostic={draws:0,failed:0,lastError:'',lastErrorAt:0};
export function relayRenderDiagnosticV76(){return {...diagnostic};}
export function reportRelayRenderErrorV76(error,time=Date.now()){
  diagnostic.failed++;diagnostic.lastError=String(error?.message||error||'Falha desconhecida').slice(0,130);
  diagnostic.lastErrorAt=time;
}
export function relayGeometryV76(node){
  const level=Math.round(bounded(node?.relayLevel??node?.fortificationLevel,1,1,3));
  return {
    level,
    x:bounded(node?.x,NaN,-1e8,1e8),y:bounded(node?.y,NaN,-1e8,1e8),
    radius:bounded(node?.radius,360,120,1800),
    hp:bounded(node?.hp,0,0,1e12),maxHp:bounded(node?.maxHp,1,1,1e12),
    shield:bounded(node?.shield,0,0,1e12),maxShield:bounded(node?.maxShield,1,1,1e12),
    progress:bounded(node?.progress,0,0,100)
  };
}
/** Desenho local em coordenadas de tela. Um save/restore encapsula TODA a operação.
 * O disco translúcido e os anéis animados pesados não são usados em nenhum modo.
 */
export function drawRelayMediumMobileV76(ctx,node,{
  x,y,image=null,color='#83c9ff',selected=false,nearby=0,label='NEUTRO'
}={}){
  const g=relayGeometryV76(node);
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(g.x)||!Number.isFinite(g.y))return false;
  const size=g.level===3?119:g.level===2?105:94;
  ctx.save();
  try{
    ctx.translate(x,y);
    // Quatro marcas leves indicam o raio de captura; o alcance real NÃO muda.
    // Sem preenchimento, shadowBlur, setLineDash, filtro ou círculo inteiro de 720px.
    ctx.strokeStyle=node?.contested?'#ffddad':color;
    ctx.globalAlpha=.48;ctx.lineWidth=1.4;
    for(let k=0;k<4;k++){
      const a=k*Math.PI/2-.07;
      ctx.beginPath();ctx.arc(0,0,g.radius,a,a+.14);ctx.stroke();
    }
    ctx.globalAlpha=g.hp<=0?.56:1;
    if(image&&Number(image.naturalWidth||image.width)>0&&Number(image.naturalHeight||image.height)>0){
      drawRelaySpriteV74(ctx,image,g.level);
    }else{
      // Fallback leve durante carregamento da textura; a estrutura não desaparece.
      ctx.fillStyle='#132b42';ctx.fillRect(-size*.32,-size*.45,size*.64,size*.9);
      ctx.strokeStyle=color;ctx.lineWidth=2;ctx.strokeRect(-size*.32,-size*.45,size*.64,size*.9);
      ctx.fillStyle='#68d9ff';ctx.fillRect(-size*.14,-size*.16,size*.28,size*.32);
    }
    ctx.globalAlpha=1;
    // Barras finas para HP / escudo, sem arcos animados e sobreposição pesada.
    const bw=Math.max(88,size),bx=-bw/2,by=size*.63;
    ctx.fillStyle='#102334';ctx.fillRect(bx,by,bw,4);
    ctx.fillStyle='#ff8876';ctx.fillRect(bx,by,bw*(g.hp/g.maxHp),4);
    ctx.fillStyle='#102334';ctx.fillRect(bx,by+6,bw,4);
    ctx.fillStyle='#50caff';ctx.fillRect(bx,by+6,bw*(g.shield/g.maxShield),4);
    if(selected){ctx.strokeStyle='#ffdf7f';ctx.lineWidth=2;ctx.strokeRect(-size*.53,-size*.63,size*1.06,size*1.26);}
    ctx.textAlign='center';ctx.font='bold 12px Arial';ctx.fillStyle='#f4fbff';
    ctx.fillText(String(node?.id||'?').slice(0,18),0,-size*.63);
    ctx.font='bold 9px Arial';ctx.fillStyle=color;
    ctx.fillText(node?.contested?'CONTESTADO':String(label).slice(0,24),0,by+23);
    // As contagens vêm do servidor e continuam atualizadas no HUD/captura.
    if(nearby>0){ctx.font='9px Arial';ctx.fillText(`${Math.round(bounded(nearby,0,0,9999))} PILOTO(S)`,0,by+34);}
    if(g.progress>0){ctx.fillStyle='#ffd27e';ctx.fillRect(bx,by+13,bw*g.progress/100,2);}
    diagnostic.draws++;return true;
  }finally{ctx.restore();}
}
