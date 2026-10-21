#!/usr/bin/env node
// V46: idempotent patch over official V45.1.0. Never edit saves, cloud data, wallet, market or relay modules.
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve,dirname,join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const OLD='45.1.0',NEXT='46.0.0';
function edit(p,fn){const file=resolve(ROOT,p),old=readFileSync(file,'utf8'),next=fn(old);if(old!==next)writeFileSync(file,next);}
function requireAnchor(text,key,file){if(!text.includes(key))throw Error('V46: missing '+file+' anchor: '+key.slice(0,90));}
function injectOnce(source,key,needle,replacement,file){if(source.includes(key))return source;requireAnchor(source,needle,file);return source.replace(needle,replacement);}
edit('server/index.js',s=>{
 if(s.includes("const RELEASE_VERSION = '"+NEXT+"'"))return s;
 requireAnchor(s,"const RELEASE_VERSION = '"+OLD+"'",'server/index.js');
 return s.replace("const RELEASE_VERSION = '"+OLD+"'","const RELEASE_VERSION = '"+NEXT+"'");
});
edit('public/game.js',s=>{
 s=injectOnce(s,"from './level-curve-v460.js?", "import { xpThresholdV1770, xpThresholdV1915, migratePilotXpV1915 } from './level-curve-v1915.js?v="+OLD+"';",
 "import { xpThresholdV1770, xpThresholdV1915, migratePilotXpV1915 } from './level-curve-v1915.js?v="+OLD+"';\nimport { xpThresholdV460, migratePilotXpV460 } from './level-curve-v460.js?v="+NEXT+"';",'public/game.js');
 s=injectOnce(s,"from './modules/galactic-balance-v460.js?", "import {galacticLevelV451,applyGalacticProgressionV451} from './modules/galactic-progression-v451.js?v="+OLD+"';",
 "import {galacticLevelV451,applyGalacticProgressionV451} from './modules/galactic-progression-v451.js?v="+OLD+"';\nimport {progressionMilestonesV460} from './modules/galactic-balance-v460.js?v="+NEXT+"';",'public/game.js');
 s=injectOnce(s,'function levelXpThreshold(level){return xpThresholdV460(level);}',
 'function levelXpThreshold(level){return xpThresholdV1915(level);}',
 'function levelXpThreshold(level){return xpThresholdV460(level);}', 'public/game.js');
 s=injectOnce(s,'function migratePlayerXpCurveV460()',
 'function migratePlayerXpCurveV1915(){',
 'function migratePlayerXpCurveV460(){if(migratePilotXpV460(progress?.profile,PLAYER_MAX_LEVEL))cloudDirty=true;}\nfunction migratePlayerXpCurveV1915(){','public/game.js');
 s=injectOnce(s,'migratePlayerXpCurveV460();',
 '  migratePlayerXpCurveV1915();\n  progress.profile.level=levelFromXp(progress.profile.xp,PLAYER_MAX_LEVEL);',
 '  migratePlayerXpCurveV1915();\n  migratePlayerXpCurveV460();\n  progress.profile.level=levelFromXp(progress.profile.xp,PLAYER_MAX_LEVEL);','public/game.js');
 const before=`function progressionUnlocksAtLevel(level){
  const out=[];
  if(level===3)out.push('MAPA X-2');
  if(level===5)out.push('MISSÕES DIÁRIAS');
  if(level===6)out.push('PERFIL DE PILOTO');
  if(level===7)out.push('MAPA X-3','MISSÕES SEMANAIS');
  if(level===8)out.push('CLÃ');
  if(level===10)out.push('MAPA X-4','MISSÕES MENSAIS');
  if(level===12)out.push('MISSÕES ESPECIAIS');
  if(level===15)out.push('BATTLE MAPS');
  return out;
}`;
 s=injectOnce(s,'function progressionUnlocksAtLevel(level){return progressionMilestonesV460(level);}',before,
 'function progressionUnlocksAtLevel(level){return progressionMilestonesV460(level);}','public/game.js');
 return s;
});
edit('public/modules/unified-expansion-v42.js',s=>{
 s=injectOnce(s,"from './galactic-balance-panel-v460.js", "import {renderFrontierAuditV450} from './frontier-audit-v450.js';",
 "import {renderGalacticBalanceV460} from './galactic-balance-panel-v460.js';\nimport {renderFrontierAuditV450} from './frontier-audit-v450.js';",'public/modules/unified-expansion-v42.js');
 s=injectOnce(s,'renderGalacticBalanceV460(root,tab,snapshot.isAdmin);',
 "if(tab==='admin' && snapshot?.isAdmin)void v421AdminRender(root);",
 "if(tab==='admin' && snapshot?.isAdmin){renderGalacticBalanceV460(root,tab,snapshot.isAdmin);void v421AdminRender(root);}",
 'public/modules/unified-expansion-v42.js');
 return s;
});
function walk(d){let files=[];for(const e of readdirSync(resolve(ROOT,d),{withFileTypes:true})){
 const rel=join(d,e.name);if(e.isDirectory())files.push(...walk(rel));else if(e.isFile()&&['.js','.mjs','.html','.css'].includes(extname(e.name)))files.push(rel);
 }return files;}
// Invalidate browser caches only. Avoid touching JSON, game saves, SQL and third-party assets.
for(const file of walk('public'))edit(file,s=>s.replaceAll('?v='+OLD,'?v='+NEXT));
// Older test assertions must follow version bumps; do not disable or remove regression suites.
for(const file of walk('tests').filter(p=>/v(?:435|440|450|451)-.*\.test\.mjs$/.test(p)))edit(file,s=>s
 .replaceAll("assert.equal(p.version,'"+OLD+"')","assert.equal(p.version,'"+NEXT+"')")
 .replaceAll("assert.equal(pkg.version,'"+OLD+"')","assert.equal(pkg.version,'"+NEXT+"')")
 .replaceAll('v451-apply-patch','v460-apply-patch')
 .replaceAll('/game.js?v='+OLD,'/game.js?v='+NEXT)
 .replaceAll("const RELEASE_VERSION = '"+OLD+"'","const RELEASE_VERSION = '"+NEXT+"'"));
requireAnchor(readFileSync(resolve(ROOT,'public/game.js'),'utf8'),'migratePlayerXpCurveV460();','public/game.js');
console.log('V46 XP migration, unlocked sectors, read-only balance panel and cache versions OK.');
