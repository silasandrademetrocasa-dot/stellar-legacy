import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const prepare=read('sql/STELLAR_V119_1_CAPTURA_ADAPTATIVA_PREPARAR.sql');
const activate=read('sql/STELLAR_V119_1_CAPTURA_ATIVAR.sql');
const rollback=read('sql/STELLAR_V119_1_CAPTURA_DESATIVAR.sql');
const logs=read('sql/STELLAR_V119_1_LOGS_SOMENTE_LEITURA.sql');
const server=read('server/index.js');
const api=read('public/api.js');

test('V119.1: captura registra 1 revisao por mutacao sem gerar outro saldo',()=>{
 assert.match(prepare,/revision=public\.stellar_player_save_head_v119\.revision\+1/);
 assert.match(prepare,/NEW\.state/);
 assert.match(prepare,/md5\(NEW\.state::text\)/);
 assert.doesNotMatch(prepare,/UPDATE\s+public\.game_saves/i);
 assert.doesNotMatch(prepare,/TRUNCATE|DELETE\s+FROM|DROP\s+TABLE/i);
});
test('V119.1: combate intenso nao replica save em cada abate',()=>{
 assert.match(prepare,/interval '30 seconds'/);
 assert.match(prepare,/interval '90 seconds'/);
 assert.match(prepare,/IF v_capture THEN[\s\S]*?stellar_player_save_checkpoint_v119/);
 assert.match(prepare,/IF v_log THEN[\s\S]*?stellar_player_save_journal_v119/);
 assert.match(prepare,/serverNpcRewardRevision/);
 assert.match(prepare,/serverOreRevision/);
 assert.doesNotMatch(prepare,/NEW\.state->'pet' IS DISTINCT FROM OLD\.state->'pet'/);
});
test('V119.1: A/B/C so usa dados confirmados do unico game_saves',()=>{
 assert.match(activate,/LOCK TABLE public\.game_saves IN SHARE ROW EXCLUSIVE MODE/);
 assert.match(activate,/CREATE TEMP TABLE _stellar_v1191_stale/);
 assert.match(activate,/INSERT INTO public\.stellar_player_save_checkpoint_v119/);
 assert.match(activate,/ARRAY\['migracao'\]::text\[\]/);
 assert.match(activate,/AFTER UPDATE OF state ON public\.game_saves/);
 assert.match(activate,/FARM_EM_ANDAMENTO_ADIAR_ATIVACAO/);
 assert.match(rollback,/DROP TRIGGER IF EXISTS stellar_capture_save_update_v119/);
 assert.doesNotMatch(rollback,/DROP TABLE|DELETE FROM/i);
});
test('V119.1: logs independentes sao views read-only restritas ao servidor',()=>{
 assert.match(logs,/WITH \(security_invoker=true\)/);
 for(const table of ['stellar_npc_reward_ledger','stellar_ore_reward_ledger','auction_bids','stellar_offline_farm_v484','stellar_player_save_journal_v119'])
  assert.ok(logs.includes(table),table);
 assert.match(logs,/REVOKE ALL ON public\.stellar_player_save_audit_v1191 FROM PUBLIC,anon,authenticated/);
 assert.match(logs,/GRANT SELECT ON public\.stellar_player_save_audit_v1191 TO service_role/);
 assert.doesNotMatch(logs,/CREATE TABLE|INSERT INTO|UPDATE public|DELETE FROM/i);
});
test('V119.1: o login inicia save/reset em paralelo, sem cachear economia',()=>{
 assert.match(server,/const resetReadV1191=req\.sb\.from\('stellar_account_reset_epochs_v478'\)/);
 assert.match(server,/const \{data: resetRecord,error: resetErr\}=await resetReadV1191/);
 assert.match(server,/res\.set\('Cache-Control','no-store'\)/);
 assert.match(server,/lastCheckpointAt:head\?\.checkpointed_at/);
});
test('V119.1: o token de revisao nao sobrevive a outra sessao de piloto',()=>{
 assert.match(api,/checkSaveSession\(meta.sessionKey\)/);
 assert.match(api,/serverSaveRevisionV119=null;[\s\S]{0,40}saveToken=null/);
 assert.match(api,/Number\.isSafeInteger\(Number\(value\)\)/);
});
test('V119.1: eventos consultaveis pelo piloto, mas sem endpoint para editar recibos',()=>{
 assert.match(server,/app\.get\('\/api\/save\/core\/events',requireUser/);
 assert.match(server,/\.eq\('user_id',req\.user\.id\)/);
 assert.match(server,/select\('happened_at,module,event,summary'\)/);
 assert.doesNotMatch(server,/app\.post\('\/api\/save\/core\/events'/);
});
test('V119.1: captura permanece desligada ate que SQL de ativacao seja executado',()=>{
 assert.doesNotMatch(prepare,/CREATE TRIGGER stellar_capture_save_update_v119/);
 assert.match(activate,/CREATE TRIGGER stellar_capture_save_update_v119/);
});
