import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {tidyUI} from '../scripts/v4262-player-cleanup.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('public UI messages never surface database or implementation details',()=>{
 const before='<div>Aguardando status dos runtimes...</div><button>ATUALIZAR RUNTIME</button>';
 const after=tidyUI(before);
 assert.match(after,/Aguardando informações dos sistemas/);
 assert.doesNotMatch(after,/runtimes|ATUALIZAR RUNTIME/);
 assert.equal(tidyUI(after),after);
});
test('player-facing copy loses version badges; cache and IDs stay untouched',()=>{
 const before="node('h4','V42.4 • EXPLORAÇÃO DE ANOMALIAS'); import {x} from '../api.js?v=42.6.2'; const id='frontier-v426';";
 const after=tidyUI(before);
 assert.match(after,/EXPLORAÇÃO DE ANOMALIAS/);
 assert.doesNotMatch(after,/'V42\.4/);
 assert.match(after,/api\.js\?v=42\.6\.2/);
 assert.match(after,/frontier-v426/);
});
test('release, sessions, combat and item bookkeeping are not altered by cleanup',()=>{
 const pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.version,'42.6.2');
 assert.equal(pkg.scripts.start,'node server/index.js');
 assert.match(read('public/modules/unified-expansion-v42.js'),/não alteram o dano ou escudo/);
 assert.match(read('public/modules/stage-b-v426.js'),/ainda não são mapas pilotáveis/);
 assert.doesNotMatch(read('public/modules/stage-a-v423.js'),/Carregando sistemas da V42\.3/);
 assert.doesNotMatch(read('public/modules/performance-monitor.js'),/`Versão:\s*\$\{/);
 assert.match(read('public/modules/astral-rewards-v381.js'),/\.\.\/api\.js\?v=42\.6\.2/);
 assert.match(read('public/modules/unified-expansion-v42.js'),/\.\.\/api\.js\?v=42\.6\.2/);
});
