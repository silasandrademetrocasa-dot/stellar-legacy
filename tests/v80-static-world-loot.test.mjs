import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {drawPortalV71,drawBaseV71} from '../public/modules/stellar-animation-v71.js';
import {mapLayoutPath} from '../public/modules/modular-map-v2.js';
const root=resolve(import.meta.dirname,'..');
const getImage=path=>({naturalWidth:256,naturalHeight:256,path});
function track(){const paths=[];const draws=[];return {paths,draws,ctx:{drawImage:(...args)=>draws.push(args)},load:path=>{paths.push(path);return getImage(path)}};}
test('V80: todas as qualidades renderizam somente imagem estática do portal',()=>{
 for(const q of ['low','medium','high'])for(const t of [0,4,60]){
  const o=track();assert.ok(drawPortalV71(o.ctx,{portal:{to:'b41'},quality:q,time:t,getImage:o.load}));
  assert.equal(o.draws.length,1);assert.equal(o.paths.length,1);
  assert.match(o.paths[0],/\/static\.webp$/);assert.deepEqual(o.draws[0].slice(1),[-75,-75,150,150]);
 }
});
test('V80: todas as qualidades usam base única e não solicitam quadros',()=>{
 for(const q of ['low','medium','high'])for(const t of [0,2,90]){
  const o=track();assert.ok(drawBaseV71(o.ctx,{faction:'jupiter',quality:q,time:t,getImage:o.load,width:610}));
  assert.equal(o.draws.length,1);assert.equal(o.paths.length,1);assert.match(o.paths[0],/\/static\.webp$/);
 }
});
test('V80: 30 layouts de mapas têm seus próprios fundos e não há colisão de caminhos',()=>{
 const highs=new Set(),lows=new Set();
 for(const prefix of ['1','2','3','4','U'])for(let i=1;i<=(prefix==='4'||prefix==='U'?3:8);i++){
  const key=`${prefix}-${i}`,p=mapLayoutPath(key),layout=JSON.parse(readFileSync(join(root,'public',p),'utf8'));
  for(const [kind,acc] of [['low',lows],['high',highs]]){
   const path=layout.background[kind];assert.ok(path.endsWith('.webp'));assert.ok(existsSync(join(root,'public',path)));
   assert.ok(!acc.has(path),`repetido ${key}: ${path}`);acc.add(path);
  }
  assert.equal(layout.mapId,key);
 }
 assert.equal(highs.size,30);assert.equal(lows.size,30);
});
test('V80: jogo mantém renderizador seguro do relé e quebra cache da configuração de mapas',()=>{
 const game=readFileSync(join(root,'public/game.js'),'utf8');
 assert.match(game,/drawRelayMediumMobileV76\(ctx,node,relayOptions\)/);
 assert.match(game,/fetch\(path\+'\?v=47\.7\.59',\{cache:'no-cache'\}\)/);
});
