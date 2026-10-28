import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chooseStableAutopilotTargetV87,chooseAutopilotAction,cleanAutopilotConfig} from '../public/modules/stellar-autopilot-v48.js';
import {safeFarmEconomySnapshot} from '../server/farm-v86-economy.js';
import {summarizeBalanceAuditV90} from '../server/balance-audit-v90.js';
const text=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('V86: economia offline exibida é somente leitura, não credita ganhos projetados',()=>{
 const state={profile:{credits:25000,uridium:450,xp:9876,level:16},serverPurchaseRevision:3,serverNpcRewardRevision:7};
 const r=safeFarmEconomySnapshot(state,'2026-10-27T00:00:00Z');
 assert.deepEqual({...r},{credits:25000,stl:450,xp:9876,level:16,serverPurchaseRevision:3,serverNpcRewardRevision:7,updatedAt:'2026-10-27T00:00:00Z'});
 assert.ok(Object.isFrozen(r));assert.equal(state.profile.credits,25000);
 assert.ok(!('predictedReward' in r));
 const server=text('server/offline-farm-v484.js');
 assert.match(server,/\/api\/offline-farm\/v484\/v86\/economy/);
 assert.match(server,/eq\('user_id',req\.user\.id\)/);
 assert.doesNotMatch(server.match(/app\.get\('\/api\/offline-farm\/v484\/v86\/economy'[\s\S]*?\}\)\);/)?.[0]||'',/\.update\(|\.upsert\(/);
});

test('V87: keep viable selected NPC; switch if preferred died or much farther',()=>{
 const p={x:0,y:0},list=[{id:'near',x:100,y:0,hp:100},{id:'selected',x:120,y:0,hp:100}];
 assert.equal(chooseStableAutopilotTargetV87(list,p,'selected')?.id,'selected');
 assert.equal(chooseStableAutopilotTargetV87(list,p,'absent')?.id,'near');
 assert.equal(chooseStableAutopilotTargetV87([{id:'near',x:100,y:0},{id:'far',x:1000,y:0}],p,'far')?.id,'near');
 assert.equal(chooseStableAutopilotTargetV87([],p,'selected'),null);
 assert.equal(cleanAutopilotConfig({preferredTargetId:'ok'}).preferredTargetId,'ok');
 const raw={online:true,ready:true,map:'x1',player:{x:0,y:0,hp:100,maxHp:100},cargoCapacity:100,cargoUsed:0,
 enemies:list,laserRange:800,cargoFree:100,ores:[],bonusBoxes:[],loot:[]};
 assert.equal(chooseAutopilotAction(raw,{map:'x1',autoBuy:false,autoSell:false,boxes:false,preferredTargetId:'selected'}).targetId,'selected');
 const src=text('public/modules/stellar-autopilot-v48.js');
 assert.match(src,/fireRocketRateLimitedV87\(ts\)/);
 assert.match(src,/ts-lastRocketAt<1250/);
});

test('V88: ADM balance audit detects invalid Apex spawns without changing state',()=>{
 const data={npcs:[{npc_key:'apexOverlord',enabled:true,hp:6000000,shield:4200000,xp:425000,credits:14000000,respawn_min_ms:360000,respawn_max_ms:600000}],
 spawns:[{map_id:'x7',npc_key:'apexOverlord',enabled:true,spawn_count:2}],maps:[{map_id:'x7',enabled:true,min_level:15}],missions:[],
 gates:[{config:{alpha:{rounds:[]},beta:{rounds:[]},gamma:{rounds:[]}}}]};
 const ok=summarizeBalanceAuditV90(data);assert.equal(ok.readOnly,true);assert.deepEqual(ok.warnings,[]);assert.equal(ok.apex.count,2);
 const bad=summarizeBalanceAuditV90({...data,spawns:[{map_id:'b43',npc_key:'apexOverlord',enabled:true,spawn_count:3}]});
 assert.match(bad.warnings.join(' '),/Apex/);assert.equal(data.spawns[0].spawn_count,2);
 assert.match(text('server/balance-audit-v90.js'),/is_game_admin_v1763/);
 assert.match(text('public/index.html'),/v90BalanceAuditBtn/);
});

test('V89: advanced missions are new and do not overwrite old mission IDs, level x7 aligned',()=>{
 const game=text('public/game.js');
 for(const id of ['special_v89_x5','special_v89_x6','special_v89_x7','special_v90_apex','special_v89_x8','special_v89_nexus','special_v89_astral']) assert.ok(game.includes(id),id);
 assert.match(game,/const SMART_MAP_REQUIRED_LEVEL=\{x1:1,x2:3,x3:5,x4:7,x5:9,x6:12,x7:15,x8:18/);
 assert.match(game,/smartNpcPool\(level,false\)\.filter\(id=>id!=='apexOverlord'\)/);
 assert.match(game,/\['apexOverlord',2\]/);
});

test('V90: legendary alert is cosmetic, unique and persistent visuals untouched',()=>{
 const game=text('public/game.js');
 assert.match(game,/target\.type==='apexOverlord'&&state\.target\?\.id!==target\.id/);
 assert.match(game,/APEX OVERLORD • CHEFE LENDÁRIO X-7/);
 assert.match(text('server/balance-audit-v90.js'),/apex\[0\]\?\.map_id!=='x7'/);
 assert.match(text('public/modules/stellar-offline-farm-v484.js'),/#v485-world-lock/);
 assert.equal(JSON.parse(text('package.json')).version,'47.7.59');
});
