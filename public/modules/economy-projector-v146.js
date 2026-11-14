/** Provisional UI only. The server never accepts this projection as proof of payment/reward. */
const n=v=>Math.max(0,Math.floor(Number(v)||0));
const fail=message=>{throw Error(message);};
export function projectEconomicEventV146(input,event){
 const state=structuredClone(input),p=event.preview||{},profile=state.profile||=( {} );
 if(event.kind==='catalog'||event.kind==='bulk'||event.kind==='economy'&&event.body.action==='auto_buy'){
  const quote=p.quote;if(!quote)fail('Catálogo local indisponível. Abra a loja para atualizar.');
  const price=Number(event.expected?.price),currency=event.expected?.currency;
  if(!['credits','uridium'].includes(currency)||!Number.isSafeInteger(price)||price<1)fail('Cotação inválida.');
  if(n(profile[currency])<price)fail('Saldo disponível insuficiente.');
  if(n(profile.level)<n(quote.min_level||1))fail('Nível insuficiente.');
  const grant=quote.meta?.grant||{},kind=grant.kind,id=String(grant.id||quote.ref_id||''),qty=event.kind==='bulk'?n(p.delivered):Math.max(1,n(grant.qty||1));
  if(kind==='ship'){
   state.ownedShips||=[];if(state.ownedShips.includes(id))fail('Nave já obtida.');state.ownedShips.push(id);
  }else if(kind==='inventory'){
   state.inventory||={};if(quote.kind==='extra'&&(n(state.inventory[id])>0||(state.shipLoadout?.extras||[]).includes(id)))fail('Extra já obtido.');state.inventory[id]=n(state.inventory[id])+qty;
  }else if(kind==='ammo'||kind==='rocket'){
   const field=kind==='ammo'?'ammo':'rockets';state[field]||={};state[field][id]=n(state[field][id])+qty;
  }else if(kind==='drone'){
   state.drones||=[];if(state.drones.length>=8)fail('Limite de drones atingido.');state.drones.push({id:'d_lf_'+event.id.replaceAll('-',''),type:id,slots:Array(Math.max(1,n(grant.slots||1))).fill(null)});
   state.dronePurchasesV1829||={};state.dronePurchasesV1829[id]=Math.max(n(state.dronePurchasesV1829[id]),state.drones.filter(d=>d.type===id).length-1)+1;
  }else if(kind==='drone_formation'){
   state.ownedDroneFormationsV144||=[];if(state.ownedDroneFormationsV144.includes(id))fail('Formação já obtida.');state.ownedDroneFormationsV144.push(id);
  }else if(kind==='pet_base'){
   state.pet||={};if(state.pet.owned)fail('AUX já obtido.');Object.assign(state.pet,{owned:true,level:Math.max(1,n(state.pet.level)),laserSlotsUnlocked:Math.max(1,n(state.pet.laserSlotsUnlocked)),shieldSlotsUnlocked:Math.max(2,n(state.pet.shieldSlotsUnlocked))});state.pet.lasers||=[null];state.pet.shields||=[null,null];
  }else if(kind==='pet_gear'){
   if(!state.pet?.owned)fail('Adquira o AUX primeiro.');state.pet.gearsOwned||={};if(state.pet.gearsOwned[id])fail('Módulo já obtido.');state.pet.gearsOwned[id]=true;
  }else fail('Produto sem prévia local segura.');
  profile[currency]=n(profile[currency])-price;
 }else if(event.kind==='economy'&&['sell_cargo','sell_inventory'].includes(event.body.action)){
  const sold=p.sold||{},field=event.body.action==='sell_cargo'?'cargo':'inventory';
  for(const [id,count] of Object.entries(sold)){if(n(state[field]?.[id])<count)fail('Estoque local mudou.');state[field][id]=n(state[field][id])-count;if(!state[field][id])delete state[field][id];}
  if(!Object.keys(sold).length||!Number.isSafeInteger(p.total)||p.total<0)fail('Venda sem cotação local segura.');
  profile[p.currency||'credits']=n(profile[p.currency||'credits'])+p.total;
 }
 // Collection/random rewards remain pending until their server receipt; disappearance is immediate.
 return state;
}
export function reprojectEconomyV146(canonical,events,project=projectEconomicEventV146){
 let state=structuredClone(canonical);const blocked=[];
 for(const event of events){
  if(event.sequence<=Number(canonical.serverEconomicAckV146?.[event.device]||0))continue;
  try{state=project(state,event);}catch(error){blocked.push({id:event.id,message:error.message});}
 }
 return {state,blocked};
}
