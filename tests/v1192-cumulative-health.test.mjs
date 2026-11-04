import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSaveOperationMonitorV1192} from '../server/save-operation-monitor-v1192.js';
import {inspectSaveHealthV1192} from '../server/save-health-v1192.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const state=()=>({accountOwnerId:'user-01',profile:{credits:300,uridium:500,xp:10,aliensKilled:2},
 drones:[{id:'nova-1',type:'iris',slots:[null,null]}],
 combatConfigsV2013:{profiles:{'1':{droneSlots:{'nova-1':[null,null]}},'2':{droneSlots:{'nova-1':[null,null]}}}}});
const profile=()=>({credits:300,uridium:500,xp:10,aliens_killed:2});
const inspect=extra=>inspectSaveHealthV1192({state:state(),profile:profile(),ownerId:'user-01',
 head:{revision:2},checkpoints:[{slot:'A'},{slot:'B'}],verified:true,...extra});
test('V119.2: diagnostico do save oficial nao altera os dados',()=>{
 const original=state(),serialized=JSON.stringify(original);
 const health=inspect({state:original});
 assert.equal(health.ok,true);assert.equal(health.readonly,true);assert.deepEqual(health.issues,[]);
 assert.equal(JSON.stringify(original),serialized);
 assert.equal(JSON.stringify(health).includes('credits'),false);
});
test('V119.2: detecta divergencia de carteira, XP e abates sem revelar valores',()=>{
 const result=inspect({profile:{credits:301,uridium:4,xp:3,aliens_killed:8}});
 assert.equal(result.ok,false);
 assert.deepEqual(result.issues.map(x=>x.code),[
  'PROFILE_CREDITS_DESYNC','PROFILE_STL_DESYNC','PROFILE_XP_DESYNC','PROFILE_KILLS_DESYNC']);
 assert.doesNotMatch(JSON.stringify(result),/301|500|credits:300/);
});
test('V119.2: detecta drones duplicados e orfaos de CONF1/2',()=>{
 const s=state();s.drones.push({...s.drones[0]});
 s.combatConfigsV2013.profiles['1'].droneSlots.orphan=['lf2'];
 s.combatConfigsV2013.profiles['2'].droneSlots.orphan=['lf2'];
 const result=inspect({state:s});
 assert.equal(result.ok,false);
 assert.ok(result.issues.some(x=>x.code==='DRONE_IDS_INVALID'));
 assert.ok(result.issues.some(x=>x.code==='CONF1_ORPHAN_DRONES'));
 assert.ok(result.issues.some(x=>x.code==='CONF2_ORPHAN_DRONES'));
});
test('V119.2: revisao desatualizada apenas alerta em observe, bloqueia em enforce',()=>{
 const observed=inspect({verified:false,mode:'observe'}),enforced=inspect({verified:false,mode:'enforce'});
 assert.equal(observed.ok,true);assert.equal(enforced.ok,false);
 assert.equal(observed.issues[0].code,'REVISION_HASH_BEHIND');
});
test('V119.2: preview sem save responde indisponivel e nunca resgata A/B/C',()=>{
 const a=inspect({state:null});
 assert.equal(a.ok,false);assert.equal(a.readonly,true);
 assert.equal(a.issues[0].code,'CANONICAL_READ_UNAVAILABLE');
});
test('V119.2: monitor agrega falhas e quantis sem dados pessoais',async()=>{
 const monitor=createSaveOperationMonitorV1192(20);
 for(let i=1;i<=30;i++)monitor.record('farm',i,i%5!==0);
 const data=monitor.snapshot().farm;
 assert.equal(data.samples,20);assert.equal(data.failures,4);
 assert.equal(data.p99Ms,30);assert.equal(data.p95Ms,29);
 assert.doesNotMatch(JSON.stringify(data),/user_id|email|state|credits/);
});
test('V119.2: monitor mede retorno RPC rejeitado sem mascarar resultado',async()=>{
 const m=createSaveOperationMonitorV1192();
 const original={data:null,error:{code:'42501'}};
 const reply=await m.measure('leilao',async()=>original);
 assert.equal(reply,original);assert.equal(m.snapshot().leilao.failures,1);
 const accepted=await m.measure('economia',async()=>({data:{ok:true},error:null}));
 assert.equal(accepted.data.ok,true);assert.equal(m.snapshot().economia.failures,0);
 await assert.rejects(m.measure('farm',async()=>{throw Error('failure');}));
 assert.equal(m.snapshot().farm.failures,1);
});
test('V119.2: monitor nao registra nomes nem payloads do jogador',()=>{
 const m=createSaveOperationMonitorV1192();m.record('unknown',500,false);
 const result=m.snapshot();assert.deepEqual(Object.keys(result),['save']);
 assert.deepEqual(Object.keys(result.save),['samples','failures','avgMs','p95Ms','p99Ms']);
});
test('V119.2: endpoint do diagnostico tem JWT, id somente do usuario, read-only',()=>{
 const server=read('server/index.js');
 assert.match(server,/app\.get\('\/api\/save\/core\/health',requireUser/);
 const part=server.split("app.get('/api/save/core/health'")[1].split("app.get('/api/save/core/events'")[0];
 assert.match(part,/const uid=req\.user\.id/);
 assert.match(part,/Promise\.all\(/);
 assert.doesNotMatch(part,/\.upsert\(|\.update\(|\.insert\(|\.delete\(/);
 assert.match(part,/SAVE_OPERATIONS_V1192\.snapshot\(\)/);
});
test('V119.2: compras, Hangar, leilao e Farm medidos centralmente',()=>{
 const server=read('server/index.js'),farm=read('server/offline-farm-v484.js');
 assert.match(server,/SAVE_OPERATIONS_V1192\.measure\(saveModuleForRequestV119\(req\)/);
 assert.match(server,/SAVE_OPERATIONS_V1192\.measure\('leilao'/);
 assert.match(server,/operationMonitor:SAVE_OPERATIONS_V1192/);
 assert.match(farm,/operationMonitor\?\.record\('farm'/);
});
test('V119.2: Android exibe avisos longos com quebra de linha e tempo maior',()=>{
 const css=read('public/style.css'),game=read('public/game.js');
 assert.match(css,/#toast\{[\s\S]*?white-space:normal!important/);
 assert.match(css,/overflow-wrap:anywhere!important/);
 assert.match(game,/display\.length>90\?6500/);
 assert.match(game,/setAttribute\('aria-live','polite'\)/);
});
test('V119.2: migrations da V119.1 continuam com capturas desativadas por padrao',()=>{
 const prepare=read('sql/STELLAR_V119_1_CAPTURA_ADAPTATIVA_PREPARAR.sql');
 const activate=read('sql/STELLAR_V119_1_CAPTURA_ATIVAR.sql');
 assert.doesNotMatch(prepare,/CREATE TRIGGER stellar_capture_save_update_v119/);
 assert.match(activate,/FARM_EM_ANDAMENTO_ADIAR_ATIVACAO/);
 assert.match(activate,/AFTER UPDATE OF state ON public\.game_saves/);
});
