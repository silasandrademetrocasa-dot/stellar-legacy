/* V114.2 — varredura sem snapshots completos; elimina entidades de evento órfãs. */
export function staleEventEntityIdsV1142(entities,activeEventId,eventFlag){
 const ids=[];
 for(const [id,entity] of entities||[]){if(entity?.[eventFlag]&&(!activeEventId||String(entity.eventId)!==String(activeEventId)))ids.push(id);}
 return ids;
}
export function eventRuntimeAdmittedV1142(ev,eligible){return !!ev&&eligible(ev)===true;}
