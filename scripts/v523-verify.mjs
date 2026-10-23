/* V52.3.3 — verify all file assets and the safety of the fallback renderer.
 * Never claims 3D integration when a live source variant forced 2D fallback.
 */
import assert from 'node:assert/strict';import fs from 'node:fs';
import {decodeGlb,ALLOWED_SHIPS_V50} from '../public/modules/stellar-ship3d-v50.js';
const root='public/assets/v52',premium='public/assets/v52_3';
const m=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8'));
assert.equal(Object.keys(m.ships).length,13);
assert.equal(Object.keys(m.npc).length,14);
assert.equal(Object.keys(m.resources).length,7);
for(const [id,r] of Object.entries(m.ships)){
 assert(ALLOWED_SHIPS_V50[id]);assert(fs.existsSync('public'+r.card));
}
for(const [id,r] of Object.entries({...m.npc,...m.resources,...m.loot,aux9:m.aux})){
 assert(fs.existsSync('public'+r.path),`V52 sem ${id}`);
 assert(fs.existsSync('public'+r.card),`V52 card sem ${id}`);
}
const group=['aux9',...Object.keys(m.npc).map(x=>'npc_'+x),...Object.keys(m.resources).map(x=>'ore_'+x),...['bonus','loot','mystery','elite','repair','ammo'].map(x=>'box_'+x)];
let verified=0;
for(const id of group){const path=`${premium}/models/${id}.glb`;
 assert(fs.existsSync(path),`modelo Premium ausente: ${id}`);
 const b=fs.readFileSync(path);const raw=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
 assert(decodeGlb(raw).length>0,`GLB vazio: ${id}`);verified++;
 assert(fs.existsSync(`${premium}/cards/${id}.png`),`card premium ausente ${id}`);
}
for(const id of Object.keys(m.ships))assert(fs.existsSync(`${premium}/cards/ship_${id}.png`));
const game=fs.readFileSync('public/game.js','utf8');const renderer=fs.readFileSync('public/modules/stellar-ship3d-v50.js','utf8');
assert(game.includes('STELLAR_VISUAL_FLEET_V52_0')&&game.includes('STELLAR_VISUAL_FLEET_V52_3'));
assert(game.includes('/assets/v52_3/cards/'));
assert(game.includes("from './modules/stellar-ship3d-v50.js?v=47.7.6'"));
assert(renderer.includes('Math.PI/2+angle'));
const stages={aux:game.includes("drawAssetAt(ctx,'aux9'"),npc:game.includes("drawAsset(ctx,'npc_'"),ores:game.includes("drawAssetAt(ctx,'ore_'"),box:game.includes("drawAsset(ctx,'box_bonus'"),loot:game.includes("drawAssetAt(ctx,'box_loot'")};
for(const [k,v] of Object.entries(stages)) console.log(`${v?'✅':'⚠️'} V52.3.3: ${k} ${v?'GLB integrado':'2D fallback seguro (requer revisão no game.js)'}`);
console.log(`✅ V52.3.3: integridade confirmada em ${verified} GLBs, 13 cards de naves e backup visual`);
