import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const read=file=>readFileSync(new URL(file,root),'utf8');

test('native Android and worker share a tested route policy (assets never use the network)',t=>{
 const javaCheck=spawnSync('javac',['-version'],{encoding:'utf8'});
 if(javaCheck.error?.code==='ENOENT' && process.env.STELLAR_REQUIRE_JAVA_TEST!=='1') {t.skip('JDK ausente; compilação da política nativa obrigatória no workflow APK');return;}
 const dir=mkdtempSync(join(tmpdir(),'stellar-native-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 writeFileSync(join(dir,'AssetRoutePolicy.java'),read('android/app/src/main/java/com/stellarlegacy/mobile/AssetRoutePolicy.java'));
 writeFileSync(join(dir,'RouteTest.java'),`package com.stellarlegacy.mobile;
 public class RouteTest {
  static final AssetRoutePolicy policy = new AssetRoutePolicy();
  static void check(String scheme,String host,int port,String path,AssetRoutePolicy.Route expected) {
   if(policy.classify("game.example",scheme,host,port,path)!=expected) throw new AssertionError(path);
  }
  public static void main(String[] args) {
   check("https","project.supabase.co",443,"/rest/v1/rpc/get_public_rankings",AssetRoutePolicy.Route.BLOCKED);
   if(policy.allowDataOrigin("http://project.supabase.co")) throw new AssertionError("HTTP config");
   if(policy.allowDataOrigin("https://user:password@project.supabase.co")) throw new AssertionError("credentials");
   if(policy.allowDataOrigin("https://project.supabase.co/wrong")) throw new AssertionError("path");
   if(!policy.allowDataOrigin("https://project.supabase.co/")) throw new AssertionError("origin");
   if(!policy.allowDataOrigin("https://PROJECT.supabase.co")) throw new AssertionError("same origin");
   if(policy.allowDataOrigin("https://other.supabase.co")) throw new AssertionError("repin");
   for(String rpc:new String[]{"get_public_rankings","get_chat_history_v16","send_chat_message_v16","stellar_arena_status_v135","get_arena_state","get_arena_opponents","get_arena_history","get_arena_daily_reward_status","stellar_player_claim_arena_daily_reward","stellar_player_claim_clan_credit_grants","claim_event_designer_v165"}) check("https","project.supabase.co",443,"/rest/v1/rpc/"+rpc,AssetRoutePolicy.Route.DATA);
   check("https","project.supabase.co",443,"/rest/v1/auction_bids",AssetRoutePolicy.Route.DATA);
   check("https","project.supabase.co",443,"/auth/v1/user",AssetRoutePolicy.Route.DATA);
   check("https","project.supabase.co",443,"/assets/ship.webp",AssetRoutePolicy.Route.BLOCKED);
   check("https","project.supabase.co",443,"/storage/v1/object/public/ship.webp",AssetRoutePolicy.Route.BLOCKED);
   check("https","other.supabase.co",443,"/rest/v1/rpc/get_public_rankings",AssetRoutePolicy.Route.BLOCKED);
   check("https","project.supabase.co.evil.example",443,"/rest/v1/profiles",AssetRoutePolicy.Route.BLOCKED);
   for(String path:new String[]{"/api","/api/player","/api/auth/login","/ws","/health"}) check("https","game.example",-1,path,AssetRoutePolicy.Route.DATA);
   for(String path:new String[]{"/","/index.html","/assets/v141/loading/natal-vertical.webp","/modules/a.js","/sw.js","/api-other","/api.json","/health/image.png","/missing.webp"}) check("https","GAME.EXAMPLE",443,path,AssetRoutePolicy.Route.LOCAL);
   check("https","cdn.example",443,"/assets/ship.webp",AssetRoutePolicy.Route.BLOCKED);
   check("http","game.example",80,"/api/login",AssetRoutePolicy.Route.BLOCKED);
   check("https","game.example",444,"/api/login",AssetRoutePolicy.Route.BLOCKED);
   check("https",null,-1,"/index.html",AssetRoutePolicy.Route.BLOCKED);
  }
 }`);
 const compiler=spawnSync('javac',['-d',dir,join(dir,'AssetRoutePolicy.java'),join(dir,'RouteTest.java')],{encoding:'utf8'});
 assert.equal(compiler.status,0,compiler.error?.message||compiler.stderr);
 const run=spawnSync('java',['-cp',dir,'com.stellarlegacy.mobile.RouteTest'],{encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);
 const native=read('android/app/src/main/java/com/stellarlegacy/mobile/MainActivity.java');
 assert.ok(native.indexOf('setServiceWorkerClient(')<native.indexOf('new WebView(this)'));
 assert.equal((native.match(/return routeResource\(request.getUrl\(\)\)/g)||[]).length,2);
});

test('final APK audit rejects omitted, corrupted and extra resources',t=>{
 const dir=mkdtempSync(join(tmpdir(),'stellar-apk-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const script=`import importlib.util, pathlib, json, hashlib, zipfile
spec=importlib.util.spec_from_file_location('audit', 'scripts/verify-built-apk.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
r=pathlib.Path(${JSON.stringify(dir)})
content={'index.html':b'<html>local</html>','assets/ship.webp':b'approved sprite'}
manifest=r/'manifest.json';manifest.write_text(json.dumps({'release':'test','files':2,'bytes':sum(map(len,content.values())),'entries':[{'path':n,'size':len(b),'sha256':hashlib.sha256(b).hexdigest()} for n,b in content.items()]}))
for mode in ['valid','missing','corrupt','extra']:
 apk=r/(mode+'.apk')
 with zipfile.ZipFile(apk,'w') as z:
  z.writestr('AndroidManifest.xml',b'not a web asset')
  for name,data in content.items():
   if mode=='missing' and name=='assets/ship.webp':continue
   z.writestr('assets/'+name,b'bad' if mode=='corrupt' else data)
  if mode=='extra':z.writestr('assets/untracked.txt',b'unexpected')
 try:
  result=m.verify(apk,manifest)
 except ValueError:
  assert mode!='valid',mode
 else:
  assert mode=='valid' and result['verified'],mode
`;
 const result=spawnSync('python3',['-c',script],{cwd:root,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
});

test('APK bootstrap removes only PWA shell caches, preserves saves, and waits before starting',async()=>{
 const deleted=[],unregistered=[];
 const context={StellarAndroid:{},navigator:{serviceWorker:{controller:null,getRegistrations:async()=>[{unregister:async()=>unregistered.push(1)}]}},caches:{keys:async()=>['stellar-shell-old','player-saves','session-vault'],delete:async key=>deleted.push(key)}};
 vm.runInNewContext(read('public/modules/native-assets-bootstrap.js'),context);
 await context.__stellarNativeReady;
 assert.deepEqual(deleted,['stellar-shell-old']);assert.equal(unregistered.length,1);
 assert.match(read('public/game.js').slice(0,250),/await globalThis\.__stellarNativeReady/);
 assert.ok(read('public/index.html').indexOf('native-assets-bootstrap.js')<read('public/index.html').indexOf('/game.js'));
 const web={navigator:{serviceWorker:{getRegistrations:()=>{throw Error('web must not reset worker')}}}};
 vm.runInNewContext(read('public/modules/native-assets-bootstrap.js'),web);
 assert.equal(web.__stellarNativeReady,undefined);
});
