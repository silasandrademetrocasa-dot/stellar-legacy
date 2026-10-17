import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHudContentCache} from '../public/modules/hud-content-cache.js';

const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');

test('cache não reescreve texto já igual e aceita alterações feitas fora do cache',()=>{
 const c=createHudContentCache(),node={textContent:'10 HP'};
 assert.equal(c.text(node,'10 HP'),false);
 assert.equal(c.text(node,'9 HP'),true);
 node.textContent='8 HP';
 assert.equal(c.text(node,'9 HP'),true);
 assert.equal(node.textContent,'9 HP');
 assert.equal(c.text(null,'ignorado'),false);
});
test('imagem é modificada apenas quando muda; DOM novo carrega normalmente',()=>{
 const c=createHudContentCache();let src='a.webp',setCount=0;
 const img={getAttribute:k=>k==='src'?src:null,setAttribute:(k,v)=>{assert.equal(k,'src');setCount++;src=v;}};
 assert.equal(c.src(img,'a.webp'),false);
 assert.equal(c.src(img,'b.webp'),true);
 assert.equal(c.src(img,'b.webp'),false);
 assert.equal(setCount,1);
});
test('menu é reconciliado somente em alterações de assinatura; limpar permite novo ciclo',()=>{
 const c=createHudContentCache();
 assert.equal(c.needsRefresh('menu','1|config-A'),true);
 assert.equal(c.needsRefresh('menu','1|config-A'),false);
 assert.equal(c.needsRefresh('menu','2|config-A'),true);
 assert.equal(c.needsRefresh('menu','2|config-B'),true);
 c.clear();assert.equal(c.needsRefresh('menu','2|config-B'),true);
});
test('HUD urgente, nave e combate continuam independentes do menu secundário',()=>{
 assert.match(game,/function updateCriticalHudV2024\(\)/);
 assert.match(game,/function updateFrameHudV2024\(profile=null\)/);
 assert.match(game,/periodicHudCall=true;[\s\S]*?try\{updateUI\(\);\}finally\{periodicHudCall=false;\}/);
 assert.match(game,/if\(!periodicHudCall\|\|HUD_CONTENT_CACHE\.needsRefresh\('runtime-menu'/);
 assert.match(game,/if\(!periodicHudCall\)refreshAmmoCounters\(\)/);
 assert.match(game,/if\(work\.ammo\)[\s\S]*?refreshAmmoCounters\(\)/);
 assert.match(game,/lastAmmoVisualSignatureV2028=null; \/\/ Elementos recriados/);
 for(const call of ['updatePlayer(dt)','updateEnemies(dt)','updatePet(dt)','updateFrameHudV2024(profile)'])assert.ok(game.includes(call));
});
