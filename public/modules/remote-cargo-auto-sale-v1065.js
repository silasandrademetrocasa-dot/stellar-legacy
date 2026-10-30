/* V106.5: toda venda AUTOMATICA exige o extra realmente equipado na nave ativa.
 * Não substitui o RPC econômico: preço, crédito e propriedade são sempre do servidor.
 */
export const REMOTE_TRADER_CPU_V1065='remoteTraderCpuElite';
export function hasRemoteTraderCpuV1065(state){
  return Array.isArray(state?.shipLoadout?.extras)&&state.shipLoadout.extras.includes(REMOTE_TRADER_CPU_V1065);
}
export function eligibleAutoCargoSaleV1065({mode='manual',enabled=false,state=null,cargoUsed=0,cargoCapacity=0,sellValue=0,online=true,blocked=false,threshold=85}={}){
  if(!['manual','autopilot','offline'].includes(mode)||enabled!==true||!online||blocked||!hasRemoteTraderCpuV1065(state))return false;
  const capacity=Number(cargoCapacity),filled=Number(cargoUsed),sale=Number(sellValue);
  if(!(Number.isFinite(capacity)&&capacity>0&&Number.isFinite(filled)&&filled>0&&Number.isFinite(sale)&&sale>0))return false;
  const pct=Math.min(100,Math.max(1,Number(threshold)||85));
  return filled/capacity*100>=pct;
}
