import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AUX_PROTOCOL_IDS,auxProtocolSlotsUsed,normalizeAuxProtocols,changeAuxProtocolRank,auxProtocolStats} from '../public/modules/aux-protocols.js';
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const server=readFileSync(new URL('../server/security-guard.js',import.meta.url),'utf8');
test('cinco protocolos, cada um limitado a 3 níveis e espaços de nível',()=>{
 assert.deepEqual(AUX_PROTOCOL_IDS,['guard','ore','box','repair','kami']);
 assert.deepEqual(normalizeAuxProtocols({guard:40,ore:3,box:3,repair:3,kami:3},3),{guard:3,ore:0,box:0,repair:0,kami:0});
 assert.equal(auxProtocolSlotsUsed(normalizeAuxProtocols({guard:3,ore:3,box:3,repair:3,kami:3},12)),12);
 assert.deepEqual(normalizeAuxProtocols({guard:-10,ore:'evil',box:Infinity,kami:1},12),{guard:0,ore:0,box:0,repair:0,kami:1});
});
test('alocação não extrapola orçamento e respeita reatribuição',()=>{
 let p=normalizeAuxProtocols({},3);
 for(let i=0;i<8;i++)p=changeAuxProtocolRank(p,'guard',1,3);
 assert.equal(p.guard,3);assert.equal(auxProtocolSlotsUsed(p),3);
 p=changeAuxProtocolRank(p,'ore',1,3);assert.equal(p.ore,0);
 p=changeAuxProtocolRank(p,'guard',-1,3);
 p=changeAuxProtocolRank(p,'ore',1,3);
 assert.equal(p.guard,2);assert.equal(p.ore,1);
});
test('dano, cura e mobilidade são limitados e nenhum protocolo multiplica moeda/drop',()=>{
 const b=auxProtocolStats({guard:3,ore:3,box:3,repair:3,kami:3});
 assert.ok(b.guardDamage<=1.18+0.0001);
 assert.ok(b.oreMoveSpeed<=1.24+0.0001);
 assert.ok(b.boxMoveSpeed<=1.30+0.0001);
 assert.ok(b.repairRate<=1.30+0.0001);
 assert.ok(b.kamiDamage<=1.24+0.0001);
 assert.ok(b.kamiRadius<=1.12+0.0001);
 assert.ok(!('oreRewardMultiplier'in b));
});
test('sentinela ainda revida só contra agressor recente',()=>{
 assert.match(game,/function petSentinelDefensiveTarget\(/);
 assert.match(game,/selectSentinelAttacker\(state\.enemies,player/);
 assert.match(game,/if\(!sentinelAttackerEligible\(task,nowSec\(\)\)\)return;/);
 assert.match(game,/if\(mode==='guard'&&combatTask&&sentinelAttackerEligible\(combatTask,nowSec\(\)\)\)petFireAt\(combatTask\)/);
});
test('coleta online mantém limite de raio e autorização no servidor',()=>{
 assert.match(game,/!sharedUniverseMap\(\)\?base\*petProtocolEffects\(\)\.oreSeekRange:base/);
 assert.match(game,/sharedUniverse\.collectOre\(task\.id,'pet'\)/);
 assert.match(game,/nextOreCollectAt/);
});
test('interface AUX contém controles para cada protocolo e save guard do servidor',()=>{
 assert.match(game,/PROTOCOLOS DO AUX-9/);
 assert.match(game,/function changePetProtocol\(id,delta\)/);
 assert.match(game,/saveGame\(\);refreshPetViews\(\)/);
 assert.match(server,/SAVE_AUX_PROTOCOL_INVALID/);
 assert.ok(!html.includes('MODO SENTINELA V22'));
});
