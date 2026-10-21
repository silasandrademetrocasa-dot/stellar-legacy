import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sectorEntryAllowedV450,frontierEliteRespawnV450} from '../server/frontier-stability-v450.js';
import {attachFrontierAuditV450} from '../server/frontier-audit-v450.js';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
test('U sectors accept neutral SQL sector nodes for all authenticated faction rooms',()=>{
 for(const m of ['u1','u2','u3'])for(const f of ['earth','mars','jupiter'])assert.equal(sectorEntryAllowedV450(m,true,{territory_faction:null,enabled:true},f),true);
 assert.equal(sectorEntryAllowedV450('u1',true,null,'earth'),false);
 assert.equal(sectorEntryAllowedV450('u1',true,{territory_faction:'mars',enabled:true},'earth'),false);
 assert.equal(sectorEntryAllowedV450('u3',true,{territory_faction:null,enabled:false},'earth'),false);
});
test('X-1..X-8 ownership protection remains untouched',()=>{
 assert.equal(sectorEntryAllowedV450('x8',true,{territory_faction:'earth'},'earth'),true);
 assert.equal(sectorEntryAllowedV450('x8',true,{territory_faction:'mars'},'earth'),false);
 assert.equal(sectorEntryAllowedV450('x8',true,{territory_faction:null},'earth'),false);
 assert.equal(sectorEntryAllowedV450('b41',false,{territory_faction:null},null),true);
});
test('U-3 elite is unique, can return after defeat and is not created on other maps',()=>{
 const elite=frontierEliteRespawnV450('u3','bossAstralReaper',[]);
 assert.equal(elite.name,'GUARDIÃO DO VAZIO');
 assert.ok(elite.scale>3);
 assert.equal(frontierEliteRespawnV450('u3','bossAstralReaper',[{name:elite.name,hp:1}]),null);
 assert.ok(frontierEliteRespawnV450('u3','bossAstralReaper',[{name:elite.name,hp:0}]));
 assert.equal(frontierEliteRespawnV450('u2','bossAstralReaper',[]),null);
 assert.equal(frontierEliteRespawnV450('u3','nexusWarden',[]),null);
});
test('diagnostics endpoint requires a user and forwards only server-supplied admin RPC',async()=>{
 const routes={};const app={get:(url,...fn)=>routes[url]=fn};
 attachFrontierAuditV450(app,{requireUser:()=>{},asyncRoute:x=>x});
 const handlers=routes['/api/admin/frontier/diagnostics'];assert.equal(handlers.length,2);
 const res=()=>({code:200,status(v){this.code=v;return this},set(){return this},json(v){this.body=v;return this}});
 let r=res();await handlers.at(-1)({sb:{rpc:async name=>{assert.equal(name,'stellar_u450_admin_diagnostics');return {data:{totalMaps:17},error:null}}}},r);
 assert.equal(r.body.ok,true);assert.equal(r.body.report.totalMaps,17);
 r=res();await handlers.at(-1)({sb:{rpc:async()=>({data:null,error:{message:'ADMIN_ONLY'}})}},r);
 assert.equal(r.code,403);assert.equal(r.body.ok,false);
});
test('SQL function is read-only, admin-authorized and no public executable privileges',()=>{
 const sql=read('sql/STELLAR_V45_0_GALACTIC_ASCENSION.sql');
 for(const key of ['auth.uid()','is_game_admin_v1763','REVOKE ALL ON FUNCTION','TO authenticated',"SET search_path TO ''",'game_map_npc_spawns_v1811','stellar_u435_raid_config'])assert.ok(sql.includes(key),key);
 assert.doesNotMatch(sql,/\b(?:DELETE\s+FROM|UPDATE\s+public\.game_saves|TRUNCATE|DROP\s+TABLE)\b/i);
});
test('all components are wired into V45, and source saves are never rewritten',()=>{
 const p=JSON.parse(read('package.json'));
 assert.equal(p.version,'45.1.0');assert.match(p.scripts.check,/v451-apply-patch/);
 assert.match(read('server/world.js'),/sectorEntryAllowedV450\(mapId,territorial,sector,territory\)/);
 assert.match(read('server/world.js'),/frontierEliteRespawnV450\(this\.mapId,r\.type,this\.npcs\.values\(\)\)/);
 assert.match(read('server/index.js'),/attachFrontierAuditV450\(app/);
 assert.match(read('public/modules/unified-expansion-v42.js'),/renderFrontierAuditV450/);
 assert.match(read('public/api.js'),/loadFrontierAuditV450/);
 assert.match(read('tests/v440-galactic-supremacy.test.mjs'),/v451-apply-patch/);
});
