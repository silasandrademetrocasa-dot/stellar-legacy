import {auxProtocolStats,normalizeAuxProtocols} from './aux-protocols.js';
export function auxBoxRangeV1341(state,{battle=false}={}){
 const level=Math.max(1,Math.min(20,Math.floor(Number(state?.pet?.level)||1))),slots=Math.min(12,level+2);
 return Math.max(300,(battle?2200:1650)*.5)*auxProtocolStats(normalizeAuxProtocols(state?.pet?.protocols,slots)).boxSeekRange;
}
// The request selects an actor; persisted ownership/gear and server-known positions authorize it.
export function collectionAccessV1341(state,client,drop,collector='ship',now=Date.now()){
 const p=client?.player,room=client?.room;
 if(!p||room?.key!==drop.map_key||!Number.isFinite(p.x)||!Number.isFinite(p.y))return {ok:false,code:'COLLECTION_MAP_MISMATCH'};
 if(collector==='ship')return Math.hypot(p.x-drop.x,p.y-drop.y)<=150?{ok:true,collector}:{ok:false,code:'COLLECTION_SHIP_RANGE'};
 if(collector!=='pet')return {ok:false,code:'COLLECTOR_INVALID'};
 const stored=state?.pet,pet=p.pet;
 if(!stored?.owned||stored.gearsOwned?.box!==true||!pet?.owned||pet.activeGear!=='box')return {ok:false,code:'COLLECTION_PET_INACTIVE'};
 if(!Number.isFinite(pet.x)||!Number.isFinite(pet.y)||!Number.isFinite(p.updatedAt)||now-p.updatedAt>10000)return {ok:false,code:'COLLECTION_POSITION_STALE'};
 const radar=room.map?.battle?2200:1650;
 if(Math.hypot(p.x-drop.x,p.y-drop.y)>auxBoxRangeV1341(state,{battle:!!room.map?.battle})+40||Math.hypot(pet.x-p.x,pet.y-p.y)>Math.max(900,radar*.82)*1.25+40||Math.hypot(pet.x-drop.x,pet.y-drop.y)>90)return {ok:false,code:'COLLECTION_PET_RANGE'};
 return {ok:true,collector};
}
