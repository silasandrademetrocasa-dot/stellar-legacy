/** Capture AUX telemetry with the contact message, using the server's ship position.
 * The canonical collection validator still checks ownership, gear, map, radar and tether.
 * This does not bypass ship movement throttling or issue any reward.
 */
export function collectionContactV1461(player,contact,room,collector){
 const captured=structuredClone(player);
 if(collector!=='pet'||!captured?.pet?.owned||!contact?.pet)return captured;
 const pet=contact.pet,w=Number(room?.map?.world?.w),h=Number(room?.map?.world?.h);
 if(pet.owned!==true||pet.activeGear!=='box'||!Number.isFinite(pet.x)||!Number.isFinite(pet.y)||!Number.isFinite(w)||!Number.isFinite(h)||pet.x<0||pet.y<0||pet.x>w||pet.y>h)throw Error('COLLECTION_CONTACT_INVALID');
 // Mode selection is client telemetry just as in player_state; canonical gear ownership is checked at claim.
 captured.pet={...captured.pet,x:pet.x,y:pet.y,activeGear:'box'};return captured;
}
