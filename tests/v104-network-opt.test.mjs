import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {playerStateDelta,npcStateDelta} from '../server/network-delta-v104.js';
import {createReadCoalescerV104} from '../public/modules/read-coalescer-v104.js';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('V104: jogadores enviam apenas campos alterados, preservando false/null',()=>{
 const original={userId:'u1',x:200,y:300,hp:900,shield:800,laserFiring:true,targetId:'npc1',pet:{owned:true,x:100,activeGear:'a'},updatedAt:100};
 assert.equal(playerStateDelta(original,{...original,updatedAt:200}),null,'timestamp nao deve disparar patch sozinho');
 const now={...original,x:205,hp:850,laserFiring:false,targetId:null,updatedAt:250};
 assert.deepEqual(playerStateDelta(original,now),{userId:'u1',x:205,hp:850,laserFiring:false,targetId:null,updatedAt:250});
 assert.deepEqual(playerStateDelta(original,{...original,pet:{...original.pet,x:110},updatedAt:300}),{userId:'u1',pet:{owned:true,x:110,activeGear:'a'},updatedAt:300});
 assert.deepEqual(playerStateDelta(null,original),original);
});

test('V104: NPCs distantes acumulam microdeslocamentos sem perder HP/fase',()=>{
 const frame={id:'n1',x:100,y:200,hp:500,shield:900,angle:0,bossPhase:0};
 const small=npcStateDelta(frame,{...frame,x:105,y:204,angle:.03},22);
 assert.equal(small.patch,null);
 assert.deepEqual(small.cur,frame,'baseline nao avanca quando pacote foi descartado');
 const big=npcStateDelta(small.cur,{...frame,x:123,y:204,angle:.20},22);
 assert.deepEqual(big.patch,{id:'n1',x:123,angle:.2});
 const hit=npcStateDelta(frame,{...frame,hp:420,shield:700,bossPhase:1},22);
 assert.deepEqual(hit.patch,{id:'n1',hp:420,shield:700,bossPhase:1});
 assert.deepEqual(npcStateDelta(null,frame,22).patch,frame);
});

test('V104: requisicoes de leitura coalescem, mas erros nao ficam em cache',async()=>{
 const once=createReadCoalescerV104();let calls=0;
 const work=async()=>{calls++;await Promise.resolve();return {ok:true}};
 const [a,b]=await Promise.all([once('runtime:user',work),once('runtime:user',work)]);
 assert.strictEqual(a,b);assert.equal(calls,1);
 await once('runtime:user',work);assert.equal(calls,2,'apos conclusao refaz a consulta');
 const denied=async()=>{calls++;throw Error('rede');};
 await assert.rejects(once('runtime:denied',denied));
 await assert.rejects(once('runtime:denied',denied));
 assert.equal(calls,4,'falha nao deve contaminar segunda tentativa');
});

test('V104: sessao, economia, ACL e combate continuam fora do single-flight indiscriminado',()=>{
 const server=file('server/index.js'),api=file('public/api.js'),world=file('server/world.js'),game=file('public/game.js');
 assert.match(server,/return force\?readRuntimeV104\(\):runtimeReadOnceV104\('npc'/);
 assert.match(server,/req\.sb\.rpc\('is_game_admin_v1763'/);
 assert.match(api,/const safeRpcRead=.*POST/);
 assert.doesNotMatch(api,/safeRpcRead=.*get_my_account_access_v1763/);
 assert.match(world,/npc_attack/);assert.match(world,/npcStateDelta/);
 assert.match(world,/networkV104/);assert.match(game,/pvpInboxWasInSectorV104/);
 assert.match(game,/const CHAT_POLL_MS=3000/);
 assert.match(file('public/modules/stellar-autopilot-v48.js'),/pendingRoutineNotice/);
});
