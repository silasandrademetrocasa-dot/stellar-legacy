import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');
const html=read('public/index.html'),manifest=read('public/assets/v17/manifest.js'),css=read('public/style.css');
assert.match(html,/game\.js\?v=19\.0\.5/);
assert.match(html,/style\.css\?v=19\.0\.5/);
for(const asset of ['stellar-legacy-logo','earth','mars','jupiter']){
  const rel=`public/assets/v19/branding/${asset}.webp`;
  assert(fs.existsSync(path.join(root,rel)),`Missing ${asset}`);
  assert(fs.statSync(path.join(root,rel)).size>8000,`Too small ${asset}`);
  assert(html.includes(`/assets/v19/branding/${asset}.webp`),`HTML not wired ${asset}`);
  assert(manifest.includes(`/assets/v19/branding/${asset}.webp`),`Manifest not wired ${asset}`);
}
for(const old of ['logo-v8.png','/assets/v8/branding/earth.png','/assets/v8/branding/mars.png','/assets/v8/branding/jupiter.png']){
  assert(!html.includes(old),`Old visual still active ${old}`);
}
assert(css.includes('V19.0.4 — Faction identity'));
assert.equal(JSON.parse(read('package.json')).version,'19.0.5');
assert.match(read('public/game.js'),/factionAsset\(progress\.profile\.faction\)/);
console.log('PASS: new clean logo and all faction assets integrated, updated CSS and cache.');
