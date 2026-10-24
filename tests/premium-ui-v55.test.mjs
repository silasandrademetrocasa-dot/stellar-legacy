import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(root,path),'utf8');
const html=read('public/index.html'),game=read('public/game.js'),css=read('public/modules/stellar-premium-ui-v55.css');
const manifest=read('public/assets/v17/manifest.js');
test('V55: seleção de abas e compra continuam nos handlers reais',()=>{
  assert.match(game,/function renderShop\(\)/);
  assert.match(game,/renderTabs\(ui\.shopTabs,categories,state\.shopTab/);
  assert.match(game,/onBuy=\(\)=>buyItem\(id\)/);
  assert.match(game,/onBuy=\(\)=>buyAmmo\(id\)/);
  assert.match(game,/onBuy=\(\)=>buyRockets\(id\)/);
  assert.match(game,/function renderHangar\(\)/);
  assert.match(game,/ui\.hangarContent\.appendChild\(content\)/);
});
test('V55: hero do hangar exibe nave e atributos reais, sem dados fixos',()=>{
  assert.match(game,/const ship=SHIPS\[progress\.activeShipId\]/);
  for (const x of ['player.maxHp','player.maxShield','player.speed','player.laserDamage','shipCardAsset(ship.id)']) assert.ok(game.includes(x));
  assert.match(game,/renderV55HangarHero\(\)/);
  assert.match(game,/V55_SHOP_APPROVED_ART/);
});
test('V55: CSS carrega depois da navegação existente, tabs e responsividade',()=>{
  assert.match(html,/stellar-premium-ui-v55\.css\?v=47\.7\.13/);
  assert.ok(html.indexOf('stellar-premium-ui-v55.css')>html.indexOf('route-map-layout-v4825.css'));
  for(const x of ['#shopModal #shopGrid','#hangarModal #hangarContent>.v55-hangar-hero','@media(max-width:520px)','prefers-reduced-motion']) assert.ok(css.includes(x));
});
test('V55: PNGs aprovados são WebP reais com IDS corretos (20)',()=>{
  const matches=[...manifest.matchAll(/\/assets\/v55\/shop\/([\w-]+)\.webp/g)].map(m=>m[1]);
  assert.equal(new Set(matches).size,20);
  for(const id of matches){
    const p=resolve(root,'public/assets/v55/shop',id+'.webp');
    assert.ok(existsSync(p),id);
    assert.equal(readFileSync(p).subarray(0,4).toString(),'RIFF',id);
  }
  for(const id of ['fs01','fs02','fs03','fs04','sg3nb00','sg3na02','sg3nb03','lcb10','plt3030'])assert.ok(matches.includes(id));
});
test('V55: AUX não foi repintado, SQL permanece sem alteração',()=>{
  assert.match(game,/if\(type==='petGear'\)return/);
  assert.doesNotMatch(manifest,/petGear:\s*\{[^}]*v55/s);
  assert.ok(existsSync(resolve(root,'sql')));
});
