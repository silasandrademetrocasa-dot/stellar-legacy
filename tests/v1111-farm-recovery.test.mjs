import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
test('V111.1: claim sempre passa pela recuperação transacional SQL',()=>{
 const s=read('server/offline-farm-v484.js');
 assert.match(s,/stellar_offline_farm_claim_v1111/);
 assert.match(s,/stellar_offline_farm_start_v1111/);
 assert.match(s,/onlyTimestampChanges/);
 assert.match(s,/if\(!onlyTimestampChanges\)/);
 assert.match(s,/FARM_REVIEW_REQUIRED/);
});
test('V111.1: cliente nao cancela sessao quando conflito é apenas timestamp',()=>{
 const c=read('public/modules/stellar-offline-farm-v484.js');
 assert.match(c,/issues\.every\(i=>i==='save_changed'\|\|i==='profile_changed'\)/);
 assert.match(c,/request\('settle'/);
 assert.match(c,/x\.recovered/);
 assert.match(c,/CANCELAR SEM GANHOS/);
});
test('V111.1: migracao impede duplicacao de créditos e bloqueia atividade online',()=>{
 const s=read('sql/STELLAR_V111_1_FARM_RESCUE_CORRECAO.sql');
 for(const x of ['pg_advisory_xact_lock','stellar_npc_reward_ledger','stellar_ore_reward_ledger','stellar_offline_farm_fingerprint_v1111',"f.status <> 'running'",'FARM_REVIEW_REQUIRED_UNVERIFIED_CHANGE','stellar_offline_farm_claim_v49','legacy_midnight_sync_v1111','recovery_v1111'])
   assert.ok(s.includes(x),x);
 assert.match(s,/REVOKE ALL ON FUNCTION public\.stellar_offline_farm_claim_v1111/);
});
