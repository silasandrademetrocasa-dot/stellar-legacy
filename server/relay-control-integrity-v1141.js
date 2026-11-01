/* V114.1 — decisões de captura e defesa feitas a partir do estado oficial da sala. */
export function relayCaptureActorEligibleV1141({actor,node,now=Date.now(),maxStaleMs=8000}={}){
 if(!actor?.userId||!node||!(Number(actor.hp)>0)||!actor.clanId&&node.relayMode)return false;
 if(!Number.isFinite(Number(actor.x))||!Number.isFinite(Number(actor.y)))return false;
 if(now-(Number(actor.updatedAt)||0)>maxStaleMs)return false;
 return Math.hypot(Number(actor.x)-Number(node.x),Number(actor.y)-Number(node.y))<=Number(node.radius)+1;
}
export function relayTurretTargetEligibleV1141({node,player,fresh=true,portalNeutral=false,range=950}={}){
 if(!node||!player||!fresh||portalNeutral||!(Number(player.hp)>0))return false;
 if(node.ownerClanId&&String(player.clanId||'')===String(node.ownerClanId))return false;
 if(!node.ownerClanId&&node.owner&&String(player.faction||'')===String(node.owner))return false;
 if(![player.x,player.y,node.x,node.y].every(v=>Number.isFinite(Number(v))))return false;
 return Math.hypot(player.x-node.x,player.y-node.y)<=Math.min(Math.max(1,Number(range)||950),Number(node.radius||0)+150);
}
export function relayContestedClansV1141(players,node,eligible){
 if(!node?.relayMode)return false;
 const clans=new Set();
 for(const p of players||[]){if(!p?.clanId||!eligible(p))continue;clans.add(String(p.clanId));if(clans.size>1)return true;}
 return false;
}
