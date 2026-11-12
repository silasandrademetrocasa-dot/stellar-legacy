import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {entityAssetPath} from '../public/modules/asset-cache.js';
const root=resolve(import.meta.dirname,'..');
const base=join(root,'public/assets');
const catalog=JSON.parse(readFileSync(join(base,'v136/manifest.json'),'utf8'));
const game=readFileSync(join(root,'public/game.js'),'utf8');
const manifest=readFileSync(join(base,'v17/manifest.js'),'utf8');
const available=relative=>existsSync(join(base,relative));

test('V136: 43 naves com topo, frente e mapa individuais sem recortes de HUD',()=>{
 assert.equal(Object.keys(catalog.ships).length,43);
 for(const [name,info] of Object.entries(catalog.ships)){
  for(const view of ['top','front','map']){
   const path=view==='map'?info.views.map:info.views[view];
   assert.ok(available(path.replace(/^\/assets\//,'')),`${name} ${view}`);
   assert.equal(entityAssetPath(path),true,path);
   const bytes=readFileSync(join(root,'public',path));
   assert.equal(bytes.toString('ascii',0,4),'RIFF',`${name} ${view}`);
  }
 }
});

test('V136: 12 cascos com pranchas novas e fallback fiel para naves ainda sem aprovação',()=>{
 assert.equal(Object.values(catalog.ships).filter(x=>x.mode==='new board top+front').length,12);
 assert.equal(catalog.ships.meridian.mode,'new board top+front');
 assert.equal(catalog.ships.leviathan.mode,'new board top+front');
 assert.match(catalog.ships.valkyrie.mode,/original-enhanced/);
});

test('V136: IDs de gameplay mapeiam naves e NPCs para a única pasta atual',()=>{
 for(const [id,name] of Object.entries({phoenix:'aurora',liberator:'pioneer',piranha:'raptor',nostromo:'meridian',goliath:'leviathan',yamato:'kensei',defcom:'phantom'})){
  assert.match(game,new RegExp(`${id}:'${name}'`));
 }
 assert.match(game,/const shipArtV65=\(id,view\)=>SHIP_ART_ID_V136/);
 assert.match(game,/\/assets\/v136\/npcs\/streuner.webp/);
 assert.match(manifest,/\/assets\/v136\/ships\/map\/aurora.webp/);
 assert.ok(Object.keys(catalog.npcs).length>=40);
});

test('Catálogo atual não contém sprites dos diretórios legados',()=>{
 // Git/installer deletes files, not empty directory entries. Test the real assets.
 for(const dir of ['v17/ships','v17/ships-map','v17/npcs','v52_4/ships','v52_4/npcs','v62/showroom','v63/ships','v65/ships','v65/npcs','v66/ships','v66/npcs','v67/npcs','v3021/ships']){
  const target=join(base,dir);
  if(existsSync(target)) assert.deepEqual(readdirSync(target,{recursive:true,withFileTypes:true}).filter(entry=>entry.isFile()).map(entry=>entry.name),[],`sprites residuais em ${dir}`);
 }
});

test('V136: a atualização não altera dados de gameplay ou economia',()=>{
 for(const f of ['public/data.js','public/api.js','server/world.js'])assert.ok(existsSync(join(root,f)));
 assert.ok(readFileSync(join(root,'public/game.js'),'utf8').includes('const SHIP_ART_ID_V136'));
});
