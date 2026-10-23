import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('V49.5.1: preserva o catalogo oficial do jogo e nao injeta dados sinteticos',()=>{
 const source=readFileSync('public/data.js','utf8');
 assert(source.length>20000,'O data.js deve ser o catalogo completo do repositorio');
 assert(!source.includes('TEST-ONLY SYNTHETIC CATALOG'),'Fixture de teste nao pode ser publicada');
 for(const key of ['MAPS','RESOURCES','ROCKETS','NPC_TYPES','ITEMS','SHIPS','LASER_AMMO']) {
  assert(new RegExp('export\\s+const\\s+'+key+'\\s*=').test(source),key+' ausente');
 }
});
