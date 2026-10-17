import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validatePlayerSave} from '../server/security-guard.js';
const server=fs.readFileSync('server/index.js','utf8');
const game=fs.readFileSync('public/game.js','utf8');
const sql=fs.readFileSync('sql/STELLAR_V22_7_0_SERVER_WRITE_GATE.sql','utf8');
const uid='11111111-1111-4111-8111-111111111111';
function state(revision){return {accountOwnerId:uid,profile:{credits:1200,uridium:40},serverPurchaseRevision:revision};}
test('saves e perfis financeiros nao podem ser escritos diretamente pelo jogador',()=>{
 assert.match(sql,/REVOKE INSERT,UPDATE,DELETE ON TABLE public\.game_saves FROM PUBLIC, anon, authenticated/);
 assert.match(sql,/REVOKE INSERT,UPDATE,DELETE ON TABLE public\.profiles FROM PUBLIC, anon, authenticated/);
 assert.match(sql,/GRANT UPDATE \(id,callsign,updated_at\).*authenticated/);
 assert.match(sql,/GRANT SELECT,INSERT,UPDATE ON TABLE public\.game_saves TO service_role/);
});
test('rotas HTTP gravam saves somente com cliente interno privilegiado',()=>{
 assert.match(server,/async function writeVerifiedSave\(req,state,updated_at\)/);
 assert.doesNotMatch(server,/req\.sb\.from\('game_saves'\)\.upsert/);
 assert.match(server,/const error = await writeVerifiedSave\(req,state,updated_at\)/);
 assert.match(server,/const writeError=await writeVerifiedSave\(req,state,updated_at\)/);
});
test('revisao de compra server-side e monotona para impedir replay e sobrescrita',()=>{
 assert.match(server,/SAVE_ECONOMY_STALE/);
 assert.match(server,/SAVE_PURCHASE_REVISION_FORGED/);
 assert.match(game,/SAVE_ECONOMY_STALE/);
 assert.match(sql,/IF new_rev<old_rev THEN RAISE EXCEPTION 'SAVE_ECONOMY_STALE'/);
 assert.equal(validatePlayerSave(state(5),state(4),{userId:uid})?.code,'SAVE_PURCHASE_REVISION_FORGED');
 assert.equal(validatePlayerSave(state(4),state(4),{userId:uid}),null);
});
test('as funcoes de recompensa legada continuam sob controle SQL e nao perdem saldo com o trigger',()=>{
 assert.match(sql,/new_rev>old_rev\+1/);
 assert.doesNotMatch(sql,/UPDATE public\.game_saves SET state=/);
 assert.match(server,/requireEliteAdmin\(\)/);
});
