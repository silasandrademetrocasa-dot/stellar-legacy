import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const index=readFileSync(new URL('../server/index.js',import.meta.url),'utf8');
const world=readFileSync(new URL('../server/world.js',import.meta.url),'utf8');
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
test('V110.1: servidor mantém a proteção de recompensa V106.9 e a economia AUX V110 juntas',()=>{
  assert.match(index,/import \{grantNpcRewardSafelyV1069\} from '\.\/npc-reward-delivery-v1069\.js';/);
  assert.match(index,/return grantNpcRewardSafelyV1069\(\{grant,readReceipt\}\);/);
  assert.match(index,/applyAuxAdvancedActionV110\(state,action,payload,\{catalog:/);
  assert.match(index,/validateAuxAdvancedSaveV110/);
  assert.match(index,/aux_protocol_buy/);
  assert.match(game,/auxAdvanced/);
});
test('V110.1: a fila de abates é reservada antes do primeiro await e Elite depende do SQL',()=>{
  assert.match(world,/npcDeathSequenceV1069:createNpcDeathSequenceV1069\(\)/);
  const kill=world.indexOf('async killNpc(e,killerUserId)');
  const reserved=world.indexOf('return this.world.npcDeathSequenceV1069.run(',kill);
  const commit=world.indexOf('async commitNpcDeathV1069(',kill);
  const rewarded=world.indexOf('const serverReward=await this.world.grantNpcReward(',commit);
  const elite=world.indexOf("this.world.recordEliteEvent?.(c.player.userId,'npc_kill')",commit);
  assert.ok(kill>=0&&reserved>kill&&commit>reserved&&rewarded>commit&&elite>rewarded);
});
