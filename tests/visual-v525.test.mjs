import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {decodeGlb,ALLOWED_SHIPS_V50,ensureAllowedShipSaveV50} from '../public/modules/stellar-ship3d-v50.js';
const root=new URL('..', import.meta.url).pathname;
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));
const validPng=p=>{const b=fs.readFileSync(path.join(root,p));assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a',p)};
const game=read('public/game.js'),renderer=read('public/modules/stellar-ship3d-v50.js');
const npcIds=['streuner','recruitStreuner','aiderStreuner','bossStreuner','lordakia','bossLordakia','saimon','bossSaimon','mordon','bossMordon','devolarium','bossDevolarium','sibelon','bossSibelon'];

test('13 naves na origem visual única e sprites superiores válidos',()=>{
 assert.equal(Object.keys(ALLOWED_SHIPS_V50).length,13);
 assert.match(game,/STELLAR_V524_GLOBAL_VISUALS/);
 assert.match(game,/GAME_ASSETS\.shipMap\[id\]/);
 assert.match(game,/GAME_ASSETS\.ships\[id\]/);
 assert.match(game,/starterDesigners\[faction\]\.card='\/assets\/v52_4\/ships\/phoenix\.png'/);
 assert.match(game,/starterDesigners\[faction\]\.showcase='\/assets\/v52_4\/ships\/phoenix\.png'/);
 for(const [id,name] of Object.entries(ALLOWED_SHIPS_V50)){
  validPng(`public/assets/v52_4/ships/${id}.png`);
  assert(exists(`public/assets/ships3d/v50/SL_${name.toUpperCase()}_LOD.glb`),name);
 }
});

test('13 GLBs de naves têm triângulos legíveis',()=>{
 for(const name of Object.values(ALLOWED_SHIPS_V50)){
  const b=fs.readFileSync(path.join(root,`public/assets/ships3d/v50/SL_${name.toUpperCase()}_LOD.glb`));
  assert(decodeGlb(b.buffer.slice(b.byteOffset,b.byteOffset+b.length)).length>0,name);
 }
});

test('AUX, NPCs, recursos e caixas preservados em 3D e no fallback 2D',()=>{
 for(const id of npcIds){validPng(`public/assets/v52_4/npcs/npc_${id}.png`);assert(exists(`public/assets/v52_3/models/npc_${id}.glb`));}
 validPng('public/assets/v52_4/aux9.png');
 for(const n of ['aux9','box_bonus','box_loot','ore_Prometium','ore_Endurium','ore_Terbium','ore_Promerium','ore_Xenomit'])assert(exists(`public/assets/v52_3/models/${n}.glb`),n);
 assert.match(game,/NPC_VISUAL_IDS_V525\.includes\(type\)\?GAME_ASSETS\.npcs\[type\]/);
 assert.match(game,/GAME_ASSETS\.droneMap\[id\]/);
});

test('configuração global e renderização 3D/2D no mapa',()=>{
 assert.match(game,/function stellarEnsureVisualSettingsV524\(\)/);
 assert.match(game,/function renderSettings\(\)\{[\s\S]{0,220}stellarEnsureVisualSettingsV524\(\)/);
 for(const key of ['auto','3d','2d'])assert(game.includes(`data-stellar-visual=\\"${key}\\"`)||game.includes(`data-stellar-visual="${key}"`));
 assert.doesNotMatch(game,/const modeBar=document\.createElement\('div'\)/);
 assert.match(game,/stellarCan3dV524\(\)\&\&STELLAR_3D_V50\.draw\(ctx,progress\.activeShipId/);
 assert.match(game,/stellarCan3dV524\(\)\&\&STELLAR_3D_V50\.drawAsset\(ctx,'npc_'/);
 assert.match(renderer,/\['off','on','auto'\]\.includes\(mode\)/);
});

test('migração de nave não aprovada conserva equipamentos e inventário',()=>{
 const save={activeShipId:'spectrum',ownedShips:['spectrum'],inventory:{laser:4},shipLoadout:{lasers:['lf4']},combatConfigsV2013:{a:{shield:25}}};
 const inv=JSON.stringify(save.inventory),loadout=JSON.stringify(save.shipLoadout),conf=JSON.stringify(save.combatConfigsV2013);
 assert.equal(ensureAllowedShipSaveV50(save),true);
 assert.equal(save.activeShipId,'phoenix');assert(save.ownedShips.includes('spectrum'));
 assert.equal(JSON.stringify(save.inventory),inv);assert.equal(JSON.stringify(save.shipLoadout),loadout);assert.equal(JSON.stringify(save.combatConfigsV2013),conf);
 assert.equal(ensureAllowedShipSaveV50(save),false);
});

test('repo enxuto: um SQL de referência, sem instaladores históricos',()=>{
 const sql=fs.readdirSync(path.join(root,'sql')).filter(n=>n.endsWith('.sql'));
 assert.deepEqual(sql,['STELLAR_LEGACY_SQL_HISTORICO_UNICO.sql']);
 assert.equal(fs.readdirSync(path.join(root,'scripts')).filter(f=>f.endsWith('.mjs')).length,1);
 assert.equal(exists('scripts/stellar-universal-installer.py'),true);
});
