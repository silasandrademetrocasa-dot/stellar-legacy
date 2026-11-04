import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 saveCoreModeV119,saveModuleForRequestV119,validOperationIdV119,
 saveCoreEnvelopeV119,commitSaveCoreV119,SAVE_LOG_MODULES_V119
} from '../server/save-core-v119.js';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('sql/STELLAR_V119_0_SAVE_UNICO_PREPARAR.sql');
const activate=read('sql/STELLAR_V119_0_ATIVAR_AUDITORIA.sql');
const server=read('server/index.js');
const client=read('public/game.js');
const api=read('public/api.js');

const id='c7193bdb-a8de-4aa2-9729-12cfabef340c';
const state={accountOwnerId:id,profile:{callsign:'Teste'}};
const req={originalUrl:'/api/save',body:{operation_id:id,expected_revision:14}};

test('V119: modo observe por padrao, enforce so por flag',()=>{
 assert.equal(saveCoreModeV119(), 'observe');
 assert.equal(saveCoreModeV119('nope'),'observe');
 assert.equal(saveCoreModeV119('ENFORCE'),'observe'); // V119.5 source gate blocks incomplete cutover
});
test('V119: apenas rotas do servidor decidem modulo de gravacao',()=>{
 assert.equal(saveModuleForRequestV119({originalUrl:'/api/save',body:{equipmentMutationV1062:{intent:'hangar'}}}),'hangar');
 assert.equal(saveModuleForRequestV119({originalUrl:'/api/live/purchase/bulk',body:{}}),'economia');
 assert.equal(saveModuleForRequestV119({originalUrl:'/api/auction/settle',body:{}}),'leilao');
 assert.equal(saveModuleForRequestV119({originalUrl:'/api/save',body:{module:'economia'}}),'checkpoint');
});
test('V119: pedido com operacao unica e revisao valida',()=>{
 assert.equal(validOperationIdV119(id),true);
 assert.equal(validOperationIdV119('x'),false);
 const o=saveCoreEnvelopeV119(req,state);
 assert.equal(o.p_expected_revision,14);
 assert.equal(o.p_operation_id,id);
 assert.equal(o.p_module,'checkpoint');
 assert.throws(()=>saveCoreEnvelopeV119({body:{operation_id:'x'}},state),/SAVE_OPERATION_ID_INVALID/);
 assert.throws(()=>saveCoreEnvelopeV119({body:{expected_revision:-1}},state),/SAVE_EXPECTED_REVISION_INVALID/);
});
test('V119: endpoint usa exclusivamente RPC atomico quando enforce; testes nao mutam DB',async()=>{
 let last=null;
 const service={rpc:async(name,args)=>{last={name,args};return {data:{ok:true,revision:7,operation_id:id,replayed:false},error:null};}};
 const r=await commitSaveCoreV119({service,req,userId:id,state,callsign:'Teste'});
 assert.equal(r.ok,true);assert.equal(last.name,'stellar_commit_player_command_v119');
 assert.equal(last.args.p_user_id,id);assert.equal(last.args.p_state,state);
 assert.equal(last.args.p_module,'checkpoint');assert.equal(last.args.p_expected_revision,14);
});
test('V119: rejeicao da RPC nao vira confirmacao falsa',async()=>{
 const denied=await commitSaveCoreV119({service:{rpc:async()=>({data:{ok:false,code:'SAVE_REVISION_CONFLICT',message:'Sincronize',revision:9},error:null})},req,userId:id,state,callsign:'Teste'});
 assert.equal(denied.ok,false);assert.equal(denied.error.code,'SAVE_REVISION_CONFLICT');
 const broken=await commitSaveCoreV119({service:{rpc:async()=>({data:null,error:{code:'42501',message:'permission denied'}})},req,userId:id,state,callsign:'Teste'});
 assert.equal(broken.ok,false);assert.equal(broken.error.code,'42501');
});
test('V119: SQL mantiene UM canonical game_saves e A/B/C sao somente snapshots',()=>{
 assert.match(sql,/public\.game_saves/);
 assert.match(sql,/stellar_player_save_head_v119/);
 assert.match(sql,/stellar_player_save_checkpoint_v119/);
 assert.match(sql,/stellar_player_save_operation_v119/);
 assert.match(sql,/stellar_read_player_save_v119/);
 assert.match(sql,/SAVE_REVISION_REQUIRED/);
 assert.match(sql,/PRIMARY KEY \(user_id,operation_id\)/i); // idempotencia garantida por indice unico
});
test('V119: backup e revision para QUALQUER alteracao de game_saves, nao apenas Render',()=>{
 assert.match(activate,/AFTER UPDATE OF state ON public\.game_saves/i);
 assert.match(activate,/AFTER INSERT ON public\.game_saves/i);
 assert.match(sql,/TG_OP='UPDATE'/);
 assert.match(sql,/RETURNING revision INTO v_rev/i);
 assert.match(sql,/AFTER UPDATE OF state/i.test(activate)?/stellar_player_save_journal_v119/:/never/);
});
test('V119: logs por modulo, IDs de comando e checkpoint sao privados',()=>{
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/g);
 assert.match(sql,/REVOKE ALL ON TABLE.*FROM PUBLIC,anon,authenticated/g);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.stellar_commit_player_command_v119[\s\S]*?TO service_role/i);
 assert.ok(SAVE_LOG_MODULES_V119.includes('leilao'));
});
test('V119: camada visual não recebe autoridade economica',()=>{
 assert.match(client,/saveOperationPendingV119/);
 assert.match(api,/operation_id/);
 assert.match(server,/saveCoreModeV119\(\)==='enforce'/);
 assert.match(server,/stellar_commit_player_save_v118/); // convivencia controlada
 assert.match(server,/\/api\/save\/core\/logs/);
});
