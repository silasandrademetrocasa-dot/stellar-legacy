// V34.4.1 - percepcao e orientacao de NPCs no servidor.
// Apenas direcao visual e escolha de alvo; nunca calcula dano, loot ou velocidade.
const valid = value=>Number.isFinite(Number(value));
export function perceptionPlayers(players,{now,isProtected}={}){
  const t=Number(now)||0,rows=[];
  for(const player of players||[]){
    if(!player||!valid(player.x)||!valid(player.y)||!(Number(player.hp)>0)||t-(Number(player.updatedAt)||0)>8000)continue;
    rows.push({player,protected:typeof isProtected==='function'&&!!isProtected(player)});
  }
  return rows;
}
export function nearestPerceivedPlayer(entity,players){
  if(!entity)return null;
  const x=Number(entity.x)||0,y=Number(entity.y)||0;
  let best=null,minSq=Infinity;
  for(const row of players||[]){
    const p=row.player;
    if(!p||row.protected&&String(entity.aggroUserId||'')!==String(p.userId||''))continue;
    const dx=p.x-x,dy=p.y-y,sq=dx*dx+dy*dy;
    if(sq<minSq){minSq=sq;best=p;}
  }
  return best?{player:best,dist:Math.sqrt(minSq)}:null;
}
export function turnNpcToward(angle,fromX,fromY,toX,toY,dt,turnRate=5.5){
  const current=valid(angle)?Number(angle):0;
  const dx=Number(toX)-Number(fromX),dy=Number(toY)-Number(fromY);
  if(!Number.isFinite(dx)||!Number.isFinite(dy)||dx*dx+dy*dy<1)return current;
  const desired=Math.atan2(dy,dx);
  const diff=Math.atan2(Math.sin(desired-current),Math.cos(desired-current));
  const factor=Math.max(0,Math.min(1,(Number(dt)||0)*Math.max(0,turnRate)));
  return current+diff*factor;
}

// Mantem fidelidade ao aggro: somente pilotos que ja atingiram este NPC
// concorrem ao retarget, com maior dano acumulado primeiro.
export function selectAggroSuccessor(contributions,players,isFresh){
  if(!(contributions instanceof Map)||!(players instanceof Map))return null;
  let best=null,highest=-1;
  for(const [id,damage] of contributions){
    const p=players.get(id),score=Math.max(0,Number(damage)||0);
    if(!p||typeof isFresh==='function'&&!isFresh(p))continue;
    if(score>highest){highest=score;best=p;}
  }
  return best;
}
