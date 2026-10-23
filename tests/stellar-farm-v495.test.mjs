import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
import {forecastV495} from '../server/farm-v495-forecast.js';

const npc={credits:100,stl:15,xp:200},cycle={ammoPerKill:8,killSeconds:10};
test('V49.5: sem munição e sem créditos não promete farm',()=>{
 const p=forecastV495({npc,cycle,stock:0,credits:0,minutes:60,autoBuy:true,pack:{currency:'credits',qty:100,price:500}});
 assert.equal(p.kills,0);assert.equal(p.creditsNet,0);
});
test('V49.5: limita a sessão por duração e teto ADM',()=>{
 const p=forecastV495({npc,cycle,stock:9999,minutes:30,maxKills:17});
 assert.equal(p.kills,17);assert.equal(p.xp,17*200);assert.equal(p.stl,17*15);
});
test('V49.5: não compra munição premium automaticamente',()=>{
 const p=forecastV495({npc,cycle,stock:8,credits:100000,pack:{currency:'stl',qty:5000,price:20},minutes:60});
 assert.equal(p.kills,1);assert.equal(p.ammoBought,0);
});
test('V49.5: compras em créditos limitadas ao orçamento e descontadas do lucro',()=>{
 const p=forecastV495({npc:{credits:35,xp:200,stl:15},cycle:{killSeconds:12,ammoPerKill:10},minutes:30,maxKills:20,stock:10,credits:0,autoBuy:true,pack:{currency:'credits',qty:10,price:500}});
 assert.equal(p.kills,1);assert.equal(p.creditsNet,35);assert.equal(p.ammoBought,0);
 const q=forecastV495({npc,cycle,stock:0,credits:300,autoBuy:true,pack:{currency:'credits',qty:40,price:200},minutes:30,maxKills:8});
 assert.equal(q.kills,8);assert.equal(q.ammoSpent,400);assert.equal(q.creditsNet,400);
});
test('V49.5: pontuação nunca injeta créditos em saves',()=>{
 const f=readFileSync(resolve('server/farm-v495-forecast.js'),'utf8');
 assert(!/\.update\(|saveCloudSave\(|\.rpc\(/.test(f));
 const server=readFileSync(resolve('server/offline-farm-v484.js'),'utf8');
 const ui=readFileSync(resolve('public/modules/stellar-offline-v49-ui.js'),'utf8');
 assert(server.includes('rankFarmNpcV49(npcs,profile,key,pack,budget)'));
 assert(server.includes('minutes:args.p_minutes'));
 assert(ui.includes('get(\'v484-minutes\')'));
 assert(!ui.includes('48.726.900'));
});
test('V49.5: cockpit mostra PLS, preserva referências MCB no backend',()=>{
 const ui=readFileSync(resolve('public/modules/stellar-offline-farm-v484.js'),'utf8');
 assert(ui.includes('LASER_AMMO'));
 assert(ui.includes('ammoName(a.id)'));
 assert(ui.includes('ammoName(x.ammo)'));
});
test('V49.5: patch pós-resgate não faz reload/logout e é idempotente',async()=>{
 const temp=mkdtempSync(join(tmpdir(),'stellar-v495-'));
 try{
  mkdirSync(join(temp,'public'));writeFileSync(join(temp,'public/game.js'),'const testFarm={onFinish:async()=>{location.reload();}};\n');
  const script=resolve('scripts/v495-farm-login-recovery-patch.mjs');
  const a=spawnSync(process.execPath,[script],{cwd:temp,encoding:'utf8'});
  assert.equal(a.status,0,a.stderr);
  const updated=readFileSync(join(temp,'public/game.js'),'utf8');
  assert(!updated.includes('location.reload()'));
  const b=spawnSync(process.execPath,[script],{cwd:temp,encoding:'utf8'});
  assert.equal(b.status,0,b.stderr);
  assert.equal(readFileSync(join(temp,'public/game.js'),'utf8'),updated);
  const local=new Map(); let afterAuthCalls=0;let authenticated=true;
  const sandbox={getUser:()=>({id:'pilot-123'}),authenticated,cloudDirty:true,
   loadCloudSave:async()=>({state:{profile:{credits:2400},clientSavedAt:99999999999}}),
   saveKey:()=> 'stellar-save',localStorage:{setItem:(k,v)=>local.set(k,v)},
   afterAuth:async()=>{afterAuthCalls++;},showToast:()=>{},console};
  vm.runInNewContext(updated+';globalThis.runClaim=testFarm.onFinish',sandbox);
  await sandbox.runClaim();
  assert.equal(afterAuthCalls,1);
  assert.equal(sandbox.cloudDirty,false);
  assert.equal(JSON.parse(local.get('stellar-save')).profile.credits,2400);
  assert.equal(JSON.parse(local.get('stellar-save')).clientSavedAt,0);
  assert.equal(sandbox.authenticated,true);
 }finally{rmSync(temp,{recursive:true,force:true});}
});
test('V49.5: estratégia automática não duplica a cada refresh e não desliga check ADM',()=>{
 const ui=readFileSync(resolve('public/modules/stellar-offline-v49-ui.js'),'utf8');
 const main=readFileSync(resolve('public/modules/stellar-offline-farm-v484.js'),'utf8');
 assert(ui.includes('if([...npc.options].some(o=>o.value===id))continue'));
 assert(main.includes("btn.dataset.v49PermissionBlocked==='true'"));
 assert(main.includes('STELLAR_OFFLINE_FARM_MENU_RESCUE_V4851'));
});
