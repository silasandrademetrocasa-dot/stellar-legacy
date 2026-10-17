// Navegacao visual e velocidade de cruzeiro: nao altera HP, dano, saves ou calculo de equipamentos.
// O mapa PvP e mais extenso; os propulsores da CONF de corrida continuam tendo vantagem proporcional.
export const PVP_SECTORS=new Set(['b41','b42','b43']);
export const PVP_CRUISE_FACTOR=0.88;
export const PVP_MAP_DIMENSIONS=Object.freeze({
  b41:Object.freeze({w:11800,h:8400}),
  b42:Object.freeze({w:12500,h:8900}),
  b43:Object.freeze({w:13500,h:9600})
});

export function movementSpeed(baseSpeed,mapId,abilityMultiplier=1){
  const speed=Math.max(0,Number(baseSpeed)||0);
  const ability=Math.max(0,Number(abilityMultiplier)||0);
  return speed*ability*(PVP_SECTORS.has(String(mapId||''))?PVP_CRUISE_FACTOR:1);
}

// Camera acompanha a nave de perto. Atraso visual maximo em 14 unidades,
// mesmo com baixa taxa de quadros, evitando que ela 'empurre a tela'.
export function followShipCamera(camera,ship,dt,{maxLag=14,followRate=20}={}){
  const sx=Number(ship?.x),sy=Number(ship?.y);
  if(!Number.isFinite(sx)||!Number.isFinite(sy))return camera;
  const cx=Number(camera?.x),cy=Number(camera?.y);
  if(!Number.isFinite(cx)||!Number.isFinite(cy))return {x:sx,y:sy};
  const alpha=1-Math.exp(-Math.max(0,Math.min(Number(dt)||0,.25))*Math.max(1,followRate));
  const nextX=cx+(sx-cx)*alpha,nextY=cy+(sy-cy)*alpha;
  const dx=sx-nextX,dy=sy-nextY,dist=Math.hypot(dx,dy);
  const lag=Math.max(0,Number(maxLag)||0);
  if(dist>lag&&dist>0)return {x:sx-dx/dist*lag,y:sy-dy/dist*lag};
  return {x:nextX,y:nextY};
}
