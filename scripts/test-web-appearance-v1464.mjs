// Optional real-Chromium check. No login, production writes or player accounts.
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url);
let pw;try{pw=await import('playwright');}catch{pw=await import(require.resolve('playwright',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'/opt/codex/cua_node/lib/node_modules']}));}pw=pw.default||pw;
const server=createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/qa'){
  res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><script src="/modules/interface-appearance-v1464.js"></script><link rel="stylesheet" href="/style.css"></head><body><div id="app"><div id="topbar" class="hud-panel"><button class="small-btn">PILOTO</button></div><main style="position:absolute;top:120px;left:20px"><label for="interfaceAppearanceV1464">Cores da interface</label><select id="interfaceAppearanceV1464"><option value="game">VISUAL ORIGINAL DO JOGO</option><option value="system">CORES DO SISTEMA</option></select><small id="interfaceAppearanceStatusV1464"></small><div class="bar-wrap" style="width:280px"><div class="bar hp" style="width:65%"></div></div></main></div></body></html>');return;
 }
 const file=resolve(root,'public','.'+path);if(!file.startsWith(root+'/public/')){res.writeHead(403);res.end();return;}
 try{res.setHeader('Content-Type',{'.css':'text/css','.js':'text/javascript'}[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
});
let browser,started=false;const checks=[];
try{
 await new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',ok);});started=true;
 browser=await pw.chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({forcedColors:'active'}),page=await context.newPage();await page.goto('http://127.0.0.1:'+server.address().port+'/qa');
 const styles=()=>page.evaluate(()=>({forced:matchMedia('(forced-colors:active)').matches,root:getComputedStyle(document.documentElement).forcedColorAdjust,background:getComputedStyle(document.getElementById('topbar')).backgroundImage,hp:getComputedStyle(document.querySelector('.bar.hp')).backgroundImage}));
 let r=await styles();assert.equal(r.forced,true);assert.equal(r.root,'none');assert.match(r.background,/gradient/);assert.match(r.hp,/gradient/);checks.push('native forced colors: original HUD and HP gradients preserved');
 await page.selectOption('#interfaceAppearanceV1464','system');r=await styles();assert.equal(r.root,'auto');assert.equal(r.background,'none');assert.equal(r.hp,'none');checks.push('system contrast explicitly restored');
 await page.reload();assert.equal(await page.inputValue('#interfaceAppearanceV1464'),'system');await page.selectOption('#interfaceAppearanceV1464','game');r=await styles();assert.match(r.background,/gradient/);checks.push('reload retains choice; original theme can be restored');
 const out=resolve(root,'docs/web-v1464');await mkdir(out,{recursive:true});await page.screenshot({path:resolve(out,'forced-colors-original.png')});await writeFile(resolve(out,'BROWSER_RESULTS.json'),JSON.stringify({checks,passed:true},null,2));console.log(JSON.stringify({checks,passed:true}));
}finally{if(browser)await browser.close();if(started)await new Promise(r=>server.close(r));}
