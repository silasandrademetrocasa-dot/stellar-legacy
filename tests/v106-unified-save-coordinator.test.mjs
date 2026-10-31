import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLatestSaveCoordinatorV106} from '../public/modules/unified-save-coordinator-v106.js';
const source=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const server=readFileSync(new URL('../server/index.js',import.meta.url),'utf8');
const pause=()=>new Promise(r=>setTimeout(r,0));

test('V106: uma gravacao em voo e novo estado nao perde alteracoes posteriores',async()=>{
 let state={gear:'laser-1'},dirty=true,sendCount=0,pendingResolve,live=0,peak=0;
 const writes=[];
 const queue=createLatestSaveCoordinatorV106({hasPending:()=>dirty,blocked:()=>false,send:async()=>{
   live++;peak=Math.max(peak,live);const snapshot=structuredClone(state);writes.push(snapshot.gear);sendCount++;
   if(sendCount===1)await new Promise(r=>pendingResolve=r);
   dirty=state.gear!==snapshot.gear;
   live--;return 'saved';
 }});
 const a=queue.flush(),b=queue.flush(true);
 await pause();assert.equal(sendCount,1);assert.equal(peak,1);
 state.gear='laser-9';dirty=true;pendingResolve();
 assert.equal(await a,true);assert.equal(await b,true);
 assert.deepEqual(writes,['laser-1','laser-9']);assert.equal(peak,1);
});

test('V106: recupera revisao NPC com retry limitado, sem enviar escritas paralelas',async()=>{
 let attempts=0,dirty=true;
 const queue=createLatestSaveCoordinatorV106({hasPending:()=>dirty,blocked:()=>false,maxAttempts:4,send:async()=>{
   attempts++;if(attempts<3)return 'retry';dirty=false;return 'saved';
 }});
 assert.equal(await queue.flush(),true);assert.equal(attempts,3);
});

test('V106: rejeicao nao libera uma compra/venda e permanece pendente',async()=>{
 let dirty=true,attempts=0;
 const queue=createLatestSaveCoordinatorV106({hasPending:()=>dirty,blocked:()=>false,send:async()=>{attempts++;return 'error';}});
 assert.equal(await queue.flush(true),false);assert.equal(dirty,true);assert.equal(attempts,1);
});

test('V106: offline farm impede gravacao normal',async()=>{
 let called=false;
 const queue=createLatestSaveCoordinatorV106({hasPending:()=>true,blocked:()=>true,send:async()=>{called=true;return 'saved';}});
 assert.equal(await queue.flush(true),false);assert.equal(called,false);
});

test('V106: 6 conflitos seguidos nao geram loop infinito nem ACK falso',async()=>{
 let n=0;
 const queue=createLatestSaveCoordinatorV106({hasPending:()=>true,blocked:()=>false,maxAttempts:6,send:async()=>{n++;return 'retry';}});
 assert.equal(await queue.flush(),false);assert.equal(n,6);
});

test('V106: acoes economicas esperam ACK, falham fechadas e nao burlam validacao',()=>{
 assert.match(source,/async function syncBeforeEconomy\(\)[\s\S]*?flushCloudSave\(true\)/);
 assert.match(source,/Progresso ainda nao confirmado pelo servidor/);
 assert.match(source,/economyMutationInFlightV106=true/);
 assert.match(source,/createLatestSaveCoordinatorV106\(/);
 assert.match(server,/app\.put\('\/api\/save'[\s\S]*?withPurchaseLock\(req\.user\.id/);
 assert.match(server,/validatePlayerSave\(state,serverSave/);
 assert.match(server,/SAVE_NPC_STALE/);
});

test('V106: mapas astrais desenham fenda 2D; materializador ainda preserva sprite',()=>{
 assert.match(source,/drawAstralRift\(ctx,\{mapId:progress\.mapId,[^\n]*mobile:DEVICE_CAPS\.mobile\}\)/);
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 assert.match(html,/gateMaterializerSprite/);
 assert.match(html,/v106-unified-save|v1061-ammo-ack|v1062-hangar-guard|v1064-ammo-accounting|v1068-mission-ack|v108-cumulative-boot-safe/);
});
