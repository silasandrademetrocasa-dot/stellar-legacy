#!/usr/bin/env node
// V45.1: idempotent edits to live V45.0 base; preserves ALL original files and saves.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const OLD='45.0.0',NEXT='45.1.0';
function edit(p,fn){const f=resolve(ROOT,p),a=readFileSync(f,'utf8'),b=fn(a);if(a!==b)writeFileSync(f,b);}
function must(s,needle,p){if(!s.includes(needle))throw Error('V45.1 missing anchor '+p+' '+needle.slice(0,100));}
function upgrade(s){return s.replaceAll('?v='+OLD,'?v='+NEXT);}
edit('server/index.js',s=>{
 if(s.includes("const RELEASE_VERSION = '"+NEXT+"'"))return s;
 must(s,"const RELEASE_VERSION = '"+OLD+"'",'server/index.js');
 return s.replace("const RELEASE_VERSION = '"+OLD+"'","const RELEASE_VERSION = '"+NEXT+"'");
});
edit('server/world.js',s=>{
 if(!s.includes("from '../public/modules/galactic-progression-v451.js'"))s="import {applyGalacticProgressionV451} from '../public/modules/galactic-progression-v451.js';\n"+s;
 if(!s.includes('applyGalacticProgressionV451(MAPS);')){
  must(s,'const LIVE_OPS_REFRESH_MS','server/world.js');
  s=s.replace('const LIVE_OPS_REFRESH_MS','applyGalacticProgressionV451(MAPS);\nconst LIVE_OPS_REFRESH_MS');
 }
 // Server still controls true join levels by persisted SQL map + sector requirements.
 must(s,'Math.max(1,Number(dest?.minLevel)||1,Number(sector?.min_level)||1)','server/world.js');
 must(s,'sectorEntryAllowedV450(mapId,territorial,sector,territory)','server/world.js');
 return s;
});
edit('public/game.js',s=>{
 s=upgrade(s);
 if(!s.includes("from './modules/galactic-progression-v451.js?"))s="import {galacticLevelV451,applyGalacticProgressionV451} from './modules/galactic-progression-v451.js?v="+NEXT+"';\n"+s;
 if(!s.includes('applyGalacticProgressionV451(MAPS);')){
  must(s,'const WORLD_FALLBACK_MAPS=','public/game.js');
  s=s.replace('const WORLD_FALLBACK_MAPS=','applyGalacticProgressionV451(MAPS);\nconst WORLD_FALLBACK_MAPS=');
 }
 const original="function graphLevelRequirement(label){const fLevel=sectorLevelV435(label);if(fLevel)return fLevel;const live=worldRuntimeConfig.sectorInfo.get(String(label||''));if(live)return Math.max(1,Number(live.minLevel)||1);if(label.startsWith('4-'))return 15;const tier=Number(label.split('-')[1]||99);return ({1:1,2:3,3:7,4:10,5:18,6:22,7:27,8:32})[tier]||99;}";
 const fixed="function graphLevelRequirement(label){const live=worldRuntimeConfig.sectorInfo.get(String(label||''));if(live)return Math.max(1,Number(live.minLevel)||1);return galacticLevelV451(label)??99;}";
 if(!s.includes(fixed)){must(s,original,'public/game.js graph level');s=s.replace(original,fixed);}
 must(s,'function renderMapModal(){','public/game.js');
 must(s,'filteredFrontierPortalsV440','public/game.js');
 return s;
});
edit('public/modules/frontier-sectors-v435.js',s=>{
 for(const [id,previous,next] of [['u1',25,20],['u2',30,21],['u3',35,22]]){
  const re=new RegExp("(id:'"+id+"',label:'U-[123]',name:'[^']+',tier:[0-9]+,minLevel:)"+previous+'(?=,)');
  if(re.test(s))s=s.replace(re,'$1'+next);
  must(s,"id:'"+id+"',label:'U-"+id[1]+"'",'public/modules/frontier-sectors-v435.js');
  must(s,'minLevel:'+next,'public/modules/frontier-sectors-v435.js');
 }
 return upgrade(s);
});
for(const p of [
 'public/api.js','public/index.html','public/modules/unified-expansion-v42.js',
 'public/modules/frontier-routing-v440.js','public/modules/frontier-boss-v440.js','public/modules/frontier-audit-v450.js',
 'public/modules/astral-operations-v435.js','public/modules/astral-combat-admin-v431.js',
 'public/modules/stage-a-v423.js','public/modules/stage-b-v426.js',
 'public/modules/astral-rewards-v381.js','public/modules/astral-combat-v431.js',
 'public/modules/astral-systems-v435.js'
])edit(p,upgrade);
// Update three active inherited version assertions; preserve every other test and assertion.
for(const name of ['v435-integration.test.mjs','v440-galactic-supremacy.test.mjs','v450-galactic-ascension.test.mjs']){
 edit('tests/'+name,s=>{
  s=s.replaceAll("assert.equal(p.version,'"+OLD+"')","assert.equal(p.version,'"+NEXT+"')");
  s=s.replaceAll('v450-apply-patch','v451-apply-patch');
  must(s,"assert.equal(p.version,'"+NEXT+"')",'tests/'+name);
  must(s,'v451-apply-patch','tests/'+name);
  return s;
 });
}
console.log('V45.1 Galactic Progression: all factions, new tier levels, authoritative SQL portals and PvP level 15.');
