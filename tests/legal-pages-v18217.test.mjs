import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url),'utf8');
const index=read('public/index.html');
const priv=read('public/privacidade.html');
const terms=read('public/termos.html');
const css=read('public/legal.css');
const server=read('server/index.js');

test('public documents are static Portuguese HTML with homepage and reciprocal navigation',()=>{
 for (const page of [priv,terms]) {
  assert.match(page,/<!doctype html>/i);
  assert.match(page,/<html lang="pt-BR">/);
  assert.match(page,/href="\/"/);
  assert.match(page,/href="\/privacidade\.html"/);
  assert.match(page,/href="\/termos\.html"/);
  assert.match(page,/<main id="conteudo"/);
  assert.match(page,/12 de outubro de 2026/);
  assert.doesNotMatch(page,/<script/i);
  assert.match(page,/mailto:.*@gmail\.com/);
 }
 assert.match(css,/@media\(max-width:800px\)/);
});
test('public links visible before login and from settings',()=>{
 const login=index.slice(index.indexOf('id="loginModal"'),index.indexOf('id="factionModal"'));
 const settings=index.slice(index.indexOf('id="settingsAccountPanel"'),index.indexOf('id="passModal"'));
 for (const part of [login,settings]) {
  assert.match(part,/href="\/privacidade\.html"/);
  assert.match(part,/href="\/termos\.html"/);
  assert.match(part,/rel="noopener noreferrer"/);
 }
});
test('server exposes public static files before protected endpoints',()=>{
 assert(server.indexOf('app.use(express.static(PUBLIC_DIR')>0);
 assert(server.indexOf('app.use(express.static(PUBLIC_DIR')<server.indexOf("app.get('/api/save'"));
 assert.match(server,/version: '19\.0\.2'/);
 assert(index.includes('game.js?v=19.0.2'));
});
test('privacy accurately documents main providers and test-mode payments',()=>{
 for(const text of ['Supabase','Render','Google','Mercado Pago','LGPD','não processa pagamentos reais'])assert(priv.includes(text));
 assert(terms.includes('modo de teste'));
});
