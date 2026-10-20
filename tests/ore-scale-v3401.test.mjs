import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const client=readFileSync(new URL('../public/game.js', import.meta.url),'utf8');
const server=readFileSync(new URL('../server/world.js', import.meta.url),'utf8');

test('V34.5.0 reduces ore visual scale and spawn radii',()=>{
  assert.match(client,/const size=Math\.max\(20,o\.r\*2\.35\),pulse=\.95\+Math\.sin\(nowSec\(\)\*2\.2\+o\.x\*\.01\)\*\.05;/);
  assert.match(client,/r:rand\(8,12\)/);
  assert.match(client,/r:rand\(6,10\)/);
  assert.match(server,/r:opts\.r\|\|rand\(6,10\)/);
});
