#!/usr/bin/env node
// V47.7.5: strict source-anchored incremental patch. No DB writes or game-economy changes.
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve,dirname,join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const OLD='47.7.4',NEW='47.7.5';
const read=file=>readFileSync(resolve(root,file),'utf8');
let changed=0;
function edit(file,fn){const old=read(file),next=fn(old);if(old!==next){writeFileSync(resolve(root,file),next);changed++;}}
function replaceOne(s,old,updated,label){
 if(s.includes(updated))return s;
 const count=s.split(old).length-1;
 if(count!==1)throw Error(`V47.7.5 ${label}: expected one source anchor, got ${count}`);
 return s.replace(old,updated);
}
function walk(dir){return readdirSync(resolve(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):e.isFile()?[join(dir,e.name)]:[]);}
if(JSON.parse(read('package.json')).version!==NEW)throw Error('Expected package 47.7.5');
if(!read('server/frontier-ux-admission-v4775.js').includes('frontierRoomTerritoryV4775'))throw Error('Missing U-X routing module');
edit('server/world.js',s=>{
  if(!s.includes("from './frontier-ux-admission-v4775.js'"))s="import {frontierRoomTerritoryV4775,frontierWrongFactionV4775,frontierEntryDenialV4775} from './frontier-ux-admission-v4775.js';\n"+s;
  s=replaceOne(s,
    `        const territory=territorial?(admin?String(msg.territoryFaction||faction):faction):null;`,
    `        // Neutral U-X is isolated by the authenticated pilot's faction, never the UI 'battle' sentinel.\n        const territory=territorial?frontierRoomTerritoryV4775(mapId,faction,msg.territoryFaction,admin):null;`,
    'U-X authoritative room faction');
  s=replaceOne(s,
    `        const wrongFaction=!admin&&territorial&&String(msg.territoryFaction||faction)!==faction;`,
    `        const wrongFaction=frontierWrongFactionV4775(mapId,faction,msg.territoryFaction,admin);`,
    'X-only foreign territory protection');
  s=replaceOne(s,
    `reason:wrongFaction?'INVASÕES BLOQUEADAS':\`Setor indisponível / nível mínimo \${required}\``,
    `reason:frontierEntryDenialV4775({dest,validTerritory,sectorValid,wrongFaction,admin,level,required,faction})`,
    'actionable U-X denial reason');
  return s;
});
edit('public/game.js',s=>replaceOne(s,
  `      showToast('U-X • entrada negada pelo servidor. Verifique a permissão ADM e o nível.','system');`,
  `      // Display the actual server-side rejection; level 30 alone cannot fix a bad room partition.\n      showToast('U-X • '+sharedUniverseRuntime.mapError,'system');`,
  'frontier join diagnostic visible to pilot'));
const css=`
/* V47.7.5 TARGET LOCK: tiny HUD button must not contain the NEXT NPC action.
   Fixes the action pushing the expand arrow off-screen in mobile landscape. */
#rightHudStack > #targetLockHud.collapsed{
  box-sizing:border-box!important;align-self:flex-end!important;
  width:40px!important;min-width:40px!important;max-width:40px!important;
  height:40px!important;min-height:40px!important;max-height:40px!important;
  padding:0!important;margin:0!important;overflow:hidden!important;pointer-events:auto!important;
}
#rightHudStack > #targetLockHud.collapsed #nextNpcTargetV32{display:none!important;}
#rightHudStack > #targetLockHud.collapsed .target-lock-main,
#rightHudStack > #targetLockHud.collapsed .target-lock-detail,
#rightHudStack > #targetLockHud.collapsed .target-lock-head>span:first-child,
#rightHudStack > #targetLockHud.collapsed .target-lock-head-actions>b{display:none!important;}
#rightHudStack > #targetLockHud.collapsed .target-lock-head,
#rightHudStack > #targetLockHud.collapsed .target-lock-head-actions{
  display:flex!important;justify-content:center!important;align-items:center!important;
  width:40px!important;min-width:0!important;max-width:40px!important;
  height:40px!important;min-height:40px!important;max-height:40px!important;
  padding:0!important;margin:0!important;gap:0!important;
}
#rightHudStack > #targetLockHud.collapsed #targetLockToggle{
  display:grid!important;place-items:center!important;flex:0 0 40px!important;
  width:40px!important;height:40px!important;min-width:40px!important;
  padding:0!important;margin:0!important;transform:none!important;
  background:transparent!important;border:0!important;cursor:pointer!important;
  pointer-events:auto!important;touch-action:manipulation;
}
`;
edit('public/style.css',s=>s.includes('/* V47.7.5 TARGET LOCK:')?s:s+css);
for(const file of walk('public').filter(f=>['.js','.mjs','.html','.css','.webmanifest'].includes(extname(f)))){
 edit(file,s=>s.replaceAll('?v='+OLD,'?v='+NEW));
}
edit('server/index.js',s=>replaceOne(s,`const RELEASE_VERSION = '${OLD}'`,`const RELEASE_VERSION = '${NEW}'`,'release version'));
for(const file of walk('tests').filter(f=>f.endsWith('.test.mjs')&&!f.endsWith('frontier-hud-v4775.test.mjs'))){
 edit(file,s=>s.replaceAll(OLD,NEW).replaceAll(OLD.replaceAll('.','\\.'),NEW.replaceAll('.','\\.')).replaceAll('v4774-apply-patch','v4775-apply-patch'));
}
// V47.7.5 FIX2: preserve the original V47.7.2 FPS regression test after upgrading.
// The historical test inspected the *current installer script* for a comment from
// V47.7.2. That comment is not copied across releases, but the real optimization is.
// Test its shipped behavior in game.js instead, without weakening its guarantee.
edit('tests/warbot-stability-v4772.test.mjs',s=>replaceOne(s,
  " assert.ok(patch.includes('offscreen battle effects'));",
  " assert.ok(read('public/game.js').includes('if(!onScreenWorld(Number(a.x),Number(a.y),160)&&!onScreenWorld(Number(b.x),Number(b.y),160))return true;'),'offscreen battle effects must remain active in gameplay');",
  'legacy offscreen FPS regression checks game behavior rather than old installer comments'));
for(const [file,needle] of [
 ['server/world.js','frontierRoomTerritoryV4775(mapId,faction,msg.territoryFaction,admin)'],
 ['server/world.js','frontierWrongFactionV4775(mapId,faction,msg.territoryFaction,admin)'],
 ['public/style.css','#rightHudStack > #targetLockHud.collapsed #nextNpcTargetV32{display:none!important'],
 ['public/game.js',"showToast('U-X • '+sharedUniverseRuntime.mapError,'system')"],
 ['server/index.js',`const RELEASE_VERSION = '${NEW}'`],
 ['public/index.html',`/game.js?v=${NEW}`]
])if(!read(file).includes(needle))throw Error(`V47.7.5 incomplete: ${file} ${needle}`);
console.log(`✅ V47.7.5 U-X admission + target lock fix, ${changed} file edits; no DB or FPS changes.`);
