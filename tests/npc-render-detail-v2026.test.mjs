import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {npcVisualDetail} from '../public/modules/npc-render-detail.js';

test('qualidade alta e média preserva detalhes de todos os NPCs',()=>{
 for(const quality of ['high','medium'])for(const distanceSq of [0,1e6])
   assert.equal(npcVisualDetail({quality,distanceSq}),'full');
});
test('gráfico BAIXO economiza indicadores de NPCs comuns distantes',()=>{
 assert.equal(npcVisualDetail({quality:'low',distanceSq:200**2}),'full');
 assert.equal(npcVisualDetail({quality:'low',distanceSq:340**2}),'bars');
 assert.equal(npcVisualDetail({quality:'low',distanceSq:650**2}),'sprite');
});
test('chefes, eventos e alvo selecionado sempre mostram HP/escudo e nome',()=>{
 for(const prop of ['boss','eventNpc','selected'])
   assert.equal(npcVisualDetail({quality:'low',distanceSq:999**2,[prop]:true}),'full');
});
test('distâncias inválidas não removem identificação do NPC',()=>{
 for(const distanceSq of [-1,NaN,Infinity])
   assert.equal(npcVisualDetail({quality:'low',distanceSq}),'full');
});
test('módulo NPC está somente na renderização, sem tocar em combate',()=>{
 const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
 assert.match(game,/const npcDetail=npcVisualDetail/);
 assert.match(game,/if\(npcDetail==='sprite'\)return/);
 assert.match(game,/if\(npcDetail==='full'\)/);
 for(const symbol of ['updateEnemies(dt)','updateSharedUniverseInterpolation(dt)','drawPlayer();','drawPet();','updateFrameHudV2024(profile)'])
   assert.ok(game.includes(symbol),symbol);
});
test('diagnóstico mede atualização e desenho sem alterar ciclo de combate',()=>{
 const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
 assert.match(game,/const renderStart=performance\.now\(\);if\(!inSettings\)draw\(\);const end=performance\.now\(\)/);
 assert.match(game,/updateMs:renderStart-start,drawMs:end-renderStart/);
});
