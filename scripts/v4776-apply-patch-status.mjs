#!/usr/bin/env node
// V47.7.6 — verification-only companion to the historical v4776-apply-patch.mjs.
// Migration is already incorporated in the release. Never mutate source during npm run check.
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=(path)=>readFileSync(resolve(root,path),'utf8');
const has=(file,marker)=>read(file).includes(marker);
const check=(description,good)=>{if(!good){console.error('❌ '+description);process.exitCode=1}else console.log('✅ '+description)};
const pkg=JSON.parse(read('package.json'));
check('Versionamento preservado',pkg.version==='47.7.6');
check('Migração original preservada, sem reexecução',has('scripts/v4776-apply-patch.mjs',"const OLD='47.7.5',NEW='47.7.6'"));
check('Revenda em créditos autoritativa',has('server/index.js','saleQuoteV4776')&&has('public/modules/sale-policy-v4776.js','saleQuoteV4776'));
check('Confirmações integradas ao jogo',has('public/game.js','stellarConfirmV4776')&&has('public/modules/stellar-dialog-v4776.js','stellarConfirmV4776'));
check('Exploração sem desconectar',has('public/game.js','stellarEconomySyncAfterV4776')&&has('public/modules/unified-expansion-v42.js','stellarEconomySyncAfterV4776'));
check('Painel de Boss com controle de recolher',has('public/index.html','bossPhaseToggleV4776')&&has('public/game.js','bossHudMiniV4776'));
check('Hotfix visual do Target recolhido/expandido',has('public/modules/sale-policy-v4776.js','stellar-target-aux-hotfix-20261022')&&has('public/modules/sale-policy-v4776.js','#targetLockHud:not(.collapsed)'));
check('Arte AUX-9 instalada',existsSync(resolve(root,'public/assets/v4777/aux9-new.webp'))&&has('public/modules/sale-policy-v4776.js','/assets/v4777/aux9-new.webp'));
if(process.exitCode)console.error('Revisar a migração. Nenhum arquivo foi alterado pelo verificador.');
else console.log('✅ V47.7.6 instalada. Nenhuma migração reaplicada; validação principal continua no verify-release.');
