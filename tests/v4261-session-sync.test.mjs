import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
// The release version is a cache / internal protocol token, never a player label.
const version=JSON.parse(read('package.json')).version;

test('same singleton auth module for game and all extensions',()=>{
 const game=read('public/game.js');
 assert.ok(game.includes(`./api.js?v=${version}`),'game must import the current session singleton');
 for(const file of ['astral-rewards-v381.js','unified-expansion-v42.js','stage-a-v423.js','stage-b-v426.js']){
  const source=read('public/modules/'+file);
  assert.ok(source.includes(`from '../api.js?v=${version}'`),file+' must reuse the game session singleton');
  assert.doesNotMatch(source,/from ['"]\.\.\/api\.js['"]/,file+' must not create a second auth module');
 }
});

test('Astral refresh queues portal switches and errors are friendly to players',()=>{
 const source=read('public/modules/astral-rewards-v381.js');
 for(const marker of ['queuedGate=lockKey','void refresh(next)','renderPortal();if(visible(modal))void refresh(key)',"aria-expanded",'adminRuntimeMonitorRefresh']){
  assert.ok(source.includes(marker),'Astral integration missing: '+marker);
 }
 // We still show an actionable error, but not raw database/authorization internals.
 assert.ok(source.includes("editor.textContent='Não foi possível carregar as recompensas. Tente novamente.'"),
  'Astral editor must show non-technical error text');
 assert.doesNotMatch(source,/editor\.textContent='Não foi possível carregar as recompensas: '\s*\+message/,
  'do not leak backend errors into the editor');
});

test('session hotfix release and asset cache keys remain aligned',()=>{
 const html=read('public/index.html'),server=read('server/index.js');
 for(const asset of ['/game.js','/style.css','/modules/astral-rewards-v381.js','/modules/unified-expansion-v42.js']){
  assert.ok(html.includes(`${asset}?v=${version}`),asset+' missing cache-busting version '+version);
 }
 assert.ok(server.includes(`const RELEASE_VERSION = '${version}'`),'server version must match');
 assert.match(version,/^\d+\.\d+\.\d+$/);
});
