import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {seasonStatus,safeSeasonDraft,safeDirective,buildSeasonRanking} from '../server/competitive-seasons.js';
import {renderCompetitiveSection,renderUniverseDirectives,renderEliteEquipTitles} from '../public/modules/v22/command-upgrades.js';
const file=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const iso=d=>new Date(Date.now()+d*86400000).toISOString();
test('temporadas: rascunho, agendada, ativa e encerrada',()=>{
 assert.equal(seasonStatus({enabled:false}),'rascunho');
 assert.equal(seasonStatus({enabled:true,starts_at:iso(1),ends_at:iso(3)}),'agendada');
 assert.equal(seasonStatus({enabled:true,starts_at:iso(-1),ends_at:iso(1)}),'ativa');
 assert.equal(seasonStatus({enabled:true,starts_at:iso(-10),ends_at:iso(-1)}),'encerrada');
});
test('ADM: não aceita premiação inválida nem período maior que 90 dias',()=>{
 const good={title:'Campanha Solar',starts_at:iso(1),ends_at:iso(31),min_points:10,top_n:10,reward_credits:5000,reward_stl:10,enabled:false};
 assert.equal(safeSeasonDraft(good).enabled,false);
 assert.throws(()=>safeSeasonDraft({...good,ends_at:iso(110)}),/período/);
 assert.throws(()=>safeSeasonDraft({...good,reward_stl:9999}),/limites/);
 assert.throws(()=>safeSeasonDraft({...good,top_n:0}),/limites/);
 assert.throws(()=>safeSeasonDraft({...good,title:'x'}),/Título/);
});
test('avisos: somente setores/categorias admitidos',()=>{
 const d={title:'Anomalia no Setor',description:'Alerta de invasão',starts_at:iso(1),ends_at:iso(2),map_id:'x8',category:'invasion',enabled:false};
 assert.equal(safeDirective(d).map_id,'x8');
 assert.throws(()=>safeDirective({...d,map_id:'internal'}),/inválido/);
 assert.throws(()=>safeDirective({...d,category:'delete_all'}),/inválido/);
});
test('rankings: somam somente resultados já validados, ordem estável',()=>{
 const result=buildSeasonRanking([{user_id:'one',faction:'earth',points:10,captures:1},{user_id:'two',faction:'mars',points:13,defenses:1}], [{clan_id:'cl1',points:10,pilots:1}], 'one');
 assert.equal(result.myRank,2);assert.equal(result.factions[0].faction,'mars');assert.equal(result.clans[0].clan_id,'cl1');
});
test('telas escapam HTML não confiável, permitem resgate apenas quando declarado servidor',()=>{
 const snapshot={competitive:{seasons:[{id:'x1',title:'<script>alert(1)</script>',state:'encerrada',claimable:true,top_n:10,reward_credits:1}],selectedSeasonId:'x1',ranking:{myPoints:10,myRank:1}},userId:'one',eliteRewards:{titles:[{name:'<img src=x>',objective_id:'capture_1'}]}};
 const ui=renderCompetitiveSection(snapshot);
 assert.ok(!ui.includes('<script>'));assert.ok(ui.includes('data-command-season-claim'));assert.ok(!renderEliteEquipTitles(snapshot).includes('<img'));
 assert.ok(!renderUniverseDirectives({competitive:{alerts:[{title:'<svg',map_id:'x1'}]}},'x2').includes('&lt;svg'));
});
test('fonte das recompensas: SQL usa registros verificados e trava resgate duplicado',()=>{
 const s=file('sql/STELLAR_V22_0_0_TEMPORADAS_ELITE_UNIVERSO.sql');
 assert.match(s,/stellar_war_actions/);assert.match(s,/actor_user_id/);assert.match(s,/for update/i);
 assert.match(s,/primary key\(season_id,user_id\)/);
 assert.match(s,/auth\.uid\(\)/);assert.match(s,/serverEliteRevision/);
 assert.doesNotMatch(s,/truncate\s+table|delete\s+from\s+public\.stellar_warfront_nodes/i);
});
test('segurança do cliente: nenhuma chave secreta ou RPC de prêmio unilateral',()=>{
 const app=file('server/command-center-router.js');
 assert.match(app,/requireUser|createCommandCenterRouter/);assert.match(app,/is_game_admin_v1763/);
 assert.match(app,/stellar_claim_competitive_season/);assert.match(app,/stellar_equip_elite_title/);
 assert.ok(!app.includes('SUPABASE_SERVICE_ROLE_KEY='));
});
