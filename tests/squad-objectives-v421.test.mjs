import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {attachSquadObjectivesV421} from '../server/squad-objectives-v421.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('sql/STELLAR_V42_1_SQUAD_OBJECTIVES.sql');

test('objetivo só contabiliza mortes confirmadas após entrada no grupo',()=>{
 assert.match(sql,/stellar_npc_reward_ledger/);
 assert.match(sql,/GREATEST\(v_week::timestamptz,m\.joined_at,s\.created_at\)/);
 assert.match(sql,/WHERE m\.squad_id=v_squad/);
 assert.match(sql,/NOT v_claimed AND v_total>=v_goal AND v_personal>=v_min/);
});
test('resgate único por semana sem mexer no saldo de moeda ou saves',()=>{
 assert.match(sql,/PRIMARY KEY\(user_id,week_start\)/);
 assert.match(sql,/ON CONFLICT\(user_id,week_start\) DO NOTHING/);
 assert.match(sql,/stellar_u42_research/);
 assert.doesNotMatch(sql,/UPDATE public\.game_saves|UPDATE public\.profiles|TRUNCATE|DROP TABLE/i);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/NOT public\.is_game_admin_v1763/);
});
test('APIs autenticadas validam parâmetros e não deixam cliente definir recompensa',async()=>{
 const routes={GET:{},POST:{}};
 const app={get:(p,...rest)=>routes.GET[p]=rest.at(-1),post:(p,...rest)=>routes.POST[p]=rest.at(-1)};
 attachSquadObjectivesV421(app,{requireUser:()=>{},asyncRoute:x=>x});
 assert.equal(Object.keys(routes.POST).length,2);
 const calls=[];
 const req={body:{goal:0,minimumPersonal:2,rewardResearch:60},sb:{rpc:async(name,args)=>{calls.push({name,args});return{data:{ok:true},error:null}}}};
 const res={code:200,status(c){this.code=c;return this},json(v){this.body=v;return this},set(){return this}};
 await routes.POST['/api/admin/frontier/v421/squad-objective'](req,res);
 assert.equal(res.code,400);assert.equal(calls.length,0);
 req.body={goal:100,minimumPersonal:10,rewardResearch:60};res.code=200;
 await routes.POST['/api/admin/frontier/v421/squad-objective'](req,res);
 assert.equal(res.code,200);assert.equal(calls[0].name,'stellar_u42_squad_config_v421');
 await routes.POST['/api/frontier/v421/squad-objective/claim'](req,res);
 assert.equal(calls[1].name,'stellar_u42_squad_claim_v421');
 assert.equal(calls[1].args,undefined);
});
