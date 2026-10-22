import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const rd=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
const game=rd('public/game.js'),server=rd('server/index.js'),html=rd('public/index.html');
const api=rd('public/api.js');
const sql=rd('sql/STELLAR_V47_8_0_PRELAUNCH_RESET_DELETE.sql');
test('Baixa, Média e Alta show the actual uncapped rAF behavior',()=>{
 assert.match(html,/<b>ALTA<\/b><span>FPS livre \(rAF\)/);
 assert.match(html,/<b>MÉDIA<\/b><span>FPS livre \(rAF\)/);
 assert.match(html,/<b>BAIXA<\/b><span>FPS livre \(rAF\)/);
 const gate=rd('public/modules/frame-gate.js');
 assert.match(gate,/if\(!throttled\)\{last=at;return true;\}/);
});
test('reset epoch returned by server and rejects stale device saves',()=>{
 assert.match(server,/reset_epoch:Number\(resetRecord\?\.epoch\)\|\|0/);
 assert.match(api,/reset_epoch:Number\(body\?\.reset_epoch\)\|\|0/);
 assert.match(server,/SAVE_RESET_STALE/);
 assert.match(game,/accountResetEpochV478=Math\.max/);
 assert.match(game,/localStorage\.removeItem\(saveKey\(\)\)/);
 assert.match(game,/progress\.adminResetEpoch=accountResetEpochV478/);
 assert.match(sql,/CREATE TRIGGER stellar_save_reset_epoch_guard_v478/);
});
test('ADM confirms DB action and protects auth/admin identities',()=>{
 assert.match(game,/resetResult\?\.verified!==true/);
 assert.match(game,/deleteResult\?\.verified!==true/);
 assert.match(sql,/admin_reset_account_v1763_legacy_v478/);
 assert.match(sql,/admin_delete_account_v1763_legacy_v478/);
 assert.match(sql,/public\.is_game_admin_v1763\(v_admin\)/);
 assert.match(sql,/EXISTS\(SELECT 1 FROM auth\.users WHERE id=p_target_user_id\)/);
 assert.doesNotMatch(sql,/DELETE\s+FROM\s+public\.premium_accounts_v12/i);
 assert.doesNotMatch(sql,/DELETE\s+FROM\s+public\.premium_purchases_v12/i);
});
test('NPC rewards and anti-dupe ledger remain in authoritative backend',()=>{
 const world=rd('server/world.js');
 assert.ok(world.includes('npc')&&world.includes('reward'));
 assert.match(sql,/stellar_npc_reward_ledger/);
 assert.match(sql,/stellar_ore_reward_ledger/);
});
