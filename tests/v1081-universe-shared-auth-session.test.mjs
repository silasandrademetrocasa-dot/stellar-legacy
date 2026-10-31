import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=f=>readFileSync(path.join(root,f),'utf8');
const version=read('public/game.js').match(/from ['"]\.\/api\.js\?v=([^'"]+)['"]/)?.[1];
test('O Universo e todos os modulos compartilham a mesma instancia autenticada de api.js',()=>{
 assert.ok(version,'Import principal api.js precisa de identificador de cache');
 const offenders=[];
 for(const f of readdirSync(path.join(root,'public/modules')).filter(x=>x.endsWith('.js'))){
  const body=read('public/modules/'+f);
  for(const hit of body.matchAll(/from\s*['"](\.\.\/api\.js(?:\?v=[^'"]+)?)['"]/g)){
   if(hit[1]!==`../api.js?v=${version}`)offenders.push(f+' -> '+hit[1]);
  }
 }
 assert.deepEqual(offenders,[],'Imports de api.js diferentes criam segundas sessoes em memoria');
 const lazy=read('public/modules/unified-expansion-lazy-v107.js');
 const html=read('public/index.html');
 assert.match(lazy,/unified-expansion-v42\.js\?v=108\.1\.0/);
 assert.match(html,/unified-expansion-lazy-v107\.js\?v=108\.1\.0/);
});

test('Login na API principal compartilha o token e a sessao com a chamada do Universo',async()=>{
 const storage=new Map();
 globalThis.sessionStorage={setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)||null,removeItem:k=>storage.delete(k)};
 globalThis.localStorage={removeItem:()=>{},getItem:()=>null,setItem:()=>{}};
 globalThis.window={};
 const requests=[];
 globalThis.fetch=async (url,options={})=>{
  requests.push({url,authorization:options.headers?.Authorization,gameSession:options.headers?.['X-Game-Session-Id']});
  const login=url==='/api/auth/login';
  return new Response(JSON.stringify(login?{
   session:{access_token:'test-token',refresh_token:'test-refresh',expires_at:9999999999,game_session_id:'test-session'},user:{id:'test',email:'probe@example.org'}
  }:{catalog:[],materials:{},items:[]}),{status:200,headers:{'Content-Type':'application/json'}});
 };
 const main=await import(pathToFileURL(path.join(root,'public/api.js')).href+'?v='+version);
 const expansion=read('public/modules/unified-expansion-v42.js').match(/from ['"](\.\.\/api\.js\?v=[^'"]+)['"]/)?.[1];
 assert.ok(expansion,'Import da API do Universo nao encontrado');
 const other=await import(new URL(expansion,pathToFileURL(path.join(root,'public/modules/unified-expansion-v42.js'))).href);
 assert.strictEqual(main,other,'As APIs devem compartilhar a mesma instancia ES module');
 await main.signIn({email:'probe@example.org',password:'test'});
 const response=await other.loadUnifiedExpansionV42();
 assert.ok(Array.isArray(response.catalog));
 assert.equal(requests.filter(r=>r.url==='/api/frontier/v42').length,1);
 const request=requests.find(r=>r.url==='/api/frontier/v42');
 assert.equal(request.authorization,'Bearer test-token');
 assert.equal(request.gameSession,'test-session');
});
