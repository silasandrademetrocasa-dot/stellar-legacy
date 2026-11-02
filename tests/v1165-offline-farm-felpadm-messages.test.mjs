import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('V116.5: mensagens de resgate são humanas e preservam a segurança',()=>{
 const farm=read('public/modules/stellar-offline-farm-v484.js');
 for(const code of ['FARM_REVIEW_REQUIRED_UNVERIFIED_CHANGE','FARM_REVIEW_REQUIRED_ONLINE_REWARDS','FARM_REVIEW_REQUIRED_ECONOMY_DESYNC','FARM_RECOVERY_NOT_SETTLED','SAVE_NPC_STALE'])assert.ok(farm.includes(code));
 assert.match(farm,/farmFriendlyErrorV1165\(data\.error/);
 assert.match(farm,/farmIssueTextV1165\(issues\)/);
 assert.match(farm,/Conferindo o progresso e os saldos/);
 assert.match(farm,/CANCELAR SEM GANHOS/);
 assert.match(farm,/request\('settle'/);
});
test('V116.5: atualiza apenas o cache visual, sem alterar lógica financeira',()=>{
 const bridge=read('public/modules/stellar-offline-farm-v1163.js');
 assert.match(bridge,/stellar-offline-farm-v484\.js\?v=116\.5/);
 const html=read('public/index.html');
 assert.match(html,/v1165-farm-error-humanized/);
 const server=read('server/offline-farm-v484.js');
 assert.match(server,/stellar_offline_farm_claim_v1111/);
});
