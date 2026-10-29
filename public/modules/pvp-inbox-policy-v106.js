/* V106 • Controle de interesse de dano PvP. Nao faz requisicoes nem altera recompensas.
 * Nos mapas PvE o servidor nao permite ataques PvP. Fora das arenas,
 * uma unica leitura ao SAIR evita reaplicar depois eventos pendentes. */
export function shouldPollPvpInboxV106({
  inPvp=false, drainPending=false, now=0, lastReadAt=0,
  busy=false, hasSession=false, privateMap=false,
}={}){
  if(!hasSession||privateMap||busy)return false;
  if(inPvp)return now-lastReadAt>=450;
  // Sem combate PvP, zero consultas periodicas. A unica excecao e
  // limpar a inbox apos sair de 4-1/4-2/4-3; caso falhe, tentar de novo
  // apenas com backoff, nunca a cada frame.
  return drainPending&&now-lastReadAt>=15000;
}
