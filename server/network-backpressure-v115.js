/* V115.0 — apenas updates de movimento podem esperar sob backpressure.
 * Combate, dano, recompensa, evento, controle de relé e snapshot NUNCA são descartados.
 */
export const MOTION_BACKPRESSURE_BYTES_V115=256*1024;
export function shouldDeferPlayerMotionV115(payload,bufferedBytes,limit=MOTION_BACKPRESSURE_BYTES_V115){
 return payload?.type==='world_player_patch'&&Number(bufferedBytes)>limit&&!!payload?.entity?.userId;
}
export function mayFlushMovementV115(bufferedBytes,limit=MOTION_BACKPRESSURE_BYTES_V115){return Number.isFinite(Number(bufferedBytes))&&Number(bufferedBytes)<=limit/2;}
export function resyncPlayerIdsV115(pending,players,viewerId,max=3){
 const ready=[];
 if(!(pending instanceof Set))return ready;
 for(const id of pending){if(id===String(viewerId||'')){pending.delete(id);continue;}if(!players.has(id)){pending.delete(id);continue;}
  ready.push(id);if(ready.length>=max)break;
 }
 return ready;
}
