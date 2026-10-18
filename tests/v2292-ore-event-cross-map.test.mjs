import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const world = fs.readFileSync('server/world.js','utf8');
const server = fs.readFileSync('server/index.js','utf8');
const game = fs.readFileSync('public/game.js','utf8');

// Regression: the previous release supplied the grant callback to attachSharedUniverse
// but omitted it from the destructuring signature and world object.
test('mineração: callback configurado no Render atravessa a fronteira do WebSocket',()=>{
 assert.match(server,/grantOreReward:async\(userId,oreKey,resource,amount\)=>/);
 assert.match(server,/stellar_grant_ore_reward_v229/);
 assert.match(world,/export function attachSharedUniverse\(server,\{[^}]*\bgrantOreReward\}\)/);
 assert.match(world,/grantOreReward:grantOreReward\|\|\(\(\)=>Promise\.reject/);
 assert.match(world,/receipt=await this\.world\.grantOreReward\(p\.userId,oreKey,o\.type,Math\.trunc\(Number\(o\.amount\)\|\|0\)\)/);
});
test('mineração: não remover do mapa nem pagar localmente se o banco falhar',()=>{
 assert.match(world,/this\.ores\.set\(o\.id,o\);/);
 assert.match(world,/reason:'persistence_error'/);
 assert.match(world,/if\(!receipt\|\|!Number\.isSafeInteger\(Number\(receipt\.revision\)\)/);
 assert.match(game,/if\(!receipt\|\|!Number\.isSafeInteger\(Number\(receipt\.revision\)\)/);
});
test('eventos: sala envia evento global mesmo quando evento não é jogável naquele mapa',()=>{
 assert.match(world,/globalEvent:this\.world\.currentEvent\(\),warfront:this\.warfrontPayload\(\)/);
 assert.match(world,/type:'event_update',event:this\.eventPayload\(\),globalEvent:this\.world\.currentEvent\(\)/);
 assert.match(world,/type:'event_update',event:r\.eventPayload\(\),globalEvent:world\.currentEvent\(\)/);
 assert.match(world,/broadcastGlobalEventStatus\(force=false\)/);
 assert.match(world,/signature===this\.lastGlobalEventSignature/);
});
test('eventos: jogador vê atividade em outro setor sem ganhar prêmio indevido',()=>{
 assert.match(game,/function visibleSharedWorldEvent\(\)/);
 assert.match(game,/return \{\.\.\.global,informationalOnly:true\}/);
 assert.match(game,/const shared=sharedUniverseMap\(\)\?visibleSharedWorldEvent\(\):null/);
 assert.match(game,/ATIVO EM OUTRO SETOR/);
 assert.match(game,/4-1 \/ 4-2 \/ 4-3/);
 assert.match(game,/if\(!sharedWorldEvent\(\)\)return; \/\/ Evento apenas informativo/);
 assert.match(game,/if\(!progress\|\|state\.currentMap\?\.gate\|\|ev\?\.informationalOnly\)return false/);
});
test('eventos: mapa compatível aguarda sincronização em vez de inventar progresso',()=>{
 assert.match(game,/SINCRONIZANDO EVENTO NESTE SETOR/);
 assert.match(game,/galaxyEventEligible\(\{\.\.\.ev,informationalOnly:false\}\)/);
 assert.match(game,/sharedUniverseRuntime\.event=msg\.event\|\|null;sharedUniverseRuntime\.globalEvent=msg\.globalEvent\|\|null/);
});
