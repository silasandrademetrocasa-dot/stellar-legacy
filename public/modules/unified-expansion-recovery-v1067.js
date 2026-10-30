/* Stellar Legacy V106.7: recuperacao apenas de LEITURA do Universo Estelar V42.
 * Nao repetir POST economico, nao trocar sessao, nao calcular recompensas. */
const asText=value=>String(value??'').trim();
export function universeDashboardFailureV1067(error){
  const code=asText(error?.code).toUpperCase();
  const status=Number(error?.status)||0;
  const message=asText(error?.message||error).toLowerCase();
  if(code==='SESSION_REPLACED'||code==='SESSION_REQUIRED'||status===401||status===403||/sess[aã]o inv[aá]lida|sess[aã]o ausente|jwt|token expira/.test(message)){
    return {kind:'auth',retryable:false,title:'SESSÃO DO PILOTO',detail:'Sua sessão precisa ser validada novamente. Entre no jogo antes de abrir o Universo Estelar.'};
  }
  if(code==='UNIVERSE_SQL_MISSING'||/sql cumulativo|pgrst202|function.*does not exist/.test(message)){
    return {kind:'config',retryable:false,title:'UNIVERSO SEM CONFIGURAÇÃO',detail:'O servidor não encontrou a função de expansão no banco. É necessária uma correção no servidor.'};
  }
  if(code==='UNIVERSE_DB_TIMEOUT'||code==='NETWORK_TIMEOUT'||status===504||/statement timeout|tempo limite|timeout|abort/.test(message)){
    return {kind:'timeout',retryable:true,title:'UNIVERSO DEMORANDO A RESPONDER',detail:'A consulta demorou além do limite. Seu progresso não foi alterado; tente abrir o painel novamente.'};
  }
  if(code==='UNIVERSE_DB_ERROR'||status===502||status===503||code==='NETWORK_OFFLINE'||/indispon[ií]vel|conex[aã]o|fetch/.test(message)){
    return {kind:'unavailable',retryable:true,title:'UNIVERSO TEMPORARIAMENTE INDISPONÍVEL',detail:'A consulta ao painel falhou. O servidor de combate pode continuar online. Tente novamente.'};
  }
  if(code==='SAVE_MISSING'||/save_missing/.test(message)){
    return {kind:'save',retryable:false,title:'SAVE AINDA NÃO DISPONÍVEL',detail:'O Universo depende do save do piloto confirmado no servidor. Confira o save antes de tentar.'};
  }
  return {kind:'unknown',retryable:false,title:'FALHA AO CARREGAR UNIVERSO',detail:'Não foi possível carregar as atividades. O erro foi identificado para diagnóstico; tente novamente mais tarde.'};
}
export async function loadUniverseDashboardWithRetryV1067(loader,{delay=ms=>new Promise(resolve=>setTimeout(resolve,ms)),retryDelayMs=500}={}){
  if(typeof loader!=='function')throw TypeError('Leitura do painel indisponível');
  try{return await loader();}
  catch(error){
    if(!universeDashboardFailureV1067(error).retryable)throw error;
    await delay(retryDelayMs);
    return loader(); // unica tentativa adicional; apenas GET
  }
}
