import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
const read=f=>readFileSync(resolve(import.meta.dirname,'..',f),'utf8');
const game=read('public/game.js'),server=read('server/index.js'),pilot=read('public/modules/stellar-autopilot-v48.js');
test('V82: ADM pode editar recursos conhecidos de cada NPC sem aceitar itens inventados',()=>{
 assert.match(game,/adminNpcDropFieldsV82/);assert.match(game,/data-npc-resource/);
 assert.match(game,/resources,name:/);assert.match(server,/p_resources:validatedNpcDrops/);
 const fragment=server.match(/export function validateNpcDropResourcesV82\([\s\S]*?\n\}/)?.[0];assert.ok(fragment);
 const ctx={};runInNewContext(fragment.replace('export function','function')+'\nthis.validator=validateNpcDropResourcesV82;',ctx);
 const prev={Prometid:5,Voidite:3};
 assert.deepEqual(JSON.parse(JSON.stringify(ctx.validator({Prometid:0,Voidite:4},prev))),{Prometid:0,Voidite:4});
 assert.throws(()=>ctx.validator({Prometid:2,Voidite:0,InfiniteSTL:99999},prev),/Recurso não cadastrado/);
 assert.throws(()=>ctx.validator({Prometid:-1,Voidite:0},prev),/Quantidade inválida/);
 assert.throws(()=>ctx.validator({Prometid:1.5,Voidite:0},prev),/Quantidade inválida/);
});
test('V82: mapas permitem editar multiplicador e estruturas conservando paleta e conteúdo do mapa',()=>{
 assert.match(game,/data-world-map-field="enemy_multiplier"/);assert.match(game,/data-world-map-field="landmark_count"/);
 assert.match(server,/p_enemy_multiplier:clampNum\(body.enemy_multiplier/);
 assert.match(server,/p_landmark_count:Math.round\(clampNum\(body.landmark_count/);
 assert.match(server,/p_palette:palette,p_structures:structures/);
 assert.match(game,/adminWorldAdvancedFieldsV82/);
 assert.match(server,/Paleta inválida/);
});
test('V82: autopilot revalida acesso expirado em todos os botões astral, sem conceder privilégios',()=>{
 assert.match(pilot,/async function ensureAuthorizedV82/);
 assert.match(pilot,/if\(astralBuildBusy\|\|!await ensureAuthorizedV82\(\)\)/);
 assert.match(pilot,/if\(!await ensureAuthorizedV82\(\)\)return;/);
 assert.match(pilot,/data-ap-check-access-v82/);
 assert.match(pilot,/Autopilot sem permissão para esta conta/);
 assert.match(server,/stellar_autopilot_access_v48/);
 assert.match(server,/active=data\?\.enabled===true/);
});
test('V82: entrada astral precisa do opt-in antes do início assistido e aguarda transição do portal',()=>{
 assert.match(game,/transitionMs:1200/);
 assert.match(pilot,/if\(!config.astralAssist\)return notify/);
 assert.match(pilot,/setTimeout\(\(\)=>\{if\(accessReady\(\)&&!running&&getSnapshot\(\)\?\.astralActive\)start\(\)/);
 assert.match(game,/runEconomyAction\('gate_spin'/);
 assert.match(pilot,/Nenhuma recompensa é concedida por este painel/);
});
test('V82: recompensas adicionais do Astral não são confundidas com o prêmio de conclusão',()=>{
 assert.match(game,/pacote tradicional/);assert.match(read('public/modules/astral-rewards-v381.js'),/bônus adicionais/i);
 assert.match(read('public/modules/astral-rewards-v381.js'),/revis(ão|\u00e3o)|bônus v/i);
});
