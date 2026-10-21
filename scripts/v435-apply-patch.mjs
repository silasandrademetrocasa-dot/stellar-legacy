#!/usr/bin/env node
// One additive integration patch. Execution twice is harmless.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const OLD='43.1.0',NEXT='43.5.0';
function edit(p,fn){const f=resolve(ROOT,p),a=readFileSync(f,'utf8'),b=fn(a);if(a!==b)writeFileSync(f,b);}
function must(s,needle,place){if(!s.includes(needle))throw Error('Integration anchor missing: '+place+' :: '+needle.slice(0,80));}
function before(s,anchor,addon,p){must(s,anchor,p);return s.includes(addon)?s:s.replace(anchor,addon+anchor);}
function once(s,needle,replace,p){must(s,needle,p);return s.replace(needle,replace);}
edit('server/index.js',s=>{
 if(!s.includes("from './astral-integrations-v435.js'"))s="import {attachAstralIntegrationsV435} from './astral-integrations-v435.js';\n"+s;
 s=s.replace("const RELEASE_VERSION = '"+OLD+"'","const RELEASE_VERSION = '"+NEXT+"'");
 must(s,"const RELEASE_VERSION = '"+NEXT+"'",'server/index.js');
 s=before(s,'attachAstralCombatV431(app,{requireUser,asyncRoute});',"attachAstralIntegrationsV435(app,{requireUser,asyncRoute});\n",'server/index.js');
 return s;
});
edit('server/world.js',s=>{
 if(!s.includes('registerFrontierSectorsV435')){
  s="import {registerFrontierSectorsV435,frontierServerPortalsV435} from '../public/modules/frontier-sectors-v435.js';\n"+s;
  s=before(s,'const LIVE_OPS_REFRESH_MS',"registerFrontierSectorsV435(MAPS);\n",'server/world.js');
 }
 if(!s.includes('FRONTIER_ROOMS_V435')){
  const prefix='function roomKey(mapId,territoryFaction){';
  must(s,prefix,'server/world.js');
  s=s.replace("/^x[1-8]$/.test(mapId) ?", "/^(?:x[1-8]|u[1-3])$/.test(mapId) ?");
  s=s.replace('const territorial=/^x[1-8]$/.test(mapId);',"const territorial=/^(?:x[1-8]|u[1-3])$/.test(mapId); // FRONTIER_ROOMS_V435");
 }
 const fallback='if(!origin)return MAPS[mapId]?.portals||[];';
 if(!s.includes('frontierServerPortalsV435(mapId,territoryFaction,this.mapDefinition(mapId)||MAPS.x1)')){
  must(s,fallback,'server/world.js');s=s.replace(fallback,"if(!origin)return /\^u[1-3]$/.test(mapId)?frontierServerPortalsV435(mapId,territoryFaction,this.mapDefinition(mapId)||MAPS.x1):(MAPS[mapId]?.portals||[]);");
  s=s.replace('/\^u[1-3]$/.test(mapId)','/^u[1-3]$/.test(mapId)');
 }
 const anchor="}return out;},\n    loadBattleGroup:";
 if(!s.includes('frontierServerPortalsV435(mapId,territoryFaction,map)')){
  must(s,anchor,'server/world.js');
  s=s.replace(anchor,"}return out.concat(frontierServerPortalsV435(mapId,territoryFaction,map));},\n    loadBattleGroup:");
 }
 return s;
});
edit('public/api.js',s=>{
 if(!s.includes('export async function adminAstralModuleV435(')){
  must(s,'async function authedServerFetch(','public/api.js');
  s+=`\nexport async function adminAstralModuleV435(code,enabled){return authedServerFetch('/api/admin/frontier/astral-module',{method:'POST',body:JSON.stringify({code,enabled})});}\n`+
     `export async function loadRaidV435(){return authedServerFetch('/api/frontier/raid');}\n`+
     `export async function adminRaidV435(target,minimum,reward,enabled){return authedServerFetch('/api/admin/frontier/raid',{method:'POST',body:JSON.stringify({target,minimum,reward,enabled})});}\n`+
     `export async function claimRaidV435(){return authedServerFetch('/api/frontier/raid/claim',{method:'POST',body:'{}'});}\n`;
 }
 return s;
});
edit('public/game.js',s=>{
 s=s.replaceAll('?v='+OLD,'?v='+NEXT);
 if(!s.includes('registerFrontierSectorsV435'))s="import {registerFrontierSectorsV435,sectorDestinationV435,sectorLabelV435,sectorLevelV435,sectorPortalsV435} from './modules/frontier-sectors-v435.js?v="+NEXT+"';\n"+s;
 if(!s.includes('astralEquipmentBonusesV435'))s="import {astralEquipmentBonusesV435} from './modules/astral-systems-v435.js?v="+NEXT+"';\n"+s;
 s=before(s,'const WORLD_FALLBACK_MAPS=',"registerFrontierSectorsV435(MAPS);\n",'public/game.js');
 if(!s.includes('sectorLabelV435(mapId)'))s=once(s,"  if(map.gate)return map.label||'GATE';","  if(sectorLabelV435(mapId))return sectorLabelV435(mapId);\n  if(map.gate)return map.label||'GATE';",'public/game.js');
 if(!s.includes('const frontier=sectorDestinationV435(label);'))s=once(s,"function graphDestination(label){\n","function graphDestination(label){\n  const frontier=sectorDestinationV435(label);if(frontier)return frontier;\n",'public/game.js');
 if(!s.includes('const fLevel=sectorLevelV435(label);'))s=once(s,'function graphLevelRequirement(label){',"function graphLevelRequirement(label){const fLevel=sectorLevelV435(label);if(fLevel)return fLevel;",'public/game.js');
 s=s.replaceAll("!adminJump&&!dest.battle&&dest.territoryFaction!==progress?.profile?.faction", "!adminJump&&!dest.battle&&dest.territoryFaction&&dest.territoryFaction!==progress?.profile?.faction");
 s=s.replaceAll("const foreign=!dest.battle&&dest.territoryFaction!==progress.profile.faction", "const foreign=!dest.battle&&!!dest.territoryFaction&&dest.territoryFaction!==progress.profile.faction");
 const portalTail='  });\n}\nfunction resolvedPortals(';
 if(!s.includes('function ensureFrontierGraphV435(){')){
  const nodeAnchor='function graphNode(label){';
  const graph=`function ensureFrontierGraphV435(){
 const items=[['U-1',43,48],['U-2',54,37],['U-3',63,28]];
 for(const [id,x,y] of items)if(!MAP_GRAPH_NODES.some(n=>n.id===id))MAP_GRAPH_NODES.push({id,x,y});
 const edges=[['1-8','U-1'],['2-8','U-1'],['3-8','U-1'],['U-1','U-2'],['U-2','U-3']];
 for(const [a,b] of edges)if(!MAP_GRAPH_LINKS.some(e=>e[0]===a&&e[1]===b))MAP_GRAPH_LINKS.push([a,b]);
}
`;
  s=before(s,nodeAnchor,graph,'public/game.js');
  s=s.replace('function graphNode(label){','function graphNode(label){ensureFrontierGraphV435();');
  s=s.replace('function graphNeighbors(label){','function graphNeighbors(label){ensureFrontierGraphV435();');
  s=s.replace('function renderMapModal(){','function renderMapModal(){ensureFrontierGraphV435();');
  s=s.replace("n.id.startsWith(ownedPrefix+'-')||/^4-[123]$/.test(n.id)","n.id.startsWith(ownedPrefix+'-')||/^4-[123]$/.test(n.id)||/^U-[123]$/.test(n.id)");
 }
 if(!s.includes('sectorPortalsV435(label,progress?.profile?.faction)')){
  must(s,portalTail,'public/game.js');
  s=s.replace(portalTail,"  }).filter(p=>!sectorDestinationV435(p.targetLabel)&&!sectorDestinationV435(label)).concat(sectorPortalsV435(label,progress?.profile?.faction));\n}\nfunction resolvedPortals(");
 }
 const power='laserDamage*=1+(astralCombatV431.owner===getUser()?.id?verifiedAstralPveBonusV431(astralCombatV431.snapshot,progress?.combatConfigsV2013?.active||1):0)/100;';
 if(!s.includes('const astralV435=astralEquipmentBonusesV435')){
  must(s,power,'public/game.js');
  s=s.replace(power,"const astralV435=astralEquipmentBonusesV435(astralCombatV431.owner===getUser()?.id?astralCombatV431.snapshot:null,progress?.combatConfigsV2013?.active||1);"+
   "shield*=1+astralV435.shieldPercent/100;speed*=1+astralV435.speedPercent/100;laserDamage*=1+astralV435.npcDamagePercent/100;");
  const shieldEnd='progress.hp=player.hp;progress.shield=player.shield;\n}\n\nfunction initializeFaction(';
  must(s,shieldEnd,'public/game.js');
  s=s.replace(shieldEnd, 'if(keepRatio&&astralV435.shieldPercent>0)player.shield=Math.min(player.shield,preAstralShieldV435);\n  '+shieldEnd);
  s=s.replace('function computeStats(keepRatio=true){\n', 'function computeStats(keepRatio=true){\n  const preAstralShieldV435=player.shield;\n');
 }
 return s;
});
edit('public/modules/unified-expansion-v42.js',s=>{
 s=s.replaceAll('?v='+OLD,'?v='+NEXT);
 if(!s.includes("from './astral-operations-v435.js'"))s="import {renderAstralOperationsV435} from './astral-operations-v435.js';\n"+s;
 const anchor="if(tab==='forge'||tab==='admin')void renderAstralCombatAdminV431(root,tab,snapshot.isAdmin);";
 if(!s.includes('renderAstralOperationsV435(root,tab,snapshot.isAdmin)')){
  must(s,anchor,'public/modules/unified-expansion-v42.js');
  s=s.replace(anchor,"if(tab==='forge'||tab==='war'||tab==='admin')void renderAstralOperationsV435(root,tab,snapshot.isAdmin);");
 }
 return s;
});
for(const p of ['public/modules/astral-rewards-v381.js','public/modules/stage-a-v423.js','public/modules/stage-b-v426.js','public/modules/astral-combat-admin-v431.js'])edit(p,s=>s.replaceAll('?v='+OLD,'?v='+NEXT));
edit('public/index.html',s=>{s=s.replaceAll('?v='+OLD,'?v='+NEXT);must(s,'/game.js?v='+NEXT,'public/index.html');return s;});
edit('tests/v431-combat-evolution.test.mjs',s=>{
 s=s.replace("assert.equal(version,'43.1.0');","assert.match(version,/^43\\.\\d+\\.\\d+$/);");
 const oldCheck="assert.ok(game.includes('verifiedAstralPveBonusV431(astralCombatV431.snapshot'));";
 const currentCheck=[
  "assert.ok(game.includes('astralEquipmentBonusesV435(astralCombatV431.owner===getUser()?.id?astralCombatV431.snapshot:null'), 'Bonus requer inventario autenticado');",
  "assert.ok(game.includes('progress?.combatConfigsV2013?.active||1'), 'Bonus usa a configuracao ativa');",
  "assert.ok(game.includes('laserDamage*=1+astralV435.npcDamagePercent/100;'), 'Bonus PvE de armamento confirmado');",
  "assert.ok(game.includes('shield*=1+astralV435.shieldPercent/100;') && game.includes('speed*=1+astralV435.speedPercent/100;'), 'Bonus de suporte integrado nas estatisticas');"
 ].join('\n ');
 if(s.includes(oldCheck))s=s.replace(oldCheck,currentCheck);
 must(s,'astralEquipmentBonusesV435(astralCombatV431.owner===getUser()?.id?astralCombatV431.snapshot:null','tests/v431-combat-evolution.test.mjs');
 return s;
});
// The earlier stage tests already derive the release number dynamically, keep them intact.
console.log('Stellar V43.5 integrations are aligned.');
