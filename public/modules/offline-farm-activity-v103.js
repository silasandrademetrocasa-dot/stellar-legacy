/* V103: bloqueio de operações diretas no Supabase quando o Farm Offline
 * controla o save. Não substitui as verificações do servidor ou RLS SQL.
 */
export function offlineFarmDirectActivityAllowedV103(path,method='GET',farmActive=false){
  if(!farmActive)return true;
  const m=String(method||'GET').toUpperCase();
  if(['GET','HEAD','OPTIONS'].includes(m))return true;
  const p=String(path||'').split('?')[0];
  // Login/recuperação/sair não alteram game_saves/profiles.
  if(p.startsWith('/auth/v1/'))return true;
  // Lances são registrados no ledger do Leilão, não no save. A liquidação
  // do inventário é feita após o resgate do Farm Offline.
  if(p==='/rest/v1/auction_bids'||p==='/rest/v1/rpc/place_auction_bid_online')return true;
  // Consulta da presença ou saída da conexão, sem recompensa nem save.
  if(p==='/rest/v1/player_presence' && m==='DELETE')return true;
  if(p==='/rest/v1/rpc/send_chat_message_v16')return true;
  // RPCs de leitura usam POST por exigência PostgREST.
  if(/^\/rest\/v1\/rpc\/(?:get_|list_|search_)/.test(p))return true;
  // Preview ADM não registra transação do piloto.
  if(/^\/rest\/v1\/rpc\/admin_(?:preview_|simulate_)/.test(p))return true;
  // Todos os demais RPCs e alterações diretas ficam bloqueados na interface.
  return false;
}
