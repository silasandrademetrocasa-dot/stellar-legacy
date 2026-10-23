/* V52.3.3 pre-unify verification: validates base assets without assuming later scripts already ran. */
import assert from 'node:assert/strict';import fs from 'node:fs';
import {decodeGlb,ALLOWED_SHIPS_V50} from '../public/modules/stellar-ship3d-v50.js';
const root='public/assets/v52';const manifest=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8'));
assert.equal(Object.keys(manifest.ships).length,13);
assert.equal(Object.keys(manifest.npc).length,14);
assert.equal(Object.keys(manifest.resources).length,7);
for(const [id,r] of Object.entries(manifest.ships)){
 assert(ALLOWED_SHIPS_V50[id]);assert(fs.existsSync('public'+r.card));
}
for(const [id,r] of Object.entries({...manifest.npc,...manifest.resources,...manifest.loot,aux9:manifest.aux})){
 const path='public'+r.path;assert(fs.existsSync(path),`V52 sem ${id}`);
 assert(fs.existsSync('public'+r.card),`V52 card sem ${id}`);
 const b=fs.readFileSync(path);const buf=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
 assert(decodeGlb(buf).length,`GLB vazio: ${path}`);
}
const game=fs.readFileSync('public/game.js','utf8');
assert(game.includes('STELLAR_VISUAL_FLEET_V52_0'),'V52 não aplicada');
assert(game.includes('/assets/v52/cards/')||game.includes('/assets/v52_3/cards/'));
console.log('✅ V52.3.3: assets de base, 13 naves, 14 NPCs, 7 recursos e fallback 2D verificados');
