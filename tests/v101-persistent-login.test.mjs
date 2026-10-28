import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {
  canRememberSessionV101,rememberSessionEnabledV101,setRememberSessionV101,
  persistSessionV101,loadPersistedSessionV101,clearPersistedSessionV101,
  getRememberedEmailV101,setRememberEmailV101
} from '../public/modules/login-persistence-v101.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
function mockStorage(){
 const map=new Map();return {getItem:key=>map.has(key)?map.get(key):null,
  setItem:(key,v)=>map.set(key,String(v)),removeItem:k=>map.delete(k),clear:()=>map.clear(),map};
}
function testEnv(native=true){
 const localStorage=mockStorage(),sessionStorage=mockStorage();let vault='';
 const bridge={storeSession:v=>{vault=v},loadSession:()=>vault,clearSession:()=>{vault=''}};
 globalThis.window={localStorage,...(native?{StellarSessionVault:bridge}:{})};
 globalThis.sessionStorage=sessionStorage;
 return {localStorage,sessionStorage,bridge,get vault(){return vault;}};
}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}})}

// Para isolar variáveis internas do módulo de rede entre os testes.
async function freshApi(tag){return import(`../public/api.js?v101_${tag}_${Date.now()}`)}

test('V101: Web lembra somente e-mail, não persiste tokens fora da aba',()=>{
 const env=testEnv(false);
 assert.equal(canRememberSessionV101(),false);
 setRememberEmailV101(true,' Pilot@Example.COM ');
 assert.equal(getRememberedEmailV101(),'pilot@example.com');
 assert.equal(persistSessionV101({refresh_token:'secret',game_session_id:'id'}, {id:'u1'}),false);
 assert.equal(env.localStorage.map.has('stellarLegacyV4Session'),false);
 setRememberEmailV101(false);
 assert.equal(getRememberedEmailV101(),'');
});

test('V101: cofre opt-in persiste refresh token e id, mas não senha nem access token',()=>{
 const env=testEnv(true);
 assert.equal(rememberSessionEnabledV101(),true);
 assert.equal(persistSessionV101({access_token:'short',refresh_token:'renew_me',game_session_id:'game_session'},
  {id:'pilot',email:'user@demo.com',callsign:'Pilot'}),true);
 const raw=JSON.parse(env.vault);
 assert.equal(raw.session.access_token,undefined);
 assert.equal(raw.session.refresh_token,'renew_me');
 assert.equal(raw.session.game_session_id,'game_session');
 assert.equal(raw.session.password,undefined);
 assert.equal(loadPersistedSessionV101()?.user?.email,'user@demo.com');
 setRememberSessionV101(false);
 assert.equal(loadPersistedSessionV101(),null);
 assert.equal(env.vault,'');
});

test('V101: APK restaura após processo encerrado, renova e valida com Render',async()=>{
 const env=testEnv(true);
 const calls=[];
 globalThis.fetch=async(input,options={})=>{
  const path=String(input);calls.push(path);
  if(path==='/api/auth/login')return json({session:{access_token:'initial',refresh_token:'refresh_1',game_session_id:'g1',expires_at:100},user:{id:'u1',email:'pilot@example.com'}});
  if(path==='/api/auth/refresh'){
   const sent=JSON.parse(options.body);
   assert.equal(sent.refresh_token,'refresh_1');assert.equal(sent.game_session_id,'g1');
   return json({session:{access_token:'renewed',refresh_token:'refresh_2',game_session_id:'g1',expires_at:Math.floor(Date.now()/1000)+3600},user:{id:'u1',email:'pilot@example.com'}});
  }
  if(path==='/api/auth/me'){
   assert.equal(options.headers.Authorization,'Bearer renewed');return json({user:{id:'u1',email:'pilot@example.com'}});
  }
  throw Error('Unexpected '+path);
 };
 const first=await freshApi('login');
 await first.signIn({email:'pilot@example.com',password:'s3cret_senha'});
 assert.ok(env.vault.includes('refresh_1'));
 assert.ok(!env.vault.includes('s3cret_senha'));
 env.sessionStorage.clear(); // Android WebView reiniciado.
 const second=await freshApi('restart');
 const restored=await second.restoreSession();
 assert.equal(restored?.user?.id,'u1');
 assert.equal(second.getSessionCredentials().accessToken,'renewed');
 assert.equal(JSON.parse(env.vault).session.refresh_token,'refresh_2');
 assert.ok(calls.includes('/api/auth/refresh'));
 assert.ok(calls.includes('/api/auth/me'));
 second.signOutLocal();
 assert.equal(env.vault,'');
 assert.equal(env.sessionStorage.getItem('stellarLegacyV4Session'),null);
});

test('V101: falha temporária mantém cofre, mas sessão substituída o apaga',async()=>{
 const env=testEnv(true);
 persistSessionV101({refresh_token:'refresh_1',game_session_id:'g1'},{id:'u1',email:'u@x.tld'});
 globalThis.fetch=async()=>{throw new Error('Sem rede')};
 const api=await freshApi('offline');
 assert.equal(await api.restoreSession(),null);
 assert.equal(api.getSessionRestoreErrorV101()?.code,'NETWORK_OFFLINE');
 assert.ok(env.vault);
 globalThis.fetch=async()=>json({code:'SESSION_REPLACED',error:'Sessão substituída'},409);
 assert.equal(await api.restoreSession(),null);
 assert.equal(env.vault,'');
});

test('V101: Java criptografa AES-GCM com Android Keystore, sem backup de credenciais',()=>{
 const java=readFileSync(resolve(root,'android/app/src/main/java/com/stellarlegacy/mobile/MainActivity.java'),'utf8');
 const manifest=readFileSync(resolve(root,'android/app/src/main/AndroidManifest.xml'),'utf8');
 assert.match(java,/AES\/GCM\/NoPadding/);
 assert.match(java,/AndroidKeyStore/);
 assert.match(java,/@JavascriptInterface public String loadSession\(/);
 assert.match(java,/@JavascriptInterface public void clearSession\(/);
 assert.match(java,/getSharedPreferences\(PREFS, Context\.MODE_PRIVATE\)/);
 assert.match(manifest,/android:allowBackup="false"/);
});

test('V101: tela de login tem opção APK e retry; bootstrap não força logout',()=>{
 const game=readFileSync(resolve(root,'public/game.js'),'utf8');
 const html=readFileSync(resolve(root,'public/index.html'),'utf8');
 assert.match(html,/id="loginRememberEmail"/);
 assert.match(html,/id="loginRememberApk"/);
 assert.match(html,/id="loginRetrySessionBtn"/);
 assert.match(game,/const restored=await restoreSession\(\)/);
 assert.doesNotMatch(game,/V14\.1 SECURITY: nunca entra sozinho/);
});
