import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {frontierRoomTerritoryV4775,frontierWrongFactionV4775,frontierEntryDenialV4775} from '../server/frontier-ux-admission-v4775.js';
import {sectorEntryAllowedV450} from '../server/frontier-stability-v450.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const F=['earth','mars','jupiter'];
for(const map of ['u1','u2','u3'])test(`V47.7.6 ${map}: neutral frontier uses authenticated faction, never 'battle'`,()=>{
 for(const faction of F){
  for(const injected of ['battle',null,undefined,'earth','mars','jupiter','admin','']){
   assert.equal(frontierRoomTerritoryV4775(map,faction,injected,true),faction);
   assert.equal(frontierRoomTerritoryV4775(map,faction,injected,false),faction);
   assert.equal(frontierWrongFactionV4775(map,faction,injected,false),false);
  }
  assert.equal(sectorEntryAllowedV450(map,true,{enabled:true,territory_faction:null},faction),true);
 }
});
test('V47.7.6 X-1..8 remains faction-protected; admin foreign navigation explicit only',()=>{
 for(const faction of F){
  const other=F.find(x=>x!==faction);
  for(const map of ['x1','x4','x8']){
   assert.equal(frontierRoomTerritoryV4775(map,faction,other,false),faction);
   assert.equal(frontierWrongFactionV4775(map,faction,other,false),true);
   assert.equal(frontierRoomTerritoryV4775(map,faction,other,true),other);
   assert.equal(frontierWrongFactionV4775(map,faction,other,true),false);
   assert.equal(frontierRoomTerritoryV4775(map,faction,'battle',true),faction);
  }
 }
});
test('V47.7.6 does not let untrusted faction or map values create private rooms',()=>{
 for(const map of ['u1','x1','b41','b42','b43','unknown']){
  assert.equal(frontierRoomTerritoryV4775(map,'battle','mars',true),null);
  assert.equal(frontierRoomTerritoryV4775(map,'',null,false),null);
 }
 assert.equal(frontierRoomTerritoryV4775('b41','earth','mars',true),null);
});
test('V47.7.6 specific denial reasons are based on authoritative validation',()=>{
 const base={dest:{enabled:true,gate:false},validTerritory:true,sectorValid:true,wrongFaction:false,admin:false,level:30,required:20,faction:'earth'};
 assert.match(frontierEntryDenialV4775({...base,level:19}),/Requer nível 20/);
 assert.match(frontierEntryDenialV4775({...base,sectorValid:false}),/não sincronizado/);
 assert.match(frontierEntryDenialV4775({...base,validTerritory:false}),/Facção/);
 assert.equal(frontierEntryDenialV4775({...base,wrongFaction:true}),'INVASÕES BLOQUEADAS');
});
test('V47.7.6 authoritative WebSocket join uses U-X neutral routing and no X bypass',()=>{
 const s=read('server/world.js');
 assert.match(s,/frontierRoomTerritoryV4775\(mapId,faction,msg\.territoryFaction,admin\)/);
 assert.match(s,/frontierWrongFactionV4775\(mapId,faction,msg\.territoryFaction,admin\)/);
 assert.match(s,/const sectorValid=sectorEntryAllowedV450/);
 assert.match(s,/!admin&&level<required/);
 assert.match(s,/world\.refreshNpcConfig\(false\)/);
 assert.match(s,/ws\.room!==r\|\|r\.npcs\.size>0/);
});
test('V47.7.6 selected NPC mini-target hides NEXT and preserves its usable expand control',()=>{
 const css=read('public/style.css');
 assert.match(css,/#rightHudStack > #targetLockHud\.collapsed #nextNpcTargetV32\s*\{\s*display:none!important/);
 assert.match(css,/#rightHudStack > #targetLockHud\.collapsed\s*\{/);
 assert.match(css,/#targetLockToggle\s*\{/);
 assert.match(read('public/index.html'),/id="targetLockToggle"/);
 const game=read('public/game.js');
 assert.match(game,/toggleTargetLockUi\(\)/);
 assert.match(game,/loadTargetLockUiState/);
});
test('V47.7.6 leaves stable FPS, sound, renderer, bot AI and saves intact',()=>{
 const patch=read('scripts/v4776-apply-patch.mjs');
 const packageJSON=JSON.parse(read('package.json'));
 assert.equal(packageJSON.version,'47.7.6');
 assert.match(packageJSON.scripts.check,/v4776-apply-patch/);
 assert.doesNotMatch(patch,/UPDATE\s+game_saves|DROP\s+TABLE|fps\s*[:=]\s*30|warbotTacticalMove\(|\.damage\s*=|\.speed\s*=/i);
 assert.match(read('server/world.js'),/join_map/);
});
