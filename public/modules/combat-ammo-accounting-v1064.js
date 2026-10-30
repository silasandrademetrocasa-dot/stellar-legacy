/* V106.4 — contabilidade consistente de disparos de laser.
 * Uma unidade por laser que efetivamente disparou.
 * Nenhuma distinção entre usuário comum e ADM.
 * AUX Sentinela atira à parte: não somar sua cadência à rajada principal.
 */
const validCount = value => { const n=Number(value); return Number.isFinite(n)?Math.max(0,Math.floor(n)):0; };
export function laserAmmoShotBudgetV1064(equipped, stock){
  const guns=validCount(equipped), available=validCount(stock);
  const spent=Math.min(guns,available);
  return {equipped:guns,spent,remaining:available-spent};
}
export function laserAmmoSourcesV1064(state, items){
  const count=ids=>(Array.isArray(ids)?ids:[]).filter(id=>items?.[id]?.type==='laser').length;
  const ship=count(state?.shipLoadout?.lasers);
  const drones=(Array.isArray(state?.drones)?state.drones:[]).reduce((sum,d)=>sum+count(d?.slots),0);
  const aux=state?.pet?.owned?count(state.pet.lasers):0;
  const auxSentinel=aux>0&&state?.pet?.activeGear==='guard'&&state?.pet?.gearsOwned?.guard===true;
  return {ship,drones,shipAndDrones:ship+drones,aux,auxSentinel};
}
export function ammoReadoutV1064({name='Laser',mult=1,shieldDrain=false,stock=0,shipAndDrones=0,aux=0,auxSentinel=false}={}){
  const main=validCount(shipAndDrones),support=validCount(aux),amount=validCount(stock);
  const bursts=main>0?Math.floor(amount/main):0;
  return `${name} • ${shieldDrain?'CAPTURA ESCUDO x2':`dano x${mult}`}\nEstoque: ${amount.toLocaleString('pt-BR')}\nNave + drones: -${main} por rajada`+
    (support?`\nAUX Sentinela: -${support} por disparo próprio (${auxSentinel?'somente ao revidar':'inativo'})`:'')+
    `\nRajadas de nave + drones restantes: ~${bursts.toLocaleString('pt-BR')} (sem ataques AUX)`;
}
