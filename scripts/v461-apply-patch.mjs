#!/usr/bin/env node
// Idempotent V46.1 linear portaling patch. Does not modify saves, balances or accounts.
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve,dirname,join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const OLD='46.0.0',NEW='46.1.0';
function edit(file,fn){const p=resolve(ROOT,file),before=readFileSync(p,'utf8'),after=fn(before);if(after!==before)writeFileSync(p,after)}
function replace(s,old,updated,file){
 if(s.includes(updated))return s;
 if(!s.includes(old))throw Error('V461 missing anchor '+file+' '+old.slice(0,90));
 return s.replace(old,updated);
}
function walk(dir){return readdirSync(resolve(ROOT,dir),{withFileTypes:true}).flatMap(e=>{const p=join(dir,e.name);return e.isDirectory()?walk(p):e.isFile()? [p]:[]})}
edit('server/index.js',s=>replace(s,"const RELEASE_VERSION = '"+OLD+"'","const RELEASE_VERSION = '"+NEW+"'",'server/index.js'));
edit('server/world.js',s=>{
 const intro="import {portalPointV461} from '../public/modules/portal-layout-v461.js';\n";
 if(!s.includes(intro))s=intro+s;
 if(!s.includes('const pos=portalPointV461(origin.sector_label,target,map.world)||this.portalEdgePoint(')){
  const pattern=/const pos=this\.portalEdgePoint\(origin\.sector_label,target,map\);if\(mapId==='x8'\)\{[\s\S]*?\}\s*out\.push\(/;
  if(!pattern.test(s))throw Error('V461 server portal placement anchor unavailable');
  s=s.replace(pattern,'const pos=portalPointV461(origin.sector_label,target,map.world)||this.portalEdgePoint(origin.sector_label,target,map);out.push(');
 }
 return s;
});
edit('public/game.js',s=>{
 const intro="import {portalPointV461,CANONICAL_LINKS_V461} from './modules/portal-layout-v461.js?v="+NEW+"';\n";
 if(!s.includes('from \'./modules/portal-layout-v461.js?'))s=intro+s;
 // Official topology even during Supabase cache failure. Runtime SQL may still override after reload.
 const insert='MAP_GRAPH_LINKS.splice(0,MAP_GRAPH_LINKS.length,...CANONICAL_LINKS_V461.map(([a,b])=>[a,b]));\n';
 s=replace(s,'const PLAYABLE_GRAPH_LABELS = new Set',insert+'const PLAYABLE_GRAPH_LABELS = new Set','public/game.js');
 // Using fixed positions only for X and 4-X maps. U maps retain previous code positions.
 s=replace(s,'function portalEdgePoint(fromLabel,toLabel,map){\n  const a=graphNode(fromLabel)',
 'function portalEdgePoint(fromLabel,toLabel,map){\n  const fixed=portalPointV461(fromLabel,toLabel,map.world);if(fixed)return fixed;\n  const a=graphNode(fromLabel)','public/game.js');
 const oldStart="    // Segunda base X-8: o retorno para X-7 fica longe da plataforma segura,";
 if(s.includes(oldStart)){
   const pattern=/    \/\/ Segunda base X-8:[\s\S]*?\n    if\(origin\.mapId==='x8'\)\{[\s\S]*?\n    \}/;
   if(!pattern.test(s))throw Error('V461 X8 special portal override not found');
   s=s.replace(pattern,'    // V46.1: X-7 em uma borda e U-1 exatamente no centro, sem sobreposição.');
 }
 s=replace(s,'filteredFrontierPortalsV440(label,progress?.profile?.faction,graphNeighbors(label),worldRuntimeConfig.sectorDestinations.has(\'U-1\'))',
 'filteredFrontierPortalsV440(label,progress?.profile?.faction,graphNeighbors(label),worldRuntimeConfig.sectorDestinations.has(\'U-1\'),map.world)', 'public/game.js');
 // Bonus map jumps may not bypass entry to PvP from one's own X-1 portal.
 s=replace(s,'const canJump=access.ok&&!active&&(adminJump||jumps>0);',
 'const canJump=access.ok&&!active&&(adminJump||(!battle&&jumps>0&&graphNeighbors(current).includes(node.id)));','public/game.js');
 s=replace(s,`    const adminJump=isVerifiedAdminNavigator();\n    if(!adminJump&&progress.galaxyGate.jumpBonus<=0){`,
 `    const adminJump=isVerifiedAdminNavigator();\n    if(!adminJump&&access.battle){showToast('Batalhas Galácticas • use o portal na base X-1 da sua facção');return;}\n    if(!adminJump&&!graphNeighbors(current).includes(label)){showToast('Rota linear • avance de um setor por vez');return;}\n    if(!adminJump&&progress.galaxyGate.jumpBonus<=0){`,'public/game.js');
 return s;
});
edit('public/modules/frontier-routing-v440.js',s=>{
 const intro="import {portalPointV461} from './portal-layout-v461.js';\n";
 if(!s.includes(intro))s=intro+s;
 s=replace(s,'return uniqueFrontierPortalsV440(out.map(p=>positions.has(p.targetLabel)?{...p,...positions.get(p.targetLabel)}:p));',
 `return uniqueFrontierPortalsV440(out.map(p=>{const inherited=positions.get(p.targetLabel);const q=inherited?{...p,...inherited}:p;const prefix=({earth:'1',mars:'2',jupiter:'3'})[faction]||'1';const fixed=portalPointV461(mapId==='x8'?prefix+'-8':'',p.targetLabel,map?.world);return fixed?{...q,...fixed}:q;}));`, 'public/modules/frontier-routing-v440.js');
 s=replace(s,'export function filteredFrontierPortalsV440(label,faction,neighbors,managed){',
 'export function filteredFrontierPortalsV440(label,faction,neighbors,managed,world=null){','public/modules/frontier-routing-v440.js');
 s=replace(s,'return uniqueFrontierPortalsV440(base.filter(p=>allowed.has(p.targetLabel)));',
 'return uniqueFrontierPortalsV440(base.filter(p=>allowed.has(p.targetLabel)).map(p=>{const fixed=world&&portalPointV461(label,p.targetLabel,world);return fixed?{...p,...fixed}:p;}));','public/modules/frontier-routing-v440.js');
 return s;
});
// Mark V46.1 using cache-busting throughout user-facing files. No economics or game saves changed.
for(const file of walk('public').filter(f=>['.js','.mjs','.html','.css'].includes(extname(f))))edit(file,s=>s.replaceAll('?v='+OLD,'?v='+NEW));
for(const file of walk('tests').filter(f=>f.endsWith('.test.mjs')))edit(file,s=>s
 .replaceAll("assert.equal(p.version,'"+OLD+"')","assert.equal(p.version,'"+NEW+"')")
 .replaceAll("assert.equal(pkg.version,'"+OLD+"')","assert.equal(pkg.version,'"+NEW+"')")
 .replaceAll('v460-apply-patch','v461-apply-patch')
 .replaceAll('/game.js?v='+OLD,'/game.js?v='+NEW)
 .replaceAll("const RELEASE_VERSION = '"+OLD+"'","const RELEASE_VERSION = '"+NEW+"'"));
// Preserve the V44 safety regression while validating the NEW V46.1 center-position design.
// Old V44 asserted that X-8 -> U-1 was on the upper-right edge. The approved map
// has that exit at the actual center, and disabled topology must STILL stay disabled.
edit('tests/v440-galactic-supremacy.test.mjs',s=>replace(s,
 'assert.equal(server[0].x,11130);\n assert.equal(server[0].y,1650);',
 'assert.equal(server[0].x,Math.round(map.world.w/2));\n assert.equal(server[0].y,Math.round(map.world.h/2));',
 'tests/v440-galactic-supremacy.test.mjs'));
console.log('V46.1: rotas lineares, posições por facção e bloqueio de salto PvP atualizados.');
