import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validatePlayerSave} from '../server/security-guard.js';
const world=fs.readFileSync('server/world.js','utf8');
const server=fs.readFileSync('server/index.js','utf8');
const game=fs.readFileSync('public/game.js','utf8');
const sql=fs.readFileSync('sql/STELLAR_V22_9_0_ORE_SERVER_LEDGER.sql','utf8');
test('coleta online confirmada no Supabase antes da entrega',()=>{
 assert.match(world,/async handleOreCollect\(ws,msg\)/);
 assert.match(world,/receipt=await this\.world\.grantOreReward/);
 assert.match(world,/this\.ores\.set\(o\.id,o\)/);
 assert.match(world,/ore_collected',ore:o,collector,reward:receipt/);
 assert.match(server,/stellar_grant_ore_reward_v229/);
});
test('cliente não concede minério sem comprovante e revisao',()=>{
 assert.match(game,/receipt\.revision/);
 assert.match(game,/progress\.serverOreRevision=Number\(receipt\.revision\)/);
 assert.match(server,/SAVE_ORE_STALE/);
 assert.equal(validatePlayerSave({profile:{credits:0,uridium:0},serverOreRevision:5},{profile:{credits:0,uridium:0},serverOreRevision:4},{userId:'x'})?.code,'SAVE_ORE_REVISION_FORGED');
});
test('comprovantes persistentes e função não acessível ao jogador',()=>{
 assert.match(sql,/PRIMARY KEY \(user_id,ore_key\)/);
 assert.match(sql,/FOR UPDATE/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.stellar_grant_ore_reward_v229.*authenticated/);
 assert.match(sql,/CREATE TRIGGER stellar_guard_ore_revision_update_v229/);
});

test('recibos fora de ordem reconstroem o porão a partir do banco',()=>{
 assert.match(game,/Number\(receipt\.revision\)!==localOreRevision\+1/);
 assert.match(game,/loadCloudSave\(\)\.then\(remote/);
});
