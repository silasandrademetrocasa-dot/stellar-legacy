import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {npcSpriteRectV141,NPC_BOUNDS_V141} from '../public/modules/npc-framing-v141.js';
import {npcDisplaySizeV526} from '../public/modules/visual-scale-v526.js';
import {shipArtV138} from '../public/modules/entity-art-v138.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('V141: small and large NPC hulls use their alpha bounds without stretching',()=>{
 for(const [id,b] of Object.entries(NPC_BOUNDS_V141)){
  assert.ok(b[0]>=0&&b[1]>=0&&b[0]+b[2]<=512&&b[1]+b[3]<=512,id);
  const rect=npcSpriteRectV141(id,120,512,512);
  assert.equal(rect.length,8);assert.ok(Math.abs(Math.max(rect[6],rect[7])-120)<1e-8,id);
  assert.ok(Math.abs(rect[6]/rect[7]-b[2]/b[3])<1e-8,id);
 }
 assert.ok(NPC_BOUNDS_V141.recruitStreuner[3]<300,'Scout had excess transparent padding');
 assert.equal(npcDisplaySizeV526(14),96);assert.ok(npcDisplaySizeV526(19,true)>npcDisplaySizeV526(15));
 assert.equal(npcDisplaySizeV526(1000,true),280);
});
test('V141: new normal hulls resolve independently of owned country and attribute skins',()=>{
 for(const id of ['phoenix','liberator','piranha','leonov','nostromo','bigboy','goliath']){
  for(const detail of [false,true]){const path=shipArtV138(id,null,{detail});assert.match(path,/assets\/v141\//);assert.ok(existsSync(new URL('../public'+path,import.meta.url)));}
 }
 assert.match(shipArtV138('goliath','n132_goliath_br'),/v138.*leviathan_br/);
 assert.match(shipArtV138('leonov','n132_leonov_hp'),/v138.*lynx_hp/);
});
test('AUX local e remoto usam sprite único e rotação no plano, sem atlas animado',()=>{
 const game=read('public/game.js');
 assert.match(game.slice(game.indexOf('function shipCardAsset('),game.indexOf('function shipMapAsset(')),/detail:false/);
 for(const [start,end] of [['function drawPet(){','function drawShipModel'],['function drawRemotePet(','function drawRemoteLaser']]){
  const block=game.slice(game.indexOf(start),game.indexOf(end,game.indexOf(start)));
  assert.match(block,/ctx\.rotate\(auxSpriteRotation\(/);
  assert.doesNotMatch(block,/ctx\.transform|ctx\.scale/);
 }
 assert.match(game,/function droneMapSheetAsset\(id\)\{if\(auxVisualArtV64\(id\)/);
 const html=read('public/index.html');assert.doesNotMatch(html,/id="baseTradePrompt"/);
 const ui=read('public/modules/christmas-ui-v132.js');assert.equal((ui.match(/querySelector\('#topbar \.top-actions'\)\?\.append/g)||[]).length,2);
});
