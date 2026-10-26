import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync, readdirSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {ALLOWED_SHIPS_V50,isShipAllowedV50,ensureAllowedShipSaveV50} from '../public/modules/stellar-ship-allowlist-v65.js';
import {visualDroneV53} from '../public/modules/stellar-astral-expansion-v53.js';
import {entityAssetPath} from '../public/modules/asset-cache.js';
const root=resolve(import.meta.dirname,'..');
const game=readFileSync(join(root,'public/game.js'),'utf8');
const assets=join(root,'public/assets/v65');
const img=p=>readFileSync(join(root,'public',p.replace(/^\//,'')));
const webp=p=>{const data=img(p);assert.equal(data.toString('ascii',0,4),'RIFF',p);assert.equal(data.toString('ascii',8,12),'WEBP',p);assert.ok(data.length>1500,p);};
test('V65 usa 13 naves TOP no mapa e FRONT no showroom, hangar, leilão',()=>{
  assert.equal(Object.keys(ALLOWED_SHIPS_V50).length,13);
  for(const id of Object.keys(ALLOWED_SHIPS_V50)){
    assert.ok(isShipAllowedV50(id));
    webp(`/assets/v65/ships/top/${id}.webp`);webp(`/assets/v65/ships/front/${id}.webp`);
    assert.notDeepEqual(img(`/assets/v65/ships/top/${id}.webp`),img(`/assets/v65/ships/front/${id}.webp`));
  }
  assert.match(game,/shipArtV65\(id,'front'\)/);
  assert.match(game,/shipArtV65\(id,'top'\)/);
  assert.match(game,/function shipMapSheetAsset\(/);
  assert.match(game,/if\(shipArtV65\(id,'top'\)\)return null/);
});
test('NPCs têm arte compartilhada para mapa e card, sem atlas obsoleto',()=>{
  const m=game.match(/const NPC_2D_V65 = Object\.freeze\(\{([\s\S]*?)\}\)/);
  assert.ok(m);
  const paths=[...m[1].matchAll(/'([^']+\.webp)'/g)].map(a=>a[1]);
  assert.ok(paths.length>=22);
  for(const p of paths)webp(p);
  assert.match(game,/function npcWorldSpriteAsset\(type\)\{return NPC_2D_V65\[type\]/);
  assert.match(game,/function npcMapSheetAsset\(type\)\{if\(NPC_2D_V65\[type\]\)return null/);
});
test('Sete drones usam os mesmos sprites na loja e no mapa',()=>{
 for(const id of ['drone_common','drone_elite','drone_a','drone_b','drone_c','drone_d','drone_e'])webp(`/assets/v65/drones/${id}.webp`);
 assert.equal(visualDroneV53('flax',null),'drone_common');
 assert.match(game,/function droneMapSheetAsset\(id\)\{if\(droneVisualArtV64\(id\)\)return null/);
});
test('AUX tem exatamente 16 quadros de animação na mesma vista',()=>{
 webp('/assets/v65/aux/aux9_16.webp');
 for(let i=0;i<16;i++)webp(`/assets/v65/aux/aux_${String(i).padStart(2,'0')}.webp`);
 assert.match(game,/Math\.floor\(performance\.now\(\)\/130\)%frames/);
});
test('Nenhum modelo 3D é servido ou importado pelo cliente',()=>{
 const walk=p=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(p,e.name)):[join(p,e.name)]);
 assert.equal(walk(join(root,'public/assets')).filter(p=>p.endsWith('.glb')).length,0);
 assert.ok(!game.includes('stellar-ship3d-v50.js'));
 assert.ok(!game.includes('STELLAR_3D_V50'));
 assert.ok(!existsSync(join(root,'public/modules/stellar-ship3d-v50.js')));
});
test('As migrações não alteram ownership, progresso e IDs de naves',()=>{
 const save={activeShipId:'not_allowed',ownedShips:['citadel'],credits:900,stellarium:35,inventory:{item:'x'}};
 assert.equal(ensureAllowedShipSaveV50(save),true);
 assert.equal(save.activeShipId,'phoenix');assert.equal(save.credits,900);assert.equal(save.stellarium,35);
 assert.deepEqual(save.inventory,{item:'x'});assert.ok(save.ownedShips.includes('citadel'));
});
test('Cache de sprites reconhece os novos diretórios V65',()=>{
 for(const p of ['/assets/v65/ships/top/phoenix.webp','/assets/v65/ships/front/phoenix.webp','/assets/v65/aux/aux9.webp','/assets/v65/drones/drone_a.webp','/assets/v65/npcs/streuner.webp']){
  assert.equal(entityAssetPath(p),true,p);
 }
});
