// Navegacao visual e velocidade de cruzeiro: nao altera HP, dano, saves ou calculo de equipamentos.
// Mapas de exploração e PvP equilibrados: mantem vantagens proporcionais das CONF de corrida, sem mudar combate.
export const PVP_SECTORS=new Set(['b41','b42','b43']);
export const PVE_SECTORS=new Set(['x1','x2','x3','x4','x5','x6','x7','x8']);
export const PVP_CRUISE_FACTOR=0.88;
export const PVE_CRUISE_FACTOR=0.88;
export const PVP_MAP_DIMENSIONS=Object.freeze({
  b41:Object.freeze({w:11800,h:8400}),
  b42:Object.freeze({w:12500,h:8900}),
  b43:Object.freeze({w:13500,h:9600})
});

export const PVE_MAP_DIMENSIONS=Object.freeze({
  x1:Object.freeze({w:7200,h:5400}),
  x2:Object.freeze({w:7900,h:5800}),
  x3:Object.freeze({w:8650,h:6250}),
  x4:Object.freeze({w:9400,h:6750}),
  x5:Object.freeze({w:10100,h:7300}),
  x6:Object.freeze({w:10700,h:7800}),
  x7:Object.freeze({w:11300,h:8300}),
  x8:Object.freeze({w:12000,h:8900}),
});
export function movementSpeed(baseSpeed,mapId,abilityMultiplier=1){
  const speed=Math.max(0,Number(baseSpeed)||0);
  const ability=Math.max(0,Number(abilityMultiplier)||0);
  const id=String(mapId||'');
  const cruiseFactor=PVP_SECTORS.has(id)?PVP_CRUISE_FACTOR:PVE_SECTORS.has(id)?PVE_CRUISE_FACTOR:1;
  return speed*ability*cruiseFactor;
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
