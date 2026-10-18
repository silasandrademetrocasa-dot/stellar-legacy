import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=(path)=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const game=src('public/game.js'),server=src('server/index.js'),ws=src('public/world.js'),sql=src('sql/V21_5_1_RELAY_READONLY.sql');
test('sala PvP entra rapidamente e falha do banco nunca autoriza captura fantasma',()=>{
  assert.match(ws,/msg\.type==='join_error'/);assert.match(ws,/map_error/);
  assert.match(game,/SALA PvP INDISPONÍVEL/);assert.match(game,/data-warfront-reconnect/);
  assert.match(src('server/world.js'),/warfrontSyncError/);
  assert.match(src('server/world.js'),/!this\.warfrontSynced/);
});
test('posse de relés pode ser lida com JWT sem desbloquear escrita',()=>{
  assert.match(server,/api\/world\/sector-state/);assert.match(server,/requireUser/);
  assert.match(sql,/grant select \(map_id,node_id,owner,revision,captured_at\)/);
  assert.doesNotMatch(sql,/grant\s+(update|insert|delete)/i);
  assert.match(game,/normalizeReadOnlySectorOwnership/);
});
test('pontos A B C permanecem visíveis em modo somente leitura quando websocket falha',()=>{
  assert.match(game,/READ_ONLY_SECTOR_LAYOUT=\{b41/);assert.match(game,/readOnly:true/);
  assert.match(game,/CONTROLE OFFLINE/);
  assert.match(game,/sharedUniverseRuntime\.ready&&sharedUniverseRuntime\.warfront/);
  assert.match(game,/VISUALIZAÇÃO DO BANCO/);
});
test('versões não são inseridas no nome do menu visível',()=>{assert.doesNotMatch(src('public/index.html'),/CENTRO DE COMANDO V\d+/)});
