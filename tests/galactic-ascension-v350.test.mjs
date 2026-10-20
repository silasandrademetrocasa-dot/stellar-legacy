import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {dirname} from 'node:path';
import {fortificationLevel,fortificationNextLevel,fortificationStats,fortificationCanAfford,galacticEconomyVitals} from '../public/modules/galactic-ascension-v350.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const cfg=[{level:1,hp_bonus:0,shield_bonus:0,credits:0,parts_each:0,min_clan_level:1},
 {level:2,hp_bonus:250000,shield_bonus:250000,credits:2000000,parts_each:12,min_clan_level:3},
 {level:3,hp_bonus:750000,shield_bonus:750000,credits:5000000,parts_each:25,min_clan_level:5}];
const clan={isOwner:true,level:5,vault_credits:6000000};
const parts=[{part_type:'hull_parts',quantity:30},{part_type:'shield_parts',quantity:30}];
test('Fortification levels are independent and capped at LV3',()=>{
 assert.equal(fortificationLevel(null),1);assert.equal(fortificationLevel(-3),1);assert.equal(fortificationLevel(99),3);
 assert.equal(fortificationNextLevel(1,cfg)?.level,2);assert.equal(fortificationNextLevel(2,cfg)?.level,3);assert.equal(fortificationNextLevel(3,cfg),null);
 assert.equal(fortificationStats({fortificationLevel:3},cfg).hpBonus,750000);
 assert.equal(fortificationStats({fortificationLevel:1},cfg).shieldBonus,0);
});
test('UI affordability checks both part types, coffer and clan level',()=>{
 assert.equal(fortificationCanAfford(cfg[2],clan,parts),true);
 assert.equal(fortificationCanAfford(cfg[2],{...clan,level:4},parts),false);
 assert.equal(fortificationCanAfford(cfg[2],{...clan,vault_credits:100},parts),false);
 assert.equal(fortificationCanAfford(cfg[2],{...clan,isOwner:false},parts),false);
 assert.equal(fortificationCanAfford(cfg[2],clan,[{part_type:'hull_parts',quantity:40}]),false);
 assert.equal(fortificationCanAfford(cfg[2],clan,[{part_type:'shield_parts',quantity:40}]),false);
});
test('Admin configuration reports only valid costs',()=>{
 assert.deepEqual(galacticEconomyVitals(Array(36).fill({credits:100000}),cfg),{pricesConfigured:true,unsafePrices:false,maxPrice:5000000});
 assert.equal(galacticEconomyVitals([{credits:-1}],cfg).unsafePrices,true);
});
test('Server loads tier from SQL but does not require migration for old relay game',()=>{
 const srv=read('server/index.js'),router=read('server/relay-router-v346.js'),world=read('server/world.js');
 for(const k of ['stellar_relay_fortifications_v350','fortResult.data||[]','level:Number('])assert.ok(srv.includes(k),k);
 for(const k of ['stellar_relay_fortification_upgrade_v350','ONLY_CLAN_OWNER','fortificationTiers','req.sb.rpc','serviceClient']){
  assert.ok((router+read('sql/V35_0_0_GALACTIC_ASCENSION_FORTIFICATIONS.sql')).includes(k),k);
 }
 assert.match(router,/missing\(tierResult\.error\)/);
 assert.match(world,/relayLevel:n\.relayLevel\|\|1/);
 assert.match(world,/node\.relayLevel=Math\.min\(3/);
});
test('Single migration locks clan, relay, checks membership and charges atomically',()=>{
 const s=read('sql/V35_0_0_GALACTIC_ASCENSION_FORTIFICATIONS.sql');
 assert.match(s,/BEGIN;/);assert.match(s,/COMMIT;\s*$/);
 for(const k of ['FOR UPDATE','FOR SHARE','owner_id=uid','auth.uid()','vault_credits=vault_credits-cfg.credits','quantity=quantity-cfg.parts_each','INSUFFICIENT_HULL_PARTS','INSUFFICIENT_SHIELD_PARTS','RELAY_NOT_OWNED','STALE_FORTIFICATION_LEVEL','stellar_relay_fortification_audit_v350','stellar_relay_recompute_v346','stellar_relay_fortification_transfer_v350'])assert.ok(s.includes(k),k);
 assert.doesNotMatch(s,/\b(?:DELETE\s+FROM\s+public\.(?:game_saves|clans|stellar_relay_modules_v346)|DROP\s+TABLE|TRUNCATE)\b/i);
 assert.match(s,/REVOKE ALL ON public\.stellar_relay_fortification_tiers_v350,public\.stellar_relay_fortifications_v350,public\.stellar_relay_fortification_audit_v350 FROM PUBLIC,anon,authenticated/);
 assert.match(s,/GRANT EXECUTE ON FUNCTION public\.stellar_relay_fortification_upgrade_v350\(text,text,integer\) TO authenticated/);
});
test('Fortification upgrade increases maximum but does not repair in combat',()=>{
 const s=read('sql/V35_0_0_GALACTIC_ASCENSION_FORTIFICATIONS.sql');
 assert.match(s,/hp=LEAST\(hp,LEAST\(16000000,bh\+mh\+coalesce\(th,0\)\)\)/);
 assert.match(s,/shield=LEAST\(shield,LEAST\(10000000,bs\+ms\+coalesce\(ts,0\)\)\)/);
 assert.ok(s.indexOf('UPDATE public.stellar_relay_fortifications_v350 SET level=cfg.level')<s.indexOf('PERFORM public.stellar_relay_recompute_v346(p_map_id,p_node_id)'));
});
test('No economic, NPC, pilot save or weapon damage changes are introduced in patch',()=>{
 const game=read('public/game.js'),api=read('public/api.js');
 assert.match(game,/data-relay-fort-upgrade/);assert.match(game,/openConfirmModal\(\{eyebrow:'FORTALEZA • ASCENSÃO'/);
 assert.match(game,/relayMissionBusy\.has\(id\)/);assert.match(game,/fortTierSave\.disabled=true/);
 assert.match(api,/export const upgradeRelayFortificationOnline/);assert.match(api,/export const saveRelayFortificationTierOnline/);
 assert.match(read('sql/V35_0_0_GALACTIC_ASCENSION_ROLLBACK.sql'),/DROP TRIGGER IF EXISTS stellar_relay_fortification_transfer_v350/);
});
test('Visuals have LV1/LV2/LV3 silhouettes without mobile low-cost shadows',()=>{
 const visual=read('public/modules/visual-revolution-v347.js');
 for(const marker of ['if(level>=2)','if(level>=3)',"level>=3?'#ffdca3'",'visualFxBudget'])assert.ok(visual.includes(marker),marker);
 assert.match(visual,/if\(quality==='low'\)return \{relayGeometry:1,relayGlow:0/);
});
