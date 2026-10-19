import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../public/style.css', import.meta.url), 'utf8');
const js=readFileSync(new URL('../public/game.js', import.meta.url), 'utf8');

test('V32.1.7 minimap resize and modal compaction hooks exist',()=>{
  assert.match(js,/function syncMinimapCanvasSize\(\)\{/);
  assert.match(js,/syncMinimapCanvasSize\(\);[^]*?\}/);
  assert.match(js,/applyMinimapUiState\(\)\{[^]*requestAnimationFrame\(syncMinimapCanvasSize\); \}/);
  assert.match(css,/body\.mobile-landscape-pro #bottomHudDock #minimapPanel:not\(\.collapsed\) #minimap\{[^}]*width:100%!important;/);
  assert.match(css,/body\.mobile-landscape-pro \.modal>\.modal-card\{[^}]*max-height:calc\(100dvh - 10px\)!important;/);
  assert.match(css,/body\.mobile-landscape-pro \.modal \.ship-grid,[^]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important;/);
});
