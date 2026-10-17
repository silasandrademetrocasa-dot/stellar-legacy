import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const from=code.indexOf('function update(dt,profile=null){');
const to=code.indexOf('\nfunction drawSectorGrid()',from);
const update=code.slice(from,to);
test('movimento, NPC, AUX, escudos e HUD crítico não são pulados pelo scheduler',()=>{
 assert.ok(from>=0&&to>from);
 for(const call of ['updateCombatAbilities();','updatePlayer(dt);','updateSharedUniverseInterpolation(dt);','updateEnemies(dt);','updatePet(dt);','updateWarfrontRuntime();','updateGalaxyEvent(dt);','updateParticles(dt);','updateFx(dt);','updateAlphaGate();','updateFrameHudV2024(profile);']){
  assert.ok(update.includes(call),'chamada ausente: '+call);
 }
 assert.match(update,/if\(isPublicPvpSector\(\)\|\|AUX_WORK_V2027\.due\('onlinePolling',100\)\)updateOnlineWorld\(dt\);/);
 assert.match(code,/const dt=Math\.min\(\(t-last\)\/1000,\.05\);last=t;/);
});
test('V20.2.7: eventos só reduzem atualização visual e NPCs reutilizam o array',()=>{
 assert.match(code,/if\(AUX_WORK_V2027\.due\('galaxyHud',250\)\)renderGalaxyEventHud\(ev,rec\)/);
 assert.match(code,/function processRespawns\(\)[\s\S]*?state\.enemies\.splice\(i,1\)/);
 assert.doesNotMatch(code.slice(code.indexOf('function processRespawns(){'),code.indexOf('function factionBattleMap()')),/state\.enemies=state\.enemies\.filter\(/);
});
