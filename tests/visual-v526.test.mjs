import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {modelYawFromHeadingV526,npcDisplaySizeV526,oreDisplaySizeV526,boxDisplaySizeV526,lootDisplaySizeV526,modelZoomFactorV526} from '../public/modules/visual-scale-v526.js';
const text=name=>readFileSync(new URL(`../${name}`, import.meta.url),'utf8');
const game=text('public/game.js');
const renderer=text('public/modules/stellar-ship3d-v50.js');
const data=text('public/data.js');
const normalizeAngle=(a)=>((a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
function projectedScreenForward(heading){
 const yaw=modelYawFromHeadingV526(heading);
 const forwardX=Math.sin(yaw),forwardZ=Math.cos(yaw);
 return [forwardX===0||Math.abs(forwardX)<1e-10?0:Math.round(forwardX*1000)/1000,Math.abs(forwardZ)<1e-10?0:Math.round(-forwardZ*1000)/1000];
}
test('3D follows screen coordinate convention across 4 headings (matches 2D and movement)',()=>{
 assert.deepEqual(projectedScreenForward(0),[1,0]);  // right
 assert.deepEqual(projectedScreenForward(Math.PI/2),[0,1]);  // down
 assert.deepEqual(projectedScreenForward(Math.PI),[-1,0]);  // left
 assert.deepEqual(projectedScreenForward(3*Math.PI/2),[0,-1]);  // up
 assert.match(renderer,/modelYawFromHeadingV526\(angle\)/);
 assert.doesNotMatch(renderer,/Math\.PI\/2-angle/);
 for(let i=0;i<32;i++){
  const h=i*Math.PI*2/32;
  const [x,y]=projectedScreenForward(h);
  assert(Math.abs(x-Math.cos(h))<.002);
  assert(Math.abs(y-Math.sin(h))<.002);
 }
});
test('Visual scale 3D/2D for smaller NPCs, preserve boss dimension',()=>{
 assert(npcDisplaySizeV526(14,false)>=76);
 assert(npcDisplaySizeV526(15,false)>15*3.08);
 assert(npcDisplaySizeV526(18,false)>18*3.08);
 assert.equal(npcDisplaySizeV526(40,true),40*3.45);
 assert(npcDisplaySizeV526(50,false)<=126);
 const seg=game.slice(game.indexOf('function drawEnemy(e){'),game.indexOf('function drawDrones(p)'));
 assert.match(seg,/displaySize=npcDisplaySizeV526\(e.size,boss\)/);
 assert.match(seg,/\.drawAsset\(ctx,'npc_'\+e\.type,[\s\S]*?,displaySize\)/);
 assert.match(seg,/face=heading\+Math\.PI\/2,size=displaySize/);
 assert.doesNotMatch(seg,/face=heading-Math\.PI\/2/);
 assert.match(seg,/visualRadius/);
});
test('Mineral and boxes are enlarged in BOTH GLB and sprites, no simulation change',()=>{
 for(const r of [6,8,10,12]){
  assert(oreDisplaySizeV526(r,'3d')>r*3.2);
  assert(oreDisplaySizeV526(r,'2d')>r*2.35);
 }
 assert.equal(boxDisplaySizeV526(true),56);
 assert.equal(boxDisplaySizeV526(false),62);
 assert(lootDisplaySizeV526(1)>42);
 for(const expression of ['oreDisplaySizeV526(o.r,\'3d\')','oreDisplaySizeV526(o.r,\'2d\')','boxDisplaySizeV526(low)','lootDisplaySizeV526(pulse)'])assert(game.includes(expression),expression);
 assert.match(game,/function makeEnemy\(type\)/);
 assert.match(game,/function spawnOre\(type=null\)/);
 assert.match(data,/streuner:\s*\{[^\n]*size:\s*15/);
});
test('Cache bump forces updated scripts rather than stale renderer on Android',()=>{
 const current=JSON.parse(text('package.json')).version; assert.match(current,/^\d+\.\d+\.\d+$/);
 const html=text('public/index.html');
 assert(html.includes('/game.js?v='+current));
 assert(game.includes('stellar-ship3d-v50.js?v='+current));
 assert.equal(normalizeAngle(modelYawFromHeadingV526(0)),Math.PI/2);
});

test('Model framing zoom compensates small GLBs without inflating bosses or ships',()=>{
 const box=modelZoomFactorV526('box_bonus',1.5);
 const ore=modelZoomFactorV526('ore_Prometium',2.6);
 const npc=modelZoomFactorV526('npc_streuner',3.06);
 assert(box>2.8&&box<=3.4);
 assert(ore>2);
 assert(npc>1.5);
 assert.equal(modelZoomFactorV526('phoenix',5.8),1);
 assert.equal(modelZoomFactorV526('npc_bossStreuner',3.86),1);
 assert.match(renderer,/modelZoom\.set\(id,viewportScale\*modelZoomFactorV526\(id,span\)\)/);
 assert.match(renderer,/modelZoom\.get\(shipId\)\|\|viewportScale/);
});
