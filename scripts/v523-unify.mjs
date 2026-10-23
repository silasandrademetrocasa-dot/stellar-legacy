/* Stellar Legacy V52.3.3 — visual asset unification and safe enhancement.
 * Fail-safe for source refactors: preserve 2D instead of aborting the deployment.
 * Does not change game data, server, economy, or live state.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
const file='public/game.js';
const MARK='STELLAR_VISUAL_FLEET_V52_3';
let src=fs.readFileSync(file,'utf8');
assert(src.includes('STELLAR_VISUAL_FLEET_V52_0'),'V52.3: V52 não integrada');
// Keep historical release verifier satisfied.
src=src.replace(/(\bfrom\s*['"])\.\/modules\/stellar-ship3d-v50\.js(?=['"])/g,'$1./modules/stellar-ship3d-v50.js?v=47.7.6');
if(src.includes(MARK)){
 fs.writeFileSync(file,src);console.log('✅ V52.3 já integrada; execução idempotente');process.exit(0);
}
// Cards are consistent in all scenes; preserve original 2D model fallback.
assert(src.includes('/assets/v52/cards/'),'V52.3: imagens V52 não encontradas');
src=src.replaceAll('/assets/v52/cards/','/assets/v52_3/cards/');
const imageBranch=/\bif\s*\(\s*(?:img\s*&&\s*img\s*\.\s*(?:naturalWidth|complete)|img\s*\?\.\s*(?:naturalWidth|complete))(?:\s*(?:>\s*0|&&\s*img\s*\.\s*naturalWidth))?\s*\)\s*\{/g;
function functionRange(name){
 const rx=new RegExp('^function\\s+'+name+'\\s*\\(','gm');
 const matches=[...src.matchAll(rx)];if(matches.length!==1)return null;
 const a=matches[0].index,following=/^function\s+[\w$]+\s*\(/gm;
 following.lastIndex=a+matches[0][0].length;
 return {a,b:following.exec(src)?.index??src.length};
}
const reports=[];
function overlay(fn,modelCode,tag,earlyContinue=false){
 const r=functionRange(fn);
 if(!r){reports.push({tag,ok:false,why:'função não localizada'});return;}
 const seg=src.slice(r.a,r.b);
 const m=[...seg.matchAll(imageBranch)];
 if(m.length!==1){reports.push({tag,ok:false,why:`formato do sprite incompatível (${m.length} correspondências)`});return;}
 const original=m[0][0];
 const replacement=earlyContinue
   ? `if(${modelCode})continue; ${original}`
   : `if(${modelCode}){ /* V52.3: modelo 3D ${tag} */ }else ${original}`;
 src=src.slice(0,r.a+m[0].index)+replacement+src.slice(r.a+m[0].index+original.length);
 reports.push({tag,ok:true});
}
overlay('drawOres',"resolvedQualityMode()==='high'&&STELLAR_3D_V50.drawAssetAt(ctx,'ore_'+o.type,(o.rot||0)+nowSec()*.08,Math.max(26,o.r*3.2),p.x,p.y)",'minérios',true);
overlay('drawBonusBoxes',"resolvedQualityMode()==='high'&&STELLAR_3D_V50.drawAsset(ctx,'box_bonus',0,size*scale)",'box bônus');
overlay('drawLoot',"resolvedQualityMode()==='high'&&STELLAR_3D_V50.drawAssetAt(ctx,'box_loot',0,42*pulse,p.x,p.y)",'loot',true);
// High-quality ores and loot continue the per-object loop after a GLB is drawn;
// this prevents the old 2D fallback from being painted over the new 3D model.
for(const r of reports)console.log(`${r.ok?'✅':'⚠️'} V52.3 ${r.tag}: ${r.ok?'modelo 3D instalado':'fallback 2D mantido — '+r.why}`);
src='/* '+MARK+' */\n'+src;
fs.writeFileSync(file,src);
console.log(`✅ V52.3.3: unificação pronta (${reports.filter(x=>x.ok).length}/3 mapas 3D; 2D preservado)`);
