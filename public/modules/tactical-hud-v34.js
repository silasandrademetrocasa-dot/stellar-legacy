// Informational only: never fires weapons, changes damage, or updates saves.
export function npcThreatLabel(target,now=0,range=0){
 if(!target)return '';
 if(target.isPlayer)return 'PILOTO HOSTIL';
 const d=Number.isFinite(Number(range))?Math.max(0,Number(range)):Infinity;
 const attacked=Number(target.lastAttackPlayerAt)||0;
 if(attacked>0&&now>=attacked&&now-attacked<9)return 'AGRESSOR • PRIORIDADE';
 if(target.worldBoss)return 'AMEAÇA GLOBAL';
 if(target.eventNpc)return 'ANOMALIA DE EVENTO';
 return Number.isFinite(d)?`${Math.round(d)}u • ALVO DETECTADO`:'ALVO DETECTADO';
}
export function bossHudCue(enemy,{distance=Infinity,laserRange=600}={}){
 if(!enemy||!String(enemy.type||'').startsWith('boss'))return {phase:0,status:'',urgent:false};
 const phase=Math.max(0,Math.min(2,Math.trunc(Number(enemy.bossPhase)||0)));
 const d=Number.isFinite(Number(distance))?Number(distance):Infinity;
 const close=d<=Math.max(100,Number(enemy.attackRange)||350);
 const reached=d<=Math.max(100,Number(laserRange)||600);
 const names=['ESTÁVEL • 66% ATIVA FÚRIA','FÚRIA • 33% ATIVA OVERDRIVE','OVERDRIVE • AMEAÇA MÁXIMA'];
 return {phase,status:`${names[phase]}${close&&phase?' • CUIDADO: ALCANCE DO BOSS':!reached?' • FORA DO LASER':''}`,urgent:phase>=2&&close};
}
