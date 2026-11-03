import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shouldSendPeriodicCloudSaveV1172,COMBAT_CLOUD_SAVE_MAX_AGE_V1172} from '../public/modules/cloud-save-cadence-v1172.js';
import {createLatestSaveCoordinatorV106} from '../public/modules/unified-save-coordinator-v106.js';
import {reconcilePendingEquipmentV109} from '../public/modules/hangar-save-recovery-v109.js';
import {chooseAutopilotAction,cleanAutopilotConfig} from '../public/modules/stellar-autopilot-v48.js';
const source=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');

test('V117.2: fora de combate, saves periódicos seguem a cadência anterior',()=>{
 assert.equal(shouldSendPeriodicCloudSaveV1172({now:100000,lastNpcRewardAt:0,lastAttemptAt:90000}),true);
 assert.equal(shouldSendPeriodicCloudSaveV1172({now:100000,lastNpcRewardAt:85000,lastAttemptAt:92000}),true);
});
test('V117.2: recompensa NPC densa reduz PUTs durante sequência contínua',()=>{
 const at=100000;
 assert.equal(shouldSendPeriodicCloudSaveV1172({now:at,lastNpcRewardAt:at-900,lastAttemptAt:at-7000}),false);
 assert.equal(shouldSendPeriodicCloudSaveV1172({now:at,lastNpcRewardAt:at-2500,lastAttemptAt:at-12000}),false);
 assert.equal(shouldSendPeriodicCloudSaveV1172({now:at,lastNpcRewardAt:at-2600,lastAttemptAt:at-19000}),true);
});
test('V117.2: combate sem silêncio recebe checkpoint na nuvem em até 45s',()=>{
 const now=100000;
 assert.equal(shouldSendPeriodicCloudSaveV1172({now,lastNpcRewardAt:now-300,lastAttemptAt:now-COMBAT_CLOUD_SAVE_MAX_AGE_V1172+1}),false);
 assert.equal(shouldSendPeriodicCloudSaveV1172({now,lastNpcRewardAt:now-300,lastAttemptAt:now-COMBAT_CLOUD_SAVE_MAX_AGE_V1172}),true);
});
test('V117.2: hangar, missão e escolha de munição nunca esperam cooldown do combate',()=>{
 const args={now:100000,lastNpcRewardAt:99900,lastAttemptAt:99500};
 assert.equal(shouldSendPeriodicCloudSaveV1172({...args,criticalPending:true}),true);
});
test('V117.2: alteração durante escrita mantém a próxima fotografia pendente',async()=>{
 let pending=true,attempts=0;const snapshots=[];
 const save=createLatestSaveCoordinatorV106({hasPending:()=>pending,blocked:()=>false,maxAttempts:3,send:async()=>{
   attempts++;snapshots.push(attempts);pending=attempts===1;return 'saved';
 }});
 assert.equal(await save.flush(true),true);assert.equal(attempts,2);assert.deepEqual(snapshots,[1,2]);
});
test('V117.2: concorrência NPC não libera bypass de revisão, nem mexe no Farm Offline',()=>{
 const server=source('server/index.js'),game=source('public/game.js');
 assert.match(server,/incomingNpcRevision<authoritativeNpcRevision/);
 assert.match(server,/incomingOreRevision<authoritativeOreRevision/);
 assert.match(server,/incomingPurchaseRevision<authoritativePurchaseRevision/);
 assert.match(server,/SAVE_RESERVED_REVISION/);
 assert.match(game,/saveGame\(\);\s*const now=Date\.now\(\);\s*const criticalPending/);
 assert.match(game,/shouldSendPeriodicCloudSaveV1172\(/);
 assert.match(game,/offlineFarmWorldLockedV84\(\)/);
});
test('V117.2: módulo só decide quando salvar, sem alterar saldo/inventário local',()=>{
 const f=source('public/modules/cloud-save-cadence-v1172.js');
 for(const fragment of ['fetch(','localStorage','serverPurchaseRevision=','profile.credits=','game_saves'])assert.equal(f.includes(fragment),false,fragment);
});
test('V117.2: reconciliação NÃO inventa equipamento quando inventário remoto diverge',()=>{
 const fixture={activeShipId:'ship',ownedShips:['ship'],inventory:{lf4:1},shipLoadout:{lasers:[],generators:[],extras:[]},drones:[],pet:{owned:false,lasers:[],shields:[]}};
 const remote=structuredClone(fixture);remote.inventory.lf4=2;
 const desired=structuredClone(fixture);desired.shipLoadout.lasers=['lf4'];desired.inventory.lf4=0;
 const result=reconcilePendingEquipmentV109(remote,desired,fixture);
 assert.equal(result.ok,false);
});
test('V117.2: Autopilot ainda pode voltar de X-3 à base, comprar e continuar rota',()=>{
 const config=cleanAutopilotConfig({map:'x3',autoBuy:true,autoSell:true,minutes:480});
 const src={online:true,ready:true,map:'x3',player:{x:200,y:200,hp:80000,maxHp:80000},
   base:{x:6580,y:3888},cargoUsed:0,cargoCapacity:1000,sellableCargoValue:0,
   remoteTraderEquipped:false,remoteBuyEquipped:false,buyPermitted:false,
   ammoStock:0,rocketStock:0,credits:1e8,laserRange:900,laserCount:14,purchaseBudgetRemaining:10000000,
   ammoQuote:{catalog_key:'ammo:mcb25',price:600000,currency:'credits',shop_visible:true},
   bonusBoxes:[],loot:[],ores:[],enemies:[]};
 assert.equal(chooseAutopilotAction(src,config).type,'route');
 assert.equal(chooseAutopilotAction({...src,map:'x1',atBase:true,canSell:true,buyPermitted:true},config).type,'trade');
});
