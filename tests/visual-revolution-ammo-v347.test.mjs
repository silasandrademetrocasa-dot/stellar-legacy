import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAmmoHudBudget,ammoDisplaySignature} from '../public/modules/ammo-hud-budget-v347.js';
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/style.css',import.meta.url),'utf8');
test('ammo hidden or collapsed never schedules DOM painting',()=>{
 const h=createAmmoHudBudget();
 assert.equal(h.shouldPaint({visible:false,mobile:true,now:0}),false);
 assert.equal(h.shouldPaint({visible:false,mobile:true,now:900}),false);
 assert.equal(h.shouldPaint({visible:true,mobile:true,now:901}),true);
});
test('ammo mobile refresh budget coalesces repeated frame HUD calls',()=>{
 const h=createAmmoHudBudget({mobileIntervalMs:580});
 assert.equal(h.shouldPaint({mobile:true,now:0}),true);
 assert.equal(h.shouldPaint({mobile:true,now:300}),false);
 assert.equal(h.shouldPaint({mobile:true,now:579}),false);
 assert.equal(h.shouldPaint({mobile:true,now:580}),true);
 assert.equal(h.shouldPaint({mobile:true,now:581,force:true}),true);
});
test('opening the ammo drawer paints pending ammo immediately',()=>{
 const h=createAmmoHudBudget();
 assert.equal(h.shouldPaint({mobile:true,now:0}),true);
 assert.equal(h.shouldPaint({visible:false,mobile:true,now:20}),false);
 assert.equal(h.shouldPaint({visible:true,mobile:true,now:30}),true);
});
test('display fingerprint changes on quantity, selection or drone/aux laser count',()=>{
 const a=ammoDisplaySignature(100,true,15,4);
 assert.equal(a,ammoDisplaySignature(100,true,15,4));
 assert.notEqual(a,ammoDisplaySignature(99,true,15,4));
 assert.notEqual(a,ammoDisplaySignature(100,false,15,4));
 assert.notEqual(a,ammoDisplaySignature(100,true,16,4));
 assert.notEqual(a,ammoDisplaySignature(100,true,15,5));
});
test('visual update is per button, and hotkeys do not rebuild the whole ammo panel',()=>{
 assert.match(game,/const AMMO_HUD_BUTTONS=\{laser:new Map\(\),rocket:new Map\(\)\}/);
 assert.match(game,/if\(btn\.dataset\.ammoSignature===signature\)return/);
 assert.match(game,/function ammoPanelVisibleV347/);
 assert.match(game,/progress\.selectedLaserAmmo=Object\.keys\(LASER_AMMO\)\[Number\(e\.key\)-1\];refreshAmmoCounters\(true\)/);
});
test('optimized low-graphics engine fins avoid per-frame gradients',()=>{
 assert.match(game,/function drawEngineWakeLocal[\s\S]+?if\(resolvedQualityMode\(\)===.low.\)/);
 assert.match(game,/const span=Math\.max\(2,size\*\.12\)/);
 assert.match(css,/mobile-landscape-pro #weaponBar\.compact-ammo-ui/);
 assert.match(css,/animation:none!important/);
});
