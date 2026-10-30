import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {laserAmmoShotBudgetV1064,laserAmmoSourcesV1064,ammoReadoutV1064} from '../public/modules/combat-ammo-accounting-v1064.js';
import {combatProfileV487,npcCombatCycleV487} from '../server/offline-farm-v487-engine.js';
import {ITEMS} from '../public/data.js';
const source=fs.readFileSync(new URL('../public/game.js',import.meta.url),'utf8');

const state=(auxMode='guard')=>({
 shipLoadout:{lasers:Array(14).fill('lf2')},
 drones:[{slots:Array(4).fill('lf3')},{slots:Array(4).fill('lf2')}],
 pet:{owned:true,lasers:Array(4).fill('lf2'),activeGear:auxMode,gearsOwned:{guard:true}}
});

test('V106.4: nave + drones debitam por 22 lasers equipados; AUX tem cadência independente',()=>{
 const c=laserAmmoSourcesV1064(state(),ITEMS);
 assert.deepEqual(c,{ship:14,drones:8,shipAndDrones:22,aux:4,auxSentinel:true});
 assert.deepEqual(laserAmmoShotBudgetV1064(c.shipAndDrones,200),{equipped:22,spent:22,remaining:178});
 assert.deepEqual(laserAmmoShotBudgetV1064(c.aux,178),{equipped:4,spent:4,remaining:174});
});

test('V106.4: estoque insuficiente não cobra acima do estoque nem habilita disparo gratuito',()=>{
 assert.deepEqual(laserAmmoShotBudgetV1064(22,5),{equipped:22,spent:5,remaining:0});
 assert.equal(laserAmmoShotBudgetV1064(4,0).spent,0);
 assert.equal(laserAmmoShotBudgetV1064(5,-100).spent,0);
 assert.equal(laserAmmoShotBudgetV1064(4,Infinity).spent,0);
});

test('V106.4: AUX inativo no módulo Salvager continua equipado, mas não pode atirar',()=>{
 const c=laserAmmoSourcesV1064(state('box'),ITEMS);
 assert.equal(c.aux,4);assert.equal(c.auxSentinel,false);
 assert.match(source,/if\(mode==='guard'&&combatTask&&sentinelAttackerEligible\(combatTask,nowSec\(\)\)\)petFireAt\(combatTask\)/);
 const s=laserAmmoSourcesV1064({shipLoadout:{lasers:['lf2']},drones:[],pet:{owned:false,lasers:['lf2'],activeGear:'guard',gearsOwned:{guard:true}}},ITEMS);
 assert.equal(s.aux,0);assert.equal(s.auxSentinel,false);
});

test('V106.4: UI separa consumo do AUX da rajada principal e não infla previsão',()=>{
 let t=ammoReadoutV1064({name:'PLS-2',mult:2,stock:220,shipAndDrones:22,aux:4,auxSentinel:true});
 assert.match(t,/Nave \+ drones: -22 por rajada/);
 assert.match(t,/AUX Sentinela: -4 por disparo próprio/);
 assert.match(t,/~10 \(sem ataques AUX\)/);
 t=ammoReadoutV1064({name:'PLS-2',stock:120,shipAndDrones:22,aux:4,auxSentinel:false});
 assert.match(t,/inativo/);
});

test('V106.4: PVE da nave e do AUX chama mesma fórmula de débito e usa contador',()=>{
 assert.match(source,/const firingCount=laserAmmoShotBudgetV1064\(totalLasers,stock\)\.spent/);
 assert.match(source,/const firing=laserAmmoShotBudgetV1064\(lasers.length,stock\)\.spent/);
 assert.match(source,/progress\.ammo\[ammo\.id\]=Math\.max\(0,stock-firing\);\s*battlePassEvent\('ammoUse',firing\);noteAmmoConsumedV1064\(\);/);
 assert.match(source,/progress\.ammo\[ammo\.id\]=Math\.max\(0,stock-firingCount\);noteAmmoConsumedV1064\(\)/);
 assert.match(source,/if\(ammoPersistencePendingV1064\)saveGame\(\)/);
 assert.match(source,/\},2000\);/);
});

test('V106.4: PvP desconta apenas após ACK e não possui benefício ADM nas armas',()=>{
 assert.match(source,/queuePvpShot\(target,[\s\S]*?\.then\(row=>\{\s*if\(!row\)return;\s*progress\.ammo\[shotAmmo\.id\]/);
 assert.match(source,/queuePvpShot\(task,[\s\S]*?\.then\(row=>\{\s*if\(!row\)return;\s*progress\.ammo\[shotAmmo\.id\]/);
 assert.equal(source.slice(source.indexOf('function petFireAt('),source.indexOf('function updatePet(')).includes('isAdmin'),false);
});

test('V106.4: Farm Offline V487 é explicitamente nave+drones, não cobra tiros defensivos inexistentes',()=>{
 const s=state();s.activeShipId='vengeance';s.mapId='x3';s.pilotBio={skills:{}};s.shipLoadout.lasers=Array(9).fill('lf2');s.drones=[{slots:['lf3','lf3']}];s.pet.lasers=['lf4','lf4','lf4'];
 const profile=combatProfileV487(s,'mcb25');
 assert.equal(profile.laser_count,11);
 assert.equal(npcCombatCycleV487({...profile,npc:{hp:20000,shield:30000}}).ammoPerKill%11,0);
});
