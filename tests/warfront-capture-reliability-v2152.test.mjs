import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {captureElapsedSeconds,withCaptureTimeout,classifyWarfrontCaptureError,CAPTURE_FAILURE_BACKOFF_MS} from '../server/warfront-capture.js';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('capture usa relógio decorrido e não o dt limitado do combate',()=>{
 assert.equal(captureElapsedSeconds(1000,1050),0.05);
 assert.equal(captureElapsedSeconds(1000,1500),0.5);
 assert.equal(captureElapsedSeconds(1000,6000),2.5);
 assert.equal(captureElapsedSeconds(1000,900),0);
 assert.equal(captureElapsedSeconds(0,1200),0);
 const world=source('server/world.js');
 assert.match(world,/captureDt=captureElapsedSeconds\(node\.lastControlAt,now\)/);
 assert.match(world,/WARFRONT_CAPTURE_RATE\*weight\*captureDt/);
 assert.match(world,/WARFRONT_DECAY_RATE\*captureDt/);
 assert.match(world,/this\.playerFresh\(p\)/);
});
test('falhas SQL, timeout e concorrência são separados sem vazar chave',()=>{
 assert.equal(classifyWarfrontCaptureError(new Error('WARFRONT_REVISION_CONFLICT')).code,'CONCORRENCIA');
 assert.equal(classifyWarfrontCaptureError(new Error('permission denied for table')).code,'PERMISSAO_BANCO');
 assert.equal(classifyWarfrontCaptureError(new Error('CAPTURE_TIMEOUT')).code,'TEMPO_ESGOTADO');
 assert.equal(classifyWarfrontCaptureError(new Error('other error')).code,'GRAVACAO_RECUSADA');
 assert.ok(CAPTURE_FAILURE_BACKOFF_MS>=5000);
});
test('promessa sem retorno expira; confirmação rápida permanece válida',async()=>{
 await assert.rejects(withCaptureTimeout(new Promise(()=>{}),8),/CAPTURE_TIMEOUT/);
 assert.deepEqual(await withCaptureTimeout(Promise.resolve({owner:'earth'}),100),{owner:'earth'});
});
test('captura só muda o dono depois da resposta SQL, com aviso de erro e sucesso',()=>{
 const world=source('server/world.js'),client=source('public/game.js');
 assert.match(world,/withCaptureTimeout\(this\.world\.persistCapture/);
 const start=world.indexOf('withCaptureTimeout(this.world.persistCapture');
 const mutation=world.indexOf('node.owner=row.owner',start);
 assert.ok(start>=0&&mutation>start);
 assert.match(world,/type:'warfront_capture_result',ok:true/);
 assert.match(world,/type:'warfront_capture_result',ok:confirmed/);
 assert.match(world,/node\.retryAt=Date\.now\(\)\+CAPTURE_FAILURE_BACKOFF_MS/);
 assert.match(world,/String\(saved\.captured_by\|\|''\)===String\(actor\.userId\)/);
 assert.match(client,/if\(msg\.type==='warfront_capture_result'\)/);
 assert.match(client,/CONFIRMANDO\.\.\./);
 assert.match(client,/ERRO DE GRAVAÇÃO/);
});
