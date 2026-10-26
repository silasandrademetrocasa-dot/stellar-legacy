import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAdaptiveResolution} from '../public/modules/adaptive-resolution-v70.js';
import {relaySpriteRectV74,drawRelaySpriteV74} from '../public/modules/relay-sprite-framing-v74.js';

const source=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/style.css',import.meta.url),'utf8');

test('V74: rAF stall with inexpensive measured work cannot reset Canvas',()=>{
 const s=createAdaptiveResolution({mobile:true,cooldownMs:1,windowMs:200});
 s.setMode('medium');let t=0;
 for(let i=0;i<28;i++){t+=300;s.observe(t,8,100);}
 assert.equal(s.scale(),.9);
});
test('V74: heavy actual Canvas work can still reduce render scale',()=>{
 const s=createAdaptiveResolution({mobile:true,cooldownMs:1,windowMs:200});
 s.setMode('medium');let t=0;
 for(let i=0;i<10;i++){t+=300;s.observe(t,40,60);}
 assert.ok(s.scale()<.9);
});
test('V74: relay crops scale by image dimensions but use same centre & size',()=>{
 for(let level=1;level<=3;level++){
  const a=relaySpriteRectV74(level,200,240),b=relaySpriteRectV74(level,300,360);
  assert.equal(b.dx,a.dx);assert.equal(b.dy,a.dy);
  assert.equal(b.dw,a.dw);assert.equal(b.dh,a.dh);
  assert.equal(b.sx,a.sx*1.5);assert.equal(b.sy,a.sy*1.5);
  let args=null;const ctx={drawImage(...v){args=v;}};
  drawRelaySpriteV74(ctx,{naturalWidth:200,naturalHeight:240},level);
  assert.equal(args.length,9);assert.equal(args[5],-a.dw/2);assert.equal(args[6],-a.dh/2);
 }
});
test('V74: no late canvas reset; game state and hitboxes untouched',()=>{
 assert.match(source,/if\(pendingCanvasResolutionV74\)\{pendingCanvasResolutionV74=false;resize\(\);\}/);
 assert.match(source,/observe\(t,performance\.now\(\)-adaptiveFrameStart,frameInterval\)\)pendingCanvasResolutionV74=true/);
 assert.match(source,/updatePlayer\(dt\);updateSharedUniverseInterpolation\(dt\);updateEnemies\(dt\);updatePet\(dt\)/);
 assert.match(source,/economicalRingV74=DEVICE_CAPS\.mobile/);
 assert.match(source,/addEventListener\('resize', \(\)=>\{pendingCanvasResolutionV74=true;\}\)/);
 assert.match(css,/body\[data-device="mobile"\]\[data-quality="medium"\] \.hud-panel/);
 assert.match(css,/-webkit-backdrop-filter:none!important/);
});
