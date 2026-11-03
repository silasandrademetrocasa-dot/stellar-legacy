/* V117.3: at most one active WebSocket per pilot in each room.
 * Rewards belong to verified, current, alive sockets only, regardless of
 * reconnect ordering. No changes to faction, damage or SQL reward amounts.
 */
export function currentRoomActorV1173(ws,players){
  const id=String(ws?.player?.userId||'');
  return !!id&&players instanceof Map&&players.get(id)===ws.player;
}
export function replacedRoomSocketsV1173(clients,userId,except=null){
  const id=String(userId||'');
  if(!id)return [];
  return [...(clients||[])].filter(c=>c!==except&&String(c?.player?.userId||'')===id);
}
export function eligibleGroupRecipientsV1173(candidates,{
  now=Date.now(),lastActivity=()=>0,isFresh=()=>true,isCurrent=()=>true,openState=1,cutoffMs=120000
}={}){
  const found=new Set(),eligible=[];
  for(const c of candidates||[]){
    const id=String(c?.player?.userId||'');
    if(!id||found.has(id)||c.readyState!==openState||!(Number(c?.player?.hp)>0)||
       !isFresh(c.player)||!isCurrent(c)||!(Number(lastActivity(id))>=now-cutoffMs))continue;
    found.add(id);eligible.push(c);
  }
  return eligible;
}
