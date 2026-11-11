/** V137 — divisão segura do dano e absorção ponderada entre geradores equipados.
 * Mantém a soma de dano aplicado até o limite de HP/escudo sem duplicar dano.
 * Determina a taxa pelo conjunto de escudos (nave, drones e AUX), não pelo maior modelo.
 */
export function shieldAbsorptionV137(generators=[],skillPoints=0){
 let weighted=0,capacity=0;
 for(const entry of generators){
  const shield=Math.max(0,Number(entry?.capacity)||0);
  if(!Number.isFinite(shield)||shield<=0)continue;
  const pct=Math.min(100,Math.max(0,Number(entry?.absorption)||0));
  weighted+=shield*pct;capacity+=shield;
 }
 if(!capacity)return 0;
 return Math.min(95,Math.max(0,weighted/capacity+Math.max(0,Number(skillPoints)||0)));
}

export function splitShieldDamageV137({damage=0,shield=0,hp=0,absorption=0}={}){
 const amount=Math.max(0,Math.round(Number(damage)||0));
 const oldShield=Math.max(0,Number(shield)||0);
 const oldHp=Math.max(0,Number(hp)||0);
 const rate=Math.max(0,Math.min(100,Number(absorption)||0))/100;
 // Sem escudo ativo: 100% do dano remanescente vai para HP.
 const absorbed=oldShield>0?Math.min(oldShield,Math.round(amount*rate)):0;
 const hpDamage=Math.min(oldHp,amount-absorbed);
 return {shield:Math.max(0,oldShield-absorbed),hp:Math.max(0,oldHp-hpDamage),
   shieldDamage:absorbed,hpDamage,actualDamage:absorbed+hpDamage};
}
