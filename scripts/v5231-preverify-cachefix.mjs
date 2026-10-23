/* Stellar Legacy V52.3.1 — preflight corretivo V47.7.6.
 * Deve executar ANTES de scripts/verify-release.mjs.
 * Idempotente: somente versiona o import ESM do renderizador 3D.
 * Nao altera a logica do jogo, assets ou banco de dados.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
const path='public/game.js';
assert(fs.existsSync(path),'V52.3.1: public/game.js nao encontrado');
const before=fs.readFileSync(path,'utf8');
const bare=/(\bfrom\s*['"])\.\/modules\/stellar-ship3d-v50\.js(?=['"])/g;
const after=before.replace(bare,'$1./modules/stellar-ship3d-v50.js?v=47.7.6');
if(after!==before){
  fs.writeFileSync(path,after);
  console.log('✅ V52.3.1 PREVALIDACAO: import 3D corrigido ANTES do verify-release V47.7.6');
}else{
  console.log('✅ V52.3.1 PREVALIDACAO: nenhum import 3D antigo pendente');
}
assert(!/(\bfrom\s*['"])\.\/modules\/stellar-ship3d-v50\.js(?=['"])/.test(after),'Import 3D ainda sem cache-busting');
