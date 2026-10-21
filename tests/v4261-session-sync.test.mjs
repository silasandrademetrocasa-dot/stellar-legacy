import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const version='42.6.1';
test('same singleton auth module for game and all extensions',()=>{
 const game=read('public/game.js');
 assert.match(game,/\.\/api\.js\?v=42\.6\.1/);
 for(const file of ['astral-rewards-v381.js','unified-expansion-v42.js','stage-a-v423.js','stage-b-v426.js']){
  const source=read('public/modules/'+file);
  assert.match(source,/from '\.\.\/api\.js\?v=42\.6\.1'/,file);
  assert.doesNotMatch(source,/from '\.\.\/api\.js'/,file);
 }
});
test('Astral refresh queues portal switch and editor reports auth failure',()=>{
 const source=read('public/modules/astral-rewards-v381.js');
 for(const marker of ['queuedGate=lockKey','void refresh(next)','renderPortal();if(visible(modal))void refresh(key)',"editor.textContent='Não foi possível carregar as recompensas:","aria-expanded",'adminRuntimeMonitorRefresh']){
  assert.ok(source.includes(marker),marker);
 }
});
test('hotfix cache keys and server versions agree',()=>{
 const html=read('public/index.html'),server=read('server/index.js');
 assert.ok(html.includes(`/game.js?v=${version}`));
 assert.ok(html.includes(`/modules/astral-rewards-v381.js?v=${version}`));
 assert.ok(html.includes(`/modules/unified-expansion-v42.js?v=${version}`));
 assert.ok(server.includes(`const RELEASE_VERSION = '${version}'`));
 assert.equal(JSON.parse(read('package.json')).version,version);
});
