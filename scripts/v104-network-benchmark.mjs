#!/usr/bin/env node
// Benchmark de payload SINTETICO deterministico: NAO mede latencia nem Supabase real.
// Compara V103 (player full e NPC delta a 2,5s) x V104 (player delta e NPC distante a 5s).
import {playerStateDelta,npcStateDelta} from '../server/network-delta-v104.js';
const bytes=data=>Buffer.byteLength(JSON.stringify(data));
let playerOld=0,playerNew=0,prevPlayer=null,playerSkipped=0;
let npcOld=0,npcNew=0,prevNpcOld=null,prevNpcNew=null;
const seconds=30,ticks=seconds*8;
for(let t=0;t<ticks;t++){
 const time=t*125;
 const state={userId:'pilot-01',callsign:'PILOTO TESTE',faction:'earth',shipId:'goliath',shipDesignId:null,level:20,
   x:400+Math.round(t*.85),y:200+Math.round(t*.4),angle:.35,hp:100000,maxHp:100000,shield:50000,maxShield:50000,updatedAt:time,
   laserFiring:t>90&&t<125,laserColor:'#76d9ff',laserAmmoId:'lcb10',laserAmmoName:'PLS-1',targetId:t>90&&t<125?'n1':null,targetIsPlayer:false,
   pet:{owned:true,level:8,x:370+Math.round(t*.85),y:180,angle:.1,activeGear:'off',laserTargetId:null,laserActive:false,laserColor:'#76d9ff',designId:null}};
 playerOld+=bytes({type:'world_player_patch',entity:state});
 const delta=playerStateDelta(prevPlayer,state);if(delta){playerNew+=bytes({type:'world_player_patch',entity:delta});prevPlayer=state;}else playerSkipped++;
 // Um NPC distante percorrendo 3 unidades a cada 125ms, sem combate.
 const npc={id:'npc-far',x:8000+t*3,y:7600,hp:25000,shield:30000,angle:.12,bossPhase:0};
 if(t%20===0){const {cur,patch}=npcStateDelta(prevNpcOld,npc,1);if(patch){npcOld+=bytes({type:'npc_batch',entities:[patch]});prevNpcOld=cur;}}
 if(t%40===0){const {cur,patch}=npcStateDelta(prevNpcNew,npc,22);if(patch){npcNew+=bytes({type:'npc_batch',entities:[patch]});prevNpcNew=cur;}}
}
const saving=(a,b)=>+(100*(a-b)/a).toFixed(1);
console.log(JSON.stringify({kind:'synthetic-payload-only',durationSec:seconds,player:{beforeBytes:playerOld,afterBytes:playerNew,reductionPct:saving(playerOld,playerNew),skippedPackets:playerSkipped},farNpc:{beforeBytes:npcOld,afterBytes:npcNew,reductionPct:saving(npcOld,npcNew)},notes:'Nao reflete usuarios reais, compressao, latencia, FPS ou banco; usar /api/world/status + metricas Render para confirmar.'},null,2));
