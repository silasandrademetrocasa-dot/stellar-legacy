import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {combatVisualPolicyV78,drawLaserLiteV78,drawRocketLiteV78,drawLightFxV78,drawCircularSelectionV78}
 from '../public/modules/combat-visual-lite-v78.js';
import {drawRelayMediumMobileV76} from '../public/modules/relay-render-safe-v76.js';
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const relay=readFileSync(new URL('../public/modules/relay-render-safe-v76.js',import.meta.url),'utf8');
function ctxSpy({throwOn=''}={}){
 const calls=[];let depth=0;
 const ctx={calls,get depth(){return depth;}};
 for(const method of ['save','restore','translate','rotate','beginPath','arc','ellipse','moveTo','lineTo','stroke','fill','drawImage','fillRect','strokeRect','fillText','setLineDash','createRadialGradient']){
  ctx[method]=(...args)=>{calls.push([method,...args]);if(method===throwOn)throw Error('Simulated error '+method);if(method==='save')depth++;if(method==='restore')depth--;};
 }
 return ctx;
}
const expensive=['setLineDash','createRadialGradient'];
test('V78: laser celular em TODAS qualidades usa só um traço sem sombra/composição',()=>{
 for(const quality of ['low','medium','high']){
  const c=ctxSpy();drawLaserLiteV78(c,{sx:10,sy:10,tx:200,ty:90,ammoId:'ucb100',color:'#00ffff',quality,mobile:true});
  assert.equal(c.depth,0);assert.equal(c.calls.filter(x=>x[0]==='stroke').length,1);
  assert.equal(c.shadowBlur,0);assert.equal(c.globalCompositeOperation,undefined);
  assert.ok(!c.calls.some(x=>expensive.includes(x[0])));
 }
 assert.equal(combatVisualPolicyV78('high',false).laserBeams,2);
});
test('V78: laser retorna false com coordenadas inválidas, sem tocar no canvas',()=>{
 const c=ctxSpy();assert.equal(drawLaserLiteV78(c,{sx:NaN,sy:1,tx:2,ty:3}),false);assert.equal(c.calls.length,0);
});
test('V78: míssil no Médio é duas operações simples (rastro + ponto)',()=>{
 const c=ctxSpy();assert.equal(drawRocketLiteV78(c,{x:100,y:100,tailX:80,tailY:80,quality:'medium',mobile:true}),true);
 assert.equal(c.depth,0);assert.equal(c.calls.filter(x=>x[0]==='stroke').length,1);
 assert.equal(c.calls.filter(x=>x[0]==='fill').length,1);
 assert.ok(!c.calls.some(x=>expensive.includes(x[0])));
});
test('V78: escudo e vida sem orbitais, gradiente ou sombra em Baixo/Médio/Alto',()=>{
 for(const kind of ['repair','shieldcharge','shield'])for(const quality of ['low','medium','high']){
  const c=ctxSpy();assert.equal(drawLightFxV78(c,{type:kind,size:46,color:'#6fefff',life:.7,maxLife:1},{quality,mobile:true}),true);
  assert.ok(c.calls.filter(x=>x[0]==='stroke').length<=2);
  assert.equal(c.calls.filter(x=>x[0]==='fill').length,0);
  assert.ok(!c.calls.some(x=>expensive.includes(x[0])));
 }
});
test('V78: anel de alvo é círculo real e restaura Canvas',()=>{
 for(const quality of ['low','medium','high']){
  const c=ctxSpy();drawCircularSelectionV78(c,{radius:75,color:'#ffb666',quality,mobile:true,time:3});
  assert.equal(c.depth,0);assert.equal(c.calls.filter(x=>x[0]==='arc').length,1);
  assert.ok(!c.calls.some(x=>x[0]==='strokeRect'||x[0]==='setLineDash'));
 }
});
test('V78: relé com aro completo e varredura, sem nome A em cima, proteção permanece',()=>{
 const c=ctxSpy();const node={id:'A',x:40,y:80,relayLevel:3,radius:360,hp:100,maxHp:200,shield:60,maxShield:80};
 drawRelayMediumMobileV76(c,node,{x:90,y:100,selected:true,quality:'high',mobile:true,time:100});
 const arcs=c.calls.filter(x=>x[0]==='arc');assert.equal(arcs.length,3);
 assert.deepEqual(arcs[0].slice(1),[0,0,360,0,Math.PI*2]);
 assert.ok(Math.abs(arcs[1][5]-arcs[1][4]-.38)<1e-6); // segundo arco é a varredura
 assert.equal(c.calls.filter(x=>x[0]==='fillText').length,1); // só rótulo inferior
 assert.equal(c.calls.filter(x=>x[0]==='strokeRect').length,1); // fallback da textura (não seleção)
 assert.equal(c.depth,0);
});
test('V78: rotas visuais conectadas ao motor sem alterar regras de tiro ou cura',()=>{
 assert.match(game,/drawLaserLiteV78\(ctx,/);
 assert.match(game,/drawRocketLiteV78\(ctx,/);
 assert.match(game,/drawLightFxV78\(ctx,f,/);
 assert.match(game,/drawCircularSelectionV78\(ctx,/);
 assert.match(relay,/drawCircularSelectionV78\(ctx,/);
 assert.doesNotMatch(game.slice(game.indexOf('function drawRocketFx(){'),game.indexOf('function drawFx(){')),/createRadialGradient|globalCompositeOperation|shadowBlur/);
 assert.match(game,/if\(repair\.shieldReady&&repair\.shieldTick>0/);
 assert.match(game,/if\(repair\.hpReady&&repair\.hpTick>0/);
});
