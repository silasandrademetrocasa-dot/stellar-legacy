import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectLiveDirective,directiveToWorldEvent} from '../server/universe-directives.js';
import {clanOperationProgress} from '../server/clan-operations.js';
import {renderCompetitiveSection,renderUniverseDirectives} from '../public/modules/v22/command-upgrades.js';
const now=Date.parse('2026-10-17T20:00:00Z');
const directive=(category='invasion',map_id='x3',id=7)=>({id,enabled:true,title:'Invasão Pirata',description:'Setor sob ataque',category,map_id,starts_at:new Date(now-60000).toISOString(),ends_at:new Date(now+60000).toISOString()});
test('diretivas ativas são filtradas por mapa, data, categoria e ativação',()=>{
 assert.equal(selectLiveDirective([directive('boss','all',1),directive('invasion','x3',2)],'x3',now)?.id,2);
 assert.equal(selectLiveDirective([directive('boss','all',1),directive('invasion','x3',2)],'x2',now)?.id,1);
 assert.equal(selectLiveDirective([directive()],'x3',now+120000),null);
 assert.equal(selectLiveDirective([{...directive(),enabled:false}],'x3',now),null);
 assert.equal(selectLiveDirective([directive('alert')],'x3',now),null);
 assert.equal(selectLiveDirective([directive()],'nonexistent',now),null);
});
test('diretivas tornam-se eventos do motor existente, sem prêmio inventado ou nome de versão',()=>{
 const a=directive('boss');const ev=directiveToWorldEvent(a,'x3');
 assert.equal(ev.id,'titan_assault');assert.equal(ev.source,'universe-directive');assert.deepEqual(ev.reward,{});
 assert.equal(ev.end,Date.parse(a.ends_at));
 assert.equal(directiveToWorldEvent(directive('resource'),'x3').id,'ore_frenzy');
 assert.equal(directiveToWorldEvent(directive('invasion'),'x3').id,'invasion');
});
test('progresso de clã mantém histórico de capturas e resgates únicos',()=>{
 const items=clanOperationProgress([{id:'a',enabled:true,title:'Setores',target:3,metric:'capture',vault_credits:3000,sort_order:10},{id:'b',enabled:true,title:'Defesa',target:5,metric:'defense',vault_credits:2000,sort_order:20}], [{operation_id:'a'}],{capture:9,defense:2});
 assert.equal(items[0].progress,3);assert.equal(items[0].total,9);assert.equal(items[0].claimed,true);assert.equal(items[0].claimable,false);assert.equal(items[1].claimable,false);
});
test('interface protege HTML e só oferece resgate ao líder com meta cumprida',()=>{
 const data={competitive:{seasons:[],history:[{title:'<script>x</script>',winning_faction:'earth',pilots:10,rewards_claimed:3}],clanOperations:{clan:{name:'<img onerror=alert(1)>',isOwner:true},objectives:[{id:'teste',title:'Meta segura',target:3,total:4,vaultCredits:2000,claimable:true,claimed:false,metric:'capture'}]}}};
 const html=renderCompetitiveSection(data);assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img'));assert.match(html,/data-command-clan-claim="teste"/);
 assert.ok(!renderCompetitiveSection({competitive:{...data.competitive,clanOperations:{...data.competitive.clanOperations,clan:{name:'X',isOwner:false}}}}).includes('data-command-clan-claim'));
 assert.ok(!renderUniverseDirectives({competitive:{alerts:[{title:'<script>',category:'boss',map_id:'x3'}]}},'x3').includes('<script>'));
});
test('integração evita criar conquistas pelo cliente ou mudar donos de relés',()=>{
 const sql=readFileSync(new URL('../sql/STELLAR_V22_5_0_CLAN_OPERATIONS_HALL.sql',import.meta.url),'utf8');
 assert.match(sql,/stellar_war_actions/);assert.match(sql,/owner_id=v_uid/);
 assert.match(sql,/PRIMARY KEY\(clan_id,operation_id\)/);
 assert.match(sql,/SECURITY DEFINER/);assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.doesNotMatch(sql,/delete\s+from\s+public\.stellar_warfront_nodes|truncate\s+table/i);
 const backend=readFileSync(new URL('../server/world.js',import.meta.url),'utf8');
 assert.match(backend,/refreshDirectives/);assert.match(backend,/selectLiveDirective/);assert.match(backend,/clearEventEntities/);
 assert.match(backend,/if\(ev\?\.source==='universe-directive'/);
});

test('missão ADM rejeita prêmio gigante, tipo inválido e ID malformado',async()=>{
 const {safeClanOperationDraft}=await import('../server/clan-operations.js');
 const valid={id:'captura_tres',title:'Patrulha coordenada',metric:'capture',target:3,vault_credits:25000,sort_order:10,enabled:false};
 assert.equal(safeClanOperationDraft(valid).enabled,false);
 assert.throws(()=>safeClanOperationDraft({...valid,target:0}),/limites/);
 assert.throws(()=>safeClanOperationDraft({...valid,metric:'coins'}),/inválida/);
 assert.throws(()=>safeClanOperationDraft({...valid,id:'<script>'}),/inválida/);
 assert.throws(()=>safeClanOperationDraft({...valid,vault_credits:99999999}),/limites/);
});

test('ADM não programa recursos em mapa PvP nem bosses em portais especiais',async()=>{
 const {safeDirective}=await import('../server/competitive-seasons.js');
 const d={title:'Visita da Frota',description:'',category:'boss',map_id:'x4',starts_at:new Date(Date.now()+3600000).toISOString(),ends_at:new Date(Date.now()+7200000).toISOString(),enabled:false};
 assert.equal(safeDirective(d).map_id,'x4');
 assert.throws(()=>safeDirective({...d,map_id:'ggAlpha'}),/Portais especiais/);
 assert.throws(()=>safeDirective({...d,map_id:'b41',category:'resource'}),/PvE/);
});
