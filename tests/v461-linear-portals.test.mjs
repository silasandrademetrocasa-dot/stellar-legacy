import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {CANONICAL_LINKS_V461,portalSlotV461,portalPointV461} from '../public/modules/portal-layout-v461.js';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
const map={w:12000,h:9000};
test('27 conventional routes and the original five U-X routes are exact and free of shortcuts',()=>{
 const keys=CANONICAL_LINKS_V461.map(([a,b])=>[a,b].sort().join('|'));
 assert.equal(new Set(keys).size,32);
 for(const f of ['1','2','3'])for(let i=1;i<8;i++)assert.ok(keys.includes([`${f}-${i}`,`${f}-${i+1}`].sort().join('|')));
 for(const edge of [['1-1','4-1'],['2-1','4-2'],['3-1','4-3'],['U-1','U-2'],['U-2','U-3']])assert.ok(keys.includes(edge.sort().join('|')));
 assert.ok(!keys.includes(['1-3','2-4'].sort().join('|')));
 assert.ok(!keys.includes(['4-1','1-5'].sort().join('|')));
});
test('faction X-1 exits PvE at edge and PvP exactly at center',()=>{
 for(const [f,slot] of [['1','BR'],['2','BL'],['3','TL']]){
  assert.equal(portalSlotV461(`${f}-1`,`${f}-2`),slot);
  assert.deepEqual(portalPointV461(`${f}-1`,`4-${f}`,map),{x:6000,y:4500});
  const e=portalPointV461(`${f}-1`,`${f}-2`,map);
  assert.ok(e.x<900||e.x>11100);
  assert.ok(e.y<900||e.y>8100);
 }
});
test('opposite corners for normal map back and forward exits',()=>{
 for(const n of [2,3,4,5,6,7])for(const f of ['1','2','3']){
  const a=portalPointV461(`${f}-${n}`,`${f}-${n-1}`,map);
  const b=portalPointV461(`${f}-${n}`,`${f}-${n+1}`,map);
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>10000,`${f}-${n}`);
 }
});
test('X-8 preserves separate X-7 and central U-1, U internal ports are untouched',()=>{
 for(const f of ['1','2','3']){
  const normal=portalPointV461(`${f}-8`,`${f}-7`,map);
  const center=portalPointV461(`${f}-8`,'U-1',map);
  assert.deepEqual(center,{x:6000,y:4500});assert.ok(Math.hypot(normal.x-center.x,normal.y-center.y)>5000);
 }
 for(const origin of ['U-1','U-2','U-3'])assert.equal(portalPointV461(origin,'U-2',map),null);
});
test('PvP triangle has three separated ports and returns to home map',()=>{
 for(const [mapId,targets] of Object.entries({'4-1':['1-1','4-2','4-3'],'4-2':['2-1','4-1','4-3'],'4-3':['3-1','4-1','4-2']})){
  const pts=targets.map(dest=>portalPointV461(mapId,dest,map));
  assert.equal(new Set(pts.map(p=>p.x+':'+p.y)).size,3);
 }
 assert.equal(portalSlotV461('4-1','1-5'),null);
});
test('SQL leaves U-X records and pilots untouched and invalidates world cache only',()=>{
 const sql=read('sql/STELLAR_V46_1_ROTAS_LINEARES.sql');
 assert.match(sql,/game_portal_links_v1814/);assert.match(sql,/stellar_u440_veil_ion/);
 assert.match(sql,/V461_TOPOLOGY_INVALID/);assert.match(sql,/config_key='world'/);
 assert.doesNotMatch(sql,/(?:DELETE\s+FROM|UPDATE)\s+public\.(?:game_saves|profiles|stellar_u42_inventory)|DROP\s+TABLE|TRUNCATE/i);
});
test('release v46.1 contains physical portal positions in both client and server',()=>{
 const p=JSON.parse(read('package.json'));
 assert.equal(p.version,'47.7.6');assert.match(p.scripts.check,/v4776-apply-patch/);
 if(!existsSync(new URL('../public/game.js',import.meta.url))){const patch=read('scripts/v461-apply-patch.mjs');assert.match(patch,/portalPointV461/);assert.match(patch,/graphNeighbors/);return;}
 const g=read('public/game.js'),s=read('server/world.js'),r=read('public/modules/frontier-routing-v440.js');
 assert.match(g,/portalPointV461\(fromLabel,toLabel,map.world\)/);
 assert.match(g,/graphNeighbors\(current\)\.includes\(label\)/);
 assert.match(s,/portalPointV461\(origin.sector_label,target,map.world\)/);
 assert.match(r,/portalPointV461\(label,p.targetLabel,world\)/);
});

test('regression V44 verifies centered X-8 portal without weakening disabled-route checks',()=>{
 const legacy=read('tests/v440-galactic-supremacy.test.mjs');
 assert.match(legacy,/assert\.equal\(server\[0\]\.x,Math\.round\(map\.world\.w\/2\)\)/);
 assert.match(legacy,/assert\.equal\(server\[0\]\.y,Math\.round\(map\.world\.h\/2\)\)/);
 assert.match(legacy,/mergeFrontierServerPortalsV440\('x8','earth',map,\[\],data\)/);
 assert.match(legacy,/filteredFrontierPortalsV440\('1-8','earth',\[\],true\)/);
});
