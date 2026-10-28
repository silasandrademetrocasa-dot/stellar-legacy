// V104: somente campos alterados; campos removidos continuam sendo transmitidos como null/false.
// O timestamp e anexado apenas a patches reais para preservar a interpolacao de rede.
export function playerStateDelta(previous, current) {
  if (!previous) return {...current};
  const delta = {userId: current.userId};
  for (const [key, value] of Object.entries(current)) {
    if (key === 'userId' || key === 'updatedAt') continue;
    const old = previous[key];
    const same = Object.is(old, value) || (value != null && old != null && typeof value === 'object' && typeof old === 'object' && JSON.stringify(old) === JSON.stringify(value));
    if (!same) delta[key] = value;
  }
  if (Object.keys(delta).length === 1) return null;
  delta.updatedAt = current.updatedAt;
  return delta;
}

// Nunca atualiza o baseline de movimentos ignorados: o deslocamento pequeno acumula
// ate ultrapassar o limiar; vida, escudo e fase continuam exatos.
export function npcStateDelta(previous,current,positionStep=1){
  if(!previous)return {cur:current,patch:current};
  const patch={id:current.id};
  if(Math.abs(current.x-previous.x)>=positionStep)patch.x=current.x;
  if(Math.abs(current.y-previous.y)>=positionStep)patch.y=current.y;
  if(current.hp!==previous.hp)patch.hp=current.hp;
  if(current.shield!==previous.shield)patch.shield=current.shield;
  if(Math.abs(current.angle-previous.angle)>=(positionStep>1?.12:.01))patch.angle=current.angle;
  if(current.bossPhase!==previous.bossPhase)patch.bossPhase=current.bossPhase;
  return {cur:{...previous,...patch},patch:Object.keys(patch).length>1?patch:null};
}
