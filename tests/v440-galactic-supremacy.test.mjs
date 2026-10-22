import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sectorPortalsV435,registerFrontierSectorsV435} from '../public/modules/frontier-sectors-v435.js';
import {mergeFrontierServerPortalsV440,filteredFrontierPortalsV440,uniqueFrontierPortalsV440} from '../public/modules/frontier-routing-v440.js';
import {validAdminTestGrantV440,attachFrontierAdminV440} from '../server/frontier-admin-v440.js';
import {frontierBossSetupV440} from '../public/modules/frontier-boss-v440.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('U sectors reuse the flight, ore and NPC engine with no huge enemy stacks',()=>{
 const maps=registerFrontierSectorsV435({});
 assert.equal(Object.keys(maps).length,3);
 for(const id of ['u1','u2','u3']){
  assert.ok(maps[id].enemyGroups.length===3);
  assert.ok(maps[id].enemyGroups.reduce((n,g)=>n+g.count,0)<=20);
  assert.ok(maps[id].world.w>=12000);
  assert.equal(maps[id].gate,undefined);
 }
});
test('U-3 Guardian has three existing boss phases and replaces rather than adds a spawn',()=>{
 const strongest=frontierBossSetupV440('u3','bossAstralReaper',0);
 assert.equal(strongest.name,'GUARDIÃO DO VAZIO');assert.ok(strongest.scale>3);
 assert.equal(frontierBossSetupV440('u3','bossAstralReaper',1),null);
 assert.equal(frontierBossSetupV440('x1','bossAstralReaper',0),null);
 assert.ok(read('server/world.js').includes('frontierBossSetupV440(this.mapId,group.type,i)||opts'));
 assert.ok(read('server/world.js').includes('this.applyBossPhase(e)'));
});
test('DB-enabled links only: no automatic restoration of disabled U routes in server or client',()=>{
 const map={world:{w:12000,h:8900}};
 const original=sectorPortalsV435('1-8','earth')[0];
 const data=[{from_sector:'1-8',to_sector:'U-1',enabled:true}];
 const server=mergeFrontierServerPortalsV440('x8','earth',map,[{...original,x:30,y:30}],data);
 assert.equal(server.length,1);
 assert.equal(server[0].x,Math.round(map.world.w/2));
 assert.equal(server[0].y,Math.round(map.world.h/2));
 assert.equal(mergeFrontierServerPortalsV440('x8','earth',map,[],data).length,0);
 assert.equal(filteredFrontierPortalsV440('1-8','earth',[],true).length,0);
 assert.equal(filteredFrontierPortalsV440('1-8','earth',['U-1'],true).length,1);
 assert.equal(filteredFrontierPortalsV440('1-8','earth',[],false).length,1);
});
test('U-1 return portal stays within the entering faction and duplicates are removed',()=>{
 const p=sectorPortalsV435('U-1','mars');
 assert.equal(p.find(x=>x.to==='x8').targetLabel,'2-8');
 assert.equal(p.find(x=>x.to==='u2').targetLabel,'U-2');
 assert.equal(filteredFrontierPortalsV440('U-1','mars',['U-2','2-8'],true).length,2);
 assert.equal(filteredFrontierPortalsV440('U-1','mars',['U-2','1-8'],true).length,1);
 assert.equal(uniqueFrontierPortalsV440([p[0],p[0],p[1]]).length,2);
});
test('Private ADM grant rejects relay modules, invalid values and untrusted targets',async()=>{
 assert.equal(validAdminTestGrantV440({code:'astral_guard',quantity:5}),true);
 for(const c of ['relay_module','relay_laser','relay_core','credits','eclipsium',''])assert.equal(validAdminTestGrantV440({code:c,quantity:5}),false);
 for(const q of [-1,0,6,1.5, '5',null])assert.equal(validAdminTestGrantV440({code:'eclipse_lance',quantity:q}),false);
 const routes={};const app={post:(p,...callbacks)=>routes[p]=callbacks.at(-1)};
 attachFrontierAdminV440(app,{requireUser:()=>{},asyncRoute:f=>f});
 const res=()=>({status(n){this.code=n;return this},set(){return this},json(x){this.body=x;return this}});
 let reply=res(),calls=0;
 await routes['/api/admin/frontier/test-kit']({body:{code:'relay_module',quantity:5},sb:{rpc:()=>{calls++;}}},reply);
 assert.equal(reply.code,400);assert.equal(calls,0);
 reply=res();await routes['/api/admin/frontier/test-kit']({body:{code:'eclipse_lance',quantity:5,userId:'another-player'},sb:{rpc:async(name,args)=>{assert.equal(name,'stellar_u440_admin_test_kit');assert.deepEqual(args,{p_code:'eclipse_lance',p_quantity:5});return{data:{ok:true,quantity:10},error:null};}}},reply);
 assert.equal(reply.body.ok,true);
});
test('SQL is additive, bounded and role-protected',()=>{
 const sql=read('sql/STELLAR_V44_0_GALACTIC_SUPREMACY.sql');
 for(const fragment of ["'stellar_u440_earth'","'stellar_u440_mars'","'stellar_u440_jupiter'","'stellar_u440_veil_ion'","'stellar_u440_ion_void'",'ON CONFLICT(map_id,npc_key) DO NOTHING','ENABLE ROW LEVEL SECURITY','auth.uid()','is_game_admin_v1763','REVOKE ALL ON FUNCTION public.stellar_u440_admin_test_kit','quantity+excluded.quantity<=30',"config_key IN ('world','npc')"]){
  assert.ok(sql.includes(fragment),fragment);
 }
 assert.doesNotMatch(sql,/(?:DELETE FROM|UPDATE)\s+public\.game_saves|TRUNCATE\s|DROP\s+TABLE|relay_modules/i);
});
test('Installer keeps the existing live releases and migrates old tests without disabling them',()=>{
 const p=JSON.parse(read('package.json'));
 assert.equal(p.version,'47.7.4');assert.match(p.scripts.check,/v4774-apply-patch/);
 assert.match(read('server/world.js'),/mergeFrontierServerPortalsV440/);
 assert.match(read('public/game.js'),/filteredFrontierPortalsV440/);
 assert.match(read('public/modules/astral-operations-v435.js'),/adminAstralTestKitV440/);
 assert.match(read('server/index.js'),/attachFrontierAdminV440/);
 assert.match(read('tests/v435-integration.test.mjs'),/v4774-apply-patch/);
 assert.match(read('tests/v431-combat-evolution.test.mjs'),/\\d\+|\\d/);
});
