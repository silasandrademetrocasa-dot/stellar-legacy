import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {savePromotionReadinessV1195} from '../server/save-promotion-gate-v1195.js';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('V120.0: readiness endpoint is restricted to admin and read-only',()=>{
 const server=read('server/index.js');
 const part=server.split("app.get('/api/admin/save/v120/readiness'")[1].split('// V119.1: read-only consolidated audit view.')[0];
 assert.match(part,/requireUser/);
 assert.match(part,/is_game_admin_v1763/);
 assert.match(part,/stellar_save_release_readiness_v120/);
 assert.match(part,/safeToPromote:promotion\.ready===true&&data\?\.db_preflight_passed===true&&data\?\.cutover_certified===true/);
 assert.doesNotMatch(part,/\.upsert\(|\.insert\(|\.update\(|\.delete\(/);
});
test('V120.0: readiness SQL never updates money, gear, mission, farm or player save',()=>{
 const sql=read('sql/STELLAR_V120_0_READINESS_RPC_PREPARAR.sql');
 assert.match(sql,/SECURITY INVOKER/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.stellar_save_release_readiness_v120\(\) FROM PUBLIC,anon,authenticated/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.stellar_save_release_readiness_v120\(\) TO service_role/);
 assert.match(sql,/cutover_certified',false/);
 assert.doesNotMatch(sql,/UPDATE public\.game_saves|DELETE FROM public\.game_saves|DROP TABLE/i);
});
test('V120.0: source-controlled promotion remains blocked before real legacy migration',()=>{
 const status=savePromotionReadinessV1195({requestedMode:'enforce'});
 assert.equal(status.ready,false);assert.equal(status.effectiveMode,'observe');
});
test('V120.0: all chronological artifacts are included',()=>{
 for(const name of ['server/save-core-v119.js','server/save-farm-safety-v1193.js',
    'server/save-auction-coalesce-v1194.js','server/save-promotion-gate-v1195.js',
    'sql/STELLAR_V120_0_READINESS_RPC_PREPARAR.sql','docs/v119/V1195_GATE_DE_ENFORCE.md'])
  assert.ok(read(name).length>100,name);
});
