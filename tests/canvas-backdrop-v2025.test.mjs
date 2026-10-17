import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBackdropRasterCache} from '../public/modules/backdrop-raster-cache.js';
import {createTextWidthCache} from '../public/modules/text-width-cache.js';

function setup(opts={}){
  const canvases=[];
  const makeCanvas=()=>{
    const canvas={width:0,height:0,draws:[],getContext(name,options){
      assert.equal(name,'2d');assert.equal(options.alpha,false);
      return {drawImage(...a){canvas.draws.push(a)}};
    }};
    canvases.push(canvas);return canvas;
  };
  return {canvases,cache:createBackdropRasterCache({makeCanvas,...opts})};
}
test('cenário 1600x900 é reduzido apenas uma vez para 1024x576 no perfil leve',()=>{
  const {canvases,cache}=setup();
  const img={naturalWidth:1600,naturalHeight:900};
  const result=cache.get(img);
  assert.notStrictEqual(result,img);
  assert.equal(result.width,1024);assert.equal(result.height,576);
  assert.deepEqual(result.draws[0],[img,0,0,1024,576]);
  for(let i=0;i<200;i++)assert.strictEqual(cache.get(img),result);
  assert.equal(canvases.length,1);
});
test('cenários pequenos e imagens não carregadas mantêm a imagem original',()=>{
  const {canvases,cache}=setup();
  const small={naturalWidth:620,naturalHeight:320};
  const unloaded={naturalWidth:0,naturalHeight:0};
  assert.strictEqual(cache.get(small),small);
  assert.strictEqual(cache.get(unloaded),unloaded);
  assert.strictEqual(cache.get(null),null);
  assert.equal(canvases.length,0);
});
test('troca de mapas usa cache LRU limitado a dois cenários',()=>{
  const {cache,canvases}=setup({maxEntries:2});
  const a={naturalWidth:1600,naturalHeight:900},b={naturalWidth:1600,naturalHeight:900},c={naturalWidth:1600,naturalHeight:900};
  const first=cache.get(a);cache.get(b);assert.strictEqual(cache.get(a),first);
  cache.get(c);assert.equal(cache.size(),2);
  cache.get(b);assert.equal(canvases.length,4);assert.equal(cache.size(),2);
  cache.clear();assert.equal(cache.size(),0);
});
test('falhas de alocacao Canvas mantem fallback para a imagem original',()=>{
  const original={naturalWidth:1600,naturalHeight:900};
  const failed=createBackdropRasterCache({makeCanvas(){throw Error('sem memoria')}});
  assert.strictEqual(failed.get(original),original);
  const unsupported=createBackdropRasterCache({makeCanvas:()=>({getContext:()=>null})});
  assert.strictEqual(unsupported.get(original),original);
});
test('cache preserva proporção mesmo com orientação vertical',()=>{
  const {cache}=setup({maxEdge:960});
  const got=cache.get({naturalWidth:900,naturalHeight:1600});
  assert.equal(got.width,540);assert.equal(got.height,960);
});
test('cache de fontes evita medir o mesmo callsign a cada quadro',()=>{
  const cache=createTextWidthCache({capacity:2});
  const ctx={font:'bold 12px Arial',calls:0,measureText(text){this.calls++;return {width:text.length*6}}};
  assert.equal(cache.measure(ctx,'Silas'),30);
  for(let i=0;i<300;i++)assert.equal(cache.measure(ctx,'Silas'),30);
  assert.equal(ctx.calls,1);
  ctx.font='bold 14px Arial';cache.measure(ctx,'Silas');assert.equal(ctx.calls,2);
  cache.measure(ctx,'FELP22');assert.equal(cache.size(),2);
  ctx.font='bold 12px Arial';cache.measure(ctx,'Silas');assert.equal(ctx.calls,4);
  cache.clear();assert.equal(cache.size(),0);
});
test('render economico nao altera simulacao, ativos de naves nem salvamento',()=>{
  const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
  assert.match(game,/createBackdropRasterCache/);
  assert.match(game,/BACKDROP_RASTER_CACHE\.get\(original\)/);
  assert.match(game,/const img=resolvedQualityMode\(\)==='low'\?BACKDROP_RASTER_CACHE\.get\(original\):original/);
  assert.match(game,/minimapIsVisibleForCanvasV2025\(\)/);
  assert.match(game,/if\(!onScreenWorld\(b\.x,b\.y,Math\.max\(SAFE_ZONE\.radius\+40,310\)\)\)return/);
  for(const fn of ['updatePlayer(dt)','updateEnemies(dt)','updatePet(dt)','updateOnlineWorld(dt)','updateFrameHudV2024()','drawPlayer();','drawPet();'])assert.ok(game.includes(fn),fn);
  assert.ok(game.includes('ctx.drawImage(img,-img.naturalWidth*sc/2'));
});
