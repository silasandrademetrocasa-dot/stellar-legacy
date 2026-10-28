// V104: funde somente requisicoes de LEITURA concorrentes.
// Nao memoriza respostas: saldos, save e permissoes mantem sempre seus fluxos oficiais.
export function createReadCoalescerV104(){
  const inflight=new Map();
  return function readOnce(key,request){
    if(inflight.has(key))return inflight.get(key);
    const promise=Promise.resolve().then(request);
    inflight.set(key,promise);
    // Cleanup nao deve gerar rejection nao tratada em caso de falha da rede.
    promise.then(()=>{if(inflight.get(key)===promise)inflight.delete(key);},()=>{if(inflight.get(key)===promise)inflight.delete(key);});
    return promise;
  };
}
