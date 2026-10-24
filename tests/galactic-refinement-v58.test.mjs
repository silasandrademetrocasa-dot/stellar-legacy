import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const game=read('public/game.js'),html=read('public/index.html'),css=read('public/modules/stellar-refinement-v58.css');
test('V58: art from top-forward camera for all 13 GLB ships and AUX',()=>{
 for(const n of ['aurora','bastion','bulwark','kensei','leviathan','lynx','meridian','pathfinder','phantom','pioneer','raptor','seraph','valkyrie']){
  const p=resolve(root,`public/assets/v58/ships/${n}.webp`);assert(existsSync(p),n);
  assert.equal(readFileSync(p).subarray(0,4).toString(),'RIFF',n);
 }
 assert(existsSync(resolve(root,'public/assets/v58/aux/aux9-perspective.webp')));
 assert.match(game,/v56ShipPerspectiveArt\(ship\.id\)/);
 assert.match(game,/auxVisualArtV64\('aux9'\)/);
 assert(existsSync(resolve(root,'public/assets/v64/aux/aux9.webp')));
});
test('V58: the map base trade button is viewport-anchored and not world-screen positioned',()=>{
 const fn=game.slice(game.indexOf('function updateBaseTradePrompt(){'),game.indexOf('function updateUI(){'));
 assert(!fn.includes('screenPos('));
 assert(fn.includes("removeProperty('left')"));
 assert.match(css,/#baseTradePrompt\{position:fixed!important/);
 assert.match(css,/animation:none!important/);
});
test('V58: designers only in ship selection; no second image of AUX in equipment',()=>{
 const equip=game.slice(game.indexOf('function v56EquipmentView(){'),game.indexOf('function renderHangar(){'));
 assert(!equip.includes('v56-designer-jump'));
 assert.match(equip,/v58-aux-view/);
 assert.match(css,/#hangarModal \.pet-hangar-panel \.pet-hero \.pet-avatar\{display:none!important/);
 assert.match(game,/PERSONALIZAR NAVE ELITE/);
});
test('V58: accessibility-preserving compact CSS in landscape, portrait and premium/cargo/ADM',()=>{
 for(const s of ['#topbar.compact-command-bar','#premiumModal .premium-product','#cargoModal .base-service-card','#adminModal .v57-adm-nav','#hangarModal .v56-unit-body','orientation:landscape','orientation:portrait'])assert(css.includes(s),s);
 assert(html.includes('stellar-refinement-v58.css?v=47.7.13'));
});
test('V58: game economy remains server-driven and shared configurations preserved',()=>{
 assert(game.includes('switchBattleConfigV2013(n)'));
 assert(game.includes('renderHangarDrones()'));
 assert(game.includes('renderHangarPet()'));
 assert(game.includes('canChangeEquipment()'));
 assert(game.includes('renderPremiumStageV18213()'));
 assert(game.includes('renderBaseServices()'));
});
test('V58: map background no longer draws translucent image over blank canvas',()=>{
 const a=game.slice(game.indexOf('function drawMapBackground(){'),game.indexOf('function drawMapBackground(){')+2300);
 assert(a.includes("state.currentMap?.palette?.deep||'#061426'"));
 assert(a.indexOf("ctx.fillRect(0,0,W,H)")<a.indexOf("ctx.globalAlpha=q.backgroundAlpha"));
});
