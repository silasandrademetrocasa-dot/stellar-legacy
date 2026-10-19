import test from 'node:test';
import assert from 'node:assert/strict';
import { directionalIndex, directionalGrid, directionalGridForImage, facingAngle } from '../public/modules/sprite-orientation.js';
const P=Math.PI;
for(const frames of [16,32]){
 test(`${frames}: pontos cardeais, diagonais e ciclo completo`,()=>{
  for(const [angle,fraction] of [[-P/2,0],[-P/4,1/8],[0,1/4],[P/4,3/8],[P/2,1/2],[3*P/4,5/8],[P,3/4],[-3*P/4,7/8]]){
   assert.equal(directionalIndex(angle,frames),frames*fraction,`angle ${angle} count ${frames}`);
   assert.equal(directionalIndex(angle+2*P,frames),frames*fraction);
  }
  assert.equal(directionalIndex(-P/2+2*P,frames),0);
  assert.equal(directionalGrid(frames).frames,frames);
 });
}
test('contagem atlas 4x4 vs 8x4',()=>{
 assert.deepEqual(directionalGridForImage(768,768),{cols:4,rows:4,frames:16});
 assert.deepEqual(directionalGridForImage(1536,768),{cols:8,rows:4,frames:32});
});
test('NPC vira para jogador na direção correta',()=>{
 assert.equal(directionalIndex(facingAngle(0,0,0,-10),16),0);
 assert.equal(directionalIndex(facingAngle(0,0,10,0),16),4);
 assert.equal(directionalIndex(facingAngle(0,0,0,10),16),8);
 assert.equal(directionalIndex(facingAngle(0,0,-10,0),16),12);
});
