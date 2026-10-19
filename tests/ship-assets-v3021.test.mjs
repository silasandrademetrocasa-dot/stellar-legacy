import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHIPS } from '../public/data.js';
import { GAME_ASSETS } from '../public/assets/v17/manifest.js';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));

test('V30.3.1: todas as naves possuem card art individual',()=>{
  for(const shipId of Object.keys(SHIPS)){
    const path=GAME_ASSETS.ships?.[shipId] || (shipId==='phoenix'?GAME_ASSETS.starterDesigners?.earth?.card:null);
    assert.ok(path,`card asset ausente para ${shipId}`);
    assert.ok(existsSync(resolve(root,'public'+path)),`arquivo ausente para ${shipId}: ${path}`);
  }
});

test('V30.3.1: mapa prioriza casco único em vez de atlas genérico compartilhado',()=>{
  const game=readFileSync(resolve(root,'public/game.js'),'utf8');
  assert.ok(game.includes('STATIC_SHIP_RENDER_IDS'), 'static ship render set');
  assert.ok(game.includes('priorizamos a rotação do sprite próprio da nave'), 'comentário de render único');
});
