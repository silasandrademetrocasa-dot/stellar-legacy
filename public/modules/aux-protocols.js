// AUX-9: distribuição gratuita dos espaços já concedidos pela progressão.
// Não concede moedas/itens, não altera drop e nunca substitui validação do servidor.
export const AUX_PROTOCOL_TYPES=Object.freeze([
  {id:'guard',label:'GUARDA',icon:'🛡',bonus:'Alcance de reação +6%, dano do AUX +6%, tiro +5% por nível'},
  {id:'ore',label:'MINERAÇÃO',icon:'⛏',bonus:'Busca local +8% e deslocamento de coleta +8% por nível (online usa o raio do servidor)'},
  {id:'box',label:'SALVAGER',icon:'📦',bonus:'Alcance de caixas +8% e deslocamento +10% por nível'},
  {id:'repair',label:'REPARAÇÃO',icon:'✚',bonus:'Reparação de HP +10% por nível'},
  {id:'kami',label:'NOVA BURST',icon:'☄',bonus:'Dano de explosão +8% e raio +4% por nível'},
]);
export const AUX_PROTOCOL_MAX_RANK=3;
export const AUX_PROTOCOL_IDS=Object.freeze(AUX_PROTOCOL_TYPES.map(x=>x.id));
export function normalizeAuxProtocols(input,slots=0){
  const budget=Math.max(0,Math.min(12,Math.trunc(Number(slots)||0)));
  const safe={};let remaining=budget;
  for(const id of AUX_PROTOCOL_IDS){
    const value=input&&Object.prototype.hasOwnProperty.call(input,id)?input[id]:0;
    const rank=Number.isFinite(Number(value))?Math.max(0,Math.min(AUX_PROTOCOL_MAX_RANK,Math.trunc(Number(value)))):0;
    safe[id]=Math.min(remaining,rank);remaining-=safe[id];
  }
  return safe;
}
export function auxProtocolSlotsUsed(allocation){return AUX_PROTOCOL_IDS.reduce((sum,id)=>sum+Math.max(0,Math.min(AUX_PROTOCOL_MAX_RANK,Math.trunc(Number(allocation?.[id])||0))),0);}
export function changeAuxProtocolRank(allocation,id,delta,slots){
  if(!AUX_PROTOCOL_IDS.includes(id)||!Number.isInteger(delta)||Math.abs(delta)!==1)return normalizeAuxProtocols(allocation,slots);
  const safe=normalizeAuxProtocols(allocation,slots);
  const next=safe[id]+delta;
  if(next<0||next>AUX_PROTOCOL_MAX_RANK||(delta>0&&auxProtocolSlotsUsed(safe)>=slots))return safe;
  safe[id]=next;
  return safe;
}
export function auxProtocolStats(allocation){
  const ranks=normalizeAuxProtocols(allocation,12);
  return {
    guardRange:1+ranks.guard*.06,
    guardDamage:1+ranks.guard*.06,
    guardShotDelay:Math.max(.40,.58*(1-ranks.guard*.05)),
    oreSeekRange:1+ranks.ore*.08,
    oreMoveSpeed:1+ranks.ore*.08,
    boxSeekRange:1+ranks.box*.08,
    boxMoveSpeed:1+ranks.box*.10,
    repairRate:1+ranks.repair*.10,
    kamiDamage:1+ranks.kami*.08,
    kamiRadius:1+ranks.kami*.04,
  };
}
