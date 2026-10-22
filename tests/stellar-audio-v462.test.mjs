import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createStellarAudio,STELLAR_SFX_KINDS} from '../public/modules/stellar-audio-v462.js';

test('V46.2: audio has all existing sound actions plus ore and boss cues',()=>{
  for(const kind of ['laser','petLaser','rocket','shield','explosion','portal','ore','boss','ability','repair']){
    assert.ok(STELLAR_SFX_KINDS.includes(kind),kind);
  }
  assert.equal(new Set(STELLAR_SFX_KINDS).size,STELLAR_SFX_KINDS.length);
});
test('V46.2: gracefully degrades without an AudioContext',()=>{
  const engine=createStellarAudio(()=>({enabled:true,volume:.7,profile:'lite'}));
  assert.equal(engine.play('laser'),false);
  assert.equal(engine.play('unknown-effect'),false);
  engine.unlock();engine.dispose();
});
test('V46.2: muted audio makes no audio nodes',()=>{
  const engine=createStellarAudio(()=>({enabled:false,volume:.7,profile:'cinematic'}));
  assert.equal(engine.play('explosion'),false);
});
test('V46.2: HTML/game integration and cache-busting use same release',()=>{
  const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
  assert.match(game,/createStellarAudio/);
  assert.match(game,/playSfx\('ore'\)/);
  assert.match(game,/playSfx\('boss'\)/);
  assert.match(html,/id="audioPreviewButton"/);
  assert.match(html,/id="audioProfileSelect"/);
  assert.ok(html.includes('/game.js?v='+JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).version));
});

test('V46.2: older version regression checks reference the current release patch',()=>{
  const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
  assert.match(read('tests/v450-galactic-ascension.test.mjs'),/v4775-apply-patch/);
  assert.match(read('tests/v451-galactic-progression.test.mjs'),/includes\('v4775-apply-patch'\)/);
});
