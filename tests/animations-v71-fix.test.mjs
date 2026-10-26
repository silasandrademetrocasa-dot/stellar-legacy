import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {drawPortalV71,drawBaseV71,drawRelayV71} from '../public/modules/stellar-animation-v71.js';
import {versionedAssetUrl} from '../public/modules/asset-cache.js';
const root=resolve(import.meta.dirname,'..');
const manifest=JSON.parse(readFileSync(join(root,'public/assets/animations/v71/manifest.json')));
const makeContext=()=>{const calls=[];const c={calls};for(const m of ['save','restore','drawImage','beginPath','arc','stroke','fill','ellipse','setLineDash','fillRect'])c[m]=(...args)=>calls.push([m,...args]);return c;};
const image=(path)=>({naturalWidth:path.includes('/cores/')?106:256,naturalHeight:path.includes('/cores/')?106:256});
const getImage=(path)=>image(path);
test('V71: seis portais têm anel fixo e oito núcleos recortados',()=>{
 assert.equal(Object.keys(manifest.portals).length,6);
 for(const v of Object.values(manifest.portals)){
  assert.equal(v.cores.length,8);
  for(const f of [...v.cores,v.shell,v.static]){
   const abs=join(root,'public',f);assert.ok(existsSync(abs),f);const buf=readFileSync(abs);assert.equal(buf.toString('ascii',0,4),'RIFF');
  }
 }
 const opts={portal:{to:'b41'},visualId:'portal_pvp',time:.8,getImage};
 const low=makeContext(),medium=makeContext(),high=makeContext();
 assert.equal(drawPortalV71(low,{...opts,quality:'low'}),true);
 assert.equal(drawPortalV71(medium,{...opts,quality:'medium'}),true);
 assert.equal(drawPortalV71(high,{...opts,quality:'high'}),true);
 assert.equal(low.calls.filter(c=>c[0]==='drawImage').length,1);
 const draws=medium.calls.filter(c=>c[0]==='drawImage');assert.equal(draws.length,2);
 assert.deepEqual(draws[0].slice(2),[-31,-31,62,62]);
 assert.deepEqual(draws[1].slice(2),[-75,-75,150,150]);
 assert.equal(medium.calls.some(c=>c[0]==='clip'),false);
});
test('V71: bases mantêm estrutura fixa e overlay independente sem quadros gigantes',()=>{
 assert.equal(Object.keys(manifest.bases).length,3);
 for(const v of Object.values(manifest.bases)){
  assert.equal(v.light.length,12);
  for(const f of [v.static,...v.light])assert.ok(existsSync(join(root,'public',f)));
 }
 const options={faction:'mars',time:1.2,width:610,getImage};
 const low=makeContext(),high=makeContext();
 assert.equal(drawBaseV71(low,{...options,quality:'low'}),true);
 assert.equal(drawBaseV71(high,{...options,quality:'high'}),true);
 assert.equal(low.calls.filter(c=>c[0]==='drawImage').length,1);
 assert.equal(high.calls.filter(c=>c[0]==='drawImage').length,2);
 assert.deepEqual(high.calls.filter(c=>c[0]==='drawImage').map(c=>c.slice(2)),low.calls.filter(c=>c[0]==='drawImage').map(c=>c.slice(2)).concat([[-305,-610*490/840/2,610,610*490/840]]));
});
test('V71: relé permanece estacionário e preserva eventos reais',()=>{
 const node={relayMode:true,id:'relay',x:10,y:20,relayLevel:3,hp:100,shield:50,maxHp:100,maxShield:100};
 const frozen=JSON.stringify(node);const urls=[];
 const c=makeContext();assert.equal(drawRelayV71(c,node,{getImage:p=>{urls.push(p);return image(p);},time:10}),true);
 assert.equal(JSON.stringify(node),frozen);
 assert.ok(urls.every(p=>p.includes('/animations/v71/Reles/')));
 assert.ok(c.calls.some(c=>c[0]==='drawImage'));
});
test('V71: URLs dos recursos imutáveis não ganham parâmetro de versão',()=>{
 const portal='/assets/animations/v71/Portais/Portal_Comum/shell.webp';assert.equal(versionedAssetUrl(portal),portal);
});
test('V71: componentes são apenas visuais e não alteram servidor nem física',()=>{
 const game=readFileSync(join(root,'public/game.js'),'utf8');
 assert.match(game,/drawPortalV71 as drawPortalV69/);
 assert.match(game,/drawBaseV71 as drawBaseV69/);
 assert.match(game,/drawRelayV71 as drawRelayV69/);
 assert.match(game,/VISUAL_PROFILE_V71/);
 const a=game.match(/ctx\.beginPath\(\);ctx\.arc\(0,0,radius,0,TWO_PI\);if\(!node\.relayMode&&node\.contested\)ctx\.fill\(\);ctx\.stroke\(\)/);
 assert.ok(a, 'campos grandes do relé não devem ser preenchidos por quadro');
});
