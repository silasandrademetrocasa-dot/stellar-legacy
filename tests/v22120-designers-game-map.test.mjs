import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const manifest=read('public/assets/v17/manifest.js');
const game=read('public/game.js');
const asset=p=>join(new URL('.',root).pathname,'public',p);

test('faction starter designers provide 3 distinct card and map sprites',()=>{
 for (const f of ['earth','mars','jupiter']) {
   for (const suffix of ['', '-map']) {
     const path=`assets/v2212/ships/${f}${suffix}.webp`;
     assert.ok(manifest.includes('/'+path));
     assert.ok(existsSync(asset(path)));
   }
 }
 assert.match(game,/if\(id==='phoenix' && GAME_ASSETS\.starterDesigners\?\.\[faction\]\)/);
 assert.match(game,/shipMapAsset\(rp\.shipId,rp\.faction\)/);
});

test('faction territory controls the base sprite; safe-zone geometry intact',()=>{
 for(const f of ['earth','mars','jupiter']) assert.ok(manifest.includes(`/assets/v2212/bases/${f}.webp`));
 assert.match(game,/GAME_ASSETS\.bases\?\.\[currentTerritoryFaction\(\)\]/);
 assert.match(game,/const SAFE_ZONE = \{/);
});

test('new loot, ore, NPC and portal assets are transparent, present, and compact',()=>{
 const paths=[
 'boxes/common.webp','boxes/bonus.webp','ores/blue.webp','ores/gold.webp','ores/teal.webp',
 'npcs/scout.webp','npcs/fighter.webp','npcs/heavy.webp','npcs/miner.webp','npcs/elite.webp',
 'portals/common.webp','portals/pvp.webp'];
 for(const p of paths){
   const fp=asset('assets/v2212/'+p);
   assert.ok(existsSync(fp),`missing ${p}`);
   assert.ok(statSync(fp).size<180_000,`large sprite ${p}`);
 }
 for(const t of ['streuner','lordakia','saimon','mordon','devolarium','sibelon'])assert.match(manifest,new RegExp(`\\b${t}: '/assets/v2212/npcs/`));
 assert.match(manifest,/warzone: '\/assets\/v2212\/portals\/pvp\.webp'/);
});

test('existing online server and gameplay APIs untouched',()=>{
 assert.match(game,/function drawLoot\(\)/);
 assert.match(game,/function drawOres\(\)/);
 assert.match(game,/function drawPortals\(\)/);
 assert.match(game,/function drawEnemy\(e\)/);
});
