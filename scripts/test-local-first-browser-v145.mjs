import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url);
let playwright;
try{playwright=await import('playwright');}
catch{const modules=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;if(!modules)throw Error('Instale playwright para este teste opcional.');playwright=await import(require.resolve('playwright',{paths:[modules]}));}
playwright=playwright.default||playwright;
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp','.png':'image/png'};
const server=createServer(async(req,res)=>{
 const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(path==='/test'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Local first browser QA</title>');return;}
 const filename=resolve(root,'public','.'+(path==='/'?'/index.html':path));
 if(!filename.startsWith(root+'/public/')){res.writeHead(403);res.end();return;}
 try{res.setHeader('Content-Type',mime[extname(filename)]||'application/octet-stream');res.end(await readFile(filename));}
 catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
let browser;const results={suite:'Chromium real IndexedDB',checks:[]};
try{
 browser=await playwright.chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext();const page=await context.newPage();
 await page.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
 await page.goto(origin+'/test');
 const first=await page.evaluate(async()=>{
  const {openLocalSaveV121}=await import('/modules/local-first-save-v121.js');
  const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';const db=await openLocalSaveV121({name:'qa-v145'});
  const s={accountOwnerId:owner,profile:{credits:10000},clientSavedAt:1};
  for(let i=1;i<=60;i++)await db.commit(owner,{...s,clientSavedAt:i},{forceCheckpoint:true});
  const id=crypto.randomUUID(),intent={id,module:'hangar',action:'montagem_pendente',payload:{signature:'one'},requiresServer:true};
  await db.commit(owner,s,{intent});await db.commit(owner,s,{intent});
  if((await db.pending(owner)).length!==1)throw Error('duplicate intent');
  const economic={id:crypto.randomUUID(),module:'economy',action:'pending',payload:{sku:'a'},requiresServer:true};
  await db.commit(owner,s,{intent:economic});
  const pending=await db.pending(owner);if(pending.length!==2)throw Error('economy superseded hangar');
  const before=await db.read(owner);
  try{await db.commit(owner,{...s,profile:{credits:999999}},{intent:{...intent,payload:{signature:'forged'}}});throw Error('reused id accepted');}catch(e){if(e.message==='reused id accepted')throw e;}
  if((await db.read(owner)).revision!==before.revision)throw Error('aborted transaction changed state');
  const checkpoints=[];for(const slot of ['A','B','C'])checkpoints.push([slot,!!await db.checkpoint(owner,slot)]);
  db.close();return {pending:pending.map(e=>({id:e.id,sequence:e.sequence})),checkpoints,revision:before.revision};
 });
 assert.equal(first.pending.length,2);assert.ok(first.checkpoints.every(([,ok])=>ok));results.checks.push({name:'atomic commit, monotonic sequence, idempotent intent, ABC',ok:true});
 // Real reload, offline reopening, then tamper latest save and A to recover B.
 await page.reload();await page.evaluate(()=>import('/modules/local-first-save-v121.js'));await context.setOffline(true);
 const recovery=await page.evaluate(async()=>{
  const {openLocalSaveV121}=await import('/modules/local-first-save-v121.js');const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const journal=await openLocalSaveV121({name:'qa-v145'});const pending=await journal.pending(owner);
  const raw=await new Promise((resolve,reject)=>{const req=indexedDB.open('qa-v145');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
  await new Promise((resolve,reject)=>{const tx=raw.transaction(['saves','checkpoints'],'readwrite');tx.objectStore('saves').get(owner).onsuccess=e=>tx.objectStore('saves').put({...e.target.result,hash:'broken'});tx.objectStore('checkpoints').get(owner+':A').onsuccess=e=>tx.objectStore('checkpoints').put({...e.target.result,hash:'broken'});tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});
  const recovered=await journal.readRecovering(owner);if(recovered.recoveredFrom!=='B')throw Error('B recovery failed');
  await journal.acknowledge([pending[0].id]);const remaining=await journal.pending(owner);
  raw.close();journal.close();return {recoveredFrom:recovered.recoveredFrom,remaining:remaining.length};
 });
 assert.equal(recovery.remaining,1);results.checks.push({name:'offline reload, corrupt A, verified B recovery, selective ACK',ok:true});
 await context.setOffline(false);
 const other=await context.newPage();await other.goto(origin+'/test');
 const writes=page=>page.evaluate(async()=>{const {openLocalSaveV121}=await import('/modules/local-first-save-v121.js');const db=await openLocalSaveV121({name:'qa-v145-concurrent'}),owner='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';for(let i=0;i<25;i++)await db.commit(owner,{accountOwnerId:owner,profile:{credits:100}});const row=await db.read(owner);db.close();return row.revision;});
 await Promise.all([writes(page),writes(other)]);
 const total=await page.evaluate(async()=>{const {openLocalSaveV121}=await import('/modules/local-first-save-v121.js');const d=await openLocalSaveV121({name:'qa-v145-concurrent'});const r=await d.read('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');d.close();return r.revision;});
 assert.equal(total,50);results.checks.push({name:'two browser tabs: atomic journal revision 50',ok:true});
 const errors=[];other.on('pageerror',e=>errors.push(e.message));await other.goto(origin+'/');await other.waitForTimeout(1500);assert.deepEqual(errors,[]);
 const login=await other.locator('#loginModal').count();assert.equal(login,1);
 results.checks.push({name:'original game login boots without JS exceptions',ok:true});
 await mkdir(resolve(root,'docs/local-first-v145'),{recursive:true});await other.screenshot({path:resolve(root,'docs/local-first-v145/browser-login.png')});
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
await writeFile(resolve(root,'docs/local-first-v145/BROWSER_RESULTS.json'),JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
