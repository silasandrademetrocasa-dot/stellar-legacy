/* V115.0 — observabilidade ADM read-only, sem nomes, tokens ou estado econômico. */
export function competitiveQualitySummaryV115(stats={},now=Date.now()){
 const net=stats.networkV104||{},ws=stats.networkV1051||{},tot=ws.window?.outbound||{};
 const roomCount=Math.max(0,Math.floor(Number(stats.rooms)||0));
 const clients=Math.max(0,Math.floor(Number(stats.clients)||0));
 const bytes=Math.max(0,Number(tot.bytes)||0);
 const windowMs=Math.max(1,Number(ws.windowMs)||1);
 return {version:'V115.0',readOnly:true,checkedAt:new Date(now).toISOString(),rooms:roomCount,connections:clients,
  npcCount:Math.max(0,Number(stats.npcs)||0),oreCount:Math.max(0,Number(stats.ores)||0),
  network:{outboundKBps:Math.round(bytes/windowMs*1000/1024*100)/100,npcBackpressureSkips:Math.max(0,Number(net.npcBackpressureSkips)||0),playerMotionDeferred:Math.max(0,Number(net.playerMotionDeferredV115)||0),playerMotionResynced:Math.max(0,Number(net.playerMotionResyncedV115)||0)},
  activeEvent:stats.event?.id||null,dbWrites:0};
}
