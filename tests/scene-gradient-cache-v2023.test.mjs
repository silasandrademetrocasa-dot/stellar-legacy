import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSceneGradientCache} from '../public/modules/scene-gradient-cache.js';

function fakeCanvas(){
  const made=[];
  const gradient=(kind,args)=>{const item={kind,args,stops:[],addColorStop(...stop){this.stops.push(stop)}};made.push(item);return item;};
  return {made,ctx:{createRadialGradient(...args){return gradient('radial',args)},createLinearGradient(...args){return gradient('linear',args)}}};
}
const hex=(color,alpha)=>`${color}@${alpha}`;
test('reaproveita gradientes estáticos em frames consecutivos sem criar mais objetos',()=>{
  const {made,ctx}=fakeCanvas(),cache=createSceneGradientCache(ctx);
  const pal={nebula:'#123456',accent:'#fedcba'};
  const nebula=cache.nebula(360,640,pal),backdrop=cache.backdrop(360,640,'#111111',hex),light=cache.secondaryLight(360,640,'#223344',.68,hex);
  assert.equal(made.length,5);
  for(let i=0;i<200;i++){
    assert.strictEqual(cache.nebula(360,640,pal),nebula);
    assert.strictEqual(cache.backdrop(360,640,'#111111',hex),backdrop);
    assert.strictEqual(cache.secondaryLight(360,640,'#223344',.68,hex),light);
  }
  assert.equal(made.length,5);
  assert.equal(cache.size(),3);
});
test('troca de mapa, cor, força e resize invalidam somente as entradas relevantes',()=>{
  const {made,ctx}=fakeCanvas(),cache=createSceneGradientCache(ctx);
  const pal={nebula:'#123456',accent:'#abcdef'};
  cache.nebula(400,700,pal);cache.backdrop(400,700,'#222222',hex);cache.secondaryLight(400,700,'#eeeeee',1,hex);
  assert.equal(made.length,5);
  cache.nebula(400,700,{...pal,nebula:'#000000'});assert.equal(made.length,7);
  cache.nebula(420,700,{...pal,nebula:'#000000'});assert.equal(made.length,9);
  cache.backdrop(400,700,'#999999',hex);assert.equal(made.length,11);
  cache.secondaryLight(400,700,'#eeeeee',.5,hex);assert.equal(made.length,12);
  cache.clear();assert.equal(cache.size(),0);
  cache.nebula(400,700,pal);assert.equal(made.length,14);
});
test('gradientes preservam os mesmos color-stops e coordenadas do desenho anterior',()=>{
  const {ctx}=fakeCanvas(),cache=createSceneGradientCache(ctx);
  const {primary,accent}=cache.nebula(400,600,{nebula:'#123456',accent:'#abcdef'});
  assert.deepEqual(primary.stops,[[0,'#12345655'],[.38,'#12345622'],[1,'rgba(0,0,0,0)']]);
  assert.deepEqual(accent.stops,[[0,'#abcdef1f'],[1,'rgba(0,0,0,0)']]);
  const {shade,vignette}=cache.backdrop(400,600,'#551133',hex);
  assert.deepEqual(shade.stops,[[0,'rgba(1,7,16,.05)'],[.52,'rgba(1,6,14,.018)'],[1,'rgba(1,5,12,.18)']]);
  assert.equal(vignette.stops[1][1],'#551133@0.24');
});
test('culling sem alocação mantém exatamente os mesmos limites para câmera, viewport e margem',()=>{
  const old=(x,y,c,W,H,m)=>{const b={left:c.x-W/2-m,right:c.x+W/2+m,top:c.y-H/2-m,bottom:c.y+H/2+m};return x>=b.left&&x<=b.right&&y>=b.top&&y<=b.bottom};
  const newer=(x,y,c,W,H,m)=>{const halfW=W/2+m,halfH=H/2+m;return x>=c.x-halfW&&x<=c.x+halfW&&y>=c.y-halfH&&y<=c.y+halfH};
  for(const W of [360,390,980,1920])for(const H of [680,840,1080])for(const m of [0,50,180,320])for(const x of [-500,0,100,600,2500])for(const y of [-800,0,300,1600]){
    const c={x:1500,y:1800};assert.equal(newer(x,y,c,W,H,m),old(x,y,c,W,H,m));
  }
  const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
  assert.match(game,/function onScreenWorld\(x,y,margin=180\)\{const cam=state\.camera,halfW=/);
  assert.match(game,/SCENE_GRADIENTS\.backdrop\(W,H,env\.edge,hexToRgba\)/);
  assert.match(game,/SCENE_GRADIENTS\.nebula\(W,H,pal\)/);
});
