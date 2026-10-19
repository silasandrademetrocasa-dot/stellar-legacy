// V32 candidate: pure ordering only. Never selects pilots, starts fire, or bypasses access controls.
export function rankVisibleNpcTargets(enemies,{x=0,y=0,range=950,visible=()=>true,now=0,excludeId=null}={}){
  const limit=Math.max(0,Number(range)||0),limitSq=limit*limit;
  return (Array.isArray(enemies)?enemies:[])
    .filter(e=>e&&e.hp>0&&!e.isPlayer&&e.id!==excludeId&&Number.isFinite(e.x)&&Number.isFinite(e.y))
    .map(e=>({enemy:e,d2:(e.x-x)**2+(e.y-y)**2}))
    .filter(e=>e.d2<=limitSq&&visible(e.enemy))
    .sort((a,b)=>{
      const aAttack=Number(a.enemy.lastAttackPlayerAt)||0,bAttack=Number(b.enemy.lastAttackPlayerAt)||0;
      const aThreat=aAttack>0&&now>=aAttack&&now-aAttack<8?0:1;
      const bThreat=bAttack>0&&now>=bAttack&&now-bAttack<8?0:1;
      return aThreat-bThreat||a.d2-b.d2||String(a.enemy.id).localeCompare(String(b.enemy.id));
    }).map(e=>e.enemy);
}
