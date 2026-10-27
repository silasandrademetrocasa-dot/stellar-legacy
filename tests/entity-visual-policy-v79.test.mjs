import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {drawEngineWakeLiteV79,drawEntitySpriteV79,spriteSamplingV79} from '../public/modules/entity-visual-policy-v79.js';
import {renderFxCount} from '../public/modules/render-budget-v34.js';
import {rebornFxBudgetV470} from '../public/modules/combat-reborn-v470.js';
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
function fakeCtx(throwOn=''){
 const calls=[];let depth=0;const ctx={calls,get depth(){return depth;}};
 for(const key of ['save','restore','beginPath','moveTo','lineTo','closePath','fill','drawImage','createRadialGradient','arc']){
  ctx[key]=(...args)=>{calls.push([key,...args]);if(key==='save')depth++;if(key==='restore')depth--;if(key===throwOn)throw new Error('Fault '+key);};
 }
 return ctx;
}
test('V79: motor compacto igual para BAIXO, MEDIO, ALTO e AUTOMATICO',()=>{
 const results=[];
 for(const quality of ['low','medium','high','auto']){
  const c=fakeCtx();const ok=drawEngineWakeLiteV79(c,{size:90,color:'#65cfff',intensity:.8});
  assert.equal(ok,true,quality);assert.equal(c.depth,0);assert.equal(c.globalAlpha,.52*.8);
  assert.equal(c.calls.filter(x=>x[0]==='fill').length,2);
  assert.ok(!c.calls.some(x=>x[0]==='createRadialGradient'),quality);
  assert.equal(c.globalCompositeOperation,undefined);
  assert.equal(c.shadowBlur,undefined);
  results.push(JSON.stringify(c.calls));
 }
 assert.equal(new Set(results).size,1);
});
test('V79: motor nulo não gera comandos; falha no Canvas restaura contexto',()=>{
 const c=fakeCtx();assert.equal(drawEngineWakeLiteV79(c,{size:80,intensity:0}),false);assert.equal(c.calls.length,0);
 const broken=fakeCtx('fill');assert.throws(()=>drawEngineWakeLiteV79(broken,{size:80,intensity:1}),/Fault fill/);assert.equal(broken.depth,0);
});
test('V79: sprite recebe textura original, todos os modos mobile usam interpolação uniforme',()=>{
 const img={naturalWidth:512,naturalHeight:512};const crop=[0,0,512,512,-42,-42,84,84];
 assert.equal(spriteSamplingV79({mobile:true}),'medium');assert.equal(spriteSamplingV79({mobile:false}),'high');
 for(const quality of ['low','medium','high','auto']){
  const ctx=fakeCtx();assert.equal(drawEntitySpriteV79(ctx,img,crop,{mobile:true}),true);
  assert.equal(ctx.imageSmoothingEnabled,true);assert.equal(ctx.imageSmoothingQuality,'medium');
  assert.deepEqual(ctx.calls[0],['drawImage',img,...crop]);
  assert.equal(img.naturalWidth,512);assert.equal(img.naturalHeight,512);
 }
 const ctx=fakeCtx();assert.equal(drawEntitySpriteV79(ctx,img,[1,2,3,4],{mobile:false}),true);
 assert.equal(ctx.imageSmoothingQuality,'high');
});
test('V79: render de naves, drones, AUX e NPCs usa sprites sem filtros de cor e blur no mobile',()=>{
 assert.match(game,/return drawEngineWakeLiteV79\(ctx,\{size,color,intensity\}\)/);
 assert.match(game,/function drawDrones\(p\)/);
 assert.match(game,/function drawPet\(\)/);
 assert.match(game,/function drawPlayer\(\)/);
 assert.match(game,/function drawEnemy\(e\)/);
 const start=game.indexOf('function drawEngineWakeLocal('),end=game.indexOf('function drawDesignerAuraLocal(',start);
 const motor=game.slice(start,end);
 assert.doesNotMatch(motor,/createRadialGradient|shadowBlur|globalCompositeOperation/);
 const drones=game.slice(game.indexOf('function drawDrones('),game.indexOf('function drawPet('));
 assert.match(drones,/drawEntitySpriteV79\(ctx,img/);
 assert.doesNotMatch(drones,/shadowBlur|filter=/);
 assert.match(game,/if\(DEVICE_CAPS.mobile\|\|resolvedQualityMode\(\)==='low'\)return/);
 assert.match(game,/if\(DEVICE_CAPS.mobile\|\|resolvedQualityMode\(\)==='low'\|\|!designer/);
 assert.match(game,/if\(!DEVICE_CAPS.mobile\)\{ctx.shadowColor=p.color/);
});
test('V79: reduz somente quantidade de efeitos cosméticos no mobile, sem interferir nas regras',()=>{
 assert.equal(renderFxCount(400,{quality:'low',mobile:true}),12);
 assert.equal(renderFxCount(400,{quality:'medium',mobile:true}),24);
 assert.equal(renderFxCount(400,{quality:'high',mobile:true}),32);
 assert.equal(rebornFxBudgetV470({quality:'low',mobile:true}),3);
 assert.equal(rebornFxBudgetV470({quality:'medium',mobile:true}),5);
 assert.equal(rebornFxBudgetV470({quality:'high',mobile:true}),7);
 const combat=game.slice(game.indexOf('function drawRocketFx(){'),game.indexOf('function drawNavigationOverlay(){'));
 assert.match(combat,/drawRocketLiteV78\(ctx,/);
 assert.match(combat,/drawLightFxV78\(ctx,f,/);
 assert.match(game,/drawRelayMediumMobileV76/);
});
