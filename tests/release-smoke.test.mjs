import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const read=p=>readFileSync(resolve(root,p),'utf8');
test('versão de produção consistente',()=>{
  const v=JSON.parse(read('package.json')).version;
  assert.match(v,/^30\.\d+\.\d+$/);
  assert.ok(read('public/index.html').includes('game.js?v='+v));
  assert.ok(read('server/index.js').includes("const RELEASE_VERSION = '"+v+"'"));
});
test('componentes necessários do jogo presentes',()=>{
  for(const p of ['public/game.js','public/api.js','public/data.js','public/style.css','public/assets/v17/manifest.js','server/index.js','render.yaml','.github/workflows/stellar-installer-main.yml'])assert.ok(existsSync(resolve(root,p)),p);
});
test('sprites direcionais de jogadores, drones e NPCs acessíveis',async()=>{
  const {GAME_ASSETS}=await import('../public/assets/v17/manifest.js');
  for(const group of ['shipMapSheets','droneMapSheets','npcMapSheets']){
    const entries=Object.entries(GAME_ASSETS[group]||{});
    assert.ok(entries.length>0,group);
    for(const [name,url] of entries){
      const p=resolve(root,'public'+url);
      assert.ok(existsSync(p),group+' '+name+': '+url);
    }
  }
});
test('integrador 16 posições e designers preservados',()=>{
  const game=read('public/game.js');
  for(const signature of ['drawAuxSpriteSheet(sheet,a,size','drawAuxSpriteSheet(sheet,face,size','drawAuxSpriteSheet(sheet,a+Math.PI,size','drawDesignerAuraLocal'])assert.ok(game.includes(signature),signature);
});
