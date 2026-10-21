import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {attachFrontierUnifiedV42} from '../server/frontier-unified-v42.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('sql/STELLAR_V39_TO_V42_UNIFIED.sql');

test('migração contém operações transacionais e não recria nem limpa saves',()=>{
 for(const required of ['BEGIN;','COMMIT;','CREATE TABLE IF NOT EXISTS public.stellar_u42_catalog',
 'CREATE UNIQUE INDEX IF NOT EXISTS stellar_u42_one_pending_expedition',
 'FOR UPDATE',"p_action='forge'","p_action='expedition_start'","p_action='expedition_claim'","p_action='donate'",
 'stellar_u42_squad','stellar_u42_dashboard','is_game_admin_v1763'])assert.ok(sql.includes(required),required);
 for(const risky of [/\bDROP\s+(?:TABLE|SCHEMA)\b/i,/\bTRUNCATE\s+\b/i,/\bDELETE\s+FROM\s+public\.game_saves/i])assert.doesNotMatch(sql,risky);
 assert.match(sql,/PRIMARY KEY\(user_id,request_id\)/);
 assert.match(sql,/stellar_u42_material_spends/);
 assert.match(sql,/stellar_astral_ledger_v381/);
});

test('todas as nove tabelas têm RLS e usuários não recebem grants diretos',()=>{
 assert.match(sql,/FOREACH t IN ARRAY ARRAY\[/);
 assert.match(sql,/EXECUTE format\('ALTER TABLE public\.%I ENABLE ROW LEVEL SECURITY'/);
 assert.match(sql,/REVOKE ALL ON TABLE public\.%I FROM PUBLIC,anon,authenticated/);
});

test('rotas autenticadas e ID de operação obrigatório',async()=>{
 const routes={GET:{},POST:{}};
 const app={get:(path,m,...rest)=>routes.GET[path]=rest.at(-1),post:(path,m,...rest)=>routes.POST[path]=rest.at(-1)};
 attachFrontierUnifiedV42(app,{requireUser:()=>{},asyncRoute:fn=>fn});
 assert.deepEqual(Object.keys(routes.GET),['/api/frontier/v42']);
 assert.equal(Object.keys(routes.POST).length,3);
 const calls=[];
 const sb={rpc:async(n,args)=>{calls.push({n,args});return{data:{ok:true},error:null}}};
 const makeRes=()=>({code:200,status(n){this.code=n;return this},json(x){this.body=x;return this},set(){return this}});
 let res=makeRes();await routes.POST['/api/frontier/v42/action']({body:{action:'forge',code:'astral_guard',amount:1,idempotencyKey:'invalid'},sb},res);
 assert.equal(res.code,400);assert.equal(calls.length,0);
 res=makeRes();await routes.POST['/api/frontier/v42/action']({body:{action:'forge',code:'astral_guard',amount:1,idempotencyKey:'5d55f2df-2f0e-480e-8a41-e4d439e8a1d8'},sb},res);
 assert.equal(res.code,200);assert.equal(calls[0].n,'stellar_u42_action');assert.equal(calls[0].args.p_quantity,1);
});

test('o navegador não define moedas ou prêmios econômicos',()=>{
 const api=read('public/modules/unified-expansion-v42.js');
 assert.match(api,/crypto\.randomUUID\(\)/);
 assert.match(api,/loadUnifiedExpansionV42/);
 assert.match(api,/não alteram o dano ou escudo/);
 assert.doesNotMatch(api,/SUPABASE_SERVICE_ROLE_KEY/);
});
