import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const sql=fs.readFileSync('sql/STELLAR_V22_8_0_NPC_REWARD_LEDGER.sql','utf8');
const server=fs.readFileSync('server/index.js','utf8');
const world=fs.readFileSync('server/world.js','utf8');
const client=fs.readFileSync('public/game.js','utf8');
const guard=fs.readFileSync('server/security-guard.js','utf8');
const uid='11111111-1111-4111-8111-111111111111';
const {validatePlayerSave}=await import('../server/security-guard.js');
const state={accountOwnerId:uid,serverNpcRewardRevision:2,profile:{credits:100,uridium:50}};
test('ledger define chave unica por usuario e abate; somente servidor insere',()=>{
 assert.match(sql,/PRIMARY KEY\(user_id,kill_key\)/);
 assert.match(sql,/REVOKE ALL ON public\.stellar_npc_reward_ledger FROM PUBLIC,anon,authenticated/);
 assert.match(sql,/GRANT SELECT,INSERT ON public\.stellar_npc_reward_ledger TO service_role/);
});
test('funcao de pagamento requer chave de servidor e bloqueia chamada do navegador',()=>{
 assert.match(sql,/stellar_grant_npc_reward_v228/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.stellar_grant_npc_reward_v228.*authenticated/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.stellar_grant_npc_reward_v228.*service_role/);
 assert.match(sql,/SELECT state INTO v_state.*FOR UPDATE/);
 assert.match(sql,/IF FOUND THEN RETURN jsonb_build_object\('granted',false/);
});
test('servidor paga por abate de NPC confirmado e so entao envia kill_credit',()=>{
 assert.match(server,/grantNpcReward:async\(userId,killKey,npcType,baseCredits,baseStl\)/);
 assert.match(server,/sb\.rpc\('stellar_grant_npc_reward_v228'/);
 assert.match(world,/await this\.world\.grantNpcReward\(/);
 assert.match(world,/safeJsonSend\(c,\{type:'kill_credit',entity:dead,factor,serverReward/);
 assert.match(world,/npc_reward_error/);
});
test('navegador nao pode inventar o valor de CR e STL no kill_credit',()=>{
 assert.match(client,/progress\.profile\.credits\+=earnedCredits/);
 assert.match(client,/reward\.granted===true\?Math\.max\(0,Math\.round\(Number\(reward\.credits\)/);
 assert.match(client,/progress\.serverNpcRewardRevision=Number\(reward\.revision\)/);
 assert.match(client,/if\(Number\(reward\.revision\)<=creditedRevision\)return/);
 assert.doesNotMatch(client,/earnedCredits=Math\.round\(clone\.credits\*creditMult\)/);
});
test('save com revisao NPC falsificada ou atrasada e recusado, sem autoban por atraso',()=>{
 assert.match(server,/SAVE_NPC_STALE/);
 assert.match(server,/SAVE_NPC_REVISION_FORGED/);
 assert.match(client,/e\?\.code==='SAVE_NPC_STALE'/);
 assert.match(sql,/IF new_rev<old_rev THEN RAISE EXCEPTION 'SAVE_NPC_STALE'/);
 const newer={...state,serverNpcRewardRevision:3};
 assert.equal(validatePlayerSave(newer,state,{userId:uid})?.code,'SAVE_NPC_REVISION_FORGED');
 assert.equal(validatePlayerSave(state,state,{userId:uid}),null);
});
test('SQL nao reseta contas, nao faz grants para cliente e respeita beneficios de piloto',()=>{
 assert.doesNotMatch(sql,/TRUNCATE|DELETE\s+FROM\s+public\.game_saves/i);
 assert.match(sql,/v_bon_cr/);
 assert.match(sql,/v_bon_stl/);
 assert.match(sql,/INSERT INTO public\.stellar_npc_reward_ledger/);
 assert.match(sql,/UPDATE public\.game_saves SET state=/);
});
test('dano de NPC exige id de disparo nao repetido e e limitado pelo servidor',async()=>{
 const {admitNpcDamage}=await import('../server/combat-throttle.js');
 assert.equal(admitNpcDamage({}, {damage:100,hitId:''},1000).reason,'hit_id_invalid');
 const ws={};
 assert.equal(admitNpcDamage(ws,{damage:200,hitId:'hit_123456789'},1000).allowed,true);
 assert.equal(admitNpcDamage(ws,{damage:200,hitId:'hit_123456789'},2000).reason,'replay');
 assert.match(world,/ws\.identity\?\.isAdmin===true\?5000000:2000000/);
});
