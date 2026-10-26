import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {drawRelayMediumMobileV76,relayGeometryV76,relayRenderDiagnosticV76,reportRelayRenderErrorV76}
 from '../public/modules/relay-render-safe-v76.js';
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const server=readFileSync(new URL('../server/world.js',import.meta.url),'utf8');
function mock({throwOnImage=false}={}){
 const calls=[];let depth=0;
 const c={calls,get depth(){return depth;}};
 for(const name of ['save','restore','translate','beginPath','arc','stroke','fillRect','strokeRect','drawImage','fillText']){
  c[name]=(...args)=>{
   calls.push([name,...args]);
   if(name==='save')depth++;
   if(name==='restore')depth--;
   if(name==='drawImage'&&throwOnImage)throw Error('simulated texture decode failure');
  };
 }
 return c;
}
const node=Object.freeze({id:'A',relayMode:true,x:220,y:300,relayLevel:3,radius:360,hp:120000,maxHp:360000,
 shield:100000,maxShield:240000,contested:true,owner:'earth',nearby:{earth:1,mars:0,jupiter:0}});
const options={x:150,y:200,image:{naturalWidth:200,naturalHeight:240},color:'#54e3ff',label:'TERRA',selected:true,nearby:2};
test('V76: relé em qualquer modo usa sprite e marcas leves, sem disco/anel animado',()=>{
 const ctx=mock();const original=JSON.stringify(node);
 assert.equal(drawRelayMediumMobileV76(ctx,node,options),true);
 assert.equal(ctx.depth,0);assert.equal(JSON.stringify(node),original);
 assert.equal(ctx.calls.filter(c=>c[0]==='drawImage').length,1);
 assert.equal(ctx.calls.filter(c=>c[0]==='arc').length,4);
 assert.equal(ctx.calls.filter(c=>c[0]==='fillRect').length>=4,true);
 assert.ok(!ctx.calls.some(c=>['createRadialGradient','setLineDash','shadowBlur','clip','filter'].includes(c[0])));
});
test('V76: mesmo com falha do sprite, Canvas recebe restore',()=>{
 const ctx=mock({throwOnImage:true});assert.throws(()=>drawRelayMediumMobileV76(ctx,node,options),/texture decode/);
 assert.equal(ctx.depth,0);
});
test('V76: texture ausente tem fallback estável e preserva barras',()=>{
 const ctx=mock();assert.equal(drawRelayMediumMobileV76(ctx,node,{...options,image:null}),true);
 assert.equal(ctx.depth,0);assert.equal(ctx.calls.filter(c=>c[0]==='drawImage').length,0);
});
test('V76: coord. inválida é ignorada; status visual sanitiza valores absurdos',()=>{
 const ctx=mock();assert.equal(drawRelayMediumMobileV76(ctx,{...node,x:'abc'},options),false);
 assert.equal(ctx.calls.length,0);
 assert.equal(relayGeometryV76({...node,radius:Infinity,hp:-10,shield:Infinity,relayLevel:99}).radius,360);
 assert.equal(relayGeometryV76({...node,relayLevel:99}).level,3);
});
test('V76: erros reportados localmente, sem crash na simulação',()=>{
 const before=relayRenderDiagnosticV76().failed;reportRelayRenderErrorV76(Error('falha simulada'),10);
 const after=relayRenderDiagnosticV76();assert.equal(after.failed,before+1);assert.equal(after.lastError,'falha simulada');
});
test('V76: conexão com o loop V75, quadro da nave preservado, geometria de captura no servidor inalterada',()=>{
 assert.match(game,/visualTestV75!=='relay'\)drawWarfrontControlWorld\(\)/);
 assert.match(game,/drawRelayMediumMobileV76\(ctx,node/);
 assert.match(game,/catch\(error\)\{\s*\/\/ Mesmo com textura danificada/);
 assert.match(game,/drawPlayer\(\);drawPet\(\)/);
 assert.match(server,/WARFRONT_CAPTURE_RADIUS=360/);
 assert.match(game,/finally\{ctx\.restore\(\);\}/);
});

test('V76: TODOS os modos (Baixo, Médio, Alto, Auto) e dispositivos usam caminho seguro',()=>{
 const start=game.indexOf('function drawWarfrontControlWorld(){');
 const end=game.indexOf('function drawMinimap(){',start);
 assert.ok(start>=0&&end>start);
 const relayBlock=game.slice(start,end);
 assert.match(relayBlock,/if\(node\.relayMode\)\{\s*const geometry=relayGeometryV76/);
 assert.doesNotMatch(relayBlock,/if\(node\.relayMode\s*&&/);
 assert.doesNotMatch(relayBlock,/if\(node\.relayMode\s*\&\&\s*DEVICE_CAPS/);
 assert.match(relayBlock,/drawRelayMediumMobileV76\(ctx,node,relayOptions\)/);
 assert.match(relayBlock,/catch\(error\)\{[\s\S]*?reportRelayRenderErrorV76\(error\)/);
});
