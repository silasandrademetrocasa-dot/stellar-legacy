import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,resolve,dirname} from 'node:path';
import {GAME_ASSETS} from '../public/assets/v17/manifest.js';
import {ITEMS} from '../public/data.js';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const S=id=>ITEMS[id];
const groups={laser:['lf1','mp1','sl01','lf2','lf3','lf4','lfx','lfomega'],motor:['g3n1010','g3n2010','g3n3210','g3n3310','g3n6900','g3n7900','g3n8700'],shield:['sg3na01','sg3na02','sg3na03','sg3nb01','sg3nb02','sg3nb03','fs01','fs02','fs03','fs04','fs05']};
const portals=['normal','aurora','nexus','eclipse','pvp','universe'];
const files=p=>statSync(join(ROOT,'public',p.slice(1))).size;
test('todos os equipamentos aprovados tem sprite 137 real e arquivo nao vazio',()=>{
 for(const id of [...groups.laser,...groups.motor,...groups.shield]){
  assert.ok(S(id),`ID perdido: ${id}`);
  assert.match(GAME_ASSETS.equipment[id],/^\/assets\/v137\/equipment\//);
  assert.ok(files(GAME_ASSETS.equipment[id])>3000);
 }
});
test('nome antigo ARC-P1/SOL-1 deixa de ser exibido, inventario mantem IDs',()=>{
 assert.deepEqual(groups.laser.map(x=>S(x).name),['ARC-1','ARC-2','ARC-3','ARC-4','ARC-5','ARC-6','ARC-X','ARC-Ω']);
 assert.equal(S('mp1').type,'laser');assert.equal(S('sl01').type,'laser');
});
test('precificacao raridade e renda original protegida em todos os itens ativos',()=>{
 for(const ids of Object.values(groups)){
  for(const id of ids){const v=S(id);assert.ok(['common','rare','epic','legendary'].includes(v.rarity));
   if(v.rarity==='common') assert.equal(v.currency,'credits');
   if(v.rarity==='epic')assert.equal(v.currency,'uridium');
   if(v.rarity==='legendary'){assert.equal(v.eventOnly,true);assert.equal(v.price,0);}
  }
 }
 for(const ids of Object.values(groups)){
  const rare=ids.filter(id=>S(id).rarity==='rare');
  if(rare.length===1)assert.equal(S(rare[0]).currency,'uridium');
  if(rare.length===2){assert.equal(S(rare[0]).currency,'credits');assert.equal(S(rare[1]).currency,'uridium');}
 }
});
test('AUX 16 quadros, 7 drones/designers e seis portais transparentes existem',()=>{
 for(const id of portals)assert.ok(files(`/assets/v137/portals/${id}.webp`)>10000);
 for(const id of ['drone_common','drone_elite','drone_a','drone_b','drone_c','drone_d','drone_e'])assert.ok(files(`/assets/v137/drones/${id}.webp`)>2500);
 assert.ok(files('/assets/v137/aux/aux9_16.webp')>100000);
 const manifest=JSON.parse(readFileSync(join(ROOT,'public/assets/v137/manifest.json'),'utf8'));
 assert.equal(manifest.aux.frames,16);assert.equal(manifest.equipment.length,26);
});
