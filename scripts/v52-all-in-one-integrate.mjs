/* STELLAR LEGACY V52.3.3 — resilient visual patch.
 * Apply V52 visual overlays only. Existing gameplay, accounts and economy untouched.
 * If a renderer layout has evolved, preserve the working 2D path instead of
 * aborting the entire deploy; report explicit fallback diagnostics.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
const MARK='STELLAR_VISUAL_FLEET_V52_0';
const file='public/game.js';
assert(fs.existsSync(file),'V52: public/game.js ausente');
let src=fs.readFileSync(file,'utf8');
if(src.includes(MARK)){
 console.log('✅ V52 já aplicada; nenhum patch duplicado');process.exit(0);
}
assert(src.includes('STELLAR_SHIPS3D_FLEET_V50'),'V52 requer V50 instalada');
assert(fs.existsSync('public/modules/stellar-ship3d-v50.js'),'V52: módulo WebGL ausente');
assert(fs.readFileSync('public/modules/stellar-ship3d-v50.js','utf8').includes('STELLAR_V52_RENDER_UPGRADE'),'V52: extensão WebGL ausente');
for(const folder of ['public/assets/v52/models','public/assets/v52/cards'])assert(fs.existsSync(folder),`V52 sem ${folder}`);
const ships=['phoenix','leonov','liberator','piranha','vengeance','bigboy','goliath','citadel','aegis','spearhead','defcom','yamato','nostromo'];
const npcs=['streuner','recruitStreuner','aiderStreuner','bossStreuner','lordakia','bossLordakia','saimon','bossSaimon','mordon','bossMordon','devolarium','bossDevolarium','sibelon','bossSibelon'];
const ores=['Prometium','Endurium','Terbium','Prometid','Duranium','Promerium','Xenomit'];
const assetInit=`\n/* ${MARK}: preview GLB cards across Hangar/Shop/AUX, resource icons */
for(const id of ${JSON.stringify(ships)})GAME_ASSETS.ships[id]='/assets/v52/cards/ship_'+id+'.png';
for(const id of ${JSON.stringify(npcs)})GAME_ASSETS.npcs[id]='/assets/v52/cards/npc_'+id+'.png';
for(const id of ${JSON.stringify(ores)})GAME_ASSETS.resources[id]='/assets/v52/cards/ore_'+id+'.png';
GAME_ASSETS.drones.pet='/assets/v52/cards/aux9.png';
GAME_ASSETS.drones.petElite='/assets/v52/cards/aux9.png';
GAME_ASSETS.droneMap.pet='/assets/v52/cards/aux9.png';
GAME_ASSETS.droneMap.petElite='/assets/v52/cards/aux9.png';
GAME_ASSETS.bonus.box='/assets/v52/cards/box_bonus.png';
GAME_ASSETS.loot.cargo='/assets/v52/cards/box_loot.png';
STELLAR_3D_V50.preload('phoenix');
`;
const assetImport=/^[ \t]*import\s*\{\s*GAME_ASSETS\s*\}\s*from\s*(['"])\.\/assets\/v17\/manifest\.js(?:\?[^'"\n]*)?\1\s*;?[ \t]*$/gm;
const imp=[...src.matchAll(assetImport)];
assert.equal(imp.length,1,`V52: import GAME_ASSETS fora do padrão (${imp.length}); não alterado`);
src=src.slice(0,imp[0].index+imp[0][0].length)+assetInit+src.slice(imp[0].index+imp[0][0].length);
console.log('✅ V52.3.3: 13 imagens na Loja/Hangar e ícones do AUX e recursos');

// Limit range to named function (not brittle exact next-function names).
function functionRange(name){
 const rx=new RegExp('^function\\s+'+name+'\\s*\\(','gm');
 const matches=[...src.matchAll(rx)];
 if(matches.length!==1)return null;
 const a=matches[0].index;
 const following=/^function\s+[\w$]+\s*\(/gm;
 following.lastIndex=a+matches[0][0].length;
 const next=following.exec(src);
 return {a,b:next?.index??src.length};
}
// Branch matching supports whitespace, optional chaining, img.width, and img.complete variants.
const imageBranch=/\bif\s*\(\s*(?:img\s*&&\s*img\s*\.\s*(?:naturalWidth|complete)|img\s*\?\.\s*(?:naturalWidth|complete))(?:\s*(?:>\s*0|&&\s*img\s*\.\s*naturalWidth))?\s*\)\s*\{/g;
const tracked=[];
function patchImageBranch(fn,modelCode,tag){
 const r=functionRange(fn);
 if(!r){tracked.push({tag,ok:false,reason:'função ausente'});return;}
 const segment=src.slice(r.a,r.b);
 const m=[...segment.matchAll(imageBranch)];
 if(m.length!==1){tracked.push({tag,ok:false,reason:`variante do sprite (${m.length} correspondências)`});return;}
 const original=m[0][0];
 const replacement=`if(${modelCode}){ /* V52 ${tag}: GLB renderizado */ }else ${original}`;
 // transparent failover: original sprite branch and all drawing/HUD remain intact
 src=src.slice(0,r.a+m[0].index)+replacement+src.slice(r.a+m[0].index+original.length);
 tracked.push({tag,ok:true});
}
patchImageBranch('drawPet',"resolvedQualityMode()!=='low'&&STELLAR_3D_V50.drawAssetAt(ctx,'aux9',petRuntime.angle||0,48,p.x,p.y)",'AUX local');
// drawRemotePet draws more than one image type; must hit first branch before remote player.
function patchRemotePet(){
 const r=functionRange('drawRemotePet');if(!r){tracked.push({tag:'AUX remoto',ok:false,reason:'função ausente'});return;}
 const seg=src.slice(r.a,r.b);
 const hits=[...seg.matchAll(imageBranch)];
 if(!hits.length){tracked.push({tag:'AUX remoto',ok:false,reason:'sprite não identificado'});return;}
 // first image condition in drawRemotePet belongs to the AUX itself
 const m=hits[0];const original=m[0];
 const replacement=`if(resolvedQualityMode()!=='low'&&STELLAR_3D_V50.drawAssetAt(ctx,'aux9',q.angle||0,42,p.x,p.y)){ /* V52 AUX remoto */ }else ${original}`;
 src=src.slice(0,r.a+m.index)+replacement+src.slice(r.a+m.index+original.length);
 tracked.push({tag:'AUX remoto',ok:true});
}
patchRemotePet();
patchImageBranch('drawEnemy',"resolvedQualityMode()!=='low'&&STELLAR_3D_V50.drawAsset(ctx,'npc_'+e.type,Math.atan2(player.y-e.y,player.x-e.x),e.size*(boss?3.45:3.08))",'NPC GLB');
// Preserve a 2D-only fallback rather than destroy a live install when a renderer was refactored.
for(const t of tracked)console.log(`${t.ok?'✅':'⚠️'} V52 ${t.tag}: ${t.ok?'3D inserido':'mantido render 2D — '+t.reason}`);
src=`/* ${MARK} */\n`+src;
fs.writeFileSync(file,src);
console.log(`✅ V52.3.3: integração segura; ${tracked.filter(x=>x.ok).length}/${tracked.length} pontos de AUX/NPC com GLB; nenhuma modificação de estado`);
