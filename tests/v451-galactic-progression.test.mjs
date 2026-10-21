import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GALACTIC_PVE_LEVELS_V451,GALACTIC_PVP_LEVEL_V451,GALACTIC_HOME_PVP_V451,galacticLevelV451,applyGalacticProgressionV451,GALACTIC_CANONICAL_ROUTES_V451} from '../public/modules/galactic-progression-v451.js';
import {registerFrontierSectorsV435} from '../public/modules/frontier-sectors-v435.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('PVE ranks are continuous through U-3 for each of the three factions',()=>{
 assert.deepEqual(Object.values(GALACTIC_PVE_LEVELS_V451),[1,3,5,7,9,12,15,18,20,21,22]);
 for(const f of ['1','2','3'])for(const [id,lv] of Object.entries(GALACTIC_PVE_LEVELS_V451)){
  const label=id[0]==='u'?'U-'+id.slice(1):f+'-'+id.slice(1);
  assert.equal(galacticLevelV451(label),lv);
 }
 assert.equal(galacticLevelV451('unknown'),null);
});
test('PVP entry exists in each original X-1, only opens at level 15',()=>{
 assert.deepEqual(GALACTIC_HOME_PVP_V451,{'1-1':'4-1','2-1':'4-2','3-1':'4-3'});
 assert.equal(GALACTIC_PVP_LEVEL_V451,15);
 for(const [home,battle] of Object.entries(GALACTIC_HOME_PVP_V451)){
  assert.equal(galacticLevelV451(battle),15);
  assert.ok(GALACTIC_CANONICAL_ROUTES_V451.some(([a,b])=>a===home&&b===battle));
 }
});
test('game and server use the same fallback progression without overwriting user save',()=>{
 const maps=registerFrontierSectorsV435({x1:{minLevel:1},x5:{minLevel:18},x8:{minLevel:32}});
 applyGalacticProgressionV451(maps);
 assert.equal(maps.x5.minLevel,9);assert.equal(maps.x8.minLevel,18);
 assert.equal(maps.u1.minLevel,20);assert.equal(maps.u2.minLevel,21);assert.equal(maps.u3.minLevel,22);
 assert.ok(read('public/game.js').includes('return galacticLevelV451(label)??99'));
 assert.ok(read('server/world.js').includes('applyGalacticProgressionV451(MAPS);'));
 assert.ok(read('server/world.js').includes('Number(dest?.minLevel)||1,Number(sector?.min_level)||1'));
});
test('persistent SQL adds six routes and changes map and sector minimums, without touching saves',()=>{
 const sql=read('sql/STELLAR_V45_1_GALACTIC_PROGRESSION.sql');
 for(const [home,battle] of Object.entries(GALACTIC_HOME_PVP_V451))assert.ok(sql.includes(`'${home}','${battle}'`));
 for(const f of ['1','2','3'])assert.ok(sql.includes(`'${f}-4','${f}-5'`));
 for(const id of ['x8','u1','u2','u3'])assert.ok(sql.includes(`'${id}'`));
 assert.ok(sql.includes("('b41',15),('b42',15),('b43',15)"));
 assert.doesNotMatch(sql,/(?:DELETE\s+FROM|TRUNCATE|DROP\s+TABLE|UPDATE\s+public\.game_saves)/i);
 assert.doesNotMatch(sql,/UPDATE\s+public\.game_npc_config_v1811/i);
});
test('release, cache versions and earlier core security tests remain connected',()=>{
 const pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.version,'46.0.0');assert.match(pkg.scripts.check,/v460-apply-patch/);
 assert.ok(read('public/index.html').includes('/game.js?v=46.0.0'));
 assert.ok(read('server/index.js').includes("const RELEASE_VERSION = '46.0.0'"));
 assert.ok(read('tests/v450-galactic-ascension.test.mjs').includes('v460-apply-patch'));
 assert.ok(read('server/world.js').includes('sectorEntryAllowedV450'));
 assert.ok(read('server/world.js').includes('mergeFrontierServerPortalsV440'));
});
