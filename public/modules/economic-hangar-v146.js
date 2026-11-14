/** Remove only a rejected provisional inventory grant; retain other local equipment edits. */
export function removeRejectedEquipmentV146(snapshot,events=[]){
 const state=structuredClone(snapshot);if(!state)return state;
 for(const event of events){
  const grant=event.preview?.quote?.meta?.grant;
  if(grant?.kind==='drone'){
   const id='d_lf_'+event.id.replaceAll('-',''),removed=(state.drones||[]).find(d=>d.id===id);state.inventory||={};
   for(const item of removed?.slots||[])if(item)state.inventory[item]=(Number(state.inventory[item])||0)+1;
   state.drones=(state.drones||[]).filter(d=>d.id!==id);
   for(const profile of Object.values(state.combatConfigsV2013?.profiles||{}))if(profile.droneSlots)delete profile.droneSlots[id];
   continue;
  }
  if(grant?.kind==='ship'){state.ownedShips=(state.ownedShips||[]).filter(id=>id!==(grant.id||event.preview.quote.ref_id));continue;}
  if(grant?.kind==='pet_base'){if(state.pet)state.pet.owned=false;continue;}
  if(grant?.kind!=='inventory')continue;
  const id=String(grant.id||event.preview.quote.ref_id),qty=Math.max(1,Math.floor(Number(grant.qty)||1));
  let left=qty;state.inventory||={};const free=Math.min(left,Number(state.inventory[id])||0);state.inventory[id]=(Number(state.inventory[id])||0)-free;left-=free;
  const lists=[...(Object.values(state.shipLoadout||{})),...(state.drones||[]).map(d=>d.slots),state.pet?.lasers,state.pet?.shields].filter(Array.isArray);
  for(const list of lists)for(let i=list.length-1;i>=0&&left;i--)if(list[i]===id){list[i]=null;left--;}
  // Configurations share the same stock. Each alternate layout must fit the surviving total.
  const total=(Number(state.inventory[id])||0)+lists.reduce((n,list)=>n+list.filter(x=>x===id).length,0);
  for(const profile of Object.values(state.combatConfigsV2013?.profiles||{})){
   let available=total;
   const layouts=[...Object.values(profile.shipLoadout||{}),...Object.values(profile.droneSlots||{}),profile.petLoadout?.lasers,profile.petLoadout?.shields].filter(Array.isArray);
   for(const list of layouts)for(let i=0;i<list.length;i++)if(list[i]===id){if(available>0)available--;else list[i]=null;}
  }
 }
 return state;
}
