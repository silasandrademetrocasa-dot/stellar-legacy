import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {attachAstralRewardsV381} from '../server/astral-rewards-v381.js';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('V38.1 contém três portais, materiais exclusivos e semanais',()=>{
 const sql=read('sql/V38_1_0_ASTRAL_REWARDS.sql');
 for(const name of ['Aurorium','Nexium','Eclipsium'])assert.match(sql,new RegExp(name));
 for(const key of ['alpha','beta','gamma'])assert.match(sql,new RegExp(`'${key}'`));
 for(const name of ['stellar_astral_config_v381','stellar_astral_ledger_v381','stellar_astral_cursor_v381','stellar_astral_quote_lock_v381'])assert.ok(sql.includes(name));
 assert.match(sql,/PRIMARY KEY\(user_id,gate,completion_number\)/);
 assert.match(sql,/FOR UPDATE/);
 assert.match(sql,/IYYY-IW/);
 assert.match(sql,/is_game_admin_v1763/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.stellar_claim_astral_v381\(uuid,text\) FROM PUBLIC,anon,authenticated/);
});

test('rotas de resgate usam identidade autenticada e service role apenas no servidor',async()=>{
 const routes=[];
 const app={get:(p,...h)=>routes.push({p,h}),post:(p,...h)=>routes.push({p,h})};
 const auth=()=>{};
 attachAstralRewardsV381(app,{requireUser:auth,asyncRoute:f=>f,requireEliteAdmin:async()=>({rpc:async()=>({data:{claimed:false}})})});
 for(const p of ['/api/astral-rewards','/api/astral-rewards/lock','/api/astral-rewards/claim','/api/admin/astral-rewards']){
  const route=routes.find(r=>r.p===p);assert.ok(route,`faltando ${p}`);assert.equal(route.h[0],auth);
 }
 const claim=routes.find(r=>r.p==='/api/astral-rewards/claim').h.at(-1);
 let responseStatus=200;const res={status:n=>(responseStatus=n,res),json:x=>x,set:()=>res};
 const invalid=await claim({body:{gate:'not-a-gate'},user:{id:'player'}},res);
 assert.equal(responseStatus,400);assert.equal(invalid.error,'Portal inexistente.');
});

test('atualização incremental é idempotente e preserva o game.js',()=>{
 const patch=read('scripts/v381-apply-patch.mjs');
 const pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.version,'38.1.0');
 assert.equal(pkg.scripts.start,'node server/index.js');
 assert.match(patch,/if\(!c\.includes\('attachAstralRewardsV381\(app,'\)\)/);
 assert.match(patch,/if\(c\.includes\('export async function loadAstralRewardsV381\('/);
 assert.match(patch,/c\.replaceAll\('\?v=38\.0\.0'/);
 assert.match(patch,/V38\.1: âncora ausente/);
 assert.ok(existsSync(new URL('../public/modules/astral-rewards-v381.js',import.meta.url)));
});
