import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const server=readFileSync(new URL('../server/index.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/style.css',import.meta.url),'utf8');
test('3 etapas são acessíveis pelo ADM mobile',()=>{
 for(const tab of ['world','systems','events','shops'])assert.ok(html.includes(`data-adm-quick="${tab}"`));
 for(const tab of ['missions','crafting','economy'])assert.ok(html.includes(`data-adm-system-view="${tab}"`));
 assert.match(css,/adm-quick-navigation/);
});
test('craft editor edita recursos/produtos sem textarea JSON',()=>{
 const x=game.slice(game.indexOf('function renderAdminSystemCrafting(){'),game.indexOf('function renderAdminSystemsEditor(){'));
 assert.match(x,/admIngredientEditorRows\(row.ingredients\)/);
 assert.match(x,/admCraftRewardEditor\(row.grant_payload\)/);
 assert.doesNotMatch(x,/textarea/);
 assert.match(game,/normalizeCraftIngredients\(admReadIngredientRows\(card\)/);
 assert.match(game,/normalizeCraftOutput\(f\('kind'\),f\('id'\),f\('qty'\)/);
});
test('economia aceita múltiplos efeitos validados, sem textarea JSON',()=>{
 const x=game.slice(game.indexOf('function renderAdminSystemEconomy(){'),game.indexOf('function renderAdminSystemCrafting(){'));
 assert.match(x,/admEffectEditorRows\(row.effect\)/);
 assert.doesNotMatch(x,/textarea/);
 assert.match(game,/normalizeEconomyEffects\(admReadEffectRows\(card\)/);
});
test('duplicações exigem novo ID e começam inativas',()=>{
 assert.match(game,/admVisualDraft.craft=\{\.\.\.structuredClone\(row\),recipe_id:'',name:/);
 assert.match(game,/admVisualDraft.economy=\{\.\.\.structuredClone\(row\),effect:.*service_id:'',name:/);
 assert.match(game,/enabled:false\};renderAdminSystemsEditor/);
 assert.match(game,/if\(\(adminSystemsEditor.snapshot\?\.crafting_recipes\|\|\[\]\)\.some/);
});
test('backend mantém validação dos quatro efeitos e recompensas',()=>{
 assert.match(server,/SYSTEM_EFFECT_KEYS = new Set\(\['laser_damage_pct','shield_pct','cargo_flat','speed_flat'\]\)/);
 assert.match(server,/SYSTEM_GRANT_KINDS = new Set\(\['resource','ammo','rocket','repair'\]\)/);
 assert.match(server,new RegExp(`const RELEASE_VERSION = '${JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).version.replace(/\./g,'\\.')}'`));
});

test('serviço novo respeita limite de um efeito exigido pelo backend',()=>{
 assert.match(server,/Object.keys\(effect\).length!==1/);
 assert.match(game,/Object.keys\(effect\).length!==1/);
});
