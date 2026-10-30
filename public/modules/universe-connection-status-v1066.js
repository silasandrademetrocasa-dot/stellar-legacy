/* STELLAR V106.6 — distinguish a server-side sector admission denial from a
 * broken realtime connection. Pure UI policy; no map unlock or economy change. */
export function universeConnectionStatusV1066({status='offline',mapId='',latency=0,reason=''}={}){
  const state=String(status||'offline');
  const map=String(mapId||'');
  const detail=String(reason||'').slice(0,190);
  const frontier=/^u[1-3]$/.test(map);
  const required=/\bRequer n[ií]vel\s+(\d+)\b/i.exec(detail);
  if(state==='map_error'){
    if(frontier&&required)return {label:`U-${map.slice(1)} • LV${required[1]}`,title:`Acesso negado ao U-${map.slice(1)}: requer nível ${required[1]}. O servidor está conectado; seu piloto ainda não pode entrar.`,kind:'access_denied'};
    return {label:frontier?'U-X • BLOQUEADO':'MAPA • ERRO',title:detail||'Falha ao entrar no setor. A conexão pode estar ativa, mas o servidor negou o ingresso.',kind:'map_error'};
  }
  if(state==='online')return {label:Number(latency)>0?`ONLINE ${Math.round(latency)}ms`:'ONLINE',title:'Conectado ao servidor de mundo em tempo real.',kind:'online'};
  if(state==='connecting')return {label:'CONECTANDO',title:'Abrindo a conexão do universo em tempo real.',kind:'connecting'};
  if(state==='reconnecting')return {label:'RECONECTANDO',title:'Tentando restabelecer a conexão do universo.',kind:'reconnecting'};
  if(state==='auth_error')return {label:'SESSÃO',title:'A sessão do piloto foi recusada pelo servidor em tempo real.',kind:'auth_error'};
  return {label:'OFFLINE',title:'O universo em tempo real não está conectado.',kind:'offline'};
}
