import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {configureNativeDataOrigin} from '../public/modules/native-data-origin.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const api=read('public/api.js');

test('public config pins data origin before all direct Supabase requests, preserving auth and payloads',async()=>{
 const calls=[],grants=[];
 const native={allowDataOrigin:origin=>{grants.push(origin);return origin==='https://project.supabase.co';}};
 // Execute the actual config and Supabase transport functions, rather than a duplicate implementation.
 const start=api.indexOf('async function getConfig()');
 const end=api.indexOf('\nfunction setSession(',start);
 const session={access_token:'test-access-token',game_session_id:'test-game-session'};
 const context={emitCombatConfirmationV144(){},configPromise:null,configureNativeDataOrigin:url=>configureNativeDataOrigin(url,native),session,
  document:{body:{classList:{contains:()=>false}}},offlineFarmDirectActivityAllowedV103:()=>true,
  saveSessionKey:()=>session.game_session_id,checkSaveSession:()=>{},readBaselines:new WeakMap(),
  coalesceReadV104:(_key,fetcher)=>fetcher(),
  boundedFetchV4831:async(url,options)=>{
   calls.push({url,options});
   if(url==='/api/config')return {res:{ok:true},body:{supabaseUrl:'https://project.supabase.co',supabasePublishableKey:'public-test-key'}};
   assert.deepEqual(grants,['https://project.supabase.co'],'native origin must be ready before network dispatch');
   return {res:{ok:true},body:{ok:true}};
  }};
 vm.createContext(context);vm.runInContext(api.slice(start,end),context);
 for(const path of ['/rest/v1/rpc/get_public_rankings','/rest/v1/rpc/get_chat_history_v16','/rest/v1/rpc/send_chat_message_v16','/rest/v1/rpc/stellar_arena_status_v135','/rest/v1/rpc/get_arena_state','/rest/v1/rpc/get_arena_daily_reward_status','/rest/v1/rpc/stellar_player_claim_arena_daily_reward','/rest/v1/rpc/stellar_player_claim_clan_credit_grants','/rest/v1/auction_bids?select=*','/auth/v1/user']){
  await context.supabaseFetch(path,{method:'POST',body:'{"request_id":"stable-id"}'},true);
  const request=calls.at(-1);assert.equal(request.url,'https://project.supabase.co'+path);
  assert.equal(request.options.headers.Authorization,'Bearer test-access-token');
  assert.equal(request.options.headers.apikey,'public-test-key');
  assert.equal(request.options.body,'{"request_id":"stable-id"}');
 }
 assert.equal(calls.filter(x=>x.url==='/api/config').length,1);
});

test('web does not depend on native bridge; older APK gets an actionable update error',()=>{
 assert.doesNotThrow(()=>configureNativeDataOrigin('https://project.supabase.co',null));
 assert.throws(()=>configureNativeDataOrigin('https://project.supabase.co',{}),error=>error.code==='APK_UPDATE_REQUIRED'&&/Atualize o APK/.test(error.message));
 assert.throws(()=>configureNativeDataOrigin('https://project.supabase.co',{allowDataOrigin:()=>false}),error=>error.code==='APK_DATA_ORIGIN_REJECTED');
});

test('configuration rejected by native routing is retriable and sends no Supabase mutation',async()=>{
 let reject=true,dispatches=0;
 const context={emitCombatConfirmationV144(){},configPromise:null,configureNativeDataOrigin:url=>configureNativeDataOrigin(url,{allowDataOrigin:()=>!reject}),
  boundedFetchV4831:async url=>{assert.equal(url,'/api/config');dispatches++;return {res:{ok:true},body:{supabaseUrl:'https://project.supabase.co',supabasePublishableKey:'public-test-key'}};}};
 vm.createContext(context);vm.runInContext(api.slice(api.indexOf('async function getConfig()'),api.indexOf('\nasync function supabaseFetch(')),context);
 await assert.rejects(context.getConfig(),{code:'APK_DATA_ORIGIN_REJECTED'});
 assert.equal(context.configPromise,null);reject=false;const config=await context.getConfig();
 assert.equal(config.url,'https://project.supabase.co');assert.equal(dispatches,2);
});
