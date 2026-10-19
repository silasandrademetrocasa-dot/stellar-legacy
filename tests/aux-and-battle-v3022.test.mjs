import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GAME_ASSETS } from '../public/assets/v17/manifest.js';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));

test('V30.4.0: AUX-9 usa arte padronizada atualizada',()=>{
  assert.equal(GAME_ASSETS.drones.pet,'/assets/v3022/drones/aux9.webp');
  assert.equal(GAME_ASSETS.drones.petElite,'/assets/v3022/drones/aux9-elite.webp');
  assert.ok(existsSync(resolve(root,'public/assets/v3022/drones/aux9.webp')));
  assert.ok(existsSync(resolve(root,'public/assets/v3022/drones/aux9-elite.webp')));
});

test('V30.4.0: hangar traz cópia rápida de configurações e remove preview 360 do AUX',()=>{
  const game=readFileSync(resolve(root,'public/game.js'),'utf8');
  assert.ok(game.includes('function copyBattleConfigV2013('));
  assert.ok(game.includes('COPIAR CONF 1 → 2'));
  assert.ok(game.includes('COPIAR CONF 2 → 1'));
  assert.ok(!game.includes('SPRITES 360° NO MAPA'));
  assert.ok(!game.includes("root.appendChild(auxFoldSectionV18210(spritePanel,'aux:sprites'"));
});
