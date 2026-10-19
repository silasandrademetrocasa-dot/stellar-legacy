// V30.5.0: low-risk NPC scheduling. Player-adjacent, combat and special entities always tick.
export function npcUpdateDecision(enemy,{playerX=0,playerY=0,nowMs=0,frame=0,slot=0}={}){
  if(!enemy||enemy.hp<=0)return 'skip';
  if(enemy.sharedWorld)return 'normal';
  if(enemy.gateEnemy||enemy.forceChase||enemy.eventNpc||enemy.worldBoss||enemy.sharedStaticBoss||enemy.playerProvoked||enemy.selected||enemy.isTarget)return 'normal';
  if(String(enemy.type||'').startsWith('boss'))return 'normal';
  if((enemy.lastAttackPlayerAt||0)>0&&nowMs/1000-(enemy.lastAttackPlayerAt||0)<15)return 'normal';
  const dx=playerX-enemy.x,dy=playerY-enemy.y;
  const radius=Math.max(1300,(Number(enemy.aggroRange)||0)+650,(Number(enemy.attackRange)||0)+800);
  if(dx*dx+dy*dy<=radius*radius)return 'normal';
  // A distant unengaged NPC gets one coarse AI tick per eight frames.
  return ((frame+slot)%8===0)?'coarse':'skip';
}
export function nearestNpcInRange(enemies,x,y,maxRange=950){
  let best=null,bestD=maxRange*maxRange;
  for(const e of enemies||[]){if(!e||e.hp<=0||e.sharedWorld===true&&e.isHidden)continue;
    const dx=(Number(e.x)||0)-x,dy=(Number(e.y)||0)-y,d=dx*dx+dy*dy;
    if(d<bestD){best=e;bestD=d;}}
  return best;
}
