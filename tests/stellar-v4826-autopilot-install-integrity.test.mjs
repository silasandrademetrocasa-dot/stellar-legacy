import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('uma instância Autopilot após os patches da instalação',()=>{
  const game=read('public/game.js');
  assert.equal((game.match(/\bconst\s+AUTOPILOT_V48\s*=\s*createStellarAutopilotV48\s*\(/g)||[]).length,1);
  assert.match(game,/routeMapLayoutV4825/);
  assert.match(game,/applyAuthoritativePurchase/);
  assert.match(game,/autoBuyEnabled/);
});
test('o instalador do Autopilot é idempotente após ajustes no controlador',()=>{
  const script=read('scripts/v48-autopilot-patch.mjs');
  assert.match(script,/controllerMatches\.length===0/);
  assert.match(script,/controllerMatches\.length>1/);
});
test('viagem mantém farm em reconexão e a compra usa loja oficial • V48.3.1',()=>{
  const src=read('public/modules/stellar-autopilot-v48.js');
  // O teste V48.2.6 verificava o grace period de 60s e uma mensagem antiga.
  // A V48.3.1 não interrompe o bot só por perder a rede: pausa todas as ações
  // até revalidar permissão e receber um snapshot atual do setor.
  assert.match(src,/if\(authorizedId&&authorizedId===String\(getIdentity\(\)\|\|''\)\)/);
  assert.match(src,/Reconectando com segurança • sem ações de economia/);
  assert.match(src,/if\(String\(getIdentity\(\)\|\|''\)===authorizedId\)/);
  assert.match(src,/Sem sincronização do setor • aguardando servidor/);
  assert.match(src,/if\(busy\)return;\s*const action=chooseAutopilotAction/);
  assert.doesNotMatch(src,/lastHealthyAt<60000/);
});
