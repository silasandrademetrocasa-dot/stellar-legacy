import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {attachStageAV423} from '../server/stage-a-v423.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('sql/STELLAR_V42_3_ETAPA1.sql');
test('saves preservados, RLS e contratos economicamente seguros',()=>{
 assert.match(sql,/stellar_u42_inventory/);assert.match(sql,/stellar_npc_reward_ledger/);
 assert.match(sql,/FOR UPDATE/);assert.match(sql,/PRIMARY KEY \(user_id,week_start,tier\)/);
 assert.match(sql,/ON CONFLICT\(user_id,week_start,tier\) DO NOTHING/);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.doesNotMatch(sql,/\bDROP\s+(?:TABLE|SCHEMA)\b|\bTRUNCATE\b|UPDATE public\.game_saves/i);
 assert.match(sql,/combat_enabled boolean NOT NULL DEFAULT false/);
});
test('rota usa JWT e nao recebe valores de saldo ou bonus',async()=>{
 const routes={GET:{},POST:{}};const app={get:(p,...a)=>routes.GET[p]=a.at(-1),post:(p,...a)=>routes.POST[p]=a.at(-1)};
 attachStageAV423(app,{requireUser:()=>{},asyncRoute:fn=>fn});
 assert.equal(Object.keys(routes.GET).length,2);assert.equal(Object.keys(routes.POST).length,3);
 const calls=[],sb={rpc:async(name,args)=>{calls.push({name,args});return{data:{ok:true},error:null}}};
 const response=()=>({code:200,status(n){this.code=n;return this},json(v){this.body=v;return this},set(){return this}});
 let res=response();await routes.POST['/api/frontier/v423/loadouts']({sb,body:{config:9,slot:'engine',item:'nexus_drive'}},res);
 assert.equal(res.code,400);assert.equal(calls.length,0);
 res=response();await routes.POST['/api/frontier/v423/loadouts']({sb,body:{config:1,slot:'engine',item:'nexus_drive',hackedDamage:999999}},res);
 assert.equal(res.code,200);assert.deepEqual(calls[0].args,{p_config:1,p_slot:'engine',p_item:'nexus_drive'});
 await routes.POST['/api/frontier/v423/operations/claim']({sb,body:{tier:2,amount:999}},response());
 assert.equal(calls[1].name,'stellar_u423_operation_claim');assert.deepEqual(calls[1].args,{p_tier:2});
});
