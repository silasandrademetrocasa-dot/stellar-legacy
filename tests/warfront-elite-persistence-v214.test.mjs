import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {eliteStatus} from '../server/elite-operations.js';
import {renderV21CommandCenter} from '../public/modules/v21/command-center-view.js';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const world=file('server/world.js'),api=file('server/index.js'),sql=file('sql/V21_4_0_WARFRONT_ELITE_PERSISTENCIA.sql'),ui=file('public/game.js');
test('Warfront: hydrate ocorre antes de aceitar o jogador na sala',()=>{
 assert.match(world,/this\.ready=this\.warfrontControl\?this\.world\.loadWarfront/);
 assert.match(world,/await r\.ready;.*?catch\(err\)/s);
 assert.ok(world.indexOf('await r.ready')<world.indexOf('r.addClient(ws,p)'));
 assert.match(world,/if\(!Array\.isArray\(rows\)\|\|rows\.length!==3\)/);
});
test('Warfront: conquista troca dono diretamente e apenas depois do COMMIT SQL',()=>{
 assert.match(world,/persistCapture\(this\.mapId,node\.id,faction,expectedRevision,actor\.userId\)\.then/);
 const begin=world.indexOf('persistCapture(this.mapId');const assign=world.indexOf('node.owner=row.owner',begin);
 assert.ok(begin>=0&&assign>begin);
 assert.doesNotMatch(world,/node\.owner=null;node\.progress=0;node\.challenger=faction/);
 assert.match(world,/node\.revision=Number\(row\.revision\)/);
 assert.match(sql,/revision=revision\+1/);
 assert.match(sql,/revision=p_expected_revision and owner is distinct from p_faction/);
});
test('Warfront: nove relés persistentes, escrita bloqueada no navegador',()=>{
 assert.match(sql,/primary key\(map_id,node_id\)/);
 assert.match(sql,/unnest\(array\['b41','b42','b43'\]\)/);
 assert.match(sql,/unnest\(array\['A','B','C'\]\)/);
 assert.match(sql,/revoke all on public\.stellar_warfront_nodes from public,anon,authenticated/);
 assert.match(sql,/grant execute on function public\.stellar_commit_warfront_capture.*to service_role/);
 assert.match(api,/SUPABASE_SERVICE_ROLE_KEY/);
 assert.doesNotMatch(file('public/api.js'),/SUPABASE_SERVICE_ROLE_KEY/);
});
test('Elite: métricas de abate/captura vêm do servidor e são isoladas por usuário',()=>{
 assert.match(world,/recordEliteEvent\?\.\(c\.player\.userId,'npc_kill'\)/);
 assert.match(world,/recordEliteEvent\?\.\(actor\.userId,'sector_capture'\)/);
 assert.match(sql,/p_kind not in \('npc_kill','sector_capture'\)/);
 assert.match(sql,/using \(user_id=\(select auth\.uid\(\)\)\)/);
 assert.match(api,/req\.sb\.rpc\('is_game_admin_v1763'/);
});
test('Elite: resgate único, moedas concedidas no save, versão protegida de sobrescrita',()=>{
 assert.match(sql,/primary key\(user_id,objective_id\)/);
 assert.match(sql,/select state into v_state from public\.game_saves where user_id=v_uid for update/);
 assert.match(sql,/stellar_guard_elite_save_revision/);
 assert.match(api,/SAVE_ELITE_STALE/);
 assert.match(ui,/SAVE_ELITE_STALE/);
});
test('Elite: retorno computado é baseado nas definições do banco, não nas métricas do cliente',()=>{
 const definitions=[{objective_id:'hunt_100',label:'Caçador',metric:'npc_kills',target:100,credits:500,stl:2,title:'Caçador'}];
 let state=eliteStatus({npc_kills:99},[],definitions);
 assert.equal(state[0].complete,false);assert.equal(state[0].claimed,false);
 state=eliteStatus({npc_kills:102},[{objective_id:'hunt_100'}],definitions);
 assert.equal(state[0].complete,true);assert.equal(state[0].claimed,true);assert.equal(state[0].value,102);
});
test('Nomes visíveis não exibem número da versão e editor é restrito ao ADM',()=>{
 const html=file('public/index.html');
 assert.match(html,/CENTRO DE COMANDO<\/button>/);
 assert.doesNotMatch(html,/CENTRO DE COMANDO V\d+/);
 const rendered=renderV21CommandCenter({metrics:{},war:{},season:{},eliteRewards:{isAdmin:false}},'elite');
 assert.doesNotMatch(rendered,/ADMINISTRAÇÃO DE ELITE/);
 assert.doesNotMatch(rendered,/V21\.|V22\./);
 const admin=renderV21CommandCenter({metrics:{},war:{},season:{},eliteRewards:{isAdmin:true},adminElite:{items:[]}},'elite');
 assert.match(admin,/ADMINISTRAÇÃO DE ELITE/);
});
