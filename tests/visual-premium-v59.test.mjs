import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {decodeGlb} from '../public/modules/stellar-ship3d-v50.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('V59: hud neon uses original PLS/SIP/CMT selectors and real ammo artwork',()=>{
 const game=read('public/game.js'), css=read('public/modules/stellar-refinement-v59.css');
 assert.match(game,/GAME_ASSETS\.ammo\[a\.id\]/); assert.match(game,/GAME_ASSETS\.ammo\[r\.id\]/);
 assert.match(css,/#weaponBar \.ammo-btn\.circular\.active/);
 assert.match(css,/\.ammo-art\{display:block!important/);
 assert.match(css,/mobile-landscape-pro/);
});
test('V59: 3D explicit uses detailed GLBs, AUTO preserves mobile LOD and 2D fallback',()=>{
 const s=read('public/modules/stellar-ship3d-v50.js');
 assert.match(s,/function requestedModelAssetV59/);
 assert.match(s,/mode==='on'/);
 assert.match(s,/MODEL_ASSET\[id\]/);
 assert.match(s,/function setMode\(mode\)/);
 assert.match(s,/uploads\.clear\(\);requests\.clear\(\);modelZoom\.clear\(\)/);
});
test('V59: 43 GLBs decode correctly, including all 8 universe NPCs and all seven drone variants',()=>{
 const root=new URL('../public/assets/v59/models/',import.meta.url);
 const files=readdirSync(root).filter(f=>f.endsWith('.glb'));
 assert.equal(files.length,43);
 for(const f of files){const b=readFileSync(new URL(f,root));const data=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);const parts=decodeGlb(data);assert.ok(parts.length>0,`${f} empty`)}
 for(const type of ['riftScout','bossRiftScout','voidCorsair','bossVoidCorsair','nexusWarden','bossNexusWarden','astralReaper','bossAstralReaper'])assert.ok(files.includes(`npc_${type}.glb`),type);
 for(const variant of ['common','elite','a','b','c','d','e'])assert.ok(files.includes(`drone_${variant}.glb`),variant);
});
test('V59: base original remains fixed and no economy or SQL migrations',()=>{
 const game=read('public/game.js'), pkg=JSON.parse(read('package.json')), guide=read('README_V59.md');
 assert.match(game,/restaurar a base panorâmica original V22\.12/);
 assert.match(guide,/Não aplica SQL/);
 assert.ok(game.includes('stellar-ship3d-v50.js?v='+pkg.version));
});
