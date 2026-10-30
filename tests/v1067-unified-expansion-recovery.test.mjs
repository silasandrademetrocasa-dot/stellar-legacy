import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {universeDashboardFailureV1067 as classify,loadUniverseDashboardWithRetryV1067 as recover} from '../public/modules/unified-expansion-recovery-v1067.js';
import {attachFrontierUnifiedV42} from '../server/frontier-unified-v42.js';

const client=readFileSync(new URL('../public/modules/unified-expansion-v42.js',import.meta.url),'utf8');
const makeResponse=()=>({statusCode:200,headers:{},status(n){this.statusCode=n;return this},set(k,v){this.headers[k]=v;return this},json(v){this.body=v;return this}});
const dashboardRoute=()=>{const app={routes:{},get(path,...handlers){this.routes['GET '+path]=handlers},post(path,...handlers){this.routes['POST '+path]=handlers}};attachFrontierUnifiedV42(app,{requireUser:()=>{},asyncRoute:fn=>fn});return app.routes['GET /api/frontier/v42'].at(-1)};
const invoke=async(result)=>{const req={sb:{rpc:async()=>result}},res=makeResponse();await dashboardRoute()(req,res);return res};

test('V106.7: status de autenticação nunca é tratado como indisponibilidade do universo',()=>{
 assert.equal(classify({status:401}).kind,'auth');
 assert.equal(classify({code:'SESSION_REPLACED',status:409}).retryable,false);
 assert.equal(classify({status:403}).kind,'auth');
});
test('V106.7: timeout e indisponibilidade temporal têm diagnóstico e retry',()=>{
 assert.equal(classify({code:'UNIVERSE_DB_TIMEOUT',status:504}).kind,'timeout');
 assert.equal(classify({code:'NETWORK_TIMEOUT'}).retryable,true);
 assert.equal(classify({status:503,code:'UNIVERSE_DB_ERROR'}).retryable,true);
 assert.equal(classify({code:'UNIVERSE_SQL_MISSING',status:503}).retryable,false);
});
test('V106.7: recupera leitura transitória com no máximo mais um GET',async()=>{
 let calls=0,slept=0;
 const result=await recover(async()=>{calls++;if(calls===1)throw {status:503};return {catalog:[]}}, {delay:async ms=>{slept=ms}});
 assert.deepEqual(result,{catalog:[]});assert.equal(calls,2);assert.equal(slept,500);
});
test('V106.7: um segundo erro de leitura não vira repetição infinita',async()=>{
 let calls=0;
 await assert.rejects(()=>recover(async()=>{calls++;throw Object.assign(new Error('timeout'),{status:504})},{delay:async()=>{}}),/timeout/);
 assert.equal(calls,2);
});
test('V106.7: nao repete falhas de sessao ou de SQL ausente',async()=>{
 for(const err of [{status:401},{code:'UNIVERSE_SQL_MISSING',status:503}]){
  let calls=0;await assert.rejects(()=>recover(async()=>{calls++;throw err},{delay:async()=>{}}));assert.equal(calls,1);
 }
});
test('V106.7: rota V42 retorna dados existentes intactos e no-store',async()=>{
 const data={catalog:[{code:'x'}],credits:1234,materials:{Aurorium:9}};
 const res=await invoke({data,error:null});assert.equal(res.statusCode,200);assert.equal(res.headers['Cache-Control'],'no-store');assert.deepEqual(res.body,data);
});
test('V106.7: rota V42 diferencia falta de SQL de timeout sem dados privados',async()=>{
 const log=console.warn;console.warn=()=>{};
 try{
  let res=await invoke({data:null,error:{code:'57014',message:'canceling statement due to statement timeout'}});
  assert.equal(res.statusCode,504);assert.equal(res.body.code,'UNIVERSE_DB_TIMEOUT');assert.equal(res.headers['Retry-After'],'1');
  assert.equal(JSON.stringify(res.body).includes('57014'),false);
  res=await invoke({data:null,error:{code:'PGRST202',message:'Function does not exist in schema cache'}});
  assert.equal(res.statusCode,503);assert.equal(res.body.code,'UNIVERSE_SQL_MISSING');
 }finally{console.warn=log;}
});
test('V106.7: rota nao aceita payload incompleto em silencio',async()=>{
 const log=console.warn;console.warn=()=>{};try{
  const res=await invoke({data:{foo:true},error:null});assert.equal(res.statusCode,503);assert.equal(res.body.code,'UNIVERSE_INVALID_RESPONSE');
 }finally{console.warn=log;}
});
test('V106.7: interface trata especificamente a Expansão Unificada V42, nao os mapas U-X',()=>{
 assert.match(client,/frontierExpansionContentV42/);
 assert.match(client,/loadUniverseDashboardWithRetryV1067/);
 assert.match(client,/universeDashboardFailureV1067/);
 assert.match(client,/TENTAR NOVAMENTE/);
 assert.match(client,/snapshot=previous/);
 assert.doesNotMatch(client,/As atividades do universo estão temporariamente indisponíveis\. Tente novamente\./);
});
